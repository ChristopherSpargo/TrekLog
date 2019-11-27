import { action, observable } from 'mobx';

import { TrekInfo, TrekObj, NumericRange, TREK_TYPE_CHOICES,
         TREK_SELECT_BITS, TrekTypeDataNumeric, STEPS_APPLY, TREKS_WITH_STEPS_BITS
       } from './TrekInfoModel'
import { UtilsSvc, SortDateRange, DateInterval } from './UtilsService';
import { BarData, BarGraphInfo } from "./BarDisplayComponent";
import { FilterSvc } from './FilterService';

export type ActivityStatType = 'time' | 'dist' | 'speed' | 'cals' | 'steps';
export const STAT_CATS : ActivityStatType[] = ['time', 'dist', 'speed', 'cals', 'steps'];
export const INTERVAL_CATS : DateInterval[] = ['daily', 'weekly', 'monthly']; 

export interface ActivityBarGraphData {
  time: BarGraphInfo,
  dist: BarGraphInfo,
  speed: BarGraphInfo,
  cals: BarGraphInfo,
  steps: BarGraphInfo,
}

export interface ActivityStats {
  treks:    number,
  time:     number,
  dist:     number,
  cals:     number,
  steps:    number,
  stepTime: number,
  maxCPM?:   number,
  maxSPM?:   number
}

export interface AllActivityStats {
  Walk:     ActivityStats,
  Run:      ActivityStats,
  Bike:     ActivityStats,
  Hike:     ActivityStats,
  Board:    ActivityStats,
  Drive:    ActivityStats,
  Selected: ActivityStats,        // this is the total of selected types
  Total:    ActivityStats         // this is the total of all types
}

export interface ActivityStatsInterval {
  interval: SortDateRange,      // start and end SortDates for the interval
  endDate: string,              // end date formatted as mm/dd/yy
  label: string,                // end date formatted as mm/dd
  data: AllActivityStats        // the statistics for the interval
}

export class SummarySvc {

  @observable ftCount;                // count of treks encountered from filterTreks (?)
  @observable dataReady: boolean;
  @observable openItems;
  @observable showAvgSpeed: boolean;
  @observable showStepsPerMin;
  @observable showTotalCalories;
  @observable showStatType : ActivityStatType;
  statIndex;
  @observable showIntervalType;
  @observable intervalIndex;
  @observable selectedInterval;
  @observable summaryZValue;
  @observable activeTypes : number;
  @observable allowEmptyIntervals : boolean;

  activityData : ActivityStatsInterval[] = [];
  barGraphData: ActivityBarGraphData;
  trekCountData : TrekTypeDataNumeric = {};
  scanCount = 0;
  returningFromGoalDetail = false;
  beforeRFBdateMin : string;
  beforeRFBdateMax : string;
  beforeRFBtimeframe : string;

  constructor ( private uSvc: UtilsSvc, private tInfo: TrekInfo, private fS: FilterSvc ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.setFTCount(0);
    this.setDataReady(false);
    this.setOpenItems(false);
    this.showAvgSpeed = true;
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.setShowStatType('time');
    this.setShowIntervalType('weekly');
    this.setSelectedInterval(-1);
    this.activeTypes = 0;
    this.setAllowEmptyIntervals(false);
  }

  // set the value of the dataReady property
  @action
  setDataReady = (value: boolean) => {
    this.dataReady = value;
  }

  @action
  setSummaryZValue = (val: number) => {
    this.summaryZValue = val;
  }

  // set the status of the allowEmptyIntervals property
  @action
  setAllowEmptyIntervals = (status: boolean) => {
    this.allowEmptyIntervals = status;
  }

  // set the status of the openItems property
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // set the showStatType and statIndex properties
  @action
  setShowStatType = (sType: ActivityStatType) => {
    this.showStatType = sType;
    this.statIndex = STAT_CATS.indexOf(sType)
  }

  // consolidate actions associated with a show interval type change
  @action
  processShowStatTypeChange = (sType : ActivityStatType) => {
    if (this.showStatType !== sType) {
      this.setShowStatType(sType);
    } else {
      switch(sType){
        case 'dist':
          this.tInfo.switchMeasurementSystem();
          this.buildGraphData();
          break;
        case 'speed':
          this.toggleAvgSpeedOrTimeDisplay();
          break;
        case 'cals':
          this.toggleShowTotalCalories();
          break;
        case 'steps':
          this.toggleShowStepsPerMin();
          break;
        default:
      }
    }
  }

  // set the showIntervalType and intervalIndex properties
  @action
  setShowIntervalType = (iType: DateInterval) => {
    this.showIntervalType = iType;
    this.intervalIndex = INTERVAL_CATS.indexOf(iType)
  }

  @action
  // consolidate actions associated with a show interval type change
  processShowIntervalTypeChange = (iType: DateInterval) => {
    this.setShowIntervalType(iType);
    this.scanTreks();
    this.findStartingInterval();
  }

  @action
  setSelectedInterval = (val: number) => {
    if(this.activityData.length || val === -1){
      this.selectedInterval = val;
    }
  }

  //set the selectedInterval to the first interval that satisfies the allowEmptyIntervals property
  findStartingInterval = (startAt = 0) => {
    if (this.allowEmptyIntervals) {
      this.setSelectedInterval(startAt);
    } else {  
      // start looking for non-empty interval at the current interval
      let items = this.barGraphData[this.showStatType].items;
      if (startAt > items.length) { startAt = items.length; }
      if (startAt < 0) { startAt = 0; }
      for(let i=startAt; i<items.length; i++){
        if(!items[i].showEmpty){
          this.setSelectedInterval(i);  // found one that isn't empty
          return;
        }
      }
      // continue search from beginning if no valid intervals found after startAt
      for(let i=0; i<startAt; i++){
        if(!items[i].showEmpty){
          this.setSelectedInterval(i);  // found one that isn't empty
          return;
        }
      }
      this.setSelectedInterval(-1);   // all empty intervals?
    }
  }

  @action
  setFTCount = (val: number) => {
    this.ftCount = val;
  }
  
  // toggle between displaying time/distance and distance/time
  @action
  toggleAvgSpeedOrTimeDisplay = () => {
    this.showAvgSpeed = !this.showAvgSpeed;
    this.buildGraphData();
  }

  // toggle between displaying total steps and steps/min
  @action
  toggleShowStepsPerMin = () => {
    this.showStepsPerMin = !this.showStepsPerMin;
    this.buildGraphData();
  }

  // toggle between displaying total calories and calories/min
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
    this.buildGraphData();
  }

  // return true if any selected and active types involve steps
  haveStepData = () => {
    let activeAndSelected = this.tInfo.typeSelections & this.activeTypes;
    return (activeAndSelected & TREKS_WITH_STEPS_BITS) !== 0;
  }

  // make sure the showStatType isn't 'steps' if they don't apply to the situation
  checkShowStatType = () => {
    if(this.showStatType === 'steps' && !this.haveStepData()) {
      this.setShowStatType('cals');
    }
  }

  // Tally data from relevant treks
  @action
  scanTreks = () => {
    let index = 0;
    let at = this.tInfo.allTreks;
    let treks = this.fS.filteredTreks;
    let t : TrekObj;

    // alert('in ScanTreks ' + ++this.scanCount)
    this.setOpenItems(false);
    this.setFTCount(treks.length);
    this.resetTrekCountData();
    this.resetActivityData(this.showIntervalType);
    try {      
      if (treks.length) {
        for( let i=0; i<treks.length; i++){
          t = at[treks[i]];
          while(t.sortDate < this.activityData[index].interval.start) { index++ };
          this.tallyTrek(t, index);    // tally info for summary display
        }
      }
    } catch (error) {
      alert(index + '\n' + 
            this.activityData.length + '\n' +
            t.sortDate + '\n' +
            JSON.stringify(this.activityData,null,2)) 
      throw error;      
    }
    this.fS.setFoundType(this.totalCounts(this.tInfo.typeSelections) !== 0);
    this.setActiveTypes();
    this.checkShowStatType();
    this.buildGraphData();
    this.setOpenItems(true);
  }

  // Reset the trekCountData (count of treks of each type) structure
  resetTrekCountData = () => {
    this.trekCountData = {
      Walk: 0, Run: 0, Bike: 0, Hike: 0, Board: 0, Drive: 0
    }
  }

  // Reset the activityData structure
  resetActivityData = (iType: DateInterval) => {
    let sDate = this.uSvc.formatSortDate(this.fS.dateMin);
    let eDate = this.uSvc.formatShortSortDate(this.fS.dateMax) + '9999';
    let ints = this.uSvc.dateIntervalList(sDate, eDate, iType);
    this.activityData = [];

    // now create an AllActivityStats item for each interval
    // go backwards so activityData has most recent interval 1st
    for(let i=ints.length-1; i>=0; i--){  
      let ieDate = this.uSvc.dateFromSortDateYY(ints[i].end);

      this.activityData.push({interval: ints[i], endDate: ieDate, label: ieDate.substr(0,5),
        data: {
          Walk:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Run:      {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Bike:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Hike:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Board:    {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Drive:    {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Selected: {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0},
          Total:    {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0}
        }
      })
    }
  }

  // Return the total counts for types set in the sels parameter
  totalCounts = (sels: number) => {
    let total = 0;

    TREK_TYPE_CHOICES.forEach((type) => total += (sels & TREK_SELECT_BITS[type]) ? 
                        this.trekCountData[type] : 0);
    return total;
  }

  @action
  setActiveTypes = () => {
    this.activeTypes = 0;

    TREK_TYPE_CHOICES.forEach((type) => {
      if (this.trekCountData[type]) {
        this.activeTypes |= TREK_SELECT_BITS[type];
      } 
    });
  }

  // Compute all summary values for the given trek and add to the appropriate tallys
  tallyTrek = (t: TrekObj, interval: number) => {
    let cals: number = t.calories;
    let selectedType = TREK_SELECT_BITS[t.type] & this.tInfo.typeSelections;
    let iData = this.activityData[interval];

    this.trekCountData[t.type]++;   // count a trek of this type

    iData.data.Total.treks++;                   // inc overall treks Total
    if (selectedType) {iData.data.Selected.treks++;} // inc selected treks total
    iData.data[t.type].treks++;                 // inc trek count for type

    iData.data.Total.dist += t.trekDist;        // add to overall dist Total
    if (selectedType) {iData.data.Selected.dist += t.trekDist;}
    iData.data[t.type].dist += t.trekDist;
    
    iData.data.Total.time += t.duration;        // add to overall time Total
    if (selectedType) {iData.data.Selected.time += t.duration;}
    iData.data[t.type].time += t.duration;

    iData.data.Total.cals += cals;              // add to overall cals Total
    if (selectedType) {iData.data.Selected.cals += cals;}
    iData.data[t.type].cals += cals;
    let calsPM = this.uSvc.getCaloriesPerMin(t.calories, t.duration, true);
    if (calsPM > iData.data.Total.maxCPM) { iData.data.Total.maxCPM = calsPM; }

    if (STEPS_APPLY[t.type]){
      let sc = this.uSvc.computeStepCount(t.trekDist, t.strideLength)
      iData.data.Total.steps += sc;              // add to overall steps Total
      iData.data.Total.stepTime += t.duration;   // add to overall stepTime Total
      if (selectedType) {
        iData.data.Selected.steps += sc;         // add to selected steps Total
        iData.data.Selected.stepTime += t.duration; // add to selected stepTime Total
      }
      iData.data[t.type].steps += sc;             // add to type steps Total
      iData.data[t.type].stepTime += t.duration;  // add to type stepTime Total
      let stepsPM = this.uSvc.computeStepsPerMin(sc, t.duration, true);
      if (stepsPM > iData.data.Total.maxSPM) { iData.data.Total.maxSPM = stepsPM; }
      }
  }

  // get the range of values present in the activityData info for the given stat category
  getStatDataRange = (sType: ActivityStatType) => {
    let minV = 0;
    let maxV = -99999;

    this.activityData.forEach((iData: ActivityStatsInterval) => {
      let tData = iData.data.Total
      let val;
      switch(sType){
        case 'time':
          val = tData.time;
          break;
        case 'dist':
          val = this.uSvc.getRoundedDist(tData.dist, this.tInfo.distUnits(), true)
          break;
        case 'speed':
          let sys = this.tInfo.measurementSystem;
          val = this.showAvgSpeed 
                          ? this.uSvc.computeRoundedAvgSpeed(sys, tData.dist, tData.time)
                          : (tData.time / this.uSvc.convertDist(tData.dist, this.tInfo.distUnits()));
          break;
        case 'cals':
          val = this.showTotalCalories ? tData.cals : tData.maxCPM;
          break;
        case 'steps':
          val = this.showStepsPerMin ? tData.maxSPM : tData.steps;
          break;
      }
      if (val > maxV) { maxV = val; }
    })
    maxV = Math.round(maxV*10)/10;
    return {max: maxV, min: minV, range: maxV}
  }

  // build the data structure used to display the activityData bar graphs
  buildGraphData = () => {
    let graphData : ActivityBarGraphData = {
      time: {items: [], range: {} as NumericRange},
      dist: {items: [], range: {} as NumericRange, title: this.tInfo.longDistUnitsCaps()},
      speed: {items: [], range: {} as NumericRange,
              title: this.showAvgSpeed 
              ? this.tInfo.speedUnits() : ("Time/" + this.tInfo.distUnits())},
      cals: {items: [], range: {} as NumericRange,
              title: this.showTotalCalories ? undefined : "Calories/min"},
      steps: {items: [], range: {} as NumericRange,
          title: this.showStepsPerMin ? "Steps/min" : undefined},
    };

    // for each stat category, build a graph with a bar for each interval
    STAT_CATS.forEach((sType) => {
      let typeRange : NumericRange = this.getStatDataRange(sType);
      graphData[sType].range = typeRange;
    })
    this.activityData.forEach((intData) => {
      graphData.time.items.push(this.getBarItem(intData, 'time'))
      graphData.dist.items.push(this.getBarItem(intData, 'dist'))
      graphData.speed.items.push(this.getBarItem(intData, 'speed'))
      graphData.cals.items.push(this.getBarItem(intData, 'cals'))
      graphData.steps.items.push(this.getBarItem(intData, 'steps'))
    })
    this.barGraphData = graphData;
  }

  getBarItem = (iData: ActivityStatsInterval, sType: ActivityStatType) => {
    let barItem : BarData = {} as BarData;
    let data = iData.data.Selected;
    let sys = this.tInfo.measurementSystem;
    let noData = '-';
    switch(sType){
      case "dist":
        let d = this.uSvc.getRoundedDist(data.dist, this.tInfo.distUnits(), true);
        barItem.value = d;
        // barItem.label1 = data.treks === 0 ? noData : d.toString();
        break;
      case "time":
        barItem.value = data.time;
        // barItem.label1 = data.treks === 0 ? noData : this.uSvc.timeFromSeconds(data.time);
        break;
      case "steps":
        barItem.value = this.showStepsPerMin ? this.uSvc.computeStepsPerMin(data.steps, data.stepTime) 
                                             : data.steps;
        // barItem.label1 = data.treks === 0 ? noData : (barItem.value).toString();
        break;
      case "cals":
        barItem.value = this.showTotalCalories ? data.cals 
                                               : this.uSvc.getCaloriesPerMin(data.cals, data.time); 
        // barItem.label1 = data.treks === 0 ? noData : (barItem.value).toString();
        break;
      case "speed":
        barItem.value = this.showAvgSpeed 
                          ? this.uSvc.computeRoundedAvgSpeed(sys, data.dist, data.time)
                          : (data.time / this.uSvc.convertDist(data.dist, this.tInfo.distUnits()));
        break;
      default:
        barItem.value = 0;
        barItem.label1 = '';
    }
    // barItem.indicator = iData.endDate;   // interval date for display
    if(isNaN(barItem.value)) { barItem.value = 0; }
    barItem.label1 = !data.treks ? noData : ''; 
    barItem.showEmpty = !data.treks;// || barItem.value === 0;
    barItem.indicator = iData.label;
    return barItem;
  }

}
