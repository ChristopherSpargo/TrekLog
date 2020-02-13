import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, Image, Alert,
         Slider, TouchableWithoutFeedback, BackHandler, StatusBar } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { NavigationActions } from 'react-navigation';
import ImageResizer from 'react-native-image-resizer';

import { TrekInfo, TrekPoint } from './TrekInfoModel';
import { UtilsSvc, SortDate } from './UtilsService';
import IconButton from './IconButtonComponent';
import { ModalModel } from './ModalModel';
import TrekLogHeader from './TreklogHeaderComponent';
import { ToastModel } from './ToastModel';
import Waiting from './WaitingComponent';
import { semitransBlack_2, semitransWhite_8, semitransBlack_5, HEADER_HEIGHT, TREK_TYPE_COLORS_OBJ } from './App';
import { StorageSvc } from './StorageService';
import { GroupSvc } from './GroupService';
import ImageView from './ImageViewComponent';
import { LoggingSvc } from './LoggingService';
import { TrekImageSet, TrekImage, TrekImageType,
         IMAGE_TYPE_INFO, IMAGE_TYPE_PHOTO, IMAGE_TYPE_VIDEO, IMAGE_STORE_COMPRESSED,
         IMAGE_COMPRESSION_QUALITY,
         ImageSvc, } from './ImageService';
import { MainSvc, RESP_CANCEL } from './MainSvc';
import { TrekSvc } from './TrekSvc';

const goBack = NavigationActions.back() ;

@inject('mainSvc', 'trekSvc', 'uiTheme', 'utilsSvc', 
        'modalSvc', 'toastSvc', 'storageSvc', 'groupSvc', "loggingSvc", "imageSvc",
)
@observer
class TrekImages extends Component<{
  uiTheme ?: any,
  mainSvc ?: MainSvc,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  groupSvc ?: GroupSvc,
  trekSvc ?: TrekSvc,
  loggingSvc?: LoggingSvc;
  storageSvc ?: StorageSvc,
  imageSvc ?: ImageSvc,
  navigation ?: any
}, {} > {

  _didFocusSubscription;
  _willBlurSubscription;

  mS = this.props.mainSvc;
  gS = this.props.groupSvc;
  tS = this.props.trekSvc;
  iS = this.props.imageSvc;

  // navigation parameters
  tInfo: TrekInfo;
  currentImageSet       : TrekImageSet;
  currentImageSetIndex  : number;
  backgroundTimeoutID   : number;
  headerIcon            : string;
  headerIconColor       : string;
  saveTrekAfterEdit         : boolean;
  

  camera            : any;
  cameraData        : any;
  cameraIsBusy      : boolean = false;
  imageZoomRef      : any;
  videoPlayerRef    : any;
  imageType         : TrekImageType;
  videoDurationStr  : string;
  cameraSwitching   : boolean = false;
  imageTime         : SortDate;
  headerVisible     : boolean = true;
  timeoutID         : number;
  mode              : string;


  @observable headerType              : string;
  @observable headerTitle             : string;
  @observable cameraIsOpen            : boolean;
  @observable videoRecording          : boolean;
  @observable picturePaused           : boolean;
  @observable displayingImage         : boolean;
  @observable currentImage            : TrekImage;
  @observable currentImageIndex       : number;
  @observable cameraZoom              : number;
  @observable frontOrBackCamera       : "front" | "back";
  @observable imageBackgroundText     : string;
  @observable audioMuted              : boolean;
  @observable videoPaused             : boolean;
  @observable videoLoaded             : boolean;
  @observable showVideoControls       : boolean;
  @observable currentVideoPos         : number;
  @observable videoDuration           : number;
  @observable waitingForSave          : boolean;
  @observable showNote                : boolean;
  @observable headerActions           : any[];


  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        );
      }
    );
  }

  componentWillMount() {
    this.tInfo = this.props.navigation.getParam('trek');
    this.mode = this.props.navigation.getParam('cmd');
    this.headerIcon = this.props.navigation.getParam('icon', this.tInfo.type);
    this.headerIconColor = this.props.navigation.getParam('iconColor' , 
                                                        TREK_TYPE_COLORS_OBJ[this.tInfo.type]);
    this.saveTrekAfterEdit = this.props.navigation.getParam('saveAfterEdit', true)
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setCurrentImageSet(-1, 0);
    this.setFrontOrBackCamera(RNCamera.Constants.Type.back)
    this.setCameraZoom(0);
    this.setVideoPaused(true);
    this.setVideoLoaded(false);
    this.setAudioMuted(false);
    this.setShowVideoControls(true);
    this.setCurrentVideoPos(0);
    this.setVideoDuration(0);
    this.setWaitingForSave(false);
    this.setShowNote(false);

    switch(this.mode){
      case 'camera':
        this.openCamera();
        break;
      case 'show':
        let setIndex = this.props.navigation.getParam('setIndex');
        let imageIndex = this.props.navigation.getParam('imageIndex');
        this.setCurrentImageSet(setIndex, imageIndex);
        break;
      default:
    }

  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    window.clearTimeout(this.backgroundTimeoutID);
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setVideoPaused(true);
    this.setVideoLoaded(false);
    this.currentImageSet = undefined;
  }

  checkBackButton = () => {
    if (!this.onBackButtonPressAndroid()) {
      this.props.navigation.dispatch(goBack);
    }
  };

  onBackButtonPressAndroid = () => {
    if(this.mS.trekLabelFormOpen){
      return true;
    }
    return false;
  }

  hideStatusBar= () => {
    requestAnimationFrame(() => {
      StatusBar.setHidden(true, "none")
    })
  }
  
  showStatusBar= () => {
    requestAnimationFrame(() => {
      StatusBar.setHidden(false, "none")
    })
  }
  
  @action
  setShowNote = (status: boolean) => {
    this.showNote = status;
  }

  toggleShowNote = () => {
    this.setShowNote(!this.showNote);
  }

  cancelHideControlsTimer = () => {
    if (this.timeoutID !== undefined) {
      window.clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
  }

  setHideControlsTimer = () => {
    this.cancelHideControlsTimer();
    this.timeoutID = window.setTimeout(() => {
      this.setShowVideoControls(false);
    }, 3000);
  }

  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  }

  @action
  setHeaderType = (type: string) => {
    this.headerType = type;
  }

  hideHeader= () => {
    this.setHeaderType('hide');
  }
  
  showHeader= () => {
    this.setHeaderType(this.mode);
  }
  
  setHeaderNotVisible = () => {
    this.headerVisible = false;
    this.hideHeader();
  }

  setHeaderVisible = () => {
    this.headerVisible = true;
    this.showHeader();
  }

  setHeaderVisibility = (visible : boolean) => {
    if (visible === true){
      this.setHeaderVisible();
    } else {
      this.setHeaderNotVisible();
    }
  }

  @action
  setWaitingForSave = (status: boolean) => {
    this.waitingForSave = status;
  }

  @action
  setMode = (value: string) => {
    this.mode = value;
  }

  // set the value of the openCamera property
  @action
  setCameraIsOpen = (status: boolean) => {
    this.cameraIsOpen = status;
    // this.setHeaderVisibility(!status);
  }

  // open the camera component
  openCamera = () => {
    this.setCameraIsOpen(true);
    this.cameraData = undefined;
  }

  // close the camera component
  closeCamera = () => {
    this.setCameraIsOpen(false);
    this.props.navigation.dispatch(goBack);
  }

  // set the value of the videoRecording property
  @action
  setVideoRecording = (status: boolean) => {
    this.videoRecording = status;
  }

  // set the value of the picturePaused property
  @action
  setPicturePaused = (status: boolean) => {
    this.picturePaused = status;
  }

  // set the value of the displayingImage property
  @action
  setDisplayingImage = (status: boolean) => {
    this.displayingImage = status;
  }

  // open the display image area
  openImageDispaly = () => {
    this.setDisplayingImage(true);
  }

  // close the display image area
  closeImageDisplay = () => {
    this.props.navigation.dispatch(goBack);
  }

  // set the value of the cameraZoom property
  @action
  setCameraZoom = (value: number) => {
    this.cameraZoom = value;
  }

  // set the value of the currentImage property
  @action 
  setCurrentImage = (image: TrekImage) => {
    this.setHeaderTitle(this.tS.formatImageTitle(this.tInfo, 
                                    this.currentImageSetIndex, this.currentImageIndex));
    this.currentImage = image;
    this.setHeaderActions();
  }

  // set the value of the currentImageObject property
  @action
  setCurrentImageSet = (setIndex: number, imageSel: any) => {
    this.currentImageSetIndex = setIndex;
    if (this.tInfo.trekImages && setIndex >= 0) {
      let n: number;
      this.currentImageSet = this.tInfo.trekImages[setIndex];
      switch(imageSel){
        case 'last':
          n = this.currentImageSet.images.length - 1;
          break;
        case 'first':
          n = 0;
          break;
        default: 
          n = imageSel;
      }
      this.setCurrentImageIndex(n);
      this.openImageDispaly();
    }
  }

  // set the value of the currentImageIndex and currentImage properties
  @action
  setCurrentImageIndex = (val: number) => {
    this.currentImageIndex = val;
    if(this.currentImageSet){
      this.setVideoLoaded(false);
      let title = this.tS.formatImageTitle(this.tInfo, this.currentImageSetIndex, val);
      this.props.navigation.setParams({title: title});
      title = this.tS.formatImageTitle(this.tInfo, this.currentImageSetIndex, val, true);
      this.setImageBackgroundTextTimeout(title + ' is missing');
      let ci : TrekImage = {} as TrekImage;
      Object.assign(ci, this.currentImageSet.images[val]);
      if(/TrekLog/g.test(ci.uri)) {
        ci.uri = 'file://' + ci.uri;
      }
      this.setCurrentImage(ci);
      //Revisit
      Image.getSize(ci.uri,
        (w, h) => {
          ci.width = w;
          ci.height = h;
          this.clearImageBackgroundTextTimeout();
        }, 
        () => {}
      )
    }
  }

  // set the text to display in the image area while the image is loading
  @action
  setImageBackgroundText = (text: string) => {
    this.imageBackgroundText = text;
  }

  // set a timeout to change the imageBackgroundText property
  setImageBackgroundTextTimeout = (text: string) => {
      this.setImageBackgroundText('Loading...');
      window.clearTimeout(this.backgroundTimeoutID);
      this.backgroundTimeoutID = window.setTimeout(() => {
        this.setImageBackgroundText(text);
      }, 2000);
  }

  // image loaded successfully, clear timeoud and loading message
  clearImageBackgroundTextTimeout = () => {
    window.clearTimeout(this.backgroundTimeoutID);
    this.setImageBackgroundText("");
  }

  // reset the zoom factor for the picture image
  resetImageZoom = () => {
    if(this.imageZoomRef){
      this.imageZoomRef.reset();
    }
  }

  // set the value of the videoPaused property
  @action
  setVideoPaused = (status: boolean) => {
    this.videoPaused = status;
    this.setHeaderVisibility(this.videoPaused);
    if (!this.videoPaused){
      this.setHideControlsTimer();
    }
    else {
      this.setShowVideoControls(true);
      this.cancelHideControlsTimer();
    }
  }

  // set the value of the audioMuted property
  @action
  setVideoLoaded = (status: boolean) => {
    this.videoLoaded = status;
  }

  // set the value of the audioMuted property
  @action
  setAudioMuted = (status: boolean) => {
    this.audioMuted = status;
  }

  // toggle the value of the videoPaused property
  toggleVideoPaused = () => {
    this.setVideoPaused(!this.videoPaused);
  }

  // toggle the value of the audioMuted property
  toggleAudioMuted = () => {
    this.setAudioMuted(!this.audioMuted);
  }

  // set the value of the showVideoControls property
  @action
  setShowVideoControls = (status: boolean) => {
    this.showVideoControls = status;
    this.cancelHideControlsTimer();
  }

  // the user touched the video display screen
  toggleShowVideoContols = () => {
    if (this.currentImage.type === IMAGE_TYPE_VIDEO) {
      if (this.videoPaused){
        this.setHeaderVisibility(!this.headerVisible);
        this.setShowVideoControls(!this.showVideoControls);
      }
      else {
        if (!this.showVideoControls){
          this.setShowVideoControls(true);
          this.setHideControlsTimer();
        } 
        else {
          this.setShowVideoControls(false);
        }
      }
    }
    else {
      this.setShowVideoControls(!this.showVideoControls);
      this.setHeaderVisibility(this.showVideoControls);
    }
  }

  // respond to onLoad video event
  videoLoad = (data) => {
    if (this.videoPlayerRef) { this.videoPlayerRef.seek(0); }
    this.clearImageBackgroundTextTimeout();
    this.setVideoDuration(data.duration);
    this.videoDurationStr = this.props.utilsSvc.timeFromSeconds(data.duration);
    this.setVideoPaused(true);
    this.setVideoLoaded(true);
  }

  // respond to onEnd video event
  videoEnded = () => {
    if(this.videoPlayerRef) { this.videoPlayerRef.seek(0); }
    this.setVideoPaused(true);
  }

  // update the value of the video position
  @action
  setCurrentVideoPos = (value: number) => {
    this.currentVideoPos = value;
  }

  newVideoPos = (data ?: any) => {
    if (data) {
      this.setCurrentVideoPos(data.currentTime);
    }
  }

  setNewVideoPos = (pos: number) => {
    if (this.videoPlayerRef) { this.videoPlayerRef.seek(pos); }
  }

  // set the value of the videoDuration property
  @action
  setVideoDuration = (value: number) => {
    this.videoDuration = value;
  }

  // move to the next image in the images for the trek
  nextImage = () => {
    this.clearImageBackgroundTextTimeout();
    if (this.currentImageIndex < this.currentImageSet.images.length - 1){
      this.setCurrentImageIndex(this.currentImageIndex + 1);      
    }
    else {
      if (this.currentImageSetIndex < this.tInfo.trekImages.length - 1){
        this.setCurrentImageSet(this.currentImageSetIndex + 1, "first");
      }
    }
    this.resetImageZoom();
    this.setVideoPaused(true);
  }

  // move to the prior image in the images for the trek
  prevImage = () => {
    this.clearImageBackgroundTextTimeout();
    if (this.currentImageIndex > 0){
      this.setCurrentImageIndex(this.currentImageIndex - 1);      
    }
    else {
      if (this.currentImageSetIndex > 0){
        this.setCurrentImageSet(this.currentImageSetIndex - 1, "last");
      }
    }
    this.resetImageZoom();
    this.setVideoPaused(true);
  }

  // return true if there is another image later in the trek
  haveNextImage = () => {
    if (this.displayingImage && this.tS.getTrekImageCount(this.tInfo) > 0){
      return ((this.currentImageIndex < this.currentImageSet.images.length - 1) || 
      (this.currentImageSetIndex < this.tInfo.trekImages.length - 1));
    }
    return false;
  }

  // return true if there is another image earlier in the trek
  havePrevImage = () => {
    if (this.displayingImage && this.tS.getTrekImageCount(this.tInfo) > 0){
      return ((this.currentImageIndex > 0) || (this.currentImageSetIndex > 0));
    }
    return false;
  }

  // set the value of the cameraZoom property
  @action
  setFrontOrBackCamera = (value: "front" | "back") => {
    this.frontOrBackCamera = value;
  }

  // toggle which camera to use (front/back)
  toggleFrontOrBackCamera = () => {
    this.setFrontOrBackCamera(this.frontOrBackCamera === RNCamera.Constants.Type.back 
                                    ? RNCamera.Constants.Type.front : RNCamera.Constants.Type.back)
  }

  startVideoRecording = async () => {
      if (this.camera) {
        this.setVideoRecording(true);
        this.setHeaderNotVisible();
        const options = {quality: RNCamera.Constants.VideoQuality["1080p"]};
        this.imageType = IMAGE_TYPE_VIDEO;
        this.imageTime = this.props.utilsSvc.formatLongSortDate(null, null, new Date().getTime());
        this.camera.recordAsync(options)
        .then((data) => {
          this.cameraData = data;
          this.setPicturePaused(true);
          this.setHeaderVisible();
        })
        .catch((err) => {
          Alert.alert('Video Error', err);
          this.setHeaderVisible();
        })
      }
  };
    
  stopVideoRecording = () => {
    if (this.camera) {
      this.camera.stopRecording();
      this.setVideoRecording(false);
    }
  };
    
  takePicture = () => {
      if (!this.cameraIsBusy && this.camera) {
        this.cameraIsBusy = true;
        const options = {pauseAfterCapture: true, fixOrientation: true };
        this.imageType = IMAGE_TYPE_PHOTO;
        this.camera.takePictureAsync(options)
        .then((data) => {
          this.cameraData = data;
          this.imageTime = this.props.utilsSvc.formatLongSortDate(null, null, new Date().getTime());
          this.setPicturePaused(true);
          this.cameraIsBusy = false;
        })
        .catch((err) => {
          this.cameraIsBusy = false;
          Alert.alert('Camera Error', err);
        })
      }
  };

  resumeCameraPreview = () => {
    if (this.camera) {
      this.camera.resumePreview();
      this.setPicturePaused(false);
    }
  }

  // compress the image at the given uri
  // return a result uri
  compressImage = (data: any, type: TrekImageType) => {
    return new Promise<any>((resolve, reject) => {
      if (this.gS.getImageStorageMode() === IMAGE_STORE_COMPRESSED && type === IMAGE_TYPE_PHOTO) {
        ImageResizer.createResizedImage(data.uri,
                                        data.width, data.height,
                                         'JPEG', IMAGE_COMPRESSION_QUALITY)
        .then((result) => resolve(result.uri))
        .catch((err) => reject(err))
      }
      else {
        resolve(data.uri)
      }
    })
  }

  // save the given photo/video and associate it with the given location
  handlePicture = (data: any, type: TrekImageType, loc: TrekPoint) => {
    this.setWaitingForSave(true);
    this.compressImage(data, type)
    .then((compressedUri) => {
      // store image as longSortDate.extension (jpg, mp4, etc.)
      this.props.storageSvc.saveTrekLogPicture(compressedUri, this.imageTime)
      .then((finalUri) => {
        this.setWaitingForSave(false);
        this.updateImageLabel("SKIP", type)
        .then((resp: any)=> {
          this.tS.addTrekImage(this.tInfo, finalUri, data, type, loc.l, this.imageTime,
                                  resp.label, resp.notes);
          this.props.toastSvc.toastOpen({tType: 'Info', content: IMAGE_TYPE_INFO[type].name + ' saved'});
          this.resumeCameraPreview();
        })
        .catch(() =>{
          this.tS.addTrekImage(this.tInfo, finalUri, data, type, loc.l, this.imageTime, undefined, undefined);
          this.props.toastSvc.toastOpen({tType: 'Info', content: IMAGE_TYPE_INFO[type].name + ' saved'});
          this.resumeCameraPreview();
        })             // had error saving trek  
      })
      .catch((error) => {           // had error saving image
        this.setWaitingForSave(false);
        this.props.toastSvc.toastOpen({tType: 'Error',content: 'Error saving ' + 
                                              IMAGE_TYPE_INFO[type].name + ': ' + error, time: 3000});
        this.resumeCameraPreview();
      })
    })
    .catch((error) => {
      this.setWaitingForSave(false);
      this.props.toastSvc.toastOpen({tType: 'Error',content: 'Error Processing ' + 
                                            IMAGE_TYPE_INFO[type].name + ': ' + error, time: 3000});
      this.resumeCameraPreview();
    })
  }

  keepThisImage = () => {
    // open form for label and note here
    this.setShowVideoControls(true);
    this.handlePicture(this.cameraData, this.imageType, this.tS.lastPoint(this.tInfo));
  }

  deleteCurrentImage = () => {
    let type = this.currentImage.type;

    this.props.modalSvc.simpleOpen({heading: 'Delete ' + IMAGE_TYPE_INFO[type].name, 
    content: "Delete this  " + IMAGE_TYPE_INFO[type].name + "?", 
    cancelText: 'CANCEL', okText: 'YES', headingIcon: IMAGE_TYPE_INFO[type].icon})
    .then(() => {
      let newIndx = this.tS.deleteTrekImage(this.tInfo, this.currentImageSetIndex, this.currentImageIndex);
      if (newIndx !== -1) {
        this.setCurrentImageIndex(newIndx);
      } else {
        if (this.currentImageSetIndex < this.tS.getTrekImageSetCount(this.tInfo)) {
          this.setCurrentImageSet(this.currentImageSetIndex, "first");
        }
        else {
          if (this.tS.getTrekImageCount(this.tInfo) > 0) {
            this.setCurrentImageSet(this.currentImageSetIndex - 1, "last");
          }
          else {
            this.closeImageDisplay();
          }
        }
      }
      this.props.toastSvc.toastOpen({tType: 'Info', content: IMAGE_TYPE_INFO[type].name + ' deleted'});
    })
    .catch(() =>{ // CANCEL, DO NOTHING
    })
  }

  // Let the user add/edit a label and note for the image
  updateImageLabel = (cancelText: string, type: number,
                      oldLabel?: string, oldNote?: string) => {
    return new Promise((resolve, reject) => {
      this.mS.setTrekLabelFormOpen(true);
      this.props.modalSvc
        .openLabelForm({
          heading: IMAGE_TYPE_INFO[type].name + " Description",
          label: oldLabel,
          notes: oldNote,
          headingIcon: "NoteText",
          okText: "SAVE",
          cancelText: cancelText,
        })
        .then((resp: any) => {
          this.mS.setTrekLabelFormOpen(false);
          resolve(resp);
        })
        .catch(() => {
          this.mS.setTrekLabelFormOpen(false);
          reject(RESP_CANCEL);
        });
    });
  }

  // allow user to edit image notes/label for existing trek image
  editImageLabel = () => {
    let ci = this.currentImage;
    this.updateImageLabel("CANCEL", ci.type, ci.label, ci.note)
    .then((resp: any) => {
      this.tS.updateTrekImage(this.tInfo, this.currentImageSetIndex, this.currentImageIndex, 
                {label: resp.label, note: resp.notes});
      if (this.saveTrekAfterEdit){
        this.mS
        .saveTrek(this.tInfo)
        .then(() => {
          this.iS.updateAllImagesEntry(ci.sDate, ci.uri, {label: resp.label, note: resp.notes});
          this.setCurrentImageIndex(this.currentImageIndex)
          this.props.toastSvc.toastOpen({
            tType: "Success",
            content: "Image Description updated."
          });
        })
        .catch(() => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: "Error updating image description."
          });
        });
      } else {        // no save after edit
        this.setCurrentImageIndex(this.currentImageIndex)
        this.props.toastSvc.toastOpen({
          tType: "Success",
          content: "Image Description updated."
        });
      }
    })
    .catch(() =>{});    // CANCEL
  }

  @action
  setHeaderActions = () => {
    let headerActions = [];
    if(this.currentImage){
      headerActions.push({icon: 'Edit', style: {marginTop: 0}, actionFn: this.editImageLabel});
      if(this.currentImage.note){
        headerActions.push({icon: 'NoteText', style: {marginTop: 0}, actionFn: this.toggleShowNote});
      }
      headerActions.push({icon: 'Delete', style: {marginTop: 0}, actionFn: this.deleteCurrentImage});
    }
    this.headerActions = headerActions;
  }

  render () {
    const { trekLogGreen, trekLogRed, mediumTextColor, pageBackground
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { navIcon, fontBold } = this.props.uiTheme;
    const noPrev = !this.havePrevImage();
    const noNext = !this.haveNextImage();
    const imageSelectorWidth = 50;
    const cameraControlButtonSize = 72;
    const cameraControlIconSize = 48;
    const cameraControlsBackground = semitransWhite_8;
    const controlsColor = "black";
    const buttonBorderColor = semitransBlack_5;
    
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      cameraArea: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
        alignItems: 'center',
      },
      cameraPreview: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
      },
      cameraClickArea: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 120,
        justifyContent: "center",
        alignItems: "center",
      },
      cameraControls: {
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        height: cameraControlButtonSize + 10,
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
      },
      auxCameraControls: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        height: cameraControlButtonSize + 50,
        flexDirection: 'column', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
      },
      cameraControlButtonStyle: {
        width: cameraControlButtonSize,
        height: cameraControlButtonSize,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: cameraControlsBackground, 
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: buttonBorderColor,
        borderRadius: cameraControlButtonSize/2,
      },
      imageSelectorArea: {
        position: "absolute",
        top: 150,
        left: 0,
        right: 0,
      },
      imageSelectorPrev: {
        position: "absolute",
        left: 10,
        width: imageSelectorWidth,
        height: imageSelectorWidth,
        borderRadius: imageSelectorWidth/2,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorNext: {
        position: "absolute",
        right: 10,
        width: imageSelectorWidth,
        height: imageSelectorWidth,
        borderRadius: imageSelectorWidth/2,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorStyle: {
        backgroundColor: semitransWhite_8, 
        borderRadius: imageSelectorWidth/2,
        borderStyle: "solid",
        borderWidth: 1,
      },
      imageBackground: {
        position: "absolute",
        right: 10,
        left: 10,
        top: 0,
        bottom: 120,
        justifyContent: "center",
        alignItems: "center",
      },
      imageBackgroundMsg: {
        color: mediumTextColor,
        fontSize: 18,
      },
      videoBackground: {
        position: "absolute",
        right: 10,
        left: 10,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
      },
      sliderArea: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 30,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 5,
        backgroundColor: semitransWhite_8,
      },
      sliderText: {
        fontSize: 14,
        fontFamily: fontBold,
        color: "black",
      },
    })

    const CameraControl = ({icon, onPress, iSize = cameraControlIconSize, color = controlsColor}) => {
      return (  
            <IconButton 
              iconSize={iSize}
              style={styles.cameraControlButtonStyle}
              icon={icon}
              iconStyle={navIcon}
              buttonSize={cameraControlButtonSize + 5}
              color={color}
              onPressFn={onPress}
            />
      )
    }

    return (
      <View style={styles.container}>
        {this.headerType === 'show' &&
          <TrekLogHeader titleText={this.headerTitle}
                                      icon={this.headerIcon}
                                      iconColor={this.headerIconColor}
                                      actionButtons={this.headerActions}
                                      textColor="white"
                                      position="absolute"
                                      backButtonFn={this.checkBackButton}
          />
        }
        {this.headerType === 'camera' &&
          <TrekLogHeader titleText={this.headerTitle || 'Use Camera'}
                                      icon="*"
                                      textColor="white"
                                      position="absolute"
                                      backButtonFn={this.checkBackButton}
          />
        }
        {(this.waitingForSave) &&
          <Waiting 
            msg={' Saving ' + IMAGE_TYPE_INFO[this.imageType].name + '... '}
          />
        }
        {(this.cameraIsOpen) &&
            <View style={[styles.container]}>
            <RNCamera
              ref={ref => { this.camera = ref;}}
              style={styles.cameraArea}
              type={this.frontOrBackCamera}
              zoom={this.cameraZoom}
              flashMode={RNCamera.Constants.FlashMode.off}
              permissionDialogTitle={'Permission to use camera'}
              permissionDialogMessage={'TrekLog needs your permission to use the camera'}
              playSoundOnCapture={true}
            />
            {(!this.videoRecording && !this.picturePaused) &&
              <TouchableWithoutFeedback
                onPress={this.takePicture}>
                <View style={styles.cameraClickArea}>
                </View>
              </TouchableWithoutFeedback>
            }
            <View style={styles.cameraControls}>
              {this.picturePaused &&
                <CameraControl icon={"Delete"} color={trekLogRed} 
                              onPress={this.picturePaused ? this.resumeCameraPreview : this.closeCamera}/>
              }
              {this.picturePaused &&
                <CameraControl icon={"CheckMark"} color={trekLogGreen} 
                              onPress={this.keepThisImage}/>
              }
              {(!this.videoRecording && !this.picturePaused) &&
                <CameraControl icon={"CameraSwitch"} onPress={this.toggleFrontOrBackCamera}/>
              }
              {!this.picturePaused &&
                <CameraControl icon={this.videoRecording ? "VideoOff" : "Video"} 
                              color={this.videoRecording ? "red" : controlsColor}
                              onPress={this.videoRecording ? this.stopVideoRecording : this.startVideoRecording}/>
              }
            </View>
            {(!this.picturePaused) &&
              <View style={styles.auxCameraControls}>
                <View style={styles.sliderArea}>
                  <Text style={styles.sliderText}>{Math.round(this.cameraZoom * 100) + '%'}</Text>
                  <Slider
                    style={{flex: 1}}
                    step={.01}
                    maximumTrackTintColor={semitransBlack_5}
                    maximumValue={1}
                    onValueChange={this.setCameraZoom}
                    value={this.cameraZoom}
                  />                        
                  <Text style={styles.sliderText}>Zoom</Text>
                </View>
              </View>
            }
          </View>
        }
        {(this.displayingImage) &&
          <View style={[styles.container, {alignItems: "center"}]}
            // {...this._panResponder.panHandlers}
          >
            <View style={styles.container}>
              <View style={styles.imageBackground}>
                <Text style={styles.imageBackgroundMsg}>{this.imageBackgroundText}</Text>
              </View>
              {this.currentImage &&
                <View style={[styles.container,{top: HEADER_HEIGHT, justifyContent: "center", flex: 1}]}>
                    <ImageView  imageUri={this.currentImage.uri}
                                imageType={this.currentImage.type}
                                imageLabel={this.currentImage.label}
                                imageNote={this.currentImage.note}
                                showNote={this.showNote}
                                imageHeight={this.currentImage.height}
                                imageWidth={this.currentImage.width}
                                imageDate={this.currentImage.sDate}
                                clearTimeoutFn={this.clearImageBackgroundTextTimeout}
                                setShowVideoControlsFn={this.setShowVideoControls}
                    />
                    {(((this.currentImage.type !== IMAGE_TYPE_VIDEO) || this.videoPaused)
                        && this.showVideoControls) && 
                      <View style={styles.imageSelectorArea}>
                        {!noPrev &&
                          <View style={styles.imageSelectorPrev}>
                            <IconButton 
                              iconSize={imageSelectorWidth}
                              style={styles.imageSelectorStyle}
                              borderColor={buttonBorderColor}
                              icon="ChevronLeft"
                              color={controlsColor}
                              iconStyle={navIcon}
                              onPressFn={this.prevImage}
                            />
                          </View>
                        }
                        {!noNext &&
                          <View style={styles.imageSelectorNext}>
                            <IconButton
                              iconSize={imageSelectorWidth}
                              style={styles.imageSelectorStyle}
                              borderColor={buttonBorderColor}
                              icon="ChevronRight"
                              color={controlsColor}
                              iconStyle={navIcon}
                              onPressFn={this.nextImage}
                            />
                          </View>
                        }
                      </View>
                    }
                  </View>
                }
            </View>        
          </View>
        }
      </View>
    )   
  }
}

export default TrekImages;

