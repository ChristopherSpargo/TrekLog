import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, Image, Alert, Dimensions, 
         Slider, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import ImageZoom from 'react-native-image-pan-zoom';
import Video from 'react-native-video';
import { NavigationActions } from 'react-navigation';

import { TrekInfo, TrekPoint, TrekImageSet, TrekImage, TrekImageType,
         IMAGE_TYPE_INFO, IMAGE_TYPE_PHOTO, IMAGE_TYPE_VIDEO } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import IconButton from './IconButtonComponent';
import { ModalModel } from './ModalModel';
import TrekLogHeader from './TreklogHeaderComponent';
import { ToastModel } from './ToastModel';
import Waiting from './WaitingComponent';
import { semitransBlack_2, semitransWhite_8, semitransBlack_5, semitransBlack_9, 
       } from './App';
import { StorageSvc } from './StorageService';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'uiTheme', 'utilsSvc', 'modalSvc', 'toastSvc', 'storageSvc')
@observer
class TrekImages extends Component<{
  uiTheme ?: any,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  trekInfo ?: TrekInfo,
  toastSvc ?: ToastModel,
  storageSvc ?: StorageSvc,
  navigation ?: any
}, {} > {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    const cmd = params.cmd;

    switch (cmd) {
      case 'show':
        return {
          header: <TrekLogHeader titleText={params.title || ' '}
                                      icon={params.icon || ''}
                                      headerRightIcon="Delete"
                                      headerRightIconColor="white"
                                      backgroundColor="rgba(0,0,0,.4)"
                                      textColor="white"
                                      position="absolute"
                                      headerRightFn={params.deleteImage}
                                      backButtonFn={() =>  navigation.dispatch(goBack)}
                  />
        }
      case 'camera':
      return {
        header: <TrekLogHeader titleText={params.title || ' '}
                                    icon="*"
                                    backgroundColor="rgba(0,0,0,.4)"
                                    textColor="white"
                                    position="absolute"
                                    backButtonFn={() =>  navigation.dispatch(goBack)}
                />
      }
    case 'hide':
      default:
        return {
          header: null
        }
    };
  }  

  tInfo = this.props.trekInfo;
  currentImageSet       : TrekImageSet;
  currentImageSetIndex  : number;
  backgroundTimeoutID   : number;
  headerTitle = '';
  

  camera            : any;
  cameraData        : any;
  imageZoomRef      : any;
  videoPlayerRef    : any;
  imageType         : TrekImageType;
  videoDurationStr  : string;
  cameraSwitching   : boolean = false;
  imageTime         : number;
  mode              : string;
  headerVisible     : boolean = true;
  timeoutID         : number;

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
  @observable showVideoControls       : boolean;
  @observable currentVideoPos         : number;
  @observable videoDuration           : number;
  @observable waitingForSave          : boolean;


  constructor(props) {
    super(props);
}

  componentWillMount() {
    let cmd = this.props.navigation.getParam('cmd');

    this.mode = cmd;
    // this.hideStatusBar();
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setCurrentImageSet(-1);
    this.setFrontOrBackCamera(RNCamera.Constants.Type.back)
    this.setCameraZoom(0);
    this.setVideoPaused(true);
    this.setAudioMuted(false);
    this.setShowVideoControls(true);
    this.setCurrentVideoPos(0);
    this.setVideoDuration(0);
    this.setWaitingForSave(false);

    switch(cmd){
      case 'camera':
        this.openCamera();
        break;
      case 'show':
        let setIndex = this.props.navigation.getParam('setIndex');
        this.setCurrentImageSet(setIndex);
        break;
      default:
    }
    this.props.navigation.setParams({ deleteImage: this.deleteCurrentImage });

  }

  componentWillUnmount() {
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setVideoPaused(true);
    this.currentImageSet = undefined;
    // this.showStatusBar();
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

  hideHeader= () => {
    this.props.navigation.setParams({cmd: 'hide'});
  }
  
  showHeader= () => {
    this.props.navigation.setParams({cmd: this.mode});
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
    this.currentImage = image;
  }

  // set the value of the currentImageObject property
  @action
  setCurrentImageSet = (index: number) => {
    this.currentImageSetIndex = index;
    if (index >= 0) {
      this.currentImageSet = this.tInfo.trekImages[index];
      this.setCurrentImageIndex(0);
      this.openImageDispaly();
    }
  }

  // set the value of the currentImageIndex and currentImage properties
  @action
  setCurrentImageIndex = (val: number) => {
    this.currentImageIndex = val;
    if(this.currentImageSet){
      let ci : TrekImage = {} as TrekImage;
      Object.assign(ci, this.currentImageSet.images[val]);
      if(/TrekLog/g.test(ci.uri)) {
        ci.uri = 'file://' + ci.uri;
      }
      this.setCurrentImage(ci);
      let title = this.tInfo.formatImageTitle(this.currentImageSetIndex, val);
      this.props.navigation.setParams({title: title});
      title = this.tInfo.formatImageTitle(this.currentImageSetIndex, val, true);
      this.setImageBackgroundTextTimeout(title + ' is missing');
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
    }, 3000);
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
  videoLoaded = (data) => {
    if (this.videoPlayerRef) { this.videoPlayerRef.seek(0); }
    this.setVideoDuration(data.duration);
    this.videoDurationStr = this.props.utilsSvc.timeFromSeconds(data.duration);
    this.setVideoPaused(true);
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

    if (this.currentImageIndex < this.currentImageSet.images.length - 1){
      this.setCurrentImageIndex(this.currentImageIndex + 1);      
    }
    else {
      if (this.currentImageSetIndex < this.tInfo.trekImages.length - 1){
        this.setCurrentImageSet(this.currentImageSetIndex + 1);
      }
    }
    this.resetImageZoom();
    this.setVideoPaused(true);
  }

  // move to the prior image in the images for the trek
  prevImage = () => {

    if (this.currentImageIndex > 0){
      this.setCurrentImageIndex(this.currentImageIndex - 1);      
    }
    else {
      if (this.currentImageSetIndex > 0){
        this.setCurrentImageSet(this.currentImageSetIndex - 1);
        this.setCurrentImageIndex(this.currentImageSet.images.length - 1);      
      }
    }
    this.resetImageZoom();
    this.setVideoPaused(true);
  }

  // return true if there is another image later in the trek
  haveNextImage = () => {
    if (this.displayingImage && this.tInfo.haveTrekImages()){
      return ((this.currentImageIndex < this.currentImageSet.images.length - 1) || 
      (this.currentImageSetIndex < this.tInfo.trekImages.length - 1));
    }
    return false;
  }

  // return true if there is another image earlier in the trek
  havePrevImage = () => {
    if (this.displayingImage && this.tInfo.haveTrekImages()){
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
        this.imageTime = new Date().getTime();
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
      if (this.camera) {
        const options = {pauseAfterCapture: true, skipProcessing: true};
        this.imageType = IMAGE_TYPE_PHOTO;
        this.camera.takePictureAsync(options)
        .then((data) => {
          this.cameraData = data;
          this.imageTime = new Date().getTime();
          this.setPicturePaused(true);
        })
        .catch((err) => {
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

  handlePicture = (data: any, type: TrekImageType, loc: TrekPoint) => {
    this.setWaitingForSave(true);
    this.props.storageSvc.saveTrekLogPicture(data.uri)
    .then((uri) => {
      this.tInfo.addTrekImage(uri, data.deviceOrientation, type, loc.l, this.imageTime);
      this.setWaitingForSave(false);
      this.props.toastSvc.toastOpen({tType: 'Info', content: IMAGE_TYPE_INFO[type].name + ' saved'});
      this.resumeCameraPreview();
    })
    .catch((error) => {
      this.setWaitingForSave(false);
      this.props.toastSvc.toastOpen({tType: 'Error',content: 'Error saving ' + 
                                            IMAGE_TYPE_INFO[type].name + ': ' + error, time: 3000});
      this.resumeCameraPreview();
    })
  }

  keepThisImage = () => {
    // open form for label and note here
    this.handlePicture(this.cameraData, this.imageType, this.tInfo.lastPoint());
     this.setShowVideoControls(true);
  }

  deleteCurrentImage = () => {
    let type = this.currentImage.type;

    this.props.modalSvc.simpleOpen({heading: 'Delete ' + IMAGE_TYPE_INFO[type].name, 
    content: "Delete this  " + IMAGE_TYPE_INFO[type].name + "?", 
    cancelText: 'CANCEL', okText: 'YES', headingIcon: IMAGE_TYPE_INFO[type].icon})
    .then(() => {
      let newIndx = this.tInfo.deleteTrekImage(this.currentImageSetIndex, this.currentImageIndex);
      if (newIndx !== -1) {
        this.setCurrentImageIndex(newIndx);
      } else {
        if (this.currentImageSetIndex < this.tInfo.getTrekImageSetCount()) {
          this.setCurrentImageSet(this.currentImageSetIndex);
        }
        else {
          if (this.tInfo.getTrekImageCount() > 0) {
            this.setCurrentImageSet(this.currentImageSetIndex - 1);
            this.setCurrentImageIndex(this.tInfo.trekImages[this.currentImageSetIndex].images.length - 1)
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

  render () {
    const tInfo = this.tInfo;
    tInfo.setUpdateMap(false);
    const { trekLogGreen, trekLogRed,
          } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const { navIcon } = this.props.uiTheme;
    const noPrev = !this.havePrevImage();
    const noNext = !this.haveNextImage();
    const imageSelectorWidth = 50;
    const cameraControlButtonSize = 72;
    const cameraControlIconSize = 48;
    const controlsColor = semitransWhite_8;
    const iWidth = Dimensions.get('window').width;
    const iHeight = Dimensions.get('window').height;
    const buttonBorderColor = semitransBlack_5;
    
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
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
        backgroundColor: semitransBlack_2, 
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: buttonBorderColor,
        borderRadius: cameraControlButtonSize/2,
      },
      imageSelectorArea: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "center",
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
        backgroundColor: semitransBlack_2, 
        borderRadius: imageSelectorWidth/2,
        borderStyle: "solid",
        borderWidth: 1,
      },
      imageBackground: {
        position: "absolute",
        right: imageSelectorWidth,
        left: imageSelectorWidth,
        top: 0,
        bottom: iHeight / 2,
        justifyContent: "center",
        alignItems: "center",
      },
      imageBackgroundMsg: {
        color: semitransBlack_9,
        fontSize: 18,
      },
      videoControlsArea: {
        position: "absolute",
        bottom: 10,
        left: 0,
        right: 0,
        height: cameraControlButtonSize + 60,
        justifyContent: "space-between",
      },
      videoControls: {
        height: cameraControlButtonSize + 10,
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
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
        backgroundColor: semitransBlack_5,
      },
      sliderText: {
        fontSize: 14,
        color: "white",
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
              permissionDialogMessage={'We need your permission to use your phone\'s camera'}
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
                    maximumTrackTintColor="rgba(255, 255, 102, .8)"
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
                <View style={{flex: 1}}>
                  {(this.currentImage.type === IMAGE_TYPE_PHOTO) &&
                    <ImageZoom 
                      ref={ref => { this.imageZoomRef = ref;}}
                      cropWidth={iWidth}
                      cropHeight={iHeight}
                      imageWidth={iWidth}
                      imageHeight={iHeight}
                      onClick={this.toggleShowVideoContols}
                    >
                      <Image source={{uri: this.currentImage.uri}} 
                        style={{flex:1}}
                      />
                    </ImageZoom>
                  }
                  {(this.currentImage.type === IMAGE_TYPE_VIDEO) &&
// @ts-ignore
                      <Video source={{uri: this.currentImage.uri}}      
                        ref={(ref) => { this.videoPlayerRef = ref }}    // Store reference
                        onLoad={this.videoLoaded} 
                        onEnd={this.videoEnded}
                        onProgress={this.newVideoPos}
                        onSeek={this.newVideoPos}
                        reportBandwidth={false}
                        // onError={this.videoError}               // Callback when video cannot be loaded
                        paused={this.videoPaused}
                        onTouchEnd={this.toggleShowVideoContols}
                        muted={this.audioMuted}
                        resizeMode="cover"
                        progressUpdateInterval={1500}
                        style={{flex: 1}} 
                      />
                  }
                  {((this.currentImage.type === IMAGE_TYPE_VIDEO) && this.showVideoControls) &&
                    <View style={styles.videoControlsArea}>
                      <View style={styles.videoControls}>
                        {this.audioMuted &&
                          <CameraControl icon={"Speaker"} onPress={this.toggleAudioMuted}/>
                        }
                        {!this.audioMuted &&
                          <CameraControl icon={"SpeakerOff"} onPress={this.toggleAudioMuted}/>
                        }
                        {this.videoPaused &&
                          <CameraControl icon={"Play"} onPress={this.toggleVideoPaused}/>
                        }
                        {!this.videoPaused &&
                          <CameraControl icon={"Pause"} onPress={this.toggleVideoPaused}/>
                        }
                      </View>
                      <View style={styles.sliderArea}>
                        <Text style={styles.sliderText}>
                          {this.props.utilsSvc.timeFromSeconds(this.currentVideoPos)}</Text>
                        <Slider
                          style={{flex: 1}}
                          step={1}
                          maximumTrackTintColor="rgba(255, 255, 102, .8)"
                          maximumValue={this.videoDuration}
                          onValueChange={this.setNewVideoPos}
                          value={this.currentVideoPos}
                        />                        
                        <Text style={styles.sliderText}>{this.videoDurationStr}</Text>
                      </View>
                    </View>
                  }
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
            </View>        
          </View>
        }
      </View>
    )   
  }
}

export default TrekImages;

