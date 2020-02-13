import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BorderlessButton } from "react-native-gesture-handler";
import { useObserver } from "mobx-react-lite";

import { UiThemeContext, TrekSvcContext, UtilsSvcContext, MainSvcContext,
         LoggingSvcContext } from "./App";
import { UtilsSvc } from "./UtilsService";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import { MainSvc, STEPS_APPLY, DIST_UNIT_CHOICES, PLURAL_STEP_NAMES, SWITCH_SPEED_STAT,
         SpeedStatType
      } from "./MainSvc";
import { TrekSvc } from "./TrekSvc";
import { LoggingSvc } from "./LoggingService";
import { ElevationData } from "./TrekInfoModel";

const ELEVATION_DISPLAY_SWITCH = {
  Gain: "Grade",
  Grade: "Gain",   //"Points",
  Points: "AllPoints",
  AllPoints: "Gain",
  Average: "Max",
  Max: "Min",
  Min: "Average",
  First: "Last",
  Last: "First"
};
const ELEVATION_DISPLAY_TITLES = {
  First: "Start Elev",
  Last: "End Elev",
  Max: "Max Elev",
  Min: "Min Elev",
  Points: "GPS Points",
  AllPoints: "All Points",
  Gain: "Elev Gain",
  Average: "Avg Elev",
  Grade: "Grade"
};

function TrekStats({
  trek,
  logging,
  trekType,
  interval = undefined,
  intervalData = undefined,
  bgImage = undefined,
  format = undefined,
  sysChangeFn = undefined,
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tS: TrekSvc = useContext(TrekSvcContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const lS: LoggingSvc = useContext(LoggingSvcContext);

  const [elevItems1, setElevItems1] = useState("Gain");
  const [elevItems2, setElevItems2] = useState("Average");
  const [elevItems3, setElevItems3] = useState("First");

  function formattedSteps() {
    let showRate = trek.showStepsPerMin;
    let st: string;

    if (interval !== undefined && interval >= 0) {
      st = tS.formattedSteps(
        trek,
        showRate,
        intervalData.iDists[interval],
        intervalData.times[interval]
      );
    } else {
      st = tS.formattedSteps(trek, showRate);
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
      d = trek.duration;
    }
    return mainSvc.formattedDuration(d);
  }

  function formattedDist() {
    let dist: number;

    if (interval !== undefined && interval >= 0) {
      dist = intervalData.iDists[interval];
    } else {
      dist = trek.trekDist;
    }
    let fd = mainSvc.formattedDist(dist);
    let i = fd.indexOf(" ");
    return { value: fd.substr(0, i), units: fd.substr(i), label: "Distance" };
  }

  function formattedCals() {
    let val: number;

    if (interval !== undefined && interval >= 0) {
      let totalCals = uSvc.computeCalories(
        intervalData.segPoints[interval],
        0,
        trek.type,
        trek.hills,
        trek.weight,
        trek.packWeight
      );
      val = tS.formattedCalories(
        trek,
        totalCals,
        trek.showTotalCalories,
        intervalData.times[interval]
      );
    } else {
      val = trek.showTotalCalories
        ? trek.currentCalories
        : trek.currentCaloriesPerMin;
    }
    let prec = val < 10 ? 10 : 1;
    let finalVal = Math.round(val * prec) / prec;

    if (isNaN(finalVal) || finalVal < 0) {
      finalVal = 0;
    }
    return {
      value: finalVal.toString(),
      units: "",
      label: trek.showTotalCalories ? "Calories" : "Calories/Min"
    };
  }

  function shouldShowCarIcon() {
    if (interval !== undefined && interval >= 0) {
      return uSvc.checkForCarSpeed(intervalData.segPoints[interval]);
    }
    return trek.drivingACar;
  }

  // return current speed, average speed or pace of the trek (or interval if specified)
  function displaySpeedStat() {
    let ms = mainSvc.measurementSystem;
    let speedStat = trek.showSpeedStat;
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
          sp = trek.averageSpeed;
          break;
        case 'speedNow':
          sp = trek.speedNow;
          break;
        case 'time':
          sp = trek.timePerDist;
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

  // return a string to be displayed in relation to the elevation data
  // base response on current value of elevDisplay and if an interval is specified
  function elevationDisplayValue(elevItem: string) {
    let result = {
      value: undefined,
      units: "",
      label: ELEVATION_DISPLAY_TITLES[elevItem] // title to use for current elev item type
    };
    let value: string;

    if (interval !== undefined && interval >= 0) {
      let intElevs: ElevationData[] = trek.elevations.slice(intervalData.elevData[interval].first, 
                                        intervalData.elevData[interval].last + 1);
      switch (elevItem) {
        case "Average":
          value = mainSvc.formattedElevation(intervalData.avgElevs[interval]);
          break;
        case "First":
          value = lS.formattedTrekElevation(intElevs, "First");
          break;
        case "Last":
          value = lS.formattedTrekElevation(intElevs, "Last");
          break;
        case "Max":
          value = lS.formattedTrekElevation(intElevs, "Max");
          break;
        case "Min":
          value = lS.formattedTrekElevation(intElevs, "Min");
          break;
        case "Gain":
          value = mainSvc.formattedElevation(uSvc.getElevationGain(intElevs));
          break;
        case "Grade":
          value = lS.formattedElevationGainPct(uSvc.getElevationGain(intElevs), 
                                                            intervalData.iDists[interval]);
          break;
        // case "Points":
        //   result.value = intervalData.segPaths[interval].length.toString();
        //   return result;
        default:
      }
    } else {
      switch (elevItem) {
        // case "Points":
        //   result.value = tS.pointListLength(trek).toString();
        //   return result;
        // case "AllPoints":
        //   result.value = trek.totalGpsPoints
        //     ? trek.totalGpsPoints.toString()
        //     : "N/A";
        //   return result;
        case "Average":
          value = mainSvc.formattedElevation(uSvc.getArraySegmentAverage(trek.elevations));
          break;
        case "First":
          value = lS.formattedTrekElevation(trek.elevations, "First");
          break;
        case "Last":
          value = lS.formattedTrekElevation(trek.elevations, "Last");
          break;
        case "Max":
          value = lS.formattedTrekElevation(trek.elevations, "Max");
          break;
        case "Min":
          value = lS.formattedTrekElevation(trek.elevations, "Min");
          break;
        case "Gain":
          value = mainSvc.formattedElevation(trek.elevationGain);
          break;
        case "Grade":
        value = lS.formattedElevationGainPct(trek.elevationGain, trek.trekDist);
        break;
        default:
      }
    }
    // alert(elevItem + ' : ' + value)
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
  function toggleElevDisplay1() {
      setElevItems1(ELEVATION_DISPLAY_SWITCH[elevItems1]);
  }

  function toggleElevDisplay2() {
    setElevItems2(ELEVATION_DISPLAY_SWITCH[elevItems2]);
}

function toggleElevDisplay3() {
  setElevItems3(ELEVATION_DISPLAY_SWITCH[elevItems3]);
}

// toggle between displaying current speed and average speed
  function toggleSpeedStatDisplay() {
    let nextStat = SWITCH_SPEED_STAT[trek.showSpeedStat];
    if (nextStat === 'speedNow' && !logging){
      nextStat = SWITCH_SPEED_STAT[nextStat];
    }
    tS.updateShowSpeedStat(trek, nextStat as SpeedStatType);
  }

  // toggle between displaying total steps and steps/min
  function toggleShowStepsPerMin() {
    tS.updateShowStepsPerMin(trek, !trek.showStepsPerMin);
  }

  // toggle between displaying total calories calories/min
  function toggleShowTotalCalories() {
    tS.updateShowTotalCalories(trek, !trek.showTotalCalories);
  }

  const {
    highTextColor,
    selectOnFilm,
    selectOnTheme,
    mediumTextColor,
    secondaryColor,
    disabledTextColor,
    rippleColor
  } = uiTheme.palette[mainSvc.colorTheme];
  const { fontRegular } = uiTheme;
  const state = lS.logState.loggingState;
  const noSteps = !STEPS_APPLY[trek.type];
  const small = format === 'small';
  const carIconSize = small ? 12 : 14;
  const minItemWidth = 135;
  const minElevItemWidth = 60;
  const statLabelFontSize = small ? 18 : 24;
  const statValueFontSize = small ? 26 : 54;
  const statUnitsFontSize = small ? 20 : 33;
  const elevValueFontSize = small ? 26 : 33;
  const elevUnitsFontSize = small ? 20 : 26;
  const statUnitsMargin = small ? 0 : 8;
  const calsMarginTop = small ? 10 : -10;
  const selectColor = bgImage ? selectOnFilm : selectOnTheme;
  const switchSys = sysChangeFn || mainSvc.switchMeasurementSystem;
  const haveElevs = tS.hasElevations(trek);
  const timeFontSie = small ? 32 : (state === 'Review' && haveElevs ? 54 : 94);

  const styles = StyleSheet.create({
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
      flex: 1,
      alignItems: "center",
      overflow: "hidden",
      justifyContent: "space-around"
    },
    bigStatPair: {
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
    },
    elevStatAdj: {
      minWidth: minElevItemWidth,
    },
    elevValueAdj: {
      fontSize: elevValueFontSize,
    },
    elevUnitsAdj: {
      fontSize: elevUnitsFontSize,
      marginBottom: 0,
    }
  });

  const StatItem = (props: any) => {
    return (
      <View style={styles.statItem}>
        <BorderlessButton
          rippleColor={props.switchFn ? rippleColor : "transparent"}
          onPress={props.switchFn}
        >
          <View style={{...styles.statValue, ...props.statStyleAdj}}>
            <Text style={{...styles.statValueText, ...props.valueStyleAdj}}>
              {uSvc.zeroSuppressedValue(props.item.value)}
            </Text>
            <Text style={{...styles.statUnitsText, ...props.unitsStyleAdj}}>{props.item.units}</Text>
          </View>
          <View style={{...styles.statLabel, ...props.statStyleAdj}}>
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
      <View style={styles.bigStatPair}>
        <StatItem
          item={{ value: formattedDuration(), units: "", label: "Duration" }}
          valueStyleAdj={{ fontSize: timeFontSie }}
        />
      </View>
      <View style={styles.bigStatPair}>
        <StatItem
          item={formattedDist()}
          switchFn={switchSys}
        />
        <StatItem
          item={displaySpeedStat()}
          switchFn={toggleSpeedStatDisplay}
        />
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
        {/* {haveElevs && noSteps && (
          <StatItem item={elevationDisplayValue()} switchFn={toggleElevDisplay} />
        )} */}
      </View>
      {(haveElevs && !logging) && (
        <View style={[styles.bigStatPair, {marginTop: calsMarginTop}]}>
          <StatItem item={elevationDisplayValue(elevItems1)} switchFn={toggleElevDisplay1} 
                  statStyleAdj={styles.elevStatAdj} valueStyleAdj={styles.elevValueAdj}
                  unitsStyleAdj={styles.elevUnitsAdj} />
          <StatItem item={elevationDisplayValue(elevItems2)} switchFn={toggleElevDisplay2} 
                  statStyleAdj={styles.elevStatAdj} valueStyleAdj={styles.elevValueAdj}
                  unitsStyleAdj={styles.elevUnitsAdj} />
          <StatItem item={elevationDisplayValue(elevItems3)} switchFn={toggleElevDisplay3} 
                  statStyleAdj={styles.elevStatAdj} valueStyleAdj={styles.elevValueAdj}
                  unitsStyleAdj={styles.elevUnitsAdj} />
        </View>
      )}
    </View>
  ));
}

export default TrekStats;
