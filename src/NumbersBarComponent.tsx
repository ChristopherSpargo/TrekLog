import React, { Component } from "react";
import { View, Text, StyleSheet } from "react-native";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import { TrekInfo } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import SlideUpView from "./SlideUpComponent";
import { IntervalData } from "./IntervalSvc";
import {
  NUMBERS_BAR_Z_INDEX,
  INVISIBLE_Z_INDEX,
  HEADER_HEIGHT,
  TREK_TYPE_COLORS_OBJ,
  APP_VIEW_HEIGHT
} from "./App";
import TrekStats from "./TrekStatsComponent";
import SvgButton from './SvgButtonComponent';
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from './SvgImages';
import { MainSvc } from "./MainSvc";
import { TrekSvc } from "./TrekSvc";

@inject("trekSvc", "utilsSvc", "uiTheme", "mainSvc")
@observer
class NumbersBar extends Component<
  {
    trek: TrekInfo;
    timerOn: boolean;
    bottom?: number; // bottom edge of the bar display
    numbersHeight?: number; // height of the display
    open?: boolean; // display is visible if true
    interval?: number; // currently selected interval (if any)
    intervalData?: IntervalData; // interval data for trek (if any)
    bgImage?: boolean;  // true if being displayed over an image
    format?: string;    // small or big size display
    sysChangeFn?: Function // function to call for measurementSystem change
    closeFn?: Function; // function to call if user presses Close button
    uiTheme?: any;
    utilsSvc?: UtilsSvc;
    trekSvc?: TrekSvc; // object with all non-gps information about the Trek
    mainSvc?: MainSvc;
  },
  {}
> {
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;
  @observable zValue: number;

  mS = this.props.mainSvc;
  uSvc = this.props.utilsSvc;
  tS = this.props.trekSvc;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.zValue = INVISIBLE_Z_INDEX;
  };

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  };

  setVisible = () => {
    this.setZValue(NUMBERS_BAR_Z_INDEX);
  };

  setNotVisible = () => {
    this.setZValue(INVISIBLE_Z_INDEX);
  };

  render() {
    const tInfo = this.props.trek;
    const {
      highTextColor,
      mediumTextColor,
      disabledTextColor,
      secondaryColor,
      statsBackgroundColor,
    } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { cardLayout, roundedTop, fontRegular, fontItalic, fontLight } = this.props.uiTheme;
    const small = this.props.format === 'small';
    const labelText = tInfo.trekLabel
      ? tInfo.trekLabel
      : this.props.timerOn
      ? tInfo.type + " in progress"
      : "No Label";
    const noLabel = labelText === "No Label";
    const elevHt = this.tS.hasElevations(tInfo) ? 30 : 0;
    const nHt = small ? (320 + elevHt) : (APP_VIEW_HEIGHT - this.props.bottom - HEADER_HEIGHT);
    const statsAreaHt = nHt;
    const areaHeight = statsAreaHt;
    const typeIconSize = 20;

    const styles = StyleSheet.create({
      container: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: this.props.bottom || 0
      },
      cardCustom: {
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 5,
        paddingLeft: 0,
        paddingRight: 0,
        elevation: 0,
        borderBottomWidth: 0,
        height: areaHeight,
        justifyContent: "flex-start",
        zIndex: this.zValue
      },
      statusArea: {
        flexDirection: "column",
        left: 0,
        right: 0,
        bottom: 0,
        height: areaHeight,
        overflow: "hidden",
        backgroundColor: "transparent",
        zIndex: this.zValue
      },
      label: {
        paddingBottom: 10,
        paddingTop: 5,
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center"
      },
      labelAndClose: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 5,
        paddingLeft: 15,
      },
      labelText: {
        flex: 1,
        // textAlign: "center",
        fontSize: small ? 22 : 24,
        fontFamily: noLabel ? fontItalic : fontLight,
        color: noLabel ? disabledTextColor : highTextColor
      },
      intervalText: {
        fontSize: small ? 14 : 16,
        fontFamily: fontRegular,
        color: secondaryColor,
      },
      typeAndDate: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingRight: 5,
        paddingLeft: 5,
      },
      typeIcon: {
        width: typeIconSize,
        height: typeIconSize,
        marginRight: 10,
        backgroundColor: "transparent",
      },
      trekDate: {
        fontSize: small ? 18 : 20,
        fontFamily: fontRegular,
        color: mediumTextColor,
      }
    });

    return (
      <View style={styles.container}>
        <View style={[styles.statusArea, roundedTop]}>
          <SlideUpView
            bgColor={statsBackgroundColor}
            startValue={areaHeight}
            endValue={0}
            open={this.props.open}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={[cardLayout, styles.cardCustom, roundedTop]}>
              <View style={styles.label}>
                <View style={styles.labelAndClose}>
                  <Text style={styles.labelText}>{labelText}</Text>
                  <SvgButton
                    onPressFn={this.props.closeFn}
                    size={24}
                    fill={highTextColor}
                    path={ APP_ICONS.Close }
                  />
                </View>
                <View style={styles.typeAndDate}>
                  <SvgIcon
                    style={styles.typeIcon}
                    size={typeIconSize}
                    paths={APP_ICONS[tInfo.type]}
                    fill={TREK_TYPE_COLORS_OBJ[tInfo.type]}
                  />
                  <Text style={styles.trekDate}>
                    {this.uSvc.formatTrekDateAndTime(tInfo.date, tInfo.startTime)}
                  </Text>
                </View>
                {(this.props.interval !== undefined && this.props.interval >= 0) &&
                  <Text style={styles.intervalText}>{'Interval ' + (this.props.interval + 1)}</Text>
                }
              </View>
              <View style={{flex: 1, alignItems: "center"}}>
                <TrekStats
                  trek={this.props.trek}
                  logging={this.props.timerOn}
                  trekType={tInfo.type}
                  interval={this.props.interval}
                  intervalData={this.props.intervalData}
                  format={this.props.format}
                  sysChangeFn={this.props.sysChangeFn}
                />
              </View>
            </View>
          </SlideUpView>
        </View>
      </View>
    );
  }
}

export default NumbersBar;
