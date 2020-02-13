import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, Image, Dimensions, 
         Slider } from 'react-native';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import ImageZoom from 'react-native-image-pan-zoom';
import Video from 'react-native-video';

import { IMAGE_TYPE_VIDEO, TrekImageType } from './ImageService';
import { UtilsSvc, SortDate } from './UtilsService';
import IconButton from './IconButtonComponent';
import { semitransBlack_2, semitransWhite_8, semitransBlack_5,
       } from './App';
import { MainSvc } from './MainSvc';
import { TrekSvc } from './TrekSvc';

@inject('trekSvc', 'uiTheme', 'utilsSvc', 'mainSvc')
@observer
class ImageView extends Component<{
  imageUri ?: string,           // uri of image to be displayed
  imageType ?: TrekImageType,   // type of image IMAGE_TYPE_PHOTO or IMAGE_TYPE_VIDEO
  imageDate ?: SortDate,          // SortDate of image (for date & time display)
  imageLabel ?: string,         // Label to show on the image
  imageNote ?: string,          // Note to show on the image
  showNote ?: boolean,          // control for showing the note or not
  imageWidth ?: number,
  imageHeight ?: number,
  clearTimeoutFn ?: Function,   // function to call when image loads
  setShowVideoControlsFn ?: Function, // call to propogate toggleShowControls
  uiTheme ?: any,
  utilsSvc ?: UtilsSvc,
  trekSvc ?: TrekSvc,
  mainSvc ?: MainSvc,
  navigation ?: any
}, {} > {

  mS = this.props.mainSvc;
  tS = this.props.trekSvc;

  imageZoomRef      : any;
  videoPlayerRef    : any;
  videoDurationStr  : string;
  timeoutID         : number;

  @observable picturePaused           : boolean;
  @observable displayingImage         : boolean;
  @observable audioMuted              : boolean;
  @observable videoPaused             : boolean;
  @observable videoLoaded             : boolean;
  @observable showVideoControls       : boolean;
  @observable currentVideoPos         : number;
  @observable videoDuration           : number;


  componentDidMount() {
    this.resetImageZoom();
    this.setShowVideoControls(true);
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

  // image loaded successfully, clear timeoud and loading message
  clearImageBackgroundTextTimeout = () => {
    if(this.props.clearTimeoutFn) {
      this.props.clearTimeoutFn();
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
    if(this.props.setShowVideoControlsFn){ this.props.setShowVideoControlsFn(status)}
    this.cancelHideControlsTimer();
  }

  // the user touched the video display screen
  toggleShowVideoContols = () => {

    if (this.props.imageType === IMAGE_TYPE_VIDEO) {
      if (this.videoPaused){

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

  render () {
    const { pageBackground, matchingMask_8, highTextColor
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { navIcon, fontRegular, fontBold } = this.props.uiTheme;
    const cameraControlButtonSize = 72;
    const cameraControlIconSize = 48;
    const controlsColor = "black";
    const cWidth = Dimensions.get('window').width;
    const cHeight = Dimensions.get('window').height;
    const iHeight = (this.props.imageWidth !== undefined)
                    ? cWidth * (this.props.imageHeight / this.props.imageWidth)
                    : cHeight;
    const buttonBorderColor = semitransBlack_5;
    const imageTime = this.tS.formatImageTime(this.props.imageDate);
    const imageIsVideo = this.props.imageType === IMAGE_TYPE_VIDEO;
    
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
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
      cameraControlButtonStyle: {
        width: cameraControlButtonSize,
        height: cameraControlButtonSize,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: semitransWhite_8, 
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: buttonBorderColor,
        borderRadius: cameraControlButtonSize/2,
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
        backgroundColor: semitransWhite_8,
      },
      sliderText: {
        fontSize: 14,
        fontFamily: fontBold,
        color: "black",
      },
      imageLabelArea: {
        position: "absolute",
        top: 10,
        left:0,
        right: 0,
        zIndex: 100,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: matchingMask_8,
      },
      imageLabelText: {
        fontFamily: fontRegular,
        fontSize: 24,
        color: highTextColor,
      },
      imageNote: {
        flexWrap: "wrap",
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: 10,
      },
      noteText: {
        fontFamily: fontRegular,
        fontSize: 20,
        color: highTextColor,
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
      <View style={{flex: 1}}>
        {(imageTime || this.props.imageLabel) && (this.showVideoControls) &&
          <View style={styles.imageLabelArea}>
            {(imageTime !== undefined) &&
              <View>
                <Text style={styles.imageLabelText}>{imageTime}</Text>
              </View>
            }
            {(this.props.imageLabel !== undefined) &&
              <View>
                <Text style={styles.imageLabelText}>{this.props.imageLabel}</Text>
              </View>
            }
            {this.props.showNote && (this.props.imageNote !== undefined) &&
              <View style={styles.imageNote}>
                <Text style={styles.noteText}>{this.props.imageNote}</Text>
              </View>
            }
          </View>
        }
        {(!imageIsVideo) &&
          <ImageZoom 
            ref={ref => { this.imageZoomRef = ref;}}
            cropWidth={cWidth}
            cropHeight={cHeight}
            imageWidth={cWidth}
            imageHeight={iHeight}
            onClick={this.toggleShowVideoContols}
          >
            <Image source={{uri: this.props.imageUri}} 
              style={{flex:1}}
              onLoad={this.clearImageBackgroundTextTimeout}
            />
          </ImageZoom>
        }
        {(imageIsVideo) &&
// @ts-ignore
          <Video source={{uri: this.props.imageUri}}      
            ref={(ref) => { this.videoPlayerRef = ref }}    // Store reference
            onLoad={this.videoLoad} 
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
            style={this.videoLoaded ? {flex: 1} : undefined} 
          />
        }
        {((imageIsVideo && this.videoLoaded) 
            && this.showVideoControls) &&
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
                maximumTrackTintColor={semitransBlack_5}
                maximumValue={this.videoDuration}
                onValueChange={this.setNewVideoPos}
                value={this.currentVideoPos}
              />                        
              <Text style={styles.sliderText}>{this.videoDurationStr}</Text>
            </View>
          </View>
        }
      </View>
    )   
  }
}

export default ImageView;

