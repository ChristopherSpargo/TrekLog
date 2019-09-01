import { action, observable } from 'mobx';

import { TrekInfo, TrekObj, SWITCH_SPEED_AND_TIME, NumericRange, TREK_TYPE_CHOICES,
         TREK_SELECT_BITS, TrekTypeDataNumeric, STEPS_APPLY
       } from './TrekInfoModel'
import { UtilsSvc, SortDateRange, DateInterval } from './UtilsService';
import { BarData, BarGraphInfo } from "./BarDisplayComponent";
import { FilterSvc } from './FilterService';

export type ActivityStatType = 'time' | 'dist' | 'cals' | 'steps';
export const STAT_CATS : ActivityStatType[] = ['time', 'dist', 'cals', 'steps'];

export interface ActivityBarGraphData {
  time: BarGraphInfo,
  dist: BarGraphInfo,
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
  maxCPM:   number,
  maxSPM:   number
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

export class SummaryModel {

  @observable ftCount;                // count of treks encountered from filterTreks (?)
  @observable dataReady: boolean;
  @observable openItems;
  @observable showSpeedOrTime;
  @observable showStepsPerMin;
  @observable showTotalCalories;
  @observable showStatType;
  @observable showIntervalType;
  @observable selectedInterval;
  @observable summaryZValue;
  @observable activeTypes : number;

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
    this.showSpeedOrTime = 'speed';
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.setShowStatType('time');
    this.setShowIntervalType('weekly');
    this.setSelectedInterval(-1);
    this.activeTypes = 0;
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


  // set the status of the openItems property
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  @action
  setShowStatType = (sType: ActivityStatType) => {
    this.showStatType = sType;
  }

  @action
  setShowIntervalType = (iType: string) => {
    this.showIntervalType = iType;
  }

  @action
  setSelectedInterval = (val: number) => {
    if(this.activityData.length || val === -1){
      this.selectedInterval = val;
    }
  }

  @action
  setFTCount = (val: number) => {
    this.ftCount = val;
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
    this.buildGraphData();
  }

  // toggle between displaying total calories and calories/min
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
    this.buildGraphData();
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
          Walk:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Run:      {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Bike:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Hike:     {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Board:    {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Drive:    {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
          Selected: {treks: 0, dist: 0, time: 0, cals: 0,  steps: 0, stepTime: 0, maxCPM: 0, maxSPM: 0},
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
    let calsPM = t.calories / (t.duration / 60);
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
      let stepsPM = sc / (t.duration / 60);
      if (stepsPM > iData.data.Total.maxSPM) { iData.data.Total.maxSPM = stepsPM; }
      }
  }

  // get the range of values present in the activityData info for the given stat category
  getStatDataRange = (sType: ActivityStatType) => {
    let minV = 0;
    let maxV = -99999;

    this.activityData.forEach((iData: ActivityStatsInterval) => {
      let tData = iData.data.Total
      let val = tData[sType];
      switch(sType){
        case 'dist':
          val = this.uSvc.getRoundedDist(val, this.tInfo.distUnits(), true)
          break;
        case 'cals':
          val = this.showTotalCalories ? val : tData.maxCPM;
        break;
        case 'steps':
          val = this.showStepsPerMin ? tData.maxSPM : val;
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
      dist: {items: [], range: {} as NumericRange, title: this.tInfo.longDistUnitsCaps()},
      time: {items: [], range: {} as NumericRange},
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
      graphData.cals.items.push(this.getBarItem(intData, 'cals'))
      graphData.steps.items.push(this.getBarItem(intData, 'steps'))
    })
    this.barGraphData = graphData;
  }

  getBarItem = (iData: ActivityStatsInterval, sType: ActivityStatType) => {
    let barItem : BarData = {} as BarData;
    let data = iData.data.Selected;
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
          barItem.value = this.showStepsPerMin ? 
                  this.uSvc.computeStepsPerMin(data.steps, data.stepTime) : data.steps;
          // barItem.label1 = data.treks === 0 ? noData : (barItem.value).toString();
        break;
      case "cals":
        barItem.value = this.showTotalCalories ? data.cals : this.uSvc.getCaloriesPerMin(data.cals, data.time); 
        // barItem.label1 = data.treks === 0 ? noData : (barItem.value).toString();
        break;
      default:
        barItem.value = 0;
        barItem.label1 = '';
    }
    // barItem.indicator = iData.endDate;   // interval date for display
    barItem.label1 = !data.treks ? noData : ''; 
    barItem.showEmpty = !data.treks;
    barItem.indicator = iData.label;
    return barItem;
  }

}
