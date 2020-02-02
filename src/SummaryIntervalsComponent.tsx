import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useObserver } from "mobx-react-lite";
import { BorderlessButton } from 'react-native-gesture-handler'

import { UiThemeContext, UtilsSvcContext, SummarySvcContext,
         INVISIBLE_Z_INDEX, NUMBERS_BAR_Z_INDEX, MainSvcContext, FilterSvcContext } from "./App";
import { UtilsSvc, DateInterval } from './UtilsService';
import BarDisplay from "./BarDisplayComponent";
import HorizontalSlideView from './HorizontalSlideComponent';
import SvgYAxis, { YAXIS_TYPE_MAP } from './SvgYAxisComponent';
import SvgGrid from './SvgGridComponent';
import SlideUpView from './SlideUpComponent';
import { SummarySvc, ActivityStatType, ActivityStatsInterval } from './SummarySvc';
import { MainSvc, TREK_TYPE_CHOICES, TREK_SELECT_BITS, DIST_UNIT_CHOICES } from "./MainSvc";
import { FilterSvc } from "./FilterService";

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
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);
  const sumSvc: SummarySvc = useContext(SummarySvcContext);
  const fS : FilterSvc = useContext(FilterSvcContext)

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

  function updateShowStatType(sType: ActivityStatType) {
    sumSvc.setOpenItems(false);
    requestAnimationFrame(() => {
      sumSvc.processShowStatTypeChange(sType);
      sumSvc.setOpenItems(true);
    })
  }

  // set the showIntervalType property
  function updateShowIntervalType(iType: DateInterval) {
    sumSvc.setOpenItems(false);
    scrollBarGraph(0);
    sumSvc.processShowIntervalTypeChange(iType);
  }

  // format the TITLE for the total line displayed below the graph
  function getIntervalDisplayTotalTitle() {
    if ((fS.typeSelections & sumSvc.activeTypes) === 0) { return 'No Type Selected'; }
    if (sumSvc.totalCounts(fS.typeSelections)){
      return INTERVAL_LABELS[sumSvc.showIntervalType] + ':';
    } else {
      return 'No Data for Selected Types';
    }
  }

  // format the TITLE for the total line displayed below the graph
  function getDisplayTotalTitle() {
    if (!fS.typeSelections || !sumSvc.totalCounts(fS.typeSelections)) { 
      return ''; 
    } else {
      return 'Total:';
    }
  }

  // compute and format the VALUE for the total line displayed below the graph
  function getDisplayTotal(sType: ActivityStatType) {
    if (!sumSvc.activityData.length || !fS.typeSelections) { return ''; }
    if (sumSvc.totalCounts(fS.typeSelections)){
      let tData = totalStatForSelectedTypes(sType, fS.typeSelections);
      switch(sType){
        case 'dist':
          return formattedDist(tData.stat);
        case 'time':
          return formattedTime(tData.stat);
        case 'speed':
          return formattedSpeed(tData.stat, tData.time)
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
    if (!sumSvc.activityData.length || !fS.typeSelections) { return ''; }
    if (sumSvc.totalCounts(fS.typeSelections)){
      let iData = intervalTotalForSelectedTypes(sumSvc.activityData[sumSvc.selectedInterval], 
                                                sType, fS.typeSelections)
      switch(sType){
        case 'dist':
          return formattedDist(iData.stat);
        case 'time':
          return formattedTime(iData.stat);
        case 'speed':
          return formattedSpeed(iData.stat, iData.time)
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
          if (sType === 'speed'){
            stat += iData.data[tType].dist;
          } else {
            stat += iData.data[tType][sType];     // add to total
          }
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
    return uSvc.formatDist(dist, DIST_UNIT_CHOICES[mainSvc.measurementSystem]);
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

  function formattedSpeed(dist: number, time: number) {
    let val: number, prec: number;
    let sys = mainSvc.measurementSystem;

    val = sumSvc.showAvgSpeed 
            ? uSvc.computeRoundedAvgSpeed(sys, dist, time)
            : (time / uSvc.convertDist(dist, mainSvc.distUnits()));
    prec = val < 10 ? 10 : 1;
    let c = Math.round(val * prec) / prec;
    c = isNaN(c) ? 0 : c;
    return  (sumSvc.showAvgSpeed
      ? (c.toString() + " " + mainSvc.speedUnits()) 
      : (uSvc.timeFromSeconds(c) + "/" + mainSvc.distUnits()));
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
  const minBarHeight = 20;
  const yAxisWidth = 60;
  const graphWidth = statAreaWidth - yAxisWidth - 10;
  const gBarWidth = 25; 
  const showSteps = sumSvc.haveStepData();
  const numStats = showSteps ? 5 : 4;
  const statLabelWidth = (statAreaWidth - 20) / numStats;
  const statLabelUnderlineWidth = statLabelWidth - 8;
  const intervalLabelWidth = (statAreaWidth - 20) / 3;
  const intervalLabelUnderlineWidth = intervalLabelWidth - 12;
  const labelMarginTop = -9;
  const graphLabelType = (sumSvc.showStatType === 'speed' && !sumSvc.showAvgSpeed)
                          ? YAXIS_TYPE_MAP['pace'] : YAXIS_TYPE_MAP[sumSvc.showStatType];

  const { rippleColor, trekLogBlue, highTextColor, secondaryColor,
          mediumTextColor
        } = uiTheme.palette[mainSvc.colorTheme];
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
    barStyle: { 
      height: graphHeight, 
      width: gBarWidth,
      paddingHorizontal: 2,
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
})

const IntervalButton = ({selectFn, value, label}) => {
  return (  
    <BorderlessButton
      style={{flex: 1}}
      rippleColor={rippleColor}
      onPress={() => selectFn(value)}
    >
      <View style={styles.statTitleItem}>
        <Text style={styles.statLineTitleText}>{label}</Text>
      </View>
    </BorderlessButton>
  )
}

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
      <IntervalButton selectFn={updateShowIntervalType} value='daily' label='Daily'/>
      <IntervalButton selectFn={updateShowIntervalType} value='weekly' label='Weekly'/>
      <IntervalButton selectFn={updateShowIntervalType} value='monthly' label='Monthly'/>
    </View>
    <HorizontalSlideView 
      index={sumSvc.intervalIndex}
      width={intervalLabelWidth}
      underlineWidth={intervalLabelUnderlineWidth}
      underlineMarginTop={labelMarginTop}
      color={secondaryColor}
      offset={16}
      duration={500}/>
    <View style={{...styles.statLine, ...styles.statLineTitle}}>
      <IntervalButton selectFn={updateShowStatType} value='time' label='Time'/>
      <IntervalButton selectFn={updateShowStatType} value='dist' label='Dist'/>
      <IntervalButton selectFn={updateShowStatType} value='speed' label='Speed'/>
      <IntervalButton selectFn={updateShowStatType} value='cals' label='Cals'/>

      {showSteps &&
        <IntervalButton selectFn={updateShowStatType} value='steps' label='Steps'/>
      }
    </View>
    <HorizontalSlideView 
      index={sumSvc.statIndex}
      width={statLabelWidth}
      underlineWidth={statLabelUnderlineWidth}
      underlineMarginTop={labelMarginTop}
      color={secondaryColor}
      offset={14}
      duration={500}/>
    {sumSvc.barGraphData &&
      <View style={styles.graphArea}>
        <SvgYAxis
          graphHeight={graphHeight}
          axisTop={maxBarHeight}
          axisBottom={minBarHeight}
          axisWidth={yAxisWidth}
          color={mediumTextColor}
          lineWidth={1}
          majorTics={5}
          title={sumSvc.barGraphData[sumSvc.showStatType].title}
          dataRange={sumSvc.barGraphData[sumSvc.showStatType].range}
          dataType={graphLabelType}
        />
        <View style={styles.graph}>
          <SvgGrid
            graphHeight={graphHeight}
            gridWidth={graphWidth}
            lineCount={3}
            colorTheme={mainSvc.colorTheme}
            maxBarHeight={maxBarHeight}
            minBarHeight={minBarHeight}
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
            minBarHeight={minBarHeight}
            labelAngle={287}
            scrollToBar={scrollToBar}
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
export default React.memo(SummaryIntervals);
