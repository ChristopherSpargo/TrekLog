import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native'
import { NavigationActions } from 'react-navigation';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react'
import { BorderlessButton } from 'react-native-gesture-handler'

import TrekDisplay from './TrekDisplayComponent';
import { ModalModel } from './ModalModel'
import {LimitsObj} from './TrekLimitsComponent'
import { CONTROLS_HEIGHT, HEADER_ICON_SIZE, BACK_BUTTON_SIZE, BLACKISH, FOCUS_IMAGE_HEIGHT, IMAGE_ROW_Z_INDEX, INVISIBLE_Z_INDEX} from './App';
import { LocationSvc } from './LocationService';
import { LoggingSvc } from './LoggingService';
import { UtilsSvc } from './UtilsService';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages'
import { MainSvc, STEPS_APPLY, SWITCH_SPEED_STAT, SpeedStatType } from './MainSvc';
import { TrekSvc } from './TrekSvc';
import TrekImageListDisplay  from './TrekImageListDisplay';
import NavMenu from './NavMenuComponent';

const goBack = NavigationActions.back() ;

@inject('mainSvc', 'trekSvc', 'modalSvc', 'uiTheme', 'locationSvc', 'loggingSvc', 'utilsSvc')
@observer
class LogTrekMap extends Component<{ 
  uiTheme ?: any,
  trekSvc ?: TrekSvc,
  modalSvc ?: ModalModel,
  locationSvc ?: LocationSvc,
  loggingSvc ?: LoggingSvc,
  utilsSvc ?: UtilsSvc,
  mainSvc ?: MainSvc,
  navigation ?: any
}, {} > {

  @observable openNavMenu : boolean;


  mS = this.props.mainSvc;
  tS = this.props.trekSvc;
  glS = this.props.locationSvc;
  logSvc = this.props.loggingSvc;
  tI = this.logSvc.newTrek;
  logState = this.logSvc.logState;
  palette = this.props.uiTheme.palette[this.mS.colorTheme];
  activeNav = '';
  limitProps : LimitsObj = {} as LimitsObj;

  // show no header or status bar in this view
  static navigationOptions = () => {
    return {
      header: null,
      }
  }  

  componentWillUnmount() {
    this.logSvc.setShowMapInLog(false);
  }

  componentWillMount() {
    this.mS.setAppReady(true);
    if(this.mS.layoutOpts === 'Open'){
      this.toggleSpeedDialZoom(this.mS.speedDialZoomedIn ? 'All' : 'Current', true);
    } else {
      this.logSvc.setLayoutOpts(this.mS.speedDialZoomedIn ? 'Current' : 'All')
    }
  }

    // initialize all the observable properties in an action for mobx strict mode
    @action
    initializeObservables = () => {
      this.setOpenNavMenu(false);
    }
  
  // respond to action from controls
  setActiveNav = (val) => {
    requestAnimationFrame(() =>{
      this.activeNav = val;
      switch(val){
        case 'Stop':
          this.logSvc.setLoggingState('Request Stop');
        case 'DontShowMap':
          this.props.navigation.dispatch(goBack);
          break;
        case 'UseCamera':
          this.useCamera();
          break;
        case 'ImageDisplay':
          this.logSvc.setAllowImageDisplay(!this.logState.allowImageDisplay);
          if(this.logState.allowImageDisplay){
            this.mS.setShowMapControls(true);
          }
          break;
        default:
      }
    });
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  // open the camera component
  useCamera = () => {
    this.props.navigation.navigate({
      routeName: 'Images', 
      params:  {cmd: 'camera', 
                trek: this.tI},
      key: 'Key-Images'
    });
  }

  // show the images for the selected image marker
  showSelectedImageSet = (index: number) => {
    this.logSvc.setCurrentDisplayImageSet(index);
    this.logSvc.setAllowImageDisplay(true);
    this.mS.setShowMapControls(true);
  }

  // toggle the value of the speedDialZoomedIn property
  toggleSpeedDialZoom = (val: string, toggle = true) => {
    if (toggle) { this.mS.setSpeedDialZoomedIn(!this.mS.speedDialZoomedIn); }
    this.logSvc.setLayoutOpts(val);
  }

  formattedSpeedStat = () => {
    let spStr : string;
    let i : number;
    switch (this.tI.showSpeedStat) {
      case 'time':
        spStr = this.tI.timePerDist;
        i = spStr.indexOf("/");
        return { value: spStr.substr(0, i), units: "", label: " " + spStr.substr(i) };
      case 'speedAvg':
        spStr = this.tI.averageSpeed;
        i = spStr.indexOf(" ");
        return { value: spStr.substr(0, i), units: "", label: " avg" + spStr.substr(i) };
      case 'speedNow':
        spStr = this.tI.speedNow;
        i = spStr.indexOf(" ");
        return { value: spStr.substr(0, i), units: "", label: spStr.substr(i) };
      default:
      return { value: 'N/A', units: '', label: "" };
    }
  }

  formattedSteps = () => {
    let st = this.tS.formattedSteps(this.tI, this.tI.showStepsPerMin);
    if(this.tI.showStepsPerMin){ st = st.substr(0, st.indexOf(' ')); }
    return {value: st, units: '', label: this.tI.showStepsPerMin ? ' Steps/Min' : ' Steps'};
  }

  formattedDist = () => {
    let d = this.mS.formattedDist(this.logSvc.newTrek.trekDist);
    let i = d.indexOf(' ');
    return {value: d.substr(0, i), units: d.substr(i), label: 'Distance'};
  }

  // toggle between displaying total steps and steps/min
  toggleShowStepsPerMin = () => {
    this.tS.updateShowStepsPerMin(this.tI, !this.tI.showStepsPerMin);
  }

  // toggle between displaying speed now and average speed
  toggleShowSpeedStat = () => {
    this.tS.updateShowSpeedStat(this.logSvc.newTrek, SWITCH_SPEED_STAT[this.tI.showSpeedStat] as SpeedStatType);
  }

  // call the main switchMeasurementSystem function then update the calculated values for this trek
  switchMeasurementSystem = () => {
    this.mS.switchMeasurementSystem();
    this.tS.updateCalculatedValues(this.tI, this.logState.timerOn, true);
  }

  // show the selected trek image
  showTrekImage = (set: number, image = 0) => {
    let title = this.tS.formatImageTitle(this.tI, set, image);
    this.props.navigation.navigate({
      routeName: "Images", 
      params: {cmd: 'show', 
               setIndex: set, 
               imageIndex: image, 
               title: title,
               saveAfterEdit: false,
               trek: this.tI
      }, 
      key: 'Key-Images'
    });
  }

  render () {

    const haveImages = this.tS.getTrekImageSetCount(this.tI) > 0;
    const numPts = this.logState.trekPointCount;
    const stopOk = this.logState.timerOn || this.logState.logging || this.logState.limitsActive;
    const reviewOk = !stopOk && this.logState.pendingReview;
    const mapBottom = 0;
    const { controlsArea, fontRegular, fontBold, roundedTop, roundedBottom,
            trekImageRow } = this.props.uiTheme;
    const sdIcon = this.mS.speedDialZoomedIn ? "ZoomOutMap" : "Location";
    const sdValue = this.mS.speedDialZoomedIn ? "All" : "Current";
    const { highTextColor, trekLogBlue, matchingMask_7, rippleColor,
            trackingStatsBackgroundHeader
          } = this.palette;
    const semiTrans = matchingMask_7;
    const distItem = this.formattedDist();
    const speedItem = this.formattedSpeedStat();
    const stepsItem = this.formattedSteps();
    const bgBottom = (numPts > 0 && !reviewOk) ? semiTrans : "transparent";
    const imageRowBottom = reviewOk ? 3 : CONTROLS_HEIGHT - 7;
    const reviewTracking = reviewOk && this.logState.trackingObj;
    const trekImageHeight = CONTROLS_HEIGHT;
    const trekImageWidth = trekImageHeight * .75;
    const focusImageHeight = FOCUS_IMAGE_HEIGHT;
    const focusImageWidth = focusImageHeight * .75;
    const showControls = this.mS.showMapControls;
    const idLabel = this.logState.allowImageDisplay ? 'Hide Images' : 'Show Images';
    const idIcon = this.logState.allowImageDisplay ? 'CameraOff' : 'Camera';

    let navMenuItems = 
    [ {label: 'Logging Options', 
      submenu: [{icon: 'CheckeredFlag', color: BLACKISH, label: 'Finish', value: 'Stop'},
                {icon: 'Camera', label: 'Use Camera', value: 'UseCamera'},
                {icon: 'ArrowBack', label: 'Stats View', value: 'DontShowMap'}]},
      {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'} 
    ];

    if (haveImages){
      navMenuItems[0].submenu.push( {icon: idIcon, label: idLabel, value: 'ImageDisplay'} );
    }

  const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      stats: {
        flexDirection: "row",
        alignItems: "center",
      },
      statGroup: {
        flex: 1,
        height: CONTROLS_HEIGHT - 12,
        alignItems: "center",
        justifyContent: "center",
      },
      statGroupStat: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
      },
      shortStat: {
        fontSize: 24,
        fontFamily: fontBold,
        color: highTextColor,
        marginBottom: 5,
      },
      bigStat: {
        fontSize: 44,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      caAdjust: {
        justifyContent: "flex-start",
        height: CONTROLS_HEIGHT - 10,
        marginLeft: 5,
        marginRight: 5,
      },
      caBottom: {
        backgroundColor: bgBottom,
        ...roundedTop
      },
      caTop: {
        top: 0,
        height: CONTROLS_HEIGHT,
        backgroundColor: reviewTracking ? trackingStatsBackgroundHeader : semiTrans,
        bottom: undefined,
        ...roundedBottom
      },
      backButtonArea: {
        width: 56, 
        height: 56, 
        marginRight: 0,
        justifyContent: "center", 
        alignItems: "center",
      },
      backButtonTarget: {
        width: HEADER_ICON_SIZE + 5,
        height: HEADER_ICON_SIZE + 5,
        borderRadius: (HEADER_ICON_SIZE + 5) / 2,
        alignItems: "center",
        justifyContent: "center",
      },
      imageRowAdj: {
        bottom: imageRowBottom,
        zIndex: haveImages ? IMAGE_ROW_Z_INDEX : INVISIBLE_Z_INDEX
      },
      trekImage: {
        width: trekImageWidth+2,
        height: trekImageHeight+2,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: matchingMask_7,
        marginRight: 3,
        marginTop: 10,
      },
      focusImage: {
        width: focusImageWidth+2,
        height: focusImageHeight+2,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: matchingMask_7,
        marginRight: 3,
      },
  })

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        locked={false}
        open={this.openNavMenu}> 
        <View style={[styles.container]}>
          <TrekDisplay
            trek={this.tI} 
            displayMode="normal"
            showControls={showControls}
            pathToCurrent={this.logSvc.newTrek.pointList}
            pathLength={this.logState.trekPointCount}
            bottom={mapBottom} 
            layoutOpts={this.mS.layoutOpts} 
            changeZoomFn={this.toggleSpeedDialZoom}
            mapType={this.mS.currentMapType}
            mapPitch={this.mS.mapViewPitch}
            speedDialIcon={sdIcon}
            speedDialValue={sdValue}
            changeMapFn={this.mS.setDefaultMapType}
            useCameraFn={this.useCamera}
            showImagesFn={this.showSelectedImageSet}
            timerType={'Log'}
            trackingPath={this.logState.trackingObj ? this.logState.trackingObj.path : undefined}
            trackingMarker={this.logState.trackingMarkerLocation}

            // the following lines will show the tracking status bar here on the map display page.
            // unfortunately, there seems to be a high cost to displaying it and the one on the main page.
            
            // trackingDiffDist={this.trekInfo.trackingDiffDist}
            // trackingDiffDistStr={this.trekInfo.trackingDiffDistStr}
            // trackingDiffTime={this.trekInfo.trackingDiffTime}
            // trackingDiffTimeStr={this.trekInfo.trackingDiffTimeStr}
            // trackingHeader={this.trekInfo.trackingObj ? this.trekInfo.trackingObj.header : undefined}
            // trackingTime={this.trekInfo.trackingObj ? this.trekInfo.trackingObj.goalTime : undefined}
          />
          <View style={[controlsArea, styles.caAdjust, styles.caTop]}>
            {(numPts > 0) &&
              <View style={styles.stats}>
                <View style={styles.backButtonArea}>
                  <SvgButton
                    style={styles.backButtonTarget}
                    onPressFn={() => this.setActiveNav('DontShowMap')}
                    size={BACK_BUTTON_SIZE - 10}
                    fill={highTextColor}
                    path={APP_ICONS.ArrowBack}
                  />
                </View>
                <View style={[styles.statGroupStat, {flex: 1.6, justifyContent: "flex-start"}]}>
                    <Text style={[styles.bigStat, {fontSize: 56}]}>
                        {this.mS.formattedDuration(this.logSvc.newTrek.duration)}
                    </Text>
                </View>
                <BorderlessButton
                    rippleColor={rippleColor}
                    style={{flex: 1}}
                    onPress={this.switchMeasurementSystem}>
                  <View style={styles.statGroupStat}>
                      <Text style={styles.bigStat}>
                        {this.props.utilsSvc.zeroSuppressedValue(distItem.value)}</Text>
                      <Text style={[styles.shortStat, {color: trekLogBlue}]}>{distItem.units}</Text>
                  </View>   
                </BorderlessButton>          
              </View>
            }
          </View>
          <View style={[controlsArea, styles.caAdjust, styles.caBottom]}>
            {(numPts > 0 && !reviewOk) &&
              <View style={styles.stats}>
                    <BorderlessButton
                      style={{flex: 1}}
                      rippleColor={rippleColor}
                      onPress={this.toggleShowSpeedStat}>
                      <View style={[styles.statGroupStat, {flex: 0}]}>
                        <Text style={styles.bigStat}>
                        {this.props.utilsSvc.zeroSuppressedValue(speedItem.value)}</Text>
                        <Text style={[styles.shortStat, {color: trekLogBlue}]}>{speedItem.label}</Text>
                      </View>
                    </BorderlessButton>
                  {STEPS_APPLY[this.logSvc.newTrek.type] && 
                    <BorderlessButton
                      style={{flex: 1}}
                      rippleColor={rippleColor}
                      onPress={this.toggleShowStepsPerMin}>
                      <View style={[styles.statGroupStat, {flex: 0}]}>
                        <Text style={styles.bigStat}>
                          {this.props.utilsSvc.zeroSuppressedValue(stepsItem.value)}</Text>
                        <Text style={[styles.shortStat, {color: trekLogBlue}]}>{stepsItem.label}</Text>
                      </View>
                    </BorderlessButton>
                }
              </View>
            }
          </View>
          {showControls && this.logState.allowImageDisplay &&
            <View style={{...trekImageRow, ...styles.imageRowAdj}}>
              <TrekImageListDisplay
                tInfo={this.tI}
                trekId={this.tI.sortDate}
                imageCount={this.tI.trekImageCount}
                imageSetIndex={this.logState.currentDisplayImageSet}
                imageStyle={styles.trekImage}
                focusImageStyle={styles.focusImage}
                showImagesFn={this.showTrekImage}
                showImages={this.logState.allowImageDisplay}
              />
            </View>
          }
        </View>
      </NavMenu>
    )   
  }
}

export default LogTrekMap;

