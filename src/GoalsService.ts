import { observable, action } from "mobx"
import { DatePickerAndroid } from 'react-native'
import { TREKLOG_GOALS_KEY, uiTheme } from './App'
import { TrekInfo, TrekType, TrekObj, NumericRange, DIST_UNIT_LONG_NAMES } from './TrekInfoModel'
import { UtilsSvc, MS_PER_DAY, MS_PER_WEEK, DAYS_IN_MONTHS} from './UtilsService';
import { SortByTypes, ShowTypes } from './ReviewComponent'
import { ToastModel } from "./ToastModel";
import { StorageSvc } from "./StorageService";
import { BarData, BarGraphInfo } from './FilterService';

export const SORT_DIRECTIONS = ['Ascend', 'Descend'];
export const SORT_DIRECTION_OTHER = {Ascend: 'Descend', Descend: 'Ascend'};

export interface GoalObj {
  dateSet:      string,
  category:     string,   
  timeframe:    string,   
  activity:     string,  
  metric:       string,   
  metricValue:  number,   
  metricUnits:  string,   
  testValue:    number,   
  testUnits:    string,   
}

export interface GoalInterval {
  start: string,
  end: string
};

export interface GoalDisplayItem {
  trek ?: number,     // index within allTreks for the trek (undefined if no trek)
  interval ?: {
    range: GoalInterval,
    accum: number,
  },
  meetsGoal: boolean,
};

export interface GoalDisplayObj {
  goal: GoalObj,
  items: GoalDisplayItem[],
  timesMet: number,
  goalIntervals: GoalInterval[],
  numTreks: number,
  numIntervals: number,
  emptyIntervals: number,
};

export interface GoalsFilterObj {
  type: TrekType | '',
  dateMin: string,
  dateMax: string,
  sortBy: SortByTypes,
  sortDirection: string
}

export const DIT_GOAL_CAT = "Distance in Time";
export const CA_GOAL_CAT  = "Cumulative Activity";
export type GoalType = "Distance in Time" | "Cumulative Activity";
export const GoalTypesArray = [DIT_GOAL_CAT , CA_GOAL_CAT];
export const GoalLabelsArray = ["Performance" , "Consistency"];

export const DITTimeframe = 'Some Day';
export const DITActivityTypesArray = ["Walk", "Run", "Bike", "Hike"];
export const DITMetric = 'Distance';
export const DITGoalMetricUnitsArray = ["meters", "kilometers", "miles"];
export const DITTestUnitsArray = ["seconds", "minutes", "hours"];

export const CATimeframe = 'Always';
export const CAActivityTypesArray = ["Walk", "Run", "Bike", "Hike", "Burn", "Trek"];
export const CAMetric = 'Count';
export const CAGoalMetricUnitsArray = ["meters", "kilometers", "miles", "times", "minutes", "hours", "calories", "steps"];
export const CABurnGoalMetricUnitsArray = ["calories"];
export const CATestUnitsArray = ["daily", "weekly", "monthly"];
export const CATestFunction = 'Time';

export const CATestUnitsToTime = {daily: 'day', weekly: 'week', monthly: 'month'};

export class GoalsSvc {

  @observable trekType;
  @observable dateMin;
  @observable dateMax;
  @observable sortBy : SortByTypes;
  @observable sortDirection;
  @observable show : ShowTypes;
  @observable dataReady;
  @observable intervalGraph : boolean;

  @observable goalEditMode:     string;
  @observable goalDateSet:      string;
  @observable goalCategory:     string;
  @observable goalTimeframe:    string;
  @observable goalActivity:     string;
  @observable goalMetric:       string;
  @observable goalMetricValue:  string;
  @observable goalMetricUnits:  string;
  @observable goalTestValue:    string;
  @observable goalTestUnits:    string;

  displayList: GoalDisplayObj[] = [];
  goalList: GoalObj[];
  runAfterProcessGoals : Function[] = [];
  editGoalIndex:    number = -1;
  barGraphData: BarData[] = [];

  filter : GoalsFilterObj;
    
  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo, private toastSvc: ToastModel,
                private storageSvc: StorageSvc ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.trekType = '';
    this.dateMin = '';
    this.dateMax = '';
    this.sortBy = 'Date';
    this.sortDirection = SORT_DIRECTIONS[1];
    this.show = 'Dist';
    this.dataReady = false;
    this.intervalGraph = true;

    this.goalEditMode = '';
    this.goalDateSet = '';
    this.goalCategory = '';
    this.goalTimeframe = '';
    this.goalActivity = '';
    this.goalMetric = '';
    this.goalMetricValue = '';
    this.goalMetricUnits = '';
    this.goalTestValue = '';
    this.goalTestUnits = '';
  }

  // return an object with the current filter values
  getFilterSettingsObj = () : GoalsFilterObj => {

    return {
      type:          this.trekType,
      dateMin:       this.dateMin === '' ? '' : this.utilsSvc.formatSortDate(this.dateMin, '12:00 AM'),
      dateMax:       this.dateMax === '' ? '' : this.utilsSvc.formatSortDate(this.dateMax,'11:59 PM'),
      sortBy:        this.sortBy,
      sortDirection: this.sortDirection
    }
  }

  // update the filter object from the individual filter controls
  @action
  updateFSO = () => {
      this.filter = this.getFilterSettingsObj();
  }

 // Set the list of goals for the current user
  @action
  setGoalList = (list?: GoalObj[]) => {
    if (list === undefined) {
      this.goalList = [];
      this.clearDisplayList();
    }
    else {
      this.goalList = list;
    }
  }

 // set the value of the intervalGraph property
 @action
 setIntervalGraph = (status: boolean) => {
   this.intervalGraph = status;
 }

 // Clear the displayList array
 @action
 clearDisplayList = () => {
   this.displayList = [];
 }

 // Set the list of goals for the current user
 @action
 setDisplayList = (list: GoalDisplayObj[]) => {
   this.displayList = list;
 }

 // set the goal edit mode
  @action
  setGoalEditMode = (val: string) => {
    this.goalEditMode = val;
  }
  // Format the storage key for this user's goals
  formatUserGoalsKey = (user: string) => {
    return (TREKLOG_GOALS_KEY + user + '#');
  }

  // save the list of user's goals to the database
  getGoalList = () => {

    this.setGoalList();
    return new Promise((resolve, reject) => {
      this.storageSvc.fetchGoalList(this.trekInfo.user)
      .then((res : any) => {
        this.setGoalList(JSON.parse(res) as GoalObj[]);
        resolve('OK');
      })
      .catch((err) => {
        reject(err);
      })
    })
  }

  // save the list of user's goals to the database
  saveGoalList = () => {

    this.updateDataReady(false);
    return new Promise((resolve, reject) => {
      this.storageSvc.storeGoalList(this.trekInfo.user, this.goalList)
      .then((res) => {
        this.updateDataReady(true);
        this.toastSvc.toastOpen({tType: "Success", content: "Goals updated."});
        resolve(res);
      })
      .catch((err) => {
        this.updateDataReady(true);
        this.toastSvc.toastOpen({tType: "Error", content: "Goals NOT saved."});
        reject(err);
      })
    })
  }

  // set the trek type for filtering data
  @action
  setTrekType = (value?: string) => {
      this.trekType = value;
  }

  // get the effective date for the goal
  @action
  getGoalDate = () => {
    let dt;

    dt = this.utilsSvc.getYMD(new Date(this.utilsSvc.dateFromSortDateYY(this.goalDateSet)));
    DatePickerAndroid.open({
      date: new Date(dt.year, dt.month, dt.day),
    })
    // @ts-ignore
    .then(({action, year, month, day}) => {
      if (action === DatePickerAndroid.dateSetAction){
        this.setGoalDate(this.utilsSvc.formatSortDate(new Date(year,month,day).toLocaleDateString()));
      }
    })
    .catch(() =>{
    })
  }

  // update the effective date for the goal
  @action
  setGoalDate = (value: string) => {
    this.goalDateSet = value;
  }
  
  @action
  setDateMin = (value: string) => {
    this.dateMin = value;
  }
  
  @action
  setDateMax = (value: string) => {
    this.dateMax = value;
  }
  
  // do a simple set of the sortBy and sortDirection properties with no side effects
  @action
  setSortByAndDirection = (sb: SortByTypes, dir: string) => {
    this.sortBy = sb;
    this.sortDirection = dir;
  }

  // Compare the appropriate properties based on the sortBy and startWith filter values
  sortFunc = (a: number, b: number) : number => {

    return (parseInt(this.trekInfo.allTreks[b].sortDate, 10) - parseInt(this.trekInfo.allTreks[a].sortDate, 10)); 
  }

  // return a list of treks sorted and filtered by the current settings
  filterAndSort = () : number[] => {
    let treks :number[] = [];
    let ft;

    if (this.trekInfo.allTreks.length) {
      this.updateFSO();
      ft = this.filter.type;
      this.trekInfo.allTreks.forEach((t, index) => {
        if ((ft === '' || t.type === ft) && (t.sortDate >= this.filter.dateMin)) {
          treks.push(index);
        }
      })
      treks.sort(this.sortFunc);
    }
    return treks;
  }

  // set the dataReady flag based on the displayList contents
  @action
  updateDataReady = (status: boolean) => {
    this.dataReady = status;
  }

  validGoal = () => {
    return  (
              (this.goalActivity !== '') && 
              (this.goalMetricValue !== '') &&
              (this.goalMetricUnits !== '') &&
              (this.goalTestUnits !== '') &&
              ((this.goalCategory === CA_GOAL_CAT) || (this.goalTestValue !== ''))
            ); 
  }
 
  // compose the statement of the goal from the goal object
  formatGoalStatement = (g: GoalObj) : string => {
  let stmt = ' ';

  if (g.activity !== ''){
    switch(g.category){
      case DIT_GOAL_CAT:
        stmt = g.activity + ' ' + (g.metricValue === 0 ? '_' : g.metricValue) + ' ' + g.metricUnits +  
              ' in ' + (g.testValue === 0 ? '_' : g.testValue) + ' ' + g.testUnits;
        break;
      case "Cumulative Activity":
        stmt = g.activity + ' ' + (g.metricValue === 0 ? '_' : g.metricValue) + ' ' + g.metricUnits + ' ' + g.testUnits;
        break;
      default:
    }
    stmt = stmt.replace(/ 1 hours/ig, ' 1 hour');
    stmt = stmt.replace(/ 1 minutes/ig, ' 1 minute');
    stmt = stmt.replace(/ 1 seconds/ig, ' 1 second');
    stmt = stmt.replace(/ 1 calories/ig, ' 1 calorie');
    stmt = stmt.replace(/ 1 times/ig, ' once');
    stmt = stmt.replace(/ 2 times/ig, ' twice');
    stmt = stmt.replace(/ 1 miles/ig, ' 1 mile');
    stmt = stmt.replace(/ 1 meters/ig, ' 1 meter');
    stmt = stmt.replace(/ 1 kilometers/ig, ' 1 kilometer');
    stmt = stmt.replace(/daily/ig, 'per day');
    stmt = stmt.replace(/weekly/ig, 'per week');
    stmt = stmt.replace(/monthly/ig, 'per month');
  }

  return stmt;
}

 // set the fields used for editing the editGoal
  @action
  setEditObjFields = (goal: GoalObj) => {
    this.goalDateSet =        goal.dateSet || this.utilsSvc.formatSortDate();
    this.goalCategory =       goal.category;
    this.goalActivity =       goal.activity;
    this.goalTimeframe =      goal.timeframe;
    this.goalMetric =         goal.metric;
    this.goalMetricUnits =    goal.metricUnits;
    this.goalMetricValue =    goal.metricValue ? goal.metricValue.toString() : '';
    this.goalTestUnits =      goal.testUnits;
    this.goalTestValue =      goal.testValue ? goal.testValue.toString() : '';
  }

  setNewDITGoalObj = (val: string) => {
    switch(val){
      case DIT_GOAL_CAT:
      case '':
        this.setEditObjFields({
          dateSet:       this.utilsSvc.formatShortSortDate() + "0000",
          category:      val,
          activity:      this.trekInfo.defaultTrekType,
          timeframe:     DITTimeframe,
          metric:        DITMetric,
          metricUnits:   DIST_UNIT_LONG_NAMES[this.trekInfo.measurementSystem],
          metricValue:   0,
          testUnits:     'minutes',
          testValue:     0,
        } as GoalObj)
        break;
      case CA_GOAL_CAT:
        this.setEditObjFields({
          dateSet:       this.utilsSvc.formatShortSortDate() + "0000",
          category:      val,
          activity:      this.trekInfo.defaultTrekType,
          timeframe:     CATimeframe,
          metric:        CAMetric,
          metricUnits:   'times',
          metricValue:   0,
          testUnits:     'weekly',
          testValue:     0,
        } as GoalObj)
        break;
      default:
    }

  }
  // return a GoalObj object from the individual edit fields
  getGoalObj = () : GoalObj => {
    return  {
      dateSet:        this.goalDateSet,
      category:       this.goalCategory,
      timeframe:      this.goalTimeframe,
      activity:       this.goalActivity,
      metric:         this.goalMetric,
      metricUnits:    this.goalMetricUnits,
      metricValue:    this.goalMetricValue !== '' ? parseFloat(this.goalMetricValue) : 0,
      testValue:      this.goalTestValue !== '' ? parseFloat(this.goalTestValue) : 0,
      testUnits:      this.goalTestUnits,
    };
  }

  // process the current goal list
  @action
  processGoalList = (list: GoalObj[]) : GoalDisplayObj[] => {
    let dispList : GoalDisplayObj[] = [];
    // create a displayObj for each goal
    // containing the goalObj and a list of relevant type treks since the goal setDate
    // for each goal:
    //  find the relevant treks (use filterTreks)
    //  process each to see if it meets or adds to the goal (note this fact for display of check icon)
    //  different code to process each goal category
    //  need to be able to show percentage of goal achievement on main display list
    //  list relevant treks showing goal-related info in the list item
    //  list items will be selectable for viewing the trek map (use selectedTrek)
    this.setSortByAndDirection('Date', 'Descend');
    list.forEach((g) => {
      dispList.push(this.processGoal(g));
    })
    return dispList;

}

// add to the list of after filter functions, return the insert index + 1;
setAfterProcessGoalsFn = (fn : Function) => {
  return this.runAfterProcessGoals.push(fn);
}

// run any functions registered by setAfterProcessGoalsFn
afterProcessGoals = () => {
  this.runAfterProcessGoals.forEach((fn) => {
    fn();
  });
}

// remove after filter function
removeAfterProcessGoalsFn = (index) => {
  this.runAfterProcessGoals.splice(index,1);
}

  // process the goal at the given index in the goal list
  // return a GoalDisplayObj
  processGoal = (g: GoalObj) : GoalDisplayObj => {
    let treks: number[];
    let gdo: GoalDisplayObj;

    let accum = 0;
    gdo = {goal: g, items: [], goalIntervals: [], timesMet: 0, numTreks: 0, numIntervals: 0, emptyIntervals: 0};
    this.buildIntervalList(gdo);
    this.setDateMin(this.utilsSvc.dateFromSortDateYY(g.dateSet));
    this.setDateMax('');
    this.setTrekType(/Burn|Trek/ig.test(g.activity) ? '' : g.activity);
    treks = this.filterAndSort();
    gdo.numTreks = treks.length;

    if (gdo.numTreks === 0 && g.category === CA_GOAL_CAT) {
      this.processTrekCA(undefined, gdo, accum, true); // do this to set up the interval items
    }
    treks.forEach((t, index) => {
      switch(g.category){
        case DIT_GOAL_CAT:
          this.processTrekDIT(t, gdo);
          break;
        case CA_GOAL_CAT:
          let res = this.processTrekCA(t, gdo, accum, index === gdo.numTreks - 1);
          accum += res.count;
          if(res.newInterval){ 
            accum = res.count;
          }
          break;
        default:
      }
    })
    return gdo;
  }

  // Process the given trek against the given Cumulative Activity goal.
  // Add a trek item and, if necessary, an inteval item to the display item list.
  // Return the value of the property of the trek that matches the goal metric units.
  processTrekCA = (t: number, gdo: GoalDisplayObj, accum: number, lastTrek: boolean) 
                                          : {newInterval: boolean, count: number} => {
    let v = 0;
    let newInt = false;
    let meets = false;
    let sd;

    if (t !== undefined){
      v = this.getCAGoalTrekValue(this.trekInfo.allTreks[t], gdo.goal);
      sd = this.trekInfo.allTreks[t].sortDate;
    } else {
      sd = this.utilsSvc.formatShortSortDate() + "0000";
    }

    // If this trek goes with the next older interval, push an interval item.
    while (sd < gdo.goalIntervals[gdo.goalIntervals.length-1].start){
      newInt = true;
      meets = accum >= gdo.goal.metricValue;
      gdo.items.push({interval: { range: gdo.goalIntervals.pop(), accum: accum},          
                      meetsGoal: meets});
      if (meets) { gdo.timesMet++; }
      accum = 0;      // Value of accumulator will not apply to any other items added here.
    }
    // Add a trek item. For CA goals, meetsGoal is only important on iterval items
    if(t !== undefined){
      gdo.items.push({trek: t, meetsGoal: false});
    }

    // If this was the last trek, push an ending interval item.
    if(lastTrek){
      v += accum;
      meets = v >= gdo.goal.metricValue;
      gdo.items.push({interval: { range: gdo.goalIntervals.pop(), accum: v},          
                      meetsGoal: meets});
      if (meets) { gdo.timesMet++; }
      // If there are intervals left, push an interval item for each.
      while (gdo.goalIntervals.length){
        gdo.items.push({interval: { range: gdo.goalIntervals.pop(), accum: 0},          
                        meetsGoal: false});
      }
    }
    return {newInterval: newInt, count: v};
  }

  // get the associated value from the given trek for the given goal
  getCAGoalTrekValue = (t: TrekObj, g: GoalObj) : number => {
    let v = 0;

    switch(g.metricUnits){
      case 'calories':
        v = t.calories;
        break;
      case 'steps':
        v = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
        break;
      case 'times':
        v = 1;
        break;
      case 'miles':
      case 'kilometers':
      case 'meters':
        v = this.utilsSvc.convertDist(t.trekDist, g.metricUnits)
        break;
      case 'minutes':
      case 'hours':
      case 'seconds':
        v = this.utilsSvc.convertTime(t.duration, g.metricUnits)
        break;
      default:
    }
    return v;
  }

  // Process the given trek against the given Distance in Time goal. 
  // Add a trek item to the display item list.
  processTrekDIT = (t: number, gdo: GoalDisplayObj) => {
    let mVal = this.utilsSvc.convertToMeters(gdo.goal.metricValue, gdo.goal.metricUnits);
    let qualifies = false;

    // if (t.trekDist >= mVal){  // distance long enough?
      let tVal = this.utilsSvc.convertToSeconds(gdo.goal.testValue, gdo.goal.testUnits);
      qualifies = (this.trekInfo.allTreks[t].trekDist >= mVal) && 
              (tVal * (this.trekInfo.allTreks[t].trekDist / mVal) >= this.trekInfo.allTreks[t].duration);
      if (qualifies) { gdo.timesMet++; }
      gdo.items.push({trek: t, meetsGoal: qualifies})
    // }
  }

  // Build a list of interval dates {start: sortDate, end: sortDate} for the given goal 
  // starting at the date the goal is effective.
  // Intervals are not applicable to DIT goals (just CA goals).
  buildIntervalList = (gdo: GoalDisplayObj) => {
    let intervalDate = gdo.goal.dateSet;
    let iDate = new Date(this.utilsSvc.dateFromSortDateYY(gdo.goal.dateSet)).getTime();
    let todaySD = this.utilsSvc.formatShortSortDate() + '9999';

    gdo.goalIntervals = [];
    do {
      let int = {start: intervalDate, end: todaySD};
      if (gdo.goal.category === 'Cumulative Activity'){
        switch(gdo.goal.testUnits){
          case 'daily':
            iDate += MS_PER_DAY;
            break;
          case 'weekly':
            iDate += MS_PER_WEEK;
            break;
          case 'monthly':
            let im = new Date(this.utilsSvc.dateFromSortDateYY(intervalDate)).getMonth();
            iDate += MS_PER_DAY * DAYS_IN_MONTHS[im];
            break;
        }
        int.end = this.utilsSvc.formatSortDate(new Date(iDate - MS_PER_DAY).toLocaleDateString(), "11:59 PM")
        intervalDate = this.utilsSvc.formatSortDate(new Date(iDate).toLocaleDateString(), "12:00 AM");
      }
      else {
        intervalDate = todaySD;     // there is just a single interval for DIT goals
      } 
      gdo.goalIntervals.push(int);
    } while (intervalDate < todaySD)
    gdo.numIntervals = gdo.goalIntervals.length;
  }

  // return the time in seconds to go the given distance(units) given the total time(sec) and total distance(m)
  timeForDistance = (mValue: number, mUnits: string, dist: number, time: number) : number=> {
    let m = this.utilsSvc.convertToMeters(mValue, mUnits);
    if (dist <  m / 100) { return 0; }
    return time * ( m / dist);
  }

  // Find the relevant numeric range for the given goalDisplayObj
  // for CA goals, selInt values >=0 will specify an interval only 
  // use selInt = -1 for DIT goals and to get range of interval sums for CA goals
  findDataRange = (gdo: GoalDisplayObj, selInt: number, metric: string)  => {
    let gRange: NumericRange = {} as NumericRange;
    let minV = 999999;
    let maxV = -999999;
    // let metric = gdo.goal.metricUnits;
    let curInt = 0;
    let v;
    let sumInt = 0;
    let minInt = 999999;
    let maxInt = -999999;

    // use -1 for selInt to find the range of the sums for the intervals graph

    if (gdo.goal.category === DIT_GOAL_CAT) { 
      metric = 'rate'; 
    }
    gdo.items.forEach((item) => {
      if((selInt === curInt) || this.intervalGraph){      // in the right interval?
        if(item.trek !== undefined){
          let t = this.trekInfo.allTreks[item.trek];
          switch(metric){
            case 'miles':
            case 'meters':
            case 'kilometers':
              v = this.utilsSvc.convertDist(t.trekDist, metric);
              if (v < minV) { minV = v; }
              if (v > maxV) { maxV = v; }
              break;
            case 'times':
              v = 1;
              if (v < minV) { minV = v; }
              if (v > maxV) { maxV = v; }
              break;
            case 'hours':
            case 'minutes':
              v = this.utilsSvc.convertTime(t.duration, metric);
              if (v < minV) { minV = v; }
              if (v > maxV) { maxV = v; }
              break;
            case 'rate':
              v = this.timeForDistance(gdo.goal.metricValue, gdo.goal.metricUnits, t.trekDist, t.duration);
              if (v !== 0) {
                if (v < minV) { minV = v; }
                if (v > maxV) { maxV = v; }
              }
              break;
            case 'calories':
              v = t.calories;
              if (v < minV) { minV = v; }
              if (v > maxV) { maxV = v; }
              break;
            case "steps":
              v = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
              if (v < minV) { minV = v; }
              if (v > maxV) { maxV = v; }
              break;
            default:
          }      
          sumInt += v;
        }
      }
      if(item.trek === undefined){  // new interval?
        if (sumInt < minInt) { minInt = sumInt; }
        if (sumInt > maxInt) { maxInt = sumInt; }
        sumInt = 0;
        curInt++;
      }
    })
    if(this.intervalGraph && (gdo.goal.category === CA_GOAL_CAT)){
      maxInt = Math.round(maxInt);
      minInt = Math.trunc(minInt);
      gRange.max = maxInt;
      gRange.min = minInt;
      gRange.range = (gdo.items.length && (maxInt !== minInt)) ? maxInt-minInt : 10;
    } else {
      maxV = Math.round(maxV);
      minV = Math.trunc(minV);
      gRange.max = maxV;
      gRange.min = minV;
      gRange.range = (gdo.items.length && (maxV !== minV)) ? maxV-minV : 10;
    }
    return gRange;
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given display items array has already been sorted by decending date.
  // The 'show' value will be displayed on the bar and the relevant date value will be displayed below the bar.
  // for CA goals, selInt values >=0 will generate graphData for that interval only 
  // use selInt = -1 for DIT goals and to get a graph of interval sums for CA goals
  buildGraphData = (gdo: GoalDisplayObj, selectedInterval: number, metric: string) : BarGraphInfo => {
    let graphData : BarGraphInfo= {items: [], range: {max: 0, min: 0, range: 0}};
    let dataRange;
    let dataAdjust = 0;   //Math.round(dataRange.range * .1);
    // let metric = gdo.goal.metricUnits;
    let currInt = 0;
    let intSum = 0;
    let v;
    const DITGoal = gdo.goal.category === DIT_GOAL_CAT;
    const { trekLogGreen } = uiTheme.palette;

    if (gdo.goal.category === DIT_GOAL_CAT) { 
      metric = 'rate'; 
    }
    if (metric === 'times' && !this.intervalGraph) {
      metric = this.trekInfo.longDistUnits();
    }
    dataRange = this.findDataRange(gdo, selectedInterval, metric);
    graphData.range = dataRange;
    gdo.emptyIntervals = 0;
    gdo.items.forEach((item, index) => {
      let barItem : BarData = {} as BarData;
      if((selectedInterval === currInt) || this.intervalGraph) {
        if (item.trek !== undefined){     // is this a trek item?
          let t = this.trekInfo.allTreks[item.trek];
          barItem.type = t.type;
          barItem.index = index;
          if (gdo.goal.activity === 'Burn' || gdo.goal.activity === 'Trek') {
            barItem.icon = t.type;      // show type icon above bars if displaying multiple trek types at once
          }
          switch(metric){
            case "miles":
            case "meters":
            case "kilometers":
              v = this.utilsSvc.convertDist(t.trekDist, metric);
              barItem.value = v + dataAdjust;
              barItem.label1 = this.utilsSvc.getRoundedDist(t.trekDist, metric).toString();
              break;
            case 'times':
              v = 1;
              barItem.value = v + dataAdjust;
              barItem.label1 = v.toString();
              break;
            case "hours":
              v = this.utilsSvc.convertTime(t.duration, metric);
              barItem.value = v + dataAdjust;
              barItem.label1 = (Math.round(v * 10) / 10).toString();
              break;
            case "minutes":
              v = this.utilsSvc.convertTime(t.duration, metric);
              barItem.value = v + dataAdjust;
              barItem.label1 = Math.round(v).toString();
              break;
            case "steps":
              v = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
              barItem.value = v + dataAdjust;
              barItem.label1 = v.toString();
              break;
            case "rate":
              v = this.timeForDistance(gdo.goal.metricValue, gdo.goal.metricUnits, t.trekDist, t.duration);
              barItem.value = v + dataAdjust;    // add adjustment to avoid 0-height bars
              barItem.label1 = t.trekDist >= this.utilsSvc.convertToMeters(gdo.goal.metricValue, gdo.goal.metricUnits) 
                                ? this.utilsSvc.timeFromSeconds(v) : "n/a";
              break;
            case "calories":
              v = t.calories;
              barItem.value = v + dataAdjust;
              barItem.label1 = v.toString();
              break;
            default:
              barItem.value = 0;
              barItem.label1 = '';
          }
          barItem.indicator = t.date.substr(0,5);
          barItem.noPress = v === 0;
          if(DITGoal){
            barItem.indicatorFill = item.meetsGoal ? trekLogGreen : "red";
            graphData.items.push(barItem);
          } 
          else {
            if (selectedInterval === currInt) { graphData.items.push(barItem); }
          }
          intSum += v;
        }
      }
      if (item.trek === undefined){
        if (this.intervalGraph) {
          if (intSum){
            // create interval bar
            barItem.index = currInt;
            barItem.value = intSum + dataAdjust;
            switch(metric){
              case "miles":
              case "meters":
              case "kilometers":
                let m = this.utilsSvc.convertToMeters(intSum, metric);
                barItem.label1 = this.utilsSvc.getRoundedDist(m, metric).toString();
                break;
              case "calories":
              case "steps":
              case "times":
                barItem.label1 = intSum.toString();
                break;
              case "hours":
                barItem.label1 = (Math.round(intSum * 10) / 10).toString();
                break;
            case "minutes":
                barItem.label1 = Math.round(intSum).toString();
                break;
            }
            barItem.indicator = this.utilsSvc.dateFromSortDateYY(item.interval.range.end).substr(0,5);
            barItem.indicatorFill = item.meetsGoal ? trekLogGreen : "red";
            barItem.noPress = intSum === 0;
            graphData.items.push(barItem);
          }
          else {
            gdo.emptyIntervals++;
          }
        }
        intSum = 0;
        currInt++;
      }
    })
    return graphData;
  }

  getIntervalDates = (items: GoalDisplayItem[], int: number) => {
    let iCount = 0;
    let dates = {start: '', end: ''};

    for(let i=0; i<items.length; i++) {
      if (items[i].interval !== undefined) {
        if (iCount === int){
          dates.start = this.utilsSvc.dateFromSortDateYY(items[i].interval.range.start);
          dates.end   = this.utilsSvc.dateFromSortDateYY(items[i].interval.range.end);
          break;
        }
        iCount++;
      }
    }
    return dates;
  }

  // format a title for the graph
  formatGraphTitle = (gdo: GoalDisplayObj, interval: number) : string => {
    let msg = '';
    let g = gdo.goal;

    switch(g.category){
      case DIT_GOAL_CAT:
        msg = 'Time to ' + g.activity + ' ' + g.metricValue + ' ' + g.metricUnits; 
        msg = msg.replace(/Trek /ig, 'trek ');
        msg = msg.replace(/Walk /ig, 'walk ');
        msg = msg.replace(/Run /ig, 'run ');
        msg = msg.replace(/Bike /ig, 'bike ');
        msg = msg.replace(/Hike /ig, 'hike ');
        msg = msg.replace(/Burn /ig, 'burn ');
        break;
      case CA_GOAL_CAT:
        ; 
        if(this.intervalGraph) {
          msg = g.metricUnits + ' ' + g.activity + ' ' + g.testUnits;
        } else {
          let iDates = this.getIntervalDates(gdo.items, interval);
          let metric = g.metricUnits;
          if (g.metricUnits === 'times'){
            metric = this.trekInfo.longDistUnits();
          }
          msg = metric +'/' + g.activity + ': ' + iDates.start.substr(0,5) + ' - ' + iDates.end.substr(0,5);
        }
        msg = msg.replace(/Trek /ig, 'treked ');
        msg = msg.replace(/Walk /ig, 'walked ');
        msg = msg.replace(/Run /ig, 'run ');
        msg = msg.replace(/Bike /ig, 'biked ');
        msg = msg.replace(/Hike /ig, 'hiked ');
        msg = msg.replace(/Burn /ig, 'burned ');
        break;
      default:
    }
    msg = msg.substr(0,1).toUpperCase() + msg.substr(1);
    msg = msg.replace(/Burn:/ig, 'Trek:');
    msg = msg.replace(/ 1 miles/ig, ' 1 mile');
    msg = msg.replace(/daily/ig, 'per day')
    msg = msg.replace(/weekly/ig, 'per week')
    msg = msg.replace(/monthly/ig, 'per month')

    return msg;
  }

  // format a label for the x axis of the graph
  formatGraphXAxis = (gdo: GoalDisplayObj) : string => {
    let msg = '';
    let g = gdo.goal;

    switch(g.category){
      case DIT_GOAL_CAT:
        msg = g.activity + ' Dates'; 
        break;
      case CA_GOAL_CAT:
        ; 
        if(this.intervalGraph && g.testUnits !== 'daily') {
          msg = g.testUnits + ' Ending Dates';
        } else {
            msg = g.activity + ' Dates';
        }
        break;
      default:
    }
    msg = msg.substr(0,1).toUpperCase() + msg.substr(1);
    msg = msg.replace(/Burn /ig, 'Trek ');
    msg = msg.replace(/daily/ig, 'Day')
    msg = msg.replace(/weekly/ig, 'Week')
    msg = msg.replace(/monthly/ig, 'Month')

    return msg;
  }

  // format a label for info missing in the graph
  formatMissingIntsMsg = (gdo: GoalDisplayObj, eInts: number) : string => {
    let plural = eInts === 1 ? '' : 's';
    let msg = '';

    if(eInts){
      msg =  eInts + ' ';

      switch(gdo.goal.category){
        case DIT_GOAL_CAT:
          msg += 'day' + plural; 
          break;
        case CA_GOAL_CAT:
          if(this.intervalGraph && gdo.goal.testUnits !== 'daily') {
            msg += gdo.goal.testUnits + plural;
          } else {
              msg += 'day' + plural;
          }
          break;
        default:
      }
      msg = msg.replace(/daily/ig, 'day')
      msg = msg.replace(/weekly/ig, 'week')
      msg = msg.replace(/monthly/ig, 'month')
      msg = msg.replace(/^1 days/ig, '1 day')
      msg = msg.replace(/^1 weeks/ig, '1 week')
      msg = msg.replace(/^1 months/ig, '1 month')
      msg += " (not shown) had no activity";
    }

    return msg;
  }

  // return the 'interval' GoalDisplayItem applicable to the given trek date
  findGDOInterval = (gdo: GoalDisplayObj, trek: TrekObj) : number => {

    for (let i=0; i<gdo.items.length; i++){
      if((gdo.items[i].interval !== undefined) && (trek.sortDate >= gdo.items[i].interval.range.start) &&
                                        (trek.sortDate <= gdo.items[i].interval.range.end)) {
        return i;
      }
    };
    return -1;
  } 

  checkTrekAgainstGoals = (trek: TrekObj) : Promise<any> => {
    let result : {goal: GoalObj, item: GoalDisplayItem}[] = [];
    let goalsOfType: GoalObj[] = [];
    let targetGoals : GoalDisplayObj[];
    
    return new Promise((resolve, reject) => {
      this.getGoalList()
      .then(() =>{
        // take the new trek out of the treks list
        // from a list of goals that include this trekType and are either DIT goals or CA goals that haven't been met:
        //   make a result list of those goals the new trek meets (DITs) or causes to be met (CAs)
        // add the trek back to the treks list
        // return the result list
        this.goalList.forEach((g) => {
          if (g.activity === trek.type || g.activity === 'Burn' || g.activity === 'Trek'){
            goalsOfType.push(g);
          }
        })
        if (goalsOfType.length){    // are there any goals that involve this kind of trek?
          this.trekInfo.popAllTreksEntry();  // remove trek from allTreks list
          targetGoals = this.processGoalList(goalsOfType);  // see what goals looked like befor this trek
          this.trekInfo.addAllTreksEntry(trek); // put trek back in list
          targetGoals.forEach((gdo) => {
            switch(gdo.goal.category){
              case DIT_GOAL_CAT:
                let tMet = gdo.timesMet;
                this.processTrekDIT(this.trekInfo.allTreks.length-1, gdo); // this will increment timesMet if this trek achieves the goal
                if(gdo.timesMet > tMet){ result.push({goal: gdo.goal, item: undefined})}
                break;
              case CA_GOAL_CAT:
                let indx = this.findGDOInterval(gdo, trek);
                if (indx !== -1) {
                  let gdi = gdo.items[indx];
                  if (!gdi.meetsGoal){ // goal for interval not met yet?
                    gdi.interval.accum += this.getCAGoalTrekValue(trek, gdo.goal);
                    if (gdi.interval.accum  >= gdo.goal.metricValue){
                      result.push({goal: gdo.goal, item: gdi});  // this trek pushes us over the goal value
                    }
                  }
                }
                break;
              default:
            }
          });
        }
        resolve(result);
      })
      .catch(() =>{
        this.toastSvc.toastOpen({tType: "Error", content: "No goal list found."});
        reject(result);
      })
    })
  }

  // compute the progress percentage for the given GoalDisplayItem
  computeProgress = (dispItem: GoalDisplayObj) => {
    switch(dispItem.goal.category){
      case DIT_GOAL_CAT:
        return (dispItem.numTreks ?  dispItem.timesMet / dispItem.numTreks : 0);
      case CA_GOAL_CAT:
        return (dispItem.numIntervals ? dispItem.timesMet / dispItem.numIntervals : 0);
    }
    return 0;
  }



}