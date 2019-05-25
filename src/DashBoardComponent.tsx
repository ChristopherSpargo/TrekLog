import React, { Component } from 'react'
import { View, Text, StyleSheet} from 'react-native'
import { BorderlessButton } from 'react-native-gesture-handler'

import { observable, action } from 'mobx'
import { observer, inject } from 'mobx-react'

import { TrekInfo, TrekObj, SWITCH_SPEED_AND_TIME, 
         TREK_TYPE_CHOICES, TrekType, DIST_UNIT_CHOICES, TREK_SELECT_BITS, ALL_SELECT_BITS,
         TREK_TYPE_BIKE, TREK_TYPE_RUN, TREK_TYPE_WALK, TREK_TYPE_HIKE,
         BIKE_SELECT_BIT, WALK_SELECT_BIT, RUN_SELECT_BIT, HIKE_SELECT_BIT} from './TrekInfoModel'
import { TREK_TYPE_COLORS_OBJ, HEADER_HEIGHT, NUMBERS_BAR_Z_INDEX, INVISIBLE_Z_INDEX } from './App'
import { UtilsSvc } from './UtilsService';
import { TIME_FRAME_DISPLAY_NAMES } from './ReviewComponent';
import TreksPieChart from './TreksPieChartComponent';
import { FilterSvc } from './FilterService';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';
import SlideUpView from './SlideUpComponent';


@inject('trekInfo', 'utilsSvc', 'uiTheme', 'filterSvc')
@observer
class DashBoard extends Component<{ 
  trekCount ?: number,
  uiTheme ?: any,
  navigation ?: any,
  utilsSvc ?: UtilsSvc,
  filterSvc ?: FilterSvc,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  uSvc = this.props.utilsSvc;
  numTreks = -1;
  typeCounts = {            // counts for each trek type
    Walk: 0,
    Run: 0,
    Bike: 0,
    Hike: 0
  }

  @observable dataReady: boolean;
  @observable showSpeedOrTime: string;
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;
  @observable summaryOpen : boolean;
  @observable zValue;

  trekTally = 0;
  distTally = 0;
  durationTally = 0;
  TCBcalorieTally = 0;
  NCBcalorieTally = 0;
  stepTally = 0;
  typeSels = 0;
  defDtMin = '';
  defDtMax = '';
  filterRuns = 0;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentDidMount() {
    this.init();
  }

  componentDidUpdate() {
    if (this.tInfo.updateDashboard && this.props.trekInfo.dataReady){
      if( this.typeSels     !== this.tInfo.typeSelections ||            
          this.numTreks     !== this.props.trekCount ||
          this.filterRuns   !== this.fS.filterRuns ){
        this.numTreks = this.props.trekCount;
        this.updateDashboard();
      }
    }
  }

  updateDashboard = () => {
    this.typeSels = this.tInfo.typeSelections;
    this.tInfo.setTypeSelections(ALL_SELECT_BITS);
    this.fS.filterTreks(false);
    this.filterRuns = this.fS.filterRuns;
    this.tInfo.setTypeSelections(this.typeSels);
    this.scanTreks();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.dataReady = true;
    this.showSpeedOrTime = 'speed';
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.summaryOpen = false;
    this.zValue = INVISIBLE_Z_INDEX;
  }

  init = () => {
    this.fS.setTrekType();
    this.fS.setDateMax(this.tInfo.dtMax, 'None');
    this.fS.setDateMin(this.tInfo.dtMin, this.tInfo.timeframe !== 'Custom' ? 'None' : undefined);
    this.fS.findActiveTimeframe(this.tInfo.timeframe, false);  // filter the treks but don't select one
    this.scanTreks();
  }

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  }

  setVisible = () => {
    this.setZValue(NUMBERS_BAR_Z_INDEX);
  }

  setNotVisible = () => {
    this.setZValue(INVISIBLE_Z_INDEX);
  }

  @action
  updateTypeSels = (value: TrekType, toggle: boolean) => {
    if (toggle) {
      this.tInfo.updateTypeSelections(value, !(this.tInfo.typeSelections & TREK_SELECT_BITS[value]));
    } else {
      this.tInfo.setTypeSelections(TREK_SELECT_BITS[value]);
    }
    this.scanTreks();
  }

  @action
  setDataReady = (value: boolean) => {
    this.dataReady = value;
  }

  // Tally data from relevant treks
  scanTreks = () => {
    let at = this.tInfo.allTreks;
    let treks = this.fS.filteredTreks;

    this.setDataReady(false);
    this.clearTallys();
    this.clearTypeCounts();
    if (treks.length) {
      let dMin = '999999999999';
      let dMax = '000000000000';
      for( let i=0; i<treks.length; i++){
        let t = at[treks[i]];
        this.typeCounts[t.type]++;        // inc count for type
        if ((TREK_SELECT_BITS[t.type] & this.tInfo.typeSelections)) { // type for summary?
          this.tallyTrek(t);    // tally info for summary display
          let d = t.sortDate;
          if (d < dMin) { dMin = d; this.defDtMin = t.date};
          if (d > dMax) { dMax = d; this.defDtMax = t.date};
        }
      }
    }
    else {
      this.defDtMax = 'N/A';
      this.defDtMin = 'N/A';
    }
    this.fS.setFoundType(this.totalCounts(this.tInfo.typeSelections) !== 0);
    this.setDataReady(true);
  }

  // Clear the count of each trek type
  clearTypeCounts = () => {
    TREK_TYPE_CHOICES.forEach((type) => this.typeCounts[type] = 0);
  }

  // Return the total counts for each trek type
  totalCounts = (sels: number) => {
    let total = 0;

    TREK_TYPE_CHOICES.forEach((type) => total += (sels & TREK_SELECT_BITS[type]) ? this.typeCounts[type] : 0);
    return total;
  }

  // clear all the data tallys
  clearTallys = () => {
    this.trekTally = 0;
    this.distTally = 0;
    this.durationTally = 0;
    this.NCBcalorieTally = 0;
    this.TCBcalorieTally = 0;
    this.stepTally = 0;
  }

  // Compute all summary values for the given trek and add to the appropriate tallys
  tallyTrek = (t: TrekObj) => {
    let cals : number;

    this.trekTally++;
    this.distTally += t.trekDist;
    this.durationTally += t.duration;
    cals = t.calories;
    this.TCBcalorieTally += cals;
    this.NCBcalorieTally += this.uSvc.getCaloriesPerMin(cals, t.duration);
    let sl = t.type !== TREK_TYPE_BIKE ? t.strideLength : 0;
    this.stepTally += this.uSvc.computeStepCount(t.trekDist, sl);
  }

  formattedAvgSpeed = () => {

    if (this.showSpeedOrTime === 'speed') {
      return this.uSvc.formatAvgSpeed(this.tInfo.measurementSystem, this.distTally, this.durationTally);
    }
    return this.uSvc.formatTimePerDist(DIST_UNIT_CHOICES[this.tInfo.measurementSystem], 
                                                  this.distTally, this.durationTally);
  }

  formattedDist = () => {
    let dist = this.uSvc.formatDist(this.distTally, DIST_UNIT_CHOICES[this.tInfo.measurementSystem]);
    let i = dist.indexOf(' ');
    return {value: dist.substr(0,i), units: dist.substr(i)};
  }

  formattedTime = () => {
    return {value: this.uSvc.formatDuration(this.durationTally), units: ''};
  }

  formattedCals = () => {
    let val = this.showTotalCalories ? this.TCBcalorieTally : 
              this.props.utilsSvc.getCaloriesPerMin(this.TCBcalorieTally, this.durationTally);
    let prec = val < 10 ? 10 : 1;
    return {value: (Math.round(val * prec) / prec).toString(),
            units: ''}; 
  }

  formattedSteps = () => {
    if (this.showStepsPerMin) {
      return {value: Math.round(this.stepTally / (this.durationTally / 60)).toString(),
              units: ''};
    }
    return {value: this.stepTally.toString(), units: ''};
  }

  // toggle between displaying time/distance and distance/time
  @action
  toggleAvgSpeedorTimeDisplay = () => {
    this.showSpeedOrTime = SWITCH_SPEED_AND_TIME[this.showSpeedOrTime];
  }

  // toggle between displaying total steps and steps/min
  @action
  toggleShowStepsPerMin = () => {
    this.showStepsPerMin = !this.showStepsPerMin;
  }

  // toggle between displaying total calories and calories/min
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
  }

  setType = (value: TrekType) => {
      this.updateTypeSels(value, false);
  }

  toggleType = (value: TrekType) => {
      this.updateTypeSels(value, true);
  }

  render() {

    const haveTreks = !this.fS.filteredTreksEmpty();
    const typeIconAreaSize = 55;
    const summaryHeight = 200;
    const statTitleIconSize = 24;
    const noSelection = this.tInfo.typeSelections === 0;
    const calsLabel = this.showTotalCalories ? 'Calories' : 'Calories/Min';
    const stepsLabel = this.showStepsPerMin ? 'Steps/Min' : 'Steps';
    const minItemWidth = 120;
    const { highTextColor, trekLogBlue, disabledTextColor, mediumTextColor,
            rippleColor } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];

    let data = [];
    // Build the data object for the PieChart
    TREK_TYPE_CHOICES.forEach((type) =>{
      if (this.typeCounts[type]){
        data.push({ value: this.typeCounts[type], color: TREK_TYPE_COLORS_OBJ[type], 
                    type: type,
                  })
      }
    })
      
    const styles = StyleSheet.create({
      container: {
        flexDirection: "column",
      },
      timeFrameArea: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      statHeadingArea: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 5,
        marginBottom: 2,
      },
      statHeading1: {
        fontSize: 20,
        fontStyle: "italic",
        color: disabledTextColor,
      },
      userText: {
        fontSize: 22,
        color: highTextColor,
      },
      statTitleIcon: {
        width: statTitleIconSize,
        height: statTitleIconSize,
        marginRight: 4,
        backgroundColor: "transparent"
      },
      noMatches: {
        marginTop: 100,
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 22,
      },
      chartAndTypes: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 10,
        marginTop: 5,
        marginBottom: 20,
      },
      typeControls: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
      controlButton: {
        justifyContent: "center",
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      rowCenter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      dateInputArea: {
        height: 25,
      },
      dateTimeArea: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      },
      dateInputText: {
        color: disabledTextColor,
        fontSize: 22,
      },
      toText: {
        fontSize: 20,
        color: highTextColor,
      },
      timeFrameName:{
        fontSize: 20,
        fontWeight: "bold",
        color: highTextColor,
      },
      summaryArea: {
        flexDirection: "column",
        left: 0,
        right: 0,
        bottom: 0,
        height: summaryHeight,
        overflow: "hidden",
        backgroundColor: "transparent",
        justifyContent: "center",
        zIndex: this.zValue,
      },
      shortStats: {
        // alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: 3,
      },
      statPair: {
        height: (summaryHeight - 3) / 3,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
      },
      shortStat: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
      },
      shortStatValue: {
        fontSize: 50,
        fontWeight: "300",
        color: highTextColor,
      },
      shortStatUnits: {
        fontSize: 28,
        marginBottom: 2,
        fontWeight: "300",
        color: trekLogBlue,
      },
      statItem: {
        // flex: 1,
        alignItems: "center",
        justifyContent: "center",
      },
      statLabel: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        minWidth: minItemWidth,
        paddingBottom: 5,
      },
      statLabelText: {
        color: mediumTextColor,
        fontSize: 16,
      },
      statValue: {
        minWidth: minItemWidth,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: disabledTextColor,
      },
      statValueText: {
        color: highTextColor,
        fontSize: 36,
      },
      statUnitsText: {
        color: highTextColor,
        marginBottom: 4,
        fontSize: 24,
      },
    });

    const StatItem = (props: any) => {
      return (
        <View style={styles.statItem}>
          <BorderlessButton rippleColor={props.switchFn ? rippleColor : "transparent"} 
                      onPress={props.switchFn ? props.switchFn : undefined}>
            <View style={styles.statValue}>
              <Text style={[styles.statValueText, props.valueStyle]}>
                            {this.props.utilsSvc.zeroSuppressedValue(props.item.value)}</Text>
              <Text style={styles.statUnitsText}>{props.item.units}</Text>
            </View>
            <View style={styles.statLabel}>
              <Text style={[styles.statLabelText, props.switchFn ? {color: trekLogBlue} : {}]}>
                                    {props.label}</Text>
            </View>
          </BorderlessButton>
        </View>
      )
    }


    return (
      <View style={styles.container}>
        {(!haveTreks && !this.tInfo.resObj && this.fS.filterRuns) &&
          <View style={{height: 205}}>
            <Text style={styles.noMatches}>Nothing To Display for {this.tInfo.group}</Text>
          </View>
        }
        {(haveTreks && this.fS.filterRuns) &&
          <View style={styles.chartAndTypes}>
            <View style={styles.typeControls}>
              <SvgButton 
                value={TREK_TYPE_HIKE}
                onPressFn={this.toggleType}
                onLongPressFn={this.setType}
                size={typeIconAreaSize}
                style={[styles.controlButton, {marginBottom: 15}]}
                fill={TREK_TYPE_COLORS_OBJ.Hike}
                path={APP_ICONS.Hike}
                highlight={((this.tInfo.typeSelections & HIKE_SELECT_BIT) !== 0) && 
                            (this.typeCounts.Hike !== 0)}
              />
              <SvgButton 
                value={TREK_TYPE_BIKE}
                onPressFn={this.toggleType}
                onLongPressFn={this.setType}
                size={typeIconAreaSize}
                style={styles.controlButton}
                fill={TREK_TYPE_COLORS_OBJ.Bike}
                path={APP_ICONS.Bike}
                highlight={((this.tInfo.typeSelections  & BIKE_SELECT_BIT) !== 0) &&
                           (this.typeCounts.Bike !== 0)}
                svgWidthAdj={4}
              />
            </View>
            <TreksPieChart 
              selectFn={this.updateTypeSels} 
              data={data} 
              selected={this.tInfo.typeSelections}
            />
            <View style={styles.typeControls}>
              <SvgButton 
                value={TREK_TYPE_WALK}
                onPressFn={this.toggleType}
                onLongPressFn={this.setType}
                size={typeIconAreaSize}
                style={[styles.controlButton, {marginBottom: 15}]}
                fill={TREK_TYPE_COLORS_OBJ.Walk}
                path={APP_ICONS.Walk}
                highlight={((this.tInfo.typeSelections & WALK_SELECT_BIT) !== 0) &&
                           (this.typeCounts.Walk !== 0)}
              />
              <SvgButton 
                value={TREK_TYPE_RUN}
                onPressFn={this.toggleType}
                onLongPressFn={this.setType}
                style={styles.controlButton}
                size={typeIconAreaSize}
                fill={TREK_TYPE_COLORS_OBJ.Run}
                path={APP_ICONS.Run}
                highlight={((this.tInfo.typeSelections  & RUN_SELECT_BIT) !== 0) &&
                           (this.typeCounts.Run !== 0)}
              />
            </View>
          </View>
        }
        <View style={styles.dateTimeArea}>
          <View>
            <View style={styles.timeFrameArea}>
              <Text style={styles.timeFrameName}>{TIME_FRAME_DISPLAY_NAMES[this.tInfo.timeframe]}</Text>
            </View>
            {(haveTreks || this.tInfo.timeframe !== 'All') &&
              <View style={[styles.rowCenter, {marginBottom: 20}]}>
                <View style={[styles.rowStart, styles.dateInputArea]}>
                  <Text style={styles.dateInputText}>
                  {this.fS.dateMin === '' ? this.defDtMin : this.fS.dateMin}</Text>
                </View>
                <Text style={styles.toText}> - </Text>
                <View style={[styles.rowStart, styles.dateInputArea]}>
                  <Text style={styles.dateInputText}>
                  {this.fS.dateMax === '' ? this.defDtMax : this.fS.dateMax}</Text>
                </View>
              </View>
            }
          </View>
        </View>
        {(this.props.trekInfo.dataReady && this.dataReady && !noSelection && haveTreks && (this.trekTally === 0)) && 
          <View style={styles.statHeadingArea}>
            <Text style={styles.statHeading1}>
              {'No ' + this.props.filterSvc.getTitleActivity() + ' data for selected period.'}</Text>
          </View>
        }
        {(this.props.trekInfo.dataReady && this.dataReady && noSelection && haveTreks) && 
          <View style={styles.statHeadingArea}>
            <Text style={styles.statHeading1}>No type selected.</Text>
          </View>
        }
        <View style={styles.summaryArea}>
          <SlideUpView 
            bgColor="transparent"
            startValue={summaryHeight}
            endValue={0}
            open={!noSelection && (this.trekTally > 0)}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={styles.shortStats}>
              <View style={styles.statPair}>
                <StatItem item={this.formattedTime()} label='Time'/>
              </View>
              <View style={styles.statPair}>
                <View style={[styles.shortStat]}>
                  <StatItem item={this.formattedDist()} label='Distance'
                                  switchFn={this.tInfo.switchMeasurementSystem}/>
                </View>
                <View style={[styles.shortStat]}>
                  <StatItem item={this.formattedCals()} label={calsLabel}
                                  switchFn={this.toggleShowTotalCalories}/>
                </View>
              </View>
              <View style={styles.statPair}>
                <View style={styles.shortStat}>
                  <StatItem item={this.formattedSteps()} label={stepsLabel}
                                  switchFn={this.toggleShowStepsPerMin}/>
                </View>
              </View>
            </View>
          </SlideUpView>
        </View>
      </View>
    )
  }
}

export default DashBoard;