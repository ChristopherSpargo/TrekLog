import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native'
import { NavigationActions } from 'react-navigation';
import { observer, inject } from 'mobx-react'
import { BorderlessButton } from 'react-native-gesture-handler'

import { TrekInfo, STEPS_APPLY } from './TrekInfoModel';
import TrekDisplay from './TrekDisplayComponent';
import { ModalModel } from './ModalModel'
import {LimitsObj} from './TrekLimitsComponent'
import { CONTROLS_HEIGHT, HEADER_ICON_SIZE, BACK_BUTTON_SIZE} from './App';
import { LocationSvc } from './LocationService';
import { LoggingSvc } from './LoggingService';
import { UtilsSvc } from './UtilsService';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages'

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'modalSvc', 'uiTheme', 'locationSvc', 'loggingSvc', 'utilsSvc')
@observer
class LogTrekMap extends Component<{ 
  uiTheme ?: any,
  trekInfo ?: TrekInfo,
  modalSvc ?: ModalModel,
  locationSvc ?: LocationSvc,
  loggingSvc ?: LoggingSvc,
  utilsSvc ?: UtilsSvc,
  navigation ?: any
}, {} > {


  trekInfo = this.props.trekInfo;
  glS = this.props.locationSvc;
  logSvc = this.props.loggingSvc;
  palette = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
  activeNav = '';
  limitProps : LimitsObj = {} as LimitsObj;

  // show no header or status bar in this view
  static navigationOptions = () => {
    return {
      header: null,
      }
  }  

  componentWillUnmount() {
    this.trekInfo.setShowMapInLog(false);
  }

  componentWillMount() {
    if(this.trekInfo.layoutOpts === 'Open'){
      this.toggleSpeedDialZoom(this.trekInfo.speedDialZoom ? 'All' : 'Current', true);
    } else {
      this.logSvc.setLayoutOpts(this.trekInfo.speedDialZoom ? 'Current' : 'All')
    }
  }
  // respond to action from controls
  setActiveNav = (val) => {
    requestAnimationFrame(() =>{
      this.activeNav = val;
      switch(val){
        case 'DontShowMap':
          this.props.navigation.dispatch(goBack);
          break;
        default:
      }
    });
  }

  // open the camera component
  useCamera = () => {
    this.props.navigation.navigate('Images', {cmd: 'camera'});
  }

  // show the images for the selected image marker
  showCurrentImageSet = (index: number) => {
    this.props.navigation.navigate('Images', {icon: '*', cmd: 'show', setIndex: index});
  }

  // toggle the value of the speedDialZoom property
  toggleSpeedDialZoom = (val: string, toggle = true) => {
    if (toggle) { this.trekInfo.setSpeedDialZoom(!this.trekInfo.speedDialZoom); }
    this.logSvc.setLayoutOpts(val);
  }

  formattedCurrentSpeed = () => {
    let sp = this.trekInfo.formattedCurrentSpeed() as string;
    let i = sp.indexOf(' ');
    return {value: sp.substr(0, i), units: sp.substr(i), label: 'Speed Now'};
  }

  formattedSteps = () => {
    let st = this.trekInfo.formattedSteps(this.trekInfo.showStepsPerMin);
    if(this.trekInfo.showStepsPerMin){ st = st.substr(0, st.indexOf(' ')); }
    return {value: st, units: '', label: this.trekInfo.showStepsPerMin ? ' Steps/Min' : ' Steps'};
  }

  formattedDist = () => {
    let d = this.trekInfo.formattedDist();
    let i = d.indexOf(' ');
    return {value: d.substr(0, i), units: d.substr(i), label: 'Distance'};
  }

  // toggle between displaying total steps and steps/min
  toggleShowStepsPerMin = () => {
    this.trekInfo.updateShowStepsPerMin(!this.trekInfo.showStepsPerMin);
  }

  render () {

    const numPts = this.trekInfo.trekPointCount;
    const stopOk = this.trekInfo.timerOn || this.trekInfo.logging || this.trekInfo.limitsActive;
    const reviewOk = !stopOk && this.trekInfo.pendingReview;
    const mapBottom = 0;
    const { controlsArea, fontRegular, fontBold } = this.props.uiTheme;
    const sdIcon = this.trekInfo.speedDialZoom ? "ZoomOutMap" : "Location";
    const sdValue = this.trekInfo.speedDialZoom ? "All" : "Current";
    const { highTextColor, trekLogBlue, matchingMask_7, rippleColor,
            trackingStatsBackgroundHeader 
          } = this.palette;
    const semiTrans = matchingMask_7;
    const distItem = this.formattedDist();
    const speedItem = this.formattedCurrentSpeed();
    const stepsItem = this.formattedSteps();
    const bgBottom = (numPts > 0 && !reviewOk) ? semiTrans : "transparent"
    const reviewTracking = reviewOk && this.trekInfo.trackingObj;

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
      },
      caBottom: {
        backgroundColor: bgBottom,
      },
      caTop: {
        top: 0,
        height: CONTROLS_HEIGHT,
        backgroundColor: reviewTracking ? trackingStatsBackgroundHeader : semiTrans,
        bottom: undefined,
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
  })

    return (
      <View style={[styles.container]}>
        <TrekDisplay 
          displayMode="normal"
          pathToCurrent={this.trekInfo.pointList}
          pathLength={this.trekInfo.trekPointCount}
          bottom={mapBottom} 
          layoutOpts={this.trekInfo.layoutOpts} 
          changeZoomFn={this.toggleSpeedDialZoom}
          mapType={this.trekInfo.currentMapType}
          speedDialIcon={sdIcon}
          speedDialValue={sdValue}
          changeMapFn={this.trekInfo.setDefaultMapType}
          useCameraFn={this.useCamera}
          showImagesFn={this.showCurrentImageSet}
          trackingPath={this.trekInfo.trackingObj ? this.trekInfo.trackingObj.path : undefined}
          trackingMarker={this.trekInfo.trackingMarkerLocation}
          trackingDiffDist={this.trekInfo.trackingDiffDist}
          trackingDiffTime={this.trekInfo.trackingDiffTime}
          timerType={'Log'}
          trackingHeader={this.trekInfo.trackingObj ? this.trekInfo.trackingObj.header : undefined}
          trackingTime={this.trekInfo.trackingObj ? this.trekInfo.trackingObj.goalValue : undefined}
        />
        <View style={[controlsArea, styles.caAdjust, styles.caTop]}>
          {(numPts > 0) &&
            <View style={styles.stats}>
              <View style={styles.backButtonArea}>
                <SvgButton
                  style={styles.backButtonTarget}
                  onPressFn={() => this.setActiveNav('DontShowMap')}
                  borderWidth={0}
                  size={BACK_BUTTON_SIZE}
                  fill={highTextColor}
                  path={APP_ICONS.ArrowBack}
                />
              </View>
              <View style={[styles.statGroupStat, {flex: 1.6, justifyContent: "flex-start"}]}>
                  <Text style={[styles.bigStat, {fontSize: 56}]}>{this.trekInfo.formattedDuration()}</Text>
              </View>
              <BorderlessButton
                  rippleColor={rippleColor}
                  style={{flex: 1}}
                  onPress={this.trekInfo.switchMeasurementSystem}>
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
                {/* <BorderlessButton
                  rippleColor={rippleColor}
                  style={{flex: 1}}
                  onPress={this.trekInfo.switchMeasurementSystem}> */}
                  <View style={styles.statGroupStat}>
                    <Text style={styles.bigStat}>
                    {this.props.utilsSvc.zeroSuppressedValue(speedItem.value)}</Text>
                    <Text style={styles.shortStat}>{speedItem.units}</Text>
                  </View>
                {/* </BorderlessButton> */}
                {STEPS_APPLY[this.trekInfo.type] && 
                  <BorderlessButton
                    style={{flex: 1.3}}
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
      </View>
    )   
  }
}

export default LogTrekMap;

