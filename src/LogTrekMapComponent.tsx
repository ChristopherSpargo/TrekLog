import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, TouchableNativeFeedback, Text } from 'react-native'
import { NavigationActions } from 'react-navigation';
import { observer, inject } from 'mobx-react'

import { TrekInfo } from './TrekInfoModel';
import TrekDisplay from './TrekDisplayComponent';
import NumbersBar, { NUMBERS_AREA_HEIGHT, TREK_LABEL_HEIGHT } from './NumbersBarComponent'
import { ModalModel } from './ModalModel'
import {LimitsObj} from './TrekLimitsComponent'
import { CONTROLS_HEIGHT, NAV_ICON_SIZE} from './App';
import TrekLogHeader from './TreklogHeaderComponent';
import { LocationSvc } from './LocationService';
import { LoggingSvc } from './LoggingService';
import IconButton from './IconButtonComponent';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'modalSvc', 'uiTheme', 'locationSvc', 'loggingSvc')
@observer
class LogTrekMap extends Component<{ 
  uiTheme ?: any,
  trekInfo ?: TrekInfo,
  modalSvc ?: ModalModel,
  locationSvc ?: LocationSvc,
  loggingSvc ?: LoggingSvc,
  navigation ?: any
}, {} > {

  trekInfo = this.props.trekInfo;
  glS = this.props.locationSvc;
  logSvc = this.props.loggingSvc;
  palette = this.props.uiTheme.palette;
  activeNav = '';
  limitProps : LimitsObj = {} as LimitsObj;

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};

    return {
      header: <TrekLogHeader titleText={params.title}
                                   icon={params.icon}
                                   logo
              />,
    };
  }  

  // Update the value of the statsOpen property
  updateStatsOpen = (status: boolean) => {
    this.trekInfo.setUpdateMap(true);
    this.trekInfo.setStatsOpen(status);
  }

  // respond to action from controls
  setActiveNav = (val) => {
    requestAnimationFrame(() =>{
      this.activeNav = val;
      switch(val){
        case 'Stats':
            this.updateStatsOpen(!this.trekInfo.statsOpen);   
          break;
        case 'DontShowMap':
          this.trekInfo.setShowMapInLog(false);
          this.updateStatsOpen(false);
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
    return {value: sp.substr(0, i), units: sp.substr(i)};
  }

  render () {

    const numPts = this.trekInfo.trekPointCount;
    const stopOk = this.trekInfo.timerOn || this.trekInfo.logging || this.trekInfo.limitsActive;
    const reviewOk = !stopOk && this.trekInfo.pendingReview;
    const statsHt = NUMBERS_AREA_HEIGHT + TREK_LABEL_HEIGHT;
    const mapBottom = (stopOk && this.trekInfo.statsOpen ? statsHt : 0) + CONTROLS_HEIGHT;
    const { controlsArea, navItem, navIcon } = this.props.uiTheme;
    const sdIcon = this.trekInfo.speedDialZoom ? "ZoomOutMap" : "Location";
    const sdValue = this.trekInfo.speedDialZoom ? "All" : "Current";
    const { navIconColor, highTextColor, trekLogBlue } = this.props.uiTheme.palette;
    const navIconSize = NAV_ICON_SIZE;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      shortStats: {
        height: CONTROLS_HEIGHT - 12,
        alignItems: "center",
        justifyContent: "center",
      },
      statPair: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      shortStat: {
        fontSize: 28,
        fontWeight: "300",
        color: highTextColor,
      },
    })

    const cBorder = this.trekInfo.statsOpen ? {borderTopColor: highTextColor} : {};

    return (
      <View style={[styles.container]}>
        <TrekDisplay 
          bottom={mapBottom} 
          layoutOpts={this.trekInfo.layoutOpts} 
          changeZoomFn={this.toggleSpeedDialZoom}
          speedDialIcon={sdIcon}
          speedDialValue={sdValue}
          changeMapFn={this.trekInfo.setDefaultMapType}
          useCameraFn={this.useCamera}
          showImagesFn={this.showCurrentImageSet}
        />
        <NumbersBar 
          bottom={CONTROLS_HEIGHT}
          open={this.trekInfo.statsOpen}
        />
        <View style={[controlsArea, cBorder]}>
          <IconButton 
            iconSize={navIconSize}
            icon="ArrowBack"
            style={navItem}
            iconStyle={navIcon}
            color={navIconColor}
            raised
            onPressFn={this.setActiveNav}
            onPressArg="DontShowMap"
          />
          {(numPts > 0 && !reviewOk) &&
            <View style={styles.shortStats}>
              <View style={styles.statPair}>
                <Text style={[styles.shortStat, {marginRight: 12}]}>{this.trekInfo.formattedDist()}</Text>
                <Text style={[styles.shortStat, {marginLeft: 12}]}>{this.trekInfo.formattedDuration()}</Text>
              </View>
              <View style={[styles.statPair, {justifyContent: "center"}]}>
                <Text style={[styles.shortStat]}>{this.formattedCurrentSpeed().value}</Text>
                <TouchableNativeFeedback
                    background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                    onPress={this.trekInfo.switchMeasurementSystem}>
                  <Text style={[styles.shortStat, {color: trekLogBlue}]}>{this.formattedCurrentSpeed().units}</Text>
                </TouchableNativeFeedback>
              </View>
            </View>
          }
          <IconButton 
            iconSize={navIconSize}
            icon={this.trekInfo.statsOpen ? 'ChevronDown' : 'ChevronUp'}
            style={navItem}
            raised
            iconStyle={navIcon}
            color={navIconColor}
            onPressFn={this.setActiveNav}
            onPressArg="Stats"
          />
        </View>
        {reviewOk &&
          <View style={[controlsArea, cBorder]}>
            <IconButton 
              iconSize={navIconSize}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="DontShowMap"
            />
            <IconButton 
              iconSize={navIconSize}
              icon={this.trekInfo.statsOpen ? 'ChevronDown' : 'ChevronUp'}
              style={navItem}
              iconStyle={navIcon}
              raised
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="Stats"
            />
          </View>
        }
      </View>
    )   
  }
}

export default LogTrekMap;

