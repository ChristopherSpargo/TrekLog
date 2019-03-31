import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, Image, Alert, Dimensions, 
          CameraRoll, Slider, TouchableWithoutFeedback } from 'react-native';
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

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'uiTheme', 'utilsSvc', 'modalSvc', 'toastSvc')
@observer
class TrekImages extends Component<{
  uiTheme ?: any,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  trekInfo ?: TrekInfo,
  toastSvc ?: ToastModel,
  navigation ?: any
}, {} > {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};
    const cmd = params.cmd;

    switch (cmd) {
        // return {
        //   header: <TrekLogHeader titleText={params.title || 'Take Image'}
        //                               icon={params.icon || ''}
        //               />
        // }
      case 'show':
        return {
          header: <TrekLogHeader titleText={params.title || ''}
                                      icon={params.icon || ''}
                                      headerRightIcon="Delete"
                                      headerRightFn={params.deleteImage}
                                      backButtonFn={() =>  navigation.dispatch(goBack)}
                  />
        }
      case 'camera':
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
  // _panResponder : any;

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


  constructor(props) {
    super(props);
}

  componentWillMount() {
    let cmd = this.props.navigation.getParam('cmd');

    this.mode = cmd;
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setCurrentImageSet(-1);
    this.setFrontOrBackCamera(RNCamera.Constants.Type.back)
    this.setCameraZoom(0);
    this.setVideoPaused(false);
    this.setAudioMuted(false);
    this.setShowVideoControls(true);
    this.setCurrentVideoPos(0);
    this.setVideoDuration(0);

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

  //   this._panResponder = PanResponder.create({
  //     onStartShouldSetPanResponder: (evt, gestureState) => true,
  //     onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
  //     onMoveShouldSetPanResponder: (evt, gestureState) => true,
  //     onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
  //     onPanResponderTerminationRequest: (evt, gestureState) => true,
  //     onShouldBlockNativeResponder: (evt, gestureState) => false,
  //     onPanResponderMove: (evt, gestureState) => { this.handleSwipe(evt, gestureState); },
  //   });  
  }

  componentWillUnmount() {
    this.setCameraIsOpen(false);
    this.setVideoRecording(false);
    this.setPicturePaused(false);
    this.setDisplayingImage(false);
    this.setVideoPaused(true);
    this.currentImageSet = undefined;
  }
  
  // handleSwipe = (evt, gestureState) => {
  //   // Add the gesture detection.
  //   const velocityThreshold = 0.4;
  //   const directionalOffsetThreshold = 80;
  //   const swipeDirection = getGestureType(gestureState, velocityThreshold, directionalOffsetThreshold);

  //   switch(swipeDirection){
  //     case 'SWIPE_LEFT':
  //       if (this.haveNextImage()) {
  //         this.nextImage();
  //       }
  //       break;
  //     case 'SWIPE_RIGHT':
  //       if (this.havePrevImage()) {
  //         this.prevImage();
  //       }
  //       break;
  //     default:
  //   }
  // }

  // set the value of the openCamera property
  @action
  setCameraIsOpen = (status: boolean) => {
    this.cameraIsOpen = status;
  }

  // open the camera component
  openCamera = () => {
    this.setCameraIsOpen(true);
    this.cameraData = undefined;
  }

  // close the camera component
  closeCamera = () => {
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
      this.currentImage = this.currentImageSet.images[val];
      let imageType = IMAGE_TYPE_INFO[this.currentImage.type].name;
      let title = imageType;
      if (this.currentImage.time){
        title += ' at ' +  this.props.utilsSvc.formatTime(this.currentImage.time);
      }
      this.props.navigation.setParams({title: title});
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
    if (!this.showVideoControls) {
      this.props.navigation.setParams({cmd: 'hide'});
    }
    else {
      this.props.navigation.setParams({cmd: this.mode});
    }
  }

  // the user touched the video display screen
  toggleShowVideoContols = () => {
    this.setShowVideoControls(!this.showVideoControls);
  }

  // respond to onLoad video event
  videoLoaded = (data) => {
    this.setVideoDuration(data.duration);
    this.videoDurationStr = this.props.utilsSvc.timeFromSeconds(data.duration);
    this.setVideoPaused(true);
    if (this.videoPlayerRef) { this.videoPlayerRef.seek(0); }
  }

  // respond to onEnd video event
  videoEnded = () => {
    this.setVideoPaused(true);
    if(this.videoPlayerRef) { this.videoPlayerRef.seek(0); }
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
        const options = {quality: RNCamera.Constants.VideoQuality["1080p"]};
        this.imageType = IMAGE_TYPE_VIDEO;
        this.imageTime = new Date().getTime();
        this.camera.recordAsync(options)
        .then((data) => {
          this.cameraData = data;
          this.setPicturePaused(true);
          // this.handlePicture(this.cameraData, IMAGE_TYPE_VIDEO, this.tInfo.lastPoint());
          // this.closeCamera();
        })
        .catch((err) => {
          Alert.alert('Video Error', err);
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
    // Alert.alert('Picture URI', data.uri)
    CameraRoll.saveToCameraRoll(data.uri)
    .then((uri) => {
      this.tInfo.addTrekImage(uri, data.deviceOrientation, type, loc.l, this.imageTime);
      this.props.toastSvc.toastOpen({tType: 'Info', content: IMAGE_TYPE_INFO[type].name + ' saved'});
      this.resumeCameraPreview();
    })
    .catch((error) => {
      alert(error)
      this.props.toastSvc.toastOpen({tType: 'Error',content: 'Error saving ' + IMAGE_TYPE_INFO[type].name, time: 3000});
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
    const {  mediumTextColor, trekLogGreen, trekLogRed } = this.props.uiTheme.palette;
    const noPrev = !this.havePrevImage();
    const noNext = !this.haveNextImage();
    const imageSelectorWidth = 50;
    const cameraControlButtonSize = 72;
    const cameraControlIconSize = 48;
    const controlsColor = "rgba(211,211,211,.6)";
    const iWidth = Dimensions.get('window').width;
    const iHeight = Dimensions.get('window').height;
    
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
      cameraControlShadow: {
        width: cameraControlButtonSize + 4,
        height: cameraControlButtonSize + 4,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,.0)", 
        borderRadius: (cameraControlButtonSize + 4)/2,
      },
      cameraControlButtonStyle: {
        width: cameraControlButtonSize,
        height: cameraControlButtonSize,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,.5)", 
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "rgba(0,51,153,.6)",
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
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorNext: {
        position: "absolute",
        right: 10,
        width: imageSelectorWidth,
        height: imageSelectorWidth,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorIconStyle: {
        backgroundColor: "rgba(0,0,0,.6)", 
        borderRadius: imageSelectorWidth/2,
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
        color: mediumTextColor,
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
        backgroundColor: "rgba(0,0,0,.5)",
      },
      sliderText: {
        fontSize: 14,
        color: "white",
      },
    })

    const CameraControl = ({icon, onPress, iSize = cameraControlIconSize, color = controlsColor, 
                            shStyle = {} as any, ccStyle = {} as any}) => {
      return (  
        <View style={[styles.cameraControlShadow, shStyle]}>
          <View style={[styles.cameraControlButtonStyle, ccStyle]}>
            <IconButton 
              iconSize={iSize}
              icon={icon}
              color={color}
              onPressFn={onPress}
            />
          </View>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        {(this.cameraIsOpen) &&
            <View style={[styles.container]}>
            <RNCamera
              ref={ref => { this.camera = ref;}}
              style={styles.cameraArea}
              type={this.frontOrBackCamera}
              zoom={this.cameraZoom}
              flashMode={RNCamera.Constants.FlashMode.off}
              permissionDialogTitle={'Permission to use camera'}
              permissionDialogMessage={'We need your permission to use your camera phone'}
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
                <CameraControl icon={"Delete"} color={trekLogRed} shStyle={{backgroundColor: "rgba(255,255,255,.4)"}}
                              onPress={this.picturePaused ? this.resumeCameraPreview : this.closeCamera}/>
              }
              {this.picturePaused &&
                <CameraControl icon={"CheckMark"} color={trekLogGreen} 
                        shStyle={{backgroundColor: "rgba(255,255,255,.4)"}} onPress={this.keepThisImage}/>
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
                      <Video source={{uri: this.currentImage.uri}}      
                        ref={(ref) => { this.videoPlayerRef = ref }}    // Store reference
                        onLoad={this.videoLoaded} 
                        onEnd={this.videoEnded}
                        onProgress={this.newVideoPos}
                        onSeek={this.newVideoPos}
                        // onError={this.videoError}               // Callback when video cannot be loaded
                        paused={this.videoPaused}
                        onTouchEnd={this.toggleShowVideoContols}
                        muted={this.audioMuted}
                        resizeMode="cover"
                        progressUpdateInterval={1000}
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
                          maximumValue={this.videoDuration}
                          onValueChange={this.setNewVideoPos}
                          value={this.currentVideoPos}
                        />                        
                        <Text style={styles.sliderText}>{this.videoDurationStr}</Text>
                      </View>
                    </View>
                  }
                  {((this.currentImage.type !== IMAGE_TYPE_VIDEO) || this.videoPaused) && 
                    <View style={styles.imageSelectorArea}>
                      {!noPrev &&
                        <View style={styles.imageSelectorPrev}>
                          <IconButton 
                            iconSize={imageSelectorWidth}
                            icon="ChevronLeft"
                            color={controlsColor}
                            iconStyle={styles.imageSelectorIconStyle}
                            onPressFn={this.prevImage}
                          />
                        </View>
                      }
                      {!noNext &&
                        <View style={styles.imageSelectorNext}>
                          <IconButton
                            iconSize={imageSelectorWidth}
                            icon="ChevronRight"
                            color={controlsColor}
                            iconStyle={styles.imageSelectorIconStyle}
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

