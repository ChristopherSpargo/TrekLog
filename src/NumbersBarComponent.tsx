import React, { Component } from "react";
import { View, Text, StyleSheet, TouchableNativeFeedback } from "react-native";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import {
  TrekInfo,
  SWITCH_SPEED_AND_TIME,
  PLURAL_STEP_NAMES,
  DIST_UNIT_CHOICES
} from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import SlideUpView from "./SlideUpComponent";
import { IntervalData } from "./SelectedTrekComponent";
import { NUMBERS_BAR_Z_INDEX, INVISIBLE_Z_INDEX } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";

export const TREK_LABEL_HEIGHT = 25;
export const NUMBERS_BAR_HEIGHT = 33;
export const NUMBERS_AREA_HEIGHT = NUMBERS_BAR_HEIGHT * 2;
export const ELEVATION_DISPLAY_SWITCH = {
  First: "Last",
  Last: "Points",
  Min: "First",
  Max: "Min",
  Gain: "Grade",
  Points: "AllPoints",
  AllPoints: "Gain",
  Grade: "Max"
};
export const INTERVAL_ELEVATION_DISPLAY_SWITCH = {
  Elevation: "Points",
  Points: "Elevation"
};
export const ELEVATION_DISPLAY_TITLES = {
  First: "Start Elev",
  Last: "End Elev",
  Max: "Max Elev",
  Min: "Min Elev",
  Points: "GPS Points",
  AllPoints: "All Points",
  Gain: "Elev Gain",
  Elevation: "Elevation",
  Grade: "Grade"
};

@inject("trekInfo", "utilsSvc", "uiTheme")
@observer
class NumbersBar extends Component<
  {
    bottom?: number; // bottom edge of the bar display
    numbersHeight?: number; // height of the display
    logBorder?: boolean; // show rounded and darker top border if true
    open?: boolean; // display is visible if true
    interval?: number; // currently selected interval (if any)
    intervalData?: IntervalData; // interval data for trek (if any)
    uiTheme?: any;
    utilsSvc?: UtilsSvc;
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {
  @observable showStepsPerMin;
  @observable showTotalCalories;
  @observable elevDisplay;
  @observable intervalElevDisplay;
  @observable zValue;
  @observable infoOpen;
  @observable notesOpen;
  @observable expandCard;
  @observable labelFormOpen;

  tInfo = this.props.trekInfo;
  uSvc = this.props.utilsSvc;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.elevDisplay = "Gain";
    this.intervalElevDisplay = "Elevation";
    this.zValue = -1;
    this.infoOpen = false;
    this.notesOpen = false;
    this.expandCard = false;
    this.labelFormOpen = false;
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

  // toggle between displaying the various altitude values
  @action
  toggleElevDisplay = () => {
    let i = this.props.interval;

    if (i === undefined || i < 0) {
      this.elevDisplay = ELEVATION_DISPLAY_SWITCH[this.elevDisplay];
    } else {
      this.intervalElevDisplay =
        INTERVAL_ELEVATION_DISPLAY_SWITCH[this.intervalElevDisplay];
    }
  };

  // toggle between displaying time/distance and distance/time
  toggleAvgSpeedorTimeDisplay = () => {
    this.props.trekInfo.updateShowSpeedOrTime(
      SWITCH_SPEED_AND_TIME[this.props.trekInfo.showSpeedOrTime]
    );
  };

  // toggle between displaying total steps and steps/min
  @action
  toggleShowStepsPerMin = () => {
    this.showStepsPerMin = !this.showStepsPerMin;
  };

  // toggle between displaying total calories and net calories
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
  };

  // return the title to use for the elevDisplay value
  elevationDisplayTitle = (): string => {
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      return ELEVATION_DISPLAY_TITLES[this.intervalElevDisplay]; // title to use for current interval elev item type
    } else {
      return ELEVATION_DISPLAY_TITLES[this.elevDisplay]; // title to use for current elev item type
    }
  };

  // return a string to be displayed in relation to the elevation data
  // base response on current value of elevDisplay and if an interval is specified
  elevationDisplayValue = (): string => {
    let tI = this.props.trekInfo;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      switch (this.intervalElevDisplay) {
        case "Elevation":
          return tI.formattedElevation(this.props.intervalData.elevs[i]);
        case "Points":
          return this.props.intervalData.segPaths[i].length.toString();
        default:
      }
    } else {
      switch (this.elevDisplay) {
        case "Points":
          return tI.pointListLength().toString();
        case "AllPoints":
          return tI.totalGpsPoints ? tI.totalGpsPoints.toString() : "N/A";
        case "First":
          return tI.formattedTrekElevation("First");
        case "Last":
          return tI.formattedTrekElevation("Last");
        case "Max":
          return tI.formattedTrekElevation("Max");
        case "Min":
          return tI.formattedTrekElevation("Min");
        case "Gain":
          return tI.formattedElevation(tI.elevationGain);
        case "Grade":
          return tI.formattedElevationGainPct();
        default:
      }
    }
    return "";
  };

  // return the duration of the trek (or interval if specified)
  displayDuration = () => {
    let d;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      d = this.props.intervalData.times[i];
    } else {
      d = this.tInfo.duration;
    }
    return this.tInfo.formattedDuration(d);
  };

  // return the distance of the trek (or interval if specified)
  displayDist = () => {
    let d;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      d = this.props.intervalData.iDists[i];
    } else {
      d = this.tInfo.trekDist;
    }
    return this.tInfo.formattedDist(d);
  };

  // return average speed or pace of the trek (or interval if specified)
  displaySpeedOrPace = (showSpeed: boolean) => {
    let iData = this.props.intervalData;
    let i = this.props.interval;
    let ms = this.tInfo.measurementSystem;

    if (i !== undefined && i >= 0) {
      return showSpeed
        ? this.uSvc.formatAvgSpeed(ms, iData.iDists[i], iData.times[i])
        : this.uSvc.formatTimePerDist(
            DIST_UNIT_CHOICES[ms],
            iData.iDists[i],
            iData.times[i]
          );
    } else {
      return showSpeed ? this.tInfo.averageSpeed : this.tInfo.timePerDist;
    }
  };

  // return total or net calories of the trek (or interval if specified)
  displayFormattedCalories = (showTotal: boolean) => {
    let iData = this.props.intervalData;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      let totalCals = this.props.utilsSvc.computeCalories(
        iData.segPoints[i],
        this.tInfo.type,
        this.tInfo.hills,
        this.tInfo.weight,
        this.tInfo.packWeight
      );
      return this.tInfo.formattedCalories(totalCals, showTotal, iData.times[i]);
    }
    return showTotal
      ? this.tInfo.currentCalories
      : this.tInfo.currentNetCalories;
  };

  shouldShowCarIcon = () => {
    let iData = this.props.intervalData;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      return this.props.utilsSvc.checkForCarSpeed(iData.segPoints[i]);
    }
    return this.tInfo.drivingACar;
  };

  // return total or net calories of the trek (or interval if specified)
  displayFormattedSteps = (showRate: boolean) => {
    let iData = this.props.intervalData;
    let i = this.props.interval;

    if (i !== undefined && i >= 0) {
      return this.tInfo.formattedSteps(
        showRate,
        iData.iDists[i],
        iData.times[i]
      );
    } else {
      return this.tInfo.formattedSteps(showRate);
    }
  };

  render() {
    const {
      highTextColor,
      trekLogBlue,
      dividerColor,
      disabledTextColor,
      secondaryColor,
      mediumTextColor
    } = this.props.uiTheme.palette;
    const { cardLayout, roundedTop } = this.props.uiTheme;
    const tInfo = this.props.trekInfo;
    const labelText = tInfo.trekLabel
      ? tInfo.trekLabel
      : tInfo.timerOn
      ? tInfo.type + " in progress"
      : "No Label";
    const noLabel = labelText === "No Label";
    const showSpeed = tInfo.showSpeedOrTime === "speed";
    const labelHt = TREK_LABEL_HEIGHT;
    const numBars = this.tInfo.timerOn ? 2 : 3;
    const nHt = NUMBERS_BAR_HEIGHT * numBars;
    const statsAreaHt =
      this.props.numbersHeight !== undefined
        ? this.props.numbersHeight
        : nHt + labelHt;
    const areaHeight = statsAreaHt + 1;
    const carIconSize = 14;

    const styles = StyleSheet.create({
      container: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0
      },
      cardCustom: {
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        elevation: 0,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: mediumTextColor,
        borderBottomWidth: 0,
        height: areaHeight,
        justifyContent: "flex-end",
        zIndex: this.zValue
      },
      statusArea: {
        flexDirection: "column",
        left: 0,
        right: 0,
        bottom: this.props.bottom || 0,
        height: areaHeight,
        overflow: "hidden",
        backgroundColor: "transparent",
        justifyContent: "flex-end",
        zIndex: this.zValue
      },
      bar: {
        height: (statsAreaHt - labelHt) / numBars,
        paddingRight: 0,
        paddingLeft: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start"
      },
      statItem: {
        marginRight: 0,
        marginLeft: 0,
        flex: 1,
        paddingLeft: 10,
        paddingRight: 10,
        alignItems: "flex-end",
        flexDirection: "row",
        justifyContent: "space-between"
      },
      borderRt: {
        borderRightWidth: 1,
        borderColor: dividerColor,
        borderStyle: "solid"
      },
      title: {
        color: highTextColor,
        fontSize: 14,
        textAlign: "center"
      },
      selectable: {
        color: trekLogBlue
      },
      value: {
        fontSize: 22,
        fontWeight: "300",
        color: highTextColor
      },
      label: {
        height: TREK_LABEL_HEIGHT,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end"
      },
      labelText: {
        fontSize: 18,
        fontStyle: noLabel ? "italic" : "normal",
        fontWeight: "bold",
        color: noLabel ? disabledTextColor : highTextColor
      },
      carIcon: {
        marginLeft: 10,
        marginTop: 2,
        width: carIconSize,
        height: carIconSize,
        backgroundColor: "transparent"
      }
    });

    return (
      <View style={styles.container}>
        <View style={styles.statusArea}>
          <SlideUpView
            bgColor="transparent"
            startValue={areaHeight}
            endValue={0}
            open={this.props.open}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={[cardLayout, styles.cardCustom, roundedTop]}>
              <View style={styles.label}>
                <Text style={styles.labelText}>{labelText}</Text>
              </View>
              {!this.tInfo.timerOn && (
                <View style={[styles.bar]}>
                  <View style={[styles.statItem, styles.borderRt]}>
                    <Text style={styles.title}>Distance</Text>
                    <Text style={styles.value}>{this.displayDist()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.title}>Duration</Text>
                    <Text style={styles.value}>{this.displayDuration()}</Text>
                  </View>
                </View>
              )}
              {tInfo.timerOn && (
                <View style={styles.bar}>
                  <View style={[styles.statItem, styles.borderRt]}>
                    <Text style={styles.title}>Avg Speed</Text>
                    <Text style={styles.value}>
                      {this.displaySpeedOrPace(true)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.title}>Avg Pace</Text>
                    <Text style={styles.value}>
                      {this.displaySpeedOrPace(false)}
                    </Text>
                  </View>
                </View>
              )}
              {!tInfo.timerOn && (
                <View style={styles.bar}>
                  <TouchableNativeFeedback
                    background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                    onPress={this.toggleElevDisplay}
                  >
                    <View style={[styles.statItem, styles.borderRt]}>
                      <Text style={styles.title}>
                        {this.elevationDisplayTitle()}
                      </Text>
                      <Text style={[styles.value, styles.selectable]}>
                        {this.elevationDisplayValue()}
                      </Text>
                    </View>
                  </TouchableNativeFeedback>
                  <TouchableNativeFeedback
                    background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                    onPress={this.toggleAvgSpeedorTimeDisplay}
                  >
                    <View style={styles.statItem}>
                      <Text style={styles.title}>
                        Avg {showSpeed ? "Speed" : "Pace"}
                      </Text>
                      <Text style={[styles.value, styles.selectable]}>
                        {this.displaySpeedOrPace(showSpeed)}
                      </Text>
                    </View>
                  </TouchableNativeFeedback>
                </View>
              )}
              <View style={styles.bar}>
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={this.toggleShowTotalCalories}
                >
                  <View style={[styles.statItem, styles.borderRt]}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.title}>
                        {this.showTotalCalories ? "" : "Net "}Calories
                      </Text>
                      {this.shouldShowCarIcon() && (
                        <SvgIcon
                          style={styles.carIcon}
                          size={carIconSize}
                          paths={APP_ICONS.Car}
                          fill={secondaryColor}
                        />
                      )}
                    </View>
                    <Text style={[styles.value, styles.selectable]}>
                      {this.displayFormattedCalories(this.showTotalCalories)}
                    </Text>
                  </View>
                </TouchableNativeFeedback>
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={this.toggleShowStepsPerMin}
                >
                  <View style={[styles.statItem]}>
                    <Text style={styles.title}>
                      {!this.showStepsPerMin
                        ? PLURAL_STEP_NAMES[tInfo.type]
                        : "Rate"}
                    </Text>
                    <Text style={[styles.value, styles.selectable]}>
                      {this.displayFormattedSteps(this.showStepsPerMin)}
                    </Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          </SlideUpView>
        </View>
      </View>
    );
  }
}

export default NumbersBar;
