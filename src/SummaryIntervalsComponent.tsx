import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useObserver } from "mobx-react-lite";
import { BorderlessButton } from 'react-native-gesture-handler'

import { UiThemeContext, TrekInfoContext, UtilsSvcContext, SummarySvcContext,
         INVISIBLE_Z_INDEX, NUMBERS_BAR_Z_INDEX } from "./App";
import { TrekInfo, TREK_TYPE_CHOICES, TREK_SELECT_BITS, DIST_UNIT_CHOICES
       } from './TrekInfoModel';
import { UtilsSvc, DateInterval } from './UtilsService';
import BarDisplay from "./BarDisplayComponent";
import HorizontalSlideView from './HorizontalSlideComponent';
import SvgYAxis, { YAXIS_TYPE_MAP } from './SvgYAxisComponent';
import SvgGrid from './SvgGridComponent';
import SlideUpView from './SlideUpComponent';
import { SummaryModel, ActivityStatType, ActivityStatsInterval } from './SummaryModel';

export const INTERVAL_LABELS = {
  daily: 'Day',
  weekly: 'Week',
  monthly: 'Month'};

function SummaryIntervals({
  summaryHeight,
  statAreaWidth,
  haveTreks,
  showFn
}) {

  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);
  const sumSvc: SummaryModel = useContext(SummarySvcContext);

  const [scrollToBar, setScrollToBar] = useState();

  function setVisible() {
    sumSvc.setSummaryZValue(NUMBERS_BAR_Z_INDEX);
  }

  function setNotVisible() {
    sumSvc.setSummaryZValue(INVISIBLE_Z_INDEX);
  }

  // move the barGraph to the specified bar
  function scrollBarGraph(pos: number) {
    setScrollToBar(pos);
    requestAnimationFrame(() => {
      setScrollToBar(undefined);
    })
  }

  // switch the measurement system and update
  function switchMeasurementSystem() {
    tInfo.switchMeasurementSystem();
    sumSvc.buildGraphData();
  }

  function updateShowStatType(sType: ActivityStatType) {
    sumSvc.setOpenItems(false);
    requestAnimationFrame(() => {
      if (sumSvc.showStatType !== sType) {
        sumSvc.setShowStatType(sType);
      } else {
        switch(sType){
          case 'dist':
            switchMeasurementSystem();
            break;
          case 'cals':
            sumSvc.toggleShowTotalCalories();
            break;
          case 'steps':
            sumSvc.toggleShowStepsPerMin();
            break;
          default:
        }
      }
      sumSvc.setOpenItems(true);
    })
  }

  // set the showIntervalType property
  function updateShowIntervalType(iType: DateInterval) {
    sumSvc.setOpenItems(false);
    scrollBarGraph(0);
    requestAnimationFrame(() => {
      sumSvc.setShowIntervalType(iType);
      sumSvc.scanTreks();
      sumSvc.findStartingInterval();
    })
  }

  // format the TITLE for the total line displayed below the graph
  function getIntervalDisplayTotalTitle() {
    if ((tInfo.typeSelections & sumSvc.activeTypes) === 0) { return 'No Type Selected'; }
    if (sumSvc.totalCounts(tInfo.typeSelections)){
      return INTERVAL_LABELS[sumSvc.showIntervalType] + ':';
    } else {
      return 'No Data for Selected Types';
    }
  }

  // format the TITLE for the total line displayed below the graph
  function getDisplayTotalTitle() {
    if (!tInfo.typeSelections || !sumSvc.totalCounts(tInfo.typeSelections)) { 
      return ''; 
    } else {
      return 'Total:';
    }
  }

  // compute and format the VALUE for the total line displayed below the graph
  function getDisplayTotal(sType: ActivityStatType) {
    if (!sumSvc.activityData.length || !tInfo.typeSelections) { return ''; }
    if (sumSvc.totalCounts(tInfo.typeSelections)){
      let tData = totalStatForSelectedTypes(sType, tInfo.typeSelections);
      switch(sType){
        case 'dist':
          return formattedDist(tData.stat);
        case 'time':
        return formattedTime(tData.stat);
        case 'cals':
        return formattedCals(tData.stat, tData.time);
        case 'steps':
        return formattedSteps(tData.stat, tData.time);
        default:
          return "";
      }
    } else {
      return '';
    }
  }

  // compute and format the VALUE for the total line displayed below the graph
  function getIntervalDisplayTotal(sType: ActivityStatType) {
    if (!sumSvc.activityData.length || !tInfo.typeSelections) { return ''; }
    if (sumSvc.totalCounts(tInfo.typeSelections)){
      let iData = intervalTotalForSelectedTypes(sumSvc.activityData[sumSvc.selectedInterval], 
                                                sType, tInfo.typeSelections)
      switch(sType){
        case 'dist':
          return formattedDist(iData.stat);
        case 'time':
        return formattedTime(iData.stat);
        case 'cals':
        return formattedCals(iData.stat, iData.time);
        case 'steps':
        return formattedSteps(iData.stat, iData.time);
        default:
          return "";
      }
    } else {
      return '';
    }
  }

  // return the total for the given interval for the given stat and selected trek types
  function intervalTotalForSelectedTypes(iData: ActivityStatsInterval, 
                                         sType: ActivityStatType, sels: number) {
    let stat = 0, time = 0;

    if(iData){
      TREK_TYPE_CHOICES.forEach((tType) => {    // for each trekType
        if (sels & TREK_SELECT_BITS[tType]) {   // if type is in selections
          stat += iData.data[tType][sType];     // add to total
          time += sType === 'steps' ? iData.data[tType].stepTime : iData.data[tType].time;
        }
      })
    }
    return {stat: stat, time: time};
}

  // compute the total for all intervals for the given stat and selected trek types
  function totalStatForSelectedTypes(sType: ActivityStatType, sels: number) {
    let stat = 0, time = 0;

    sumSvc.activityData.forEach((iData) => {    // for each interval
      let iTotal = intervalTotalForSelectedTypes(iData, sType, sels);
      stat += iTotal.stat;
      time += iTotal.time;
    })
    return {stat: stat, time: time};
  }

  function formattedDist(dist: number) {
    return uSvc.formatDist(dist, DIST_UNIT_CHOICES[tInfo.measurementSystem]);
  }

  function formattedTime(time: number) {
    return uSvc.timeFromSeconds(time, 'colons');
  }

  function formattedCals(cals: number, time: number) {
    let val: number, prec: number;

    val = sumSvc.showTotalCalories ? cals : uSvc.getCaloriesPerMin(cals, time);
    prec = val < 10 ? 10 : 1;
    let c = Math.round(val * prec) / prec;
    c = isNaN(c) ? 0 : c;
    return c.toString() + (sumSvc.showTotalCalories ? "" : "/min");
  }

  function formattedSteps(steps: number, time: number) {
    if (sumSvc.showStepsPerMin) {
      let s = Math.round(steps / (time / 60));
      s = isNaN(s) ? 0 : s;
      return s.toString() + "/min";
    }
    return steps.toString();
  }

  const graphAreaHeight = (summaryHeight - 95);
  const graphHeight = graphAreaHeight;
  const maxBarHeight = graphHeight - 50;
  const yAxisWidth = 60;
  const graphWidth = statAreaWidth - yAxisWidth - 10;
  const gBarWidth = 25; 
  const showSteps = sumSvc.haveStepData();
  const numStats = showSteps ? 4 : 3;
  const statLabelWidth = (statAreaWidth - 20) / numStats;
  const intervalLabelWidth = (statAreaWidth - 20) / 3;

  const { rippleColor, trekLogBlue, highTextColor, secondaryColor, dividerColor, altCardBackground,
          mediumTextColor
        } = uiTheme.palette[tInfo.colorTheme];
  const { fontRegular 
        } = uiTheme;
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    statLine: {
      flexDirection: "row",
      alignItems: "center",
      height: 30,
      marginLeft: 10,
      marginRight: 10,
    },
    statLineTitle:{
      zIndex: 3,
      paddingBottom: 5,
    },
    statTitleItem: {
      height: 30,
      flexDirection: "row",
    },
    statLineTitleText: {
      flex: 1,
      fontSize: 18,
      fontFamily: fontRegular,
      textAlign: "center",
      color: trekLogBlue
    },
    statLineTotal:{
      height: 35,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    statLineTotalLabelText: {
      fontSize: 18,
      marginTop: 3,
      fontFamily: fontRegular,
      color: highTextColor
    },
    statLineTotalValueText: {
      fontSize: 22,
      fontFamily: fontRegular,
      color: highTextColor
    },
    graphArea: {
      backgroundColor: "transparent",
      height: graphAreaHeight,
      marginLeft: 0,
      marginRight: 10,
    },
    graphStyle: {
      height: graphHeight, 
      width: graphWidth,
    },
    emptyGraphArea: {
      height: graphHeight,
      justifyContent: "center"
    },
    graph: {
      marginLeft: yAxisWidth,
    },
    statTypeUnderline: {
      marginTop: -9,
      width: statLabelWidth - 8,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: secondaryColor,
    },
    intervalTypeUnderline: {
      marginTop: -9,
      width: intervalLabelWidth - 12,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: secondaryColor,
    },
    barStyle: { height: graphHeight, 
      width: gBarWidth,
      paddingHorizontal: 2,
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
})

return useObserver(() => (
  <SlideUpView 
    bgColor="transparent"
    startValue={summaryHeight}
    endValue={0}
    open={sumSvc.ftCount !== 0}
    beforeOpenFn={setVisible}
    afterCloseFn={setNotVisible}
  >
    <View style={{...styles.statLine, ...styles.statLineTitle}}>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowIntervalType('daily')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Daily</Text>
        </View>
      </BorderlessButton>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowIntervalType('weekly')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Weekly</Text>
        </View>
      </BorderlessButton>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowIntervalType('monthly')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Monthly</Text>
        </View>
      </BorderlessButton>
    </View>
    <HorizontalSlideView 
      endValue={(sumSvc.intervalIndex * (intervalLabelWidth+1)) + 14}
      duration={500}>
      <View style={styles.intervalTypeUnderline}/>
    </HorizontalSlideView>                  
    <View style={{...styles.statLine, ...styles.statLineTitle}}>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowStatType('time')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Duration</Text>
        </View>
      </BorderlessButton>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowStatType('dist')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Distance</Text>
        </View>
      </BorderlessButton>
      <BorderlessButton
        style={{flex: 1}}
        rippleColor={rippleColor}
        onPress={() => updateShowStatType('cals')}
      >
        <View style={styles.statTitleItem}>
          <Text style={styles.statLineTitleText}>Calories</Text>
        </View>
      </BorderlessButton>
      {showSteps &&
        <BorderlessButton
          style={{flex: 1}}
          rippleColor={rippleColor}
          onPress={() => updateShowStatType('steps')}
        >
          <View style={styles.statTitleItem}>
            <Text style={styles.statLineTitleText}>Steps</Text>
          </View>
        </BorderlessButton>
      }
    </View>
    <HorizontalSlideView 
      endValue={(sumSvc.statIndex * (statLabelWidth + 1)) + 14}
      duration={500}>
      <View style={styles.statTypeUnderline}/>
    </HorizontalSlideView>                  
    {sumSvc.barGraphData &&
      <View style={styles.graphArea}>
        <SvgYAxis
          graphHeight={graphHeight}
          axisTop={maxBarHeight}
          axisBottom={10}
          axisWidth={yAxisWidth}
          color={mediumTextColor}
          lineWidth={1}
          majorTics={5}
          title={sumSvc.barGraphData[sumSvc.showStatType].title}
          dataRange={sumSvc.barGraphData[sumSvc.showStatType].range}
          dataType={YAXIS_TYPE_MAP[sumSvc.showStatType]}
        />
        <View style={styles.graph}>
          <SvgGrid
            graphHeight={graphHeight}
            gridWidth={graphWidth}
            lineCount={3}
            color={dividerColor}
            maxBarHeight={maxBarHeight}
            minBarHeight={10}
          />
          <BarDisplay
            data={sumSvc.barGraphData[sumSvc.showStatType].items}
            dataRange={sumSvc.barGraphData[sumSvc.showStatType].range}
            openFlag={haveTreks && sumSvc.ftCount && sumSvc.openItems}
            selectFn={showFn}
            selected={sumSvc.selectedInterval}
            hideScrollBar
            style={styles.graphStyle}
            barStyle={styles.barStyle}
            maxBarHeight={maxBarHeight}
            minBarHeight={10}
            labelAngle={287}
            scrollToBar={scrollToBar}
            gradientEnd={altCardBackground}
            allowEmptyBars={sumSvc.allowEmptyIntervals}
          />
        </View>
      </View>
    }
    <View style={{flexDirection: "row", justifyContent: "space-between"}}>
      <View style={{...styles.statLine, ...styles.statLineTotal}}>
        <Text style={{...styles.statLineTotalLabelText, ...{marginRight: 15}}}>
                              {getIntervalDisplayTotalTitle(  )}</Text>
        <Text style={styles.statLineTotalValueText}>
                              {getIntervalDisplayTotal(sumSvc.showStatType)}</Text>
      </View>
      <View style={{...styles.statLine, ...styles.statLineTotal}}>
        <Text style={{...styles.statLineTotalLabelText, ...{marginRight: 15}}}>
                              {getDisplayTotalTitle()}</Text>
        <Text style={styles.statLineTotalValueText}>
                              {getDisplayTotal(sumSvc.showStatType)}</Text>
      </View>
    </View>
  </SlideUpView>

  ))
}
export default SummaryIntervals;
