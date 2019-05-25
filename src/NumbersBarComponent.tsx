import React, { Component } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import { TrekInfo } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import SlideUpView from "./SlideUpComponent";
import { IntervalData } from "./SelectedTrekComponent";
import {
  NUMBERS_BAR_Z_INDEX,
  INVISIBLE_Z_INDEX,
  CONTROLS_HEIGHT,
  HEADER_HEIGHT
} from "./App";
import TrekStats from "./TrekStatsComponent";

export const TREK_LABEL_HEIGHT = 45;
@inject("trekInfo", "utilsSvc", "uiTheme")
@observer
class NumbersBar extends Component<
  {
    bottom?: number; // bottom edge of the bar display
    numbersHeight?: number; // height of the display
    open?: boolean; // display is visible if true
    interval?: number; // currently selected interval (if any)
    intervalData?: IntervalData; // interval data for trek (if any)
    uiTheme?: any;
    utilsSvc?: UtilsSvc;
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;
  @observable zValue: number;

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
    const { height } = Dimensions.get("window");
    const {
      highTextColor,
      trekLogBlue,
      dividerColor,
      disabledTextColor,
      pageBackground
    } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { cardLayout, roundedTop } = this.props.uiTheme;
    const tInfo = this.props.trekInfo;
    const labelText = tInfo.trekLabel
      ? tInfo.trekLabel
      : tInfo.timerOn
      ? tInfo.type + " in progress"
      : "No Label";
    const noLabel = labelText === "No Label";
    const nHt = height - CONTROLS_HEIGHT - HEADER_HEIGHT;
    const statsAreaHt = nHt;
    const areaHeight = statsAreaHt + CONTROLS_HEIGHT;

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
        paddingBottom: CONTROLS_HEIGHT,
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
        fontSize: 18,
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
        paddingBottom: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end"
      },
      labelText: {
        fontSize: 20,
        fontStyle: noLabel ? "italic" : "normal",
        fontWeight: "bold",
        color: noLabel ? disabledTextColor : highTextColor
      }
    });

    return (
      <View style={styles.container}>
        <View style={[styles.statusArea, roundedTop]}>
          <SlideUpView
            bgColor={pageBackground}
            startValue={areaHeight}
            endValue={0}
            open={this.props.open}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={[cardLayout, styles.cardCustom, roundedTop]}>
              <View style={[styles.label]}>
                <Text style={styles.labelText}>{labelText}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  justifyContent: "space-around",
                  alignItems: "center"
                }}
              >
                <TrekStats
                  logging={tInfo.timerOn}
                  trekType={tInfo.type}
                  interval={this.props.interval}
                  intervalData={this.props.intervalData}
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
