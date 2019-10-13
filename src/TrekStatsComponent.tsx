import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BorderlessButton } from "react-native-gesture-handler";
import { useObserver } from "mobx-react-lite";

import { UiThemeContext, TrekInfoContext, UtilsSvcContext } from "./App";
import {
  TrekInfo,
  STEPS_APPLY,
  DIST_UNIT_CHOICES,
  PLURAL_STEP_NAMES,
  SWITCH_SPEED_STAT,
  SpeedStatType
} from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";

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

function TrekStats({
  logging,
  trekType,
  interval = undefined,
  intervalData = undefined,
  bgImage = undefined,
  format = undefined,
  sysChangeFn = undefined,
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);

  const [elevDisplay, setElevDisplay] = useState("Gain");
  const [intervalElevDisplay, setIntervalElevDisplay] = useState("Elevation");

  function formattedSteps() {
    let showRate = tInfo.showStepsPerMin;
    let st: string;

    if (interval !== undefined && interval >= 0) {
      st = tInfo.formattedSteps(
        showRate,
        intervalData.iDists[interval],
        intervalData.times[interval]
      );
    } else {
      st = tInfo.formattedSteps(showRate);
    }
    if (showRate) {
      st = st.substr(0, st.indexOf(" "));
    }
    return {
      value: st,
      units: "",
      label: PLURAL_STEP_NAMES[trekType] + (showRate ? "/Min" : "")
    };
  }

  // return the duration of the trek (or interval if specified)
  function formattedDuration() {
    let d: number;

    if (interval !== undefined && interval >= 0) {
      d = intervalData.times[interval];
    } else {
      d = tInfo.duration;
    }
    return tInfo.formattedDuration(d);
  }

  function formattedDist() {
    let dist: number;

    if (interval !== undefined && interval >= 0) {
      dist = intervalData.iDists[interval];
    } else {
      dist = tInfo.trekDist;
    }
    let fd = tInfo.formattedDist(dist);
    let i = fd.indexOf(" ");
    return { value: fd.substr(0, i), units: fd.substr(i), label: "Distance" };
  }

  function formattedCals() {
    let val: number;

    if (interval !== undefined && interval >= 0) {
      let totalCals = uSvc.computeCalories(
        intervalData.segPoints[interval],
        tInfo.type,
        tInfo.hills,
        tInfo.weight,
        tInfo.packWeight
      );
      val = tInfo.formattedCalories(
        totalCals,
        tInfo.showTotalCalories,
        intervalData.times[interval]
      );
    } else {
      val = tInfo.showTotalCalories
        ? tInfo.currentCalories
        : tInfo.currentNetCalories;
    }
    let prec = val < 10 ? 10 : 1;
    let finalVal = Math.round(val * prec) / prec;

    if (isNaN(finalVal) || finalVal < 0) {
      finalVal = 0;
    }
    return {
      value: finalVal.toString(),
      units: "",
      label: tInfo.showTotalCalories ? "Calories" : "Calories/Min"
    };
  }

  function shouldShowCarIcon() {
    if (interval !== undefined && interval >= 0) {
      return uSvc.checkForCarSpeed(intervalData.segPoints[interval]);
    }
    return tInfo.drivingACar;
  }

  // return current speed, average speed or pace of the trek (or interval if specified)
  function displaySpeedStat() {
    let ms = tInfo.measurementSystem;
    let speedStat = tInfo.showSpeedStat;
    let sp: string;
    let sepStr = speedStat === 'time' ? "/" : " ";

    if (interval !== undefined && interval >= 0) {
      switch(speedStat){
        case 'speedAvg':
          sp = uSvc.formatAvgSpeed(ms, intervalData.iDists[interval], intervalData.times[interval]);
          break;
        case 'time':
          sp = uSvc.formatTimePerDist(DIST_UNIT_CHOICES[ms], intervalData.iDists[interval],
                                      intervalData.times[interval]);
          break;
        default:
      }
    } else {
      switch(speedStat){
        case 'speedAvg':
          sp = tInfo.averageSpeed;
          break;
        case 'speedNow':
          sp = tInfo.speedNow;
          break;
        case 'time':
          sp = tInfo.timePerDist;
          break;
        default:
      }
    }
    let i = sp.indexOf(sepStr);
    switch (speedStat) {
      case 'time':
        return { value: sp.substr(0, i), units: "", label: "Time" + sp.substr(i) };
      case 'speedAvg':
        return { value: sp.substr(0, i), units: sp.substr(i), label: "Avg Speed" };
      case 'speedNow':
        return { value: sp.substr(0, i), units: sp.substr(i), label: "Speed Now" };
      default:
      return { value: 'N/A', units: '', label: "" };
    }
  }

  // return the title to use for the elevDisplay value
  function elevationDisplayTitle(): string {
    if (interval !== undefined && interval >= 0) {
      return ELEVATION_DISPLAY_TITLES[intervalElevDisplay]; // title to use for current interval elev item type
    } else {
      return ELEVATION_DISPLAY_TITLES[elevDisplay]; // title to use for current elev item type
    }
  }

  // return a string to be displayed in relation to the elevation data
  // base response on current value of elevDisplay and if an interval is specified
  function elevationDisplayValue() {
    let result = {
      value: undefined,
      units: "",
      label: elevationDisplayTitle()
    };
    let value: string;

    if (interval !== undefined && interval >= 0) {
      switch (intervalElevDisplay) {
        case "Elevation":
          value = tInfo.formattedElevation(intervalData.elevs[interval]);
          break;
        case "Points":
          result.value = intervalData.segPaths[interval].length.toString();
          return result;
        default:
      }
    } else {
      switch (elevDisplay) {
        case "Points":
          result.value = tInfo.pointListLength().toString();
          return result;
        case "AllPoints":
          result.value = tInfo.totalGpsPoints
            ? tInfo.totalGpsPoints.toString()
            : "N/A";
          return result;
        case "First":
          value = tInfo.formattedTrekElevation("First");
          break;
        case "Last":
          value = tInfo.formattedTrekElevation("Last");
          break;
        case "Max":
          value = tInfo.formattedTrekElevation("Max");
          break;
        case "Min":
          value = tInfo.formattedTrekElevation("Min");
          break;
        case "Gain":
          value = tInfo.formattedElevation(tInfo.elevationGain);
          break;
        case "Grade":
          value = tInfo.formattedElevationGainPct();
          break;
        default:
      }
    }
    if (value === 'N/A') {
      result.value = value;
      return result;
    }
    let i = value.indexOf(" ");
    result.value = value.substr(0, i);
    result.units = value.substr(i);
    return result;
  }

  // toggle between displaying the various altitude values
  function toggleElevDisplay() {
    if (interval === undefined || interval < 0) {
      setElevDisplay(ELEVATION_DISPLAY_SWITCH[elevDisplay]);
    } else {
      setIntervalElevDisplay(
        INTERVAL_ELEVATION_DISPLAY_SWITCH[intervalElevDisplay]
      );
    }
  }

  // toggle between displaying current speed and average speed
  function toggleSpeedStatDisplay() {
    let nextStat = SWITCH_SPEED_STAT[tInfo.showSpeedStat];
    if (nextStat === 'speedNow' && !logging){
      nextStat = SWITCH_SPEED_STAT[nextStat];
    }
    tInfo.updateShowSpeedStat(nextStat as SpeedStatType);
  }

  // toggle between displaying total steps and steps/min
  function toggleShowStepsPerMin() {
    tInfo.updateShowStepsPerMin(!tInfo.showStepsPerMin);
  }

  // toggle between displaying total calories calories/min
  function toggleShowTotalCalories() {
    tInfo.updateShowTotalCalories(!tInfo.showTotalCalories);
  }

  const {
    highTextColor,
    selectOnFilm,
    selectOnTheme,
    mediumTextColor,
    secondaryColor,
    pageBackground,
    disabledTextColor,
    rippleColor
  } = uiTheme.palette[tInfo.colorTheme];
  const { fontRegular } = uiTheme;
  const noSteps = !STEPS_APPLY[tInfo.type];
  const small = format === 'small';
  const carIconSize = small ? 12 : 14;
  const minItemWidth = 135;
  const timeFontSie = small ? 32 : 94
  const statLabelFontSize = small ? 18 : 24;
  const statValueFontSize = small ? 26 : 54;
  const statUnitsFontSize = small ? 20 : 33;
  const statUnitsMargin = small ? 0 : 8;
  const calsMarginTop = small ? 10 : -10;
  const selectColor = bgImage ? selectOnFilm : selectOnTheme;
  const switchSys = sysChangeFn || tInfo.switchMeasurementSystem;
  const haveElevs = tInfo.hasElevations();

  const styles = StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: pageBackground
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    statLabel: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      minWidth: minItemWidth,
      paddingBottom: 5
    },
    statLabelText: {
      color: mediumTextColor,
      fontFamily: fontRegular,
      fontSize: statLabelFontSize
    },
    statValue: {
      minWidth: minItemWidth,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "flex-end",
      borderBottomWidth: 2,
      borderStyle: "solid",
      borderColor: disabledTextColor,
    },
    statValueText: {
      color: highTextColor,
      fontFamily: fontRegular,
      fontSize: statValueFontSize
    },
    statUnitsText: {
      color: highTextColor,
      fontFamily: fontRegular,
      marginBottom: statUnitsMargin,
      fontSize: statUnitsFontSize
    },
    bigStats: {
      alignItems: "center",
      overflow: "hidden",
      justifyContent: "center"
    },
    bigStatPair: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    carIcon: {
      marginLeft: 10,
      marginTop: 2,
      width: carIconSize,
      height: carIconSize,
      backgroundColor: "transparent"
    }
  });

  const StatItem = (props: any) => {
    return (
      <View style={styles.statItem}>
        <BorderlessButton
          rippleColor={props.switchFn ? rippleColor : "transparent"}
          onPress={props.switchFn}
        >
          <View style={styles.statValue}>
            <Text style={[styles.statValueText, props.valueStyle]}>
              {uSvc.zeroSuppressedValue(props.item.value)}
            </Text>
            <Text style={styles.statUnitsText}>{props.item.units}</Text>
          </View>
          <View style={styles.statLabel}>
            <Text
              style={[
                styles.statLabelText,
                props.switchFn ? { color: selectColor } : {}
              ]}
            >
              {props.item.label}
            </Text>
            {props.showDriving && shouldShowCarIcon() && (
              <SvgIcon
                style={styles.carIcon}
                size={carIconSize}
                paths={APP_ICONS.Car}
                fill={secondaryColor}
              />
            )}
          </View>
        </BorderlessButton>
      </View>
    );
  };

  return useObserver(() => (
    <View style={styles.bigStats}>
      <StatItem
        item={{ value: formattedDuration(), units: "", label: "Duration" }}
        valueStyle={{ fontSize: timeFontSie }}
      />
      <View style={styles.bigStatPair}>
        <StatItem
          item={formattedDist()}
          switchFn={switchSys}
        />
        {/* {logging && 
          <StatItem 
            item={formattedCurrentSpeed()} 
            switchFn={toggleShowSpeedNowDisplay}
          />
        }
        {!logging && ( */}
          <StatItem
            item={displaySpeedStat()}
            switchFn={toggleSpeedStatDisplay}
          />
        {/* )} */}
      </View>
      <View style={[styles.bigStatPair, {marginTop: calsMarginTop}]}>
        <StatItem
          item={formattedCals()}
          showDriving={true}
          switchFn={toggleShowTotalCalories}
        />
        {!noSteps && (
          <StatItem item={formattedSteps()} switchFn={toggleShowStepsPerMin} />
        )}
        {haveElevs && noSteps && (
          <StatItem item={elevationDisplayValue()} switchFn={toggleElevDisplay} />
        )}
      </View>
      {(haveElevs && !logging && !noSteps) && (
        <View style={styles.bigStatPair}>
          <StatItem item={elevationDisplayValue()} switchFn={toggleElevDisplay} />
        </View>
      )}
    </View>
  ));
}

export default TrekStats;
