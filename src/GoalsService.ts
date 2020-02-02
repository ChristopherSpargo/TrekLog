import { observable, action } from "mobx";
import { DatePickerAndroid } from "react-native";
import { uiTheme } from "./App";
import { TrekObj, NumericRange } from "./TrekInfoModel";
import {
  UtilsSvc,
  SortDate,
  DateInterval,
  SortDateRange
} from "./UtilsService";
import { ToastModel } from "./ToastModel";
import { StorageSvc } from "./StorageService";
import { BarData, BarGraphInfo } from "./BarDisplayComponent";
import { MainSvc, SortByTypes, ShowTypes,
        TrekType, DIST_UNIT_LONG_NAMES } from "./MainSvc";

export const SORT_DIRECTIONS = ["Ascend", "Descend"];
export const SORT_DIRECTION_OTHER = { Ascend: "Descend", Descend: "Ascend" };

export interface GoalObj {
  dateSet: SortDate;                // date goal established
  category: string;               // goal type (performance or consistency)
  timeframe: string;              // effective date
  activity: string;               // activity being measured (Walk, Run, Burn, Trek, etc.)
  metric: string;                 // Distance or Count (currently not used)
  metricValue: number;            // how many occurences, how many miles, etc.
  metricUnits: string;            // what's being counted (miles, occurrences, calories)
  testValue: number;              // time limit period count 
  testUnits: string;              // limit units (minutes, hours, weekly)
  course?: string,                // course to use as metric value and units
}

export interface GoalDisplayItem {
  trek?: number; // index within allTreks for the trek (undefined if no trek)
  interval?: {
    range: SortDateRange;
    accum: number;
  };
  meetsGoal: boolean;
}

export interface GoalDisplayObj {
  goal: GoalObj;
  timesMet: number;
  mostRecentDate: string;               // sortDate of trek that most recently met goal
  goalIntervals: SortDateRange[];
  numTreks: number;
  numIntervals: number;
  emptyIntervals: number;
  items: GoalDisplayItem[];
  dateRange: SortDateRange;
}

export interface GoalsFilterObj {
  type: TrekType | "";
  dateMin: string;
  dateMax: string;
  sortBy: SortByTypes;
  sortDirection: string;
  course: string;
}

export const DIT_GOAL_CAT = "Distance in Time";
export const CA_GOAL_CAT = "Cumulative Activity";
export type GoalType = "Distance in Time" | "Cumulative Activity";
export const GoalTypesArray = [DIT_GOAL_CAT, CA_GOAL_CAT];
export const GoalLabelsArray = ["Performance", "Consistency"];
export const GoalCommentsArray = [
  `Performance goals track performance of an activity over a specific distance in a given time ` +
  `limit.\ne.g. 'Run 2 miles in 12 min'\ne.g. 'Bike LongLakeRoad in 2 hr 30 min'`,
  `Consistency goals track occurrences of activity or accumulations of metrics like calories or ` +
  `steps over a period of time.\ne.g. 'Bike 100 miles per week'\ne.g. 'Hike SillyMtnTrail twice per month'`
]

export const DITTimeframe = "Some Day";
export const DITActivityTypesArray = ["Walk", "Run", "Bike", "Hike", "Board", "Drive", "Trek"];
export const DITMetric = "Distance";
export const DITGoalMetricUnitsArray = ["meters", "kilometers", "miles", "course"];
export const DITTestUnitsArray = ["seconds", "minutes", "hours"];

export const CATimeframe = "Always";
export const CAActivityTypesArray = [
  "Walk",
  "Run",
  "Bike",
  "Hike",
  "Board",
  "Drive",
  "Burn",
  "Trek"
];
export const CAActivityTypesWithStepsArray = [
  "Walk",
  "Run",
  "Hike"
];
export const CAMetric = "Count";
export const CAGoalMetricUnitsArray = [
  "meters",
  "kilometers",
  "miles",
  "occurrences",
  "time",
  "calories",
  "steps",
  "course"
];
export const CABurnGoalMetricUnitsArray = ["calories"];
export const CATestUnitsArray = ["daily", "weekly", "monthly"];
export const CATestFunction = "Time";

export const CATestUnitsToTime = {
  daily: "day",
  weekly: "week",
  monthly: "month"
};

export const PROGRESS_RANGES = [20, 80];

export class GoalsSvc {
  @observable trekType;
  @observable dateMin;
  @observable dateMax;
  @observable sortBy: SortByTypes;
  @observable sortDirection;
  @observable show: ShowTypes;
  @observable dataReady;
  @observable intervalGraph: boolean;

  @observable goalEditMode: string;
  @observable goalDateSet: SortDate;
  @observable goalCategory: string;
  @observable goalTimeframe: string;
  @observable goalActivity: string;
  @observable goalMetric: string;
  @observable goalMetricValue: string;
  @observable goalMetricUnits: string;
  @observable goalTestValue: string;
  @observable goalTestUnits: string;
  @observable goalCourse: string;

  displayList: GoalDisplayObj[] = [];
  goalList: GoalObj[];
  runAfterProcessGoals: Function[] = [];
  editGoalIndex: number = -1;
  barGraphData: BarData[] = [];
  filterCourse: string;

  filter: GoalsFilterObj;

  constructor(
    private mainSvc: MainSvc,
    private utilsSvc: UtilsSvc,
    private toastSvc: ToastModel,
    private storageSvc: StorageSvc
  ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.trekType = "";
    this.dateMin = "";
    this.dateMax = "";
    this.sortBy = "Date";
    this.sortDirection = SORT_DIRECTIONS[1];
    this.show = "Dist";
    this.dataReady = false;
    this.intervalGraph = true;

    this.goalEditMode = "";
    this.goalDateSet = "";
    this.goalCategory = "";
    this.goalTimeframe = "";
    this.goalActivity = "";
    this.goalMetric = "";
    this.goalMetricValue = "";
    this.goalMetricUnits = "";
    this.goalTestValue = "";
    this.goalTestUnits = "";
    this.goalCourse = undefined;
  };

  // set the dataReady property
  @action
  setDataReady = (status: boolean) => {
    this.dataReady = status;
  }

  // return an object with the current filter values
  getFilterSettingsObj = (): GoalsFilterObj => {
    return {
      type: this.trekType,
      dateMin:
        this.dateMin === ""
          ? ""
          : this.utilsSvc.formatSortDate(this.dateMin, "12:00 AM"),
      dateMax:
        this.dateMax === ""
          ? ""
          : this.utilsSvc.formatSortDate(this.dateMax, "11:59 PM"),
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      course: this.filterCourse
    };
  };

  // update the filter object from the individual filter controls
  @action
  updateFSO = () => {
    this.filter = this.getFilterSettingsObj();
  };

  // Set the list of goals for the current group
  @action
  setGoalList = (list?: GoalObj[]) => {
    if (list === undefined) {
      this.goalList = [];
      this.clearDisplayList();
    } else {
      this.goalList = list;
    }
  };

  // set the value of the intervalGraph property
  @action
  setIntervalGraph = (status: boolean) => {
    this.intervalGraph = status;
  };

  // Clear the displayList array
  clearDisplayList = () => {
    this.setDisplayList([]);
  };

  // Set the list of goals for the current group
  @action
  setDisplayList = (list: GoalDisplayObj[]) => {
    this.displayList = list;
  };

  // set the goal edit mode
  @action
  setGoalEditMode = (val: string) => {
    this.goalEditMode = val;
  };

  // read the list of group's goals from the database
  getGoalList = (group = this.mainSvc.group) => {
    this.setGoalList();
    return new Promise((resolve, reject) => {
      this.storageSvc
        .fetchGoalListFile(group)
        .then((res: any) => {
          this.setGoalList(JSON.parse(res) as GoalObj[]);
          resolve("OK");
        })
        .catch(err => {
          reject(err);
        });
    });
  };

  // save the list of group's goals to the database
  saveGoalList = (group = this.mainSvc.group) => {
    this.updateDataReady(false);
    return new Promise((resolve, reject) => {
      this.storageSvc
        .storeGoalListFile(group, this.goalList)
        .then(res => {
          this.updateDataReady(true);
          this.toastSvc.toastOpen({
            tType: "Success",
            content: "Goals updated."
          });
          resolve(res);
        })
        .catch(err => {
          this.updateDataReady(true);
          this.toastSvc.toastOpen({
            tType: "Error",
            content: "Goals NOT saved."
          });
          reject(err);
        });
    });
  };

  // sort the goalDisplayList by dateLastMet and reorder the displayList and goalList
  sortGoals = () => {
    
    // get the mostRecentDate from the displayList entries
    let mapped = this.displayList.map((el, i) => { return { index: i, value: parseInt(el.mostRecentDate) }; })
    
    // sorting the dates
    mapped.sort((a, b) => { return (b.value - a.value); });
    
    // create arrays with results in order
    let result1 = mapped.map((el) => { return this.displayList[el.index]; });
    let result2 = mapped.map((el) => { return this.goalList[el.index]; });
    this.setDisplayList(result1);
    this.goalList = result2;
  }

  // set the trek type for filtering data
  @action
  setTrekType = (value?: string) => {
    this.trekType = value;
  };

  // get the effective date for the goal
  @action
  getGoalDate = () => {
    let dt;

    dt = this.utilsSvc.getYMD(
      new Date(this.utilsSvc.dateFromSortDateYY(this.goalDateSet))
    );
    DatePickerAndroid.open({
      date: new Date(dt.year, dt.month, dt.day)
    })
      // @ts-ignore
      .then(({ action, year, month, day }) => {
        if (action === DatePickerAndroid.dateSetAction) {
          this.setGoalDate(
            this.utilsSvc.formatSortDate(
              new Date(year, month, day).toLocaleDateString()
            )
          );
        }
      })
      .catch(() => {});
  };

  // update the effective date for the goal
  @action
  setGoalDate = (value: string) => {
    this.goalDateSet = value;
  };

  @action
  setDateMin = (value: string) => {
    this.dateMin = value;
  };

  @action
  setDateMax = (value: string) => {
    this.dateMax = value;
  };

  // do a simple set of the sortBy and sortDirection properties with no side effects
  @action
  setSortByAndDirection = (sb: SortByTypes, dir: string) => {
    this.sortBy = sb;
    this.sortDirection = dir;
  };

  // Compare the dates for an decending sort (newest first)
  sortFunc = (a: number, b: number): number => {
    return (
      parseInt(this.mainSvc.allTreks[b].sortDate, 10) -
      parseInt(this.mainSvc.allTreks[a].sortDate, 10)
    );
  };

  // return a list of treks sorted and filtered by the current settings
  filterAndSort = (): number[] => {
    let treks: number[] = [];
    let ft;

    if (this.mainSvc.allTreks.length) {
      this.updateFSO();
      ft = this.filter.type;
      this.mainSvc.allTreks.forEach((t, index) => {
        if ((ft === "" || t.type === ft) && 
            (t.sortDate >= this.filter.dateMin) &&
            (t.sortDate <= this.filter.dateMax) &&
            (this.filter.course === undefined || this.filter.course === t.course)) {
          treks.push(index);
        }
      });
      treks.sort(this.sortFunc);    // sort treks (oldest to newest)
    }
    return treks;
  };

  // set the dataReady flag based on the displayList contents
  @action
  updateDataReady = (status: boolean) => {
    this.dataReady = status && this.mainSvc.dataReady;
  };

  // return true if the data in the goal editing fields represents a valid goal
  validGoal = () => {
    return (
      this.goalActivity !== "" &&
      (this.goalMetricValue !== "" || this.goalMetricUnits === 'course') &&
      (this.goalMetricUnits !== "course" || this.goalCourse) &&
      this.goalMetricUnits !== "" &&
      this.goalTestUnits !== "" &&
      (this.goalCategory === CA_GOAL_CAT || this.goalTestValue !== "")
    );
  };

  // compose the statement of the goal from the goal object
  formatGoalStatement = (g: GoalObj): string => {
    let stmt = " ";

    // if (g.activity !== "") {
      switch (g.category) {
        case DIT_GOAL_CAT:
          if (g.metricUnits === 'course') {
            stmt =
            (g.activity === '' ? "_" : g.activity) +
            " " +
            (!g.course ? "_" : g.course) +
            " in " +
            (g.testValue === 0 ? "_" : this.utilsSvc.timeFromSeconds(
                                          this.utilsSvc.convertToSeconds(g.testValue, g.testUnits), 'hms'))
          } else {
            stmt =
            (g.activity === '' ? "_" : g.activity) +
            " " +
            (g.metricValue === 0 ? "_" : g.metricValue) +
            " " +
            g.metricUnits +
            " in " +
            (g.testValue === 0 ? "_" : this.utilsSvc.timeFromSeconds(
                                          this.utilsSvc.convertToSeconds(g.testValue, g.testUnits), 'hms'))
          } 
          break;
        case CA_GOAL_CAT:
          if (g.metricUnits === 'course') {
            stmt =
            (g.activity === '' ? "_" : g.activity) +
            " " +
            (!g.course ? "_" : g.course) +
            " " +
            (g.metricValue === 0 ? "_" : g.metricValue) +
            " times " + 
            g.testUnits;
          } else {
            stmt =
            (g.activity === '' ? "_" : g.activity) +
            " " +
            (g.metricUnits === 'time' ? this.utilsSvc.timeFromSeconds(g.metricValue, 'hms') : 
               ((g.metricValue === 0 ? "_" : g.metricValue) + " " + g.metricUnits)) +
            " " +
            g.testUnits;
          }
          break;
        default:
      }
      // stmt = stmt.replace(/ 1 hours/gi, " 1 hour");
      // stmt = stmt.replace(/ 1 minutes/gi, " 1 minute");
      // stmt = stmt.replace(/ 1 seconds/gi, " 1 second");
      stmt = stmt.replace(/ 1 calories/gi, " 1 calorie");
      stmt = stmt.replace(/ occurrences/gi, " times");
      stmt = stmt.replace(/ 1 times/gi, " once");
      stmt = stmt.replace(/ 2 times/gi, " twice");
      stmt = stmt.replace(/ 1 miles/gi, " 1 mile");
      stmt = stmt.replace(/ 1 meters/gi, " 1 meter");
      stmt = stmt.replace(/ 1 kilometers/gi, " 1 kilometer");
      stmt = stmt.replace(/daily/gi, "per day");
      stmt = stmt.replace(/weekly/gi, "per week");
      stmt = stmt.replace(/monthly/gi, "per month");
    // }

    return stmt;
  };

  // set the fields used for editing the editGoal
  @action
  setEditObjFields = (goal: GoalObj) => {
    this.goalDateSet = goal.dateSet || this.utilsSvc.formatSortDate();
    this.goalCategory = goal.category;
    this.goalActivity = goal.activity;
    this.goalTimeframe = goal.timeframe;
    this.goalMetric = goal.metric;
    this.goalMetricUnits = goal.metricUnits === 'times' ? 'occurrences' : goal.metricUnits;
    this.goalMetricValue = goal.metricValue ? goal.metricValue.toString() : "";
    this.goalTestUnits = goal.testUnits;
    this.goalTestValue = goal.testValue ? goal.testValue.toString() : "";
    this.goalCourse = goal.course === "" ? undefined : goal.course;
  };

  setNewDITGoalObj = (val: string) => {
    switch (val) {
      case DIT_GOAL_CAT:
      case "":
        this.setEditObjFields({
          dateSet: this.utilsSvc.formatShortSortDate() + "0000",
          category: val,
          activity: this.mainSvc.defaultTrekType,
          timeframe: DITTimeframe,
          metric: DITMetric,
          metricUnits: DIST_UNIT_LONG_NAMES[this.mainSvc.measurementSystem],
          metricValue: 0,
          testUnits: "time",
          testValue: 0,
          course: undefined
        } as GoalObj);
        break;
      case CA_GOAL_CAT:
        this.setEditObjFields({
          dateSet: this.utilsSvc.formatShortSortDate() + "0000",
          category: val,
          activity: this.mainSvc.defaultTrekType,
          timeframe: CATimeframe,
          metric: CAMetric,
          metricUnits: "times",
          metricValue: 0,
          testUnits: "weekly",
          testValue: 0,
          course: undefined
        } as GoalObj);
        break;
      default:
    }
  };

  // return a GoalObj object from the individual edit fields
  getGoalObj = (): GoalObj => {
    return {
      dateSet: this.goalDateSet,
      category: this.goalCategory,
      timeframe: this.goalTimeframe,
      activity: this.goalActivity,
      metric: this.goalMetric,
      metricUnits: this.goalMetricUnits === 'occurrences' ? 'times' : this.goalMetricUnits,
      metricValue:
        this.goalMetricValue !== "" ? parseFloat(this.goalMetricValue) : 0,
      testValue: this.goalTestValue !== "" ? parseFloat(this.goalTestValue) : 0,
      testUnits: this.goalTestUnits,
      course: this.goalCourse
    };
  };

  // process the current goal list
  @action
  processGoalList = (list: GoalObj[], minTimesMet = 0, sDate?: string, eDate?: string): GoalDisplayObj[] => {
    let dispList: GoalDisplayObj[] = [];
    let gdo: GoalDisplayObj;

    // create a displayObj for each goal
    // containing the goalObj and a list of relevant type treks since the goal setDate
    // for each goal:
    //  find the relevant treks (use filterTreks)
    //  process each to see if it meets or adds to the goal (note this fact for display of check icon)
    //  different code to process each goal category
    //  need to be able to show percentage of goal achievement on main display list
    //  list relevant treks showing goal-related info in the list item
    //  list items will be selectable for viewing the trek map (use selectedTrek)
    this.setSortByAndDirection("Date", "Descend");
    list.forEach(g => {
      gdo = this.processGoal(g, sDate, eDate);
      if(gdo.timesMet >= minTimesMet) {
        dispList.push(gdo);       
      }
    });
    return dispList;
  };

  // add to the list of after filter functions, return the insert index + 1;
  setAfterProcessGoalsFn = (fn: Function) => {
    return this.runAfterProcessGoals.push(fn);
  };

  // run any functions registered by setAfterProcessGoalsFn
  afterProcessGoals = () => {
    this.runAfterProcessGoals.forEach(fn => {
      fn();
    });
  };

  // remove after filter function
  removeAfterProcessGoalsFn = index => {
    this.runAfterProcessGoals.splice(index, 1);
  };

  // process the goal at the given index in the goal list
  // return a GoalDisplayObj
  processGoal = (g: GoalObj, sDate?: string, eDate?: string): GoalDisplayObj => {
    let treks: number[];
    let gdo: GoalDisplayObj;
    let sdDate = sDate ? this.utilsSvc.formatShortSortDate(sDate) + "0000" : undefined;
    let seDate = eDate ? this.utilsSvc.formatShortSortDate(eDate) + "0000" : undefined;
    let todaySD = this.utilsSvc.formatShortSortDate();  // sortDate for TODAY
    let accum = 0;
    let sDateSet = this.utilsSvc.dateFromSortDateYY(g.dateSet);
    
    if (sDate && (sdDate < g.dateSet)) {   // use date set for min if after specified start date
      sdDate = g.dateSet;
      sDate = sDateSet;
    }
    this.setDateMin(sDate || sDateSet);
    this.setDateMax(eDate || this.utilsSvc.dateFromSortDateYY(todaySD));
    gdo = {
      goal: g,
      items: [],
      goalIntervals: [],
      mostRecentDate: '0',
      timesMet: 0,
      numTreks: 0,
      numIntervals: 0,
      emptyIntervals: 0,
      dateRange: {start: this.dateMin, end: this.dateMax}
    };
    this.buildIntervalList(gdo, sdDate, eDate);
    if(!gdo.numIntervals) { return gdo; }     // bail if no intervals
    this.setTrekType(/Burn|Trek/gi.test(g.activity) ? "" : g.activity);
    this.filterCourse = g.course;
    treks = this.filterAndSort();
    gdo.numTreks = treks.length;

    if (gdo.numTreks === 0 && g.category === CA_GOAL_CAT) {
      this.processTrekCA(undefined, gdo, accum, true, seDate); // do this to set up the interval items
    }
    treks.forEach((t, index) => {
      switch (g.category) {
        case DIT_GOAL_CAT:
          this.processTrekDIT(t, gdo);
          break;
        case CA_GOAL_CAT:
          let res = this.processTrekCA(
            t,
            gdo,
            accum,
            index === gdo.numTreks - 1
          );
          accum += res.count;
          if (res.newInterval) {
            accum = res.count;
          }
          break;
        default:
      }
    });
    return gdo;
  };

  // find the first trek entry for the current interval in the given displayItem list
  getFirstTrekInInterval = (items: GoalDisplayItem[]) : number => {
    let last = items.length - 1;
    for (let i=last; i>0; i--) {
      if (items[i-1].trek === undefined){ return items[i].trek;}
    }
    return items[last].trek ;
  }

  // Process the given trek against the given Cumulative Activity goal.
  // Add a trek item and, if necessary, an inteval item to the display item list.
  // Return the value of the property of the trek that matches the goal metric units.
  processTrekCA = (
    t: number,
    gdo: GoalDisplayObj,
    accum: number,
    lastTrek: boolean,
    seDate?: string
  ): { newInterval: boolean; count: number } => {
    let v = 0;
    let newInt = false;
    let meets = false;
    let sd : string;

    if (t && seDate && this.mainSvc.allTreks[t].sortDate > seDate) {
      return { newInterval: false, count: 0 };
    }
    if (t !== undefined) {
      v = this.getCAGoalTrekValue(this.mainSvc.allTreks[t], gdo.goal);
      sd = this.mainSvc.allTreks[t].sortDate;
    } else {
      sd = seDate || this.utilsSvc.formatShortSortDate() + "0000";
    }

    // If this trek goes with the next older interval, push an interval item.
    while (sd < gdo.goalIntervals[gdo.goalIntervals.length - 1].start) {
      newInt = true;
      meets = accum >= gdo.goal.metricValue;
      if (meets) {
        gdo.timesMet++;
        if (gdo.mostRecentDate === '0') { 
          gdo.mostRecentDate = this.mainSvc.allTreks[this.getFirstTrekInInterval(gdo.items)].sortDate; 
        }
      }
      gdo.items.push({
        interval: { range: gdo.goalIntervals.pop(), accum: accum },
        meetsGoal: meets
      });
      accum = 0; // Value of accumulator will not apply to any other items added here.
    }
    // Add a trek item. For CA goals, meetsGoal is only important on iterval items
    if (t !== undefined) {
      gdo.items.push({ trek: t, meetsGoal: false });
    }

    // If this was the last trek, push an ending interval item.
    if (lastTrek) {
      v += accum;
      meets = v >= gdo.goal.metricValue;
      if (meets) {
        gdo.timesMet++;
        if (gdo.mostRecentDate === '0') { 
          gdo.mostRecentDate = this.mainSvc.allTreks[this.getFirstTrekInInterval(gdo.items)].sortDate; 
        }
      }
      gdo.items.push({
        interval: { range: gdo.goalIntervals.pop(), accum: v },
        meetsGoal: meets
      });

      // If there are intervals left, push an interval item for each.
      while (gdo.goalIntervals.length) {
        gdo.items.push({
          interval: { range: gdo.goalIntervals.pop(), accum: 0 },
          meetsGoal: false
        });
      }
    }
    return { newInterval: newInt, count: v };
  };

  // get the associated value from the given trek for the given goal
  getCAGoalTrekValue = (t: TrekObj, g: GoalObj): number => {
    let v = 0;

    switch (g.metricUnits) {
      case "calories":
        v = t.calories;
        break;
      case "steps":
        v = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
        break;      
      case "course":  
      case "times":
        v = 1;
        break;
      case "miles":
      case "kilometers":
      case "meters":
        v = this.utilsSvc.convertDist(t.trekDist, g.metricUnits);
        break;
      case "minutes":
      case "hours":
      case "seconds":
      case "time":
        v = this.utilsSvc.convertTime(t.duration, g.metricUnits);
        break;
      default:
    }
    return v;
  };

  // Process the given trek against the given Distance in Time goal.
  // Add a trek item to the display item list.
  processTrekDIT = (t: number, gdo: GoalDisplayObj) => {
    let qualifies = false;
    let trek = this.mainSvc.allTreks[t];

    switch(gdo.goal.metricUnits){
      case 'course':
        qualifies = trek.duration <= gdo.goal.testValue;
        break;
      default:
        let mVal = this.utilsSvc.convertToMeters(
          gdo.goal.metricValue,
          gdo.goal.metricUnits
        );
        let tVal = this.utilsSvc.convertToSeconds(
          gdo.goal.testValue,
          gdo.goal.testUnits
        );
        qualifies =
        trek.trekDist >= mVal && tVal * (trek.trekDist / mVal) >= trek.duration;
    }
    if (qualifies) {
      gdo.timesMet++;
      if (gdo.mostRecentDate === '0') { 
        gdo.mostRecentDate = trek.sortDate; 
      }
    }
    gdo.items.push({ trek: t, meetsGoal: qualifies });
  };

  // Build a list of interval dates {start: SortDate, end: SortDate} for the given goal
  // starting at the start date or the date the goal is effective(which ever is later).
  // Intervals are not applicable to DIT goals (just CA goals).
  buildIntervalList = (gdo: GoalDisplayObj, sDate?: SortDate, eDate?: string ) => {

    let intervalDate = sDate || gdo.goal.dateSet;
    let endSD = this.utilsSvc.formatShortSortDate(eDate) + "9999";  //TODAY if eDate is undefined
    let period : DateInterval = 
          gdo.goal.category === CA_GOAL_CAT ? gdo.goal.testUnits as DateInterval : 'single';

    gdo.goalIntervals = this.utilsSvc.dateIntervalList(intervalDate, endSD, period )
    gdo.numIntervals = gdo.goalIntervals.length;
  };

  // return the time in seconds to go the given distance(units) given the total time(sec) and total distance(m)
  timeForDistance = (
    mValue: number,
    mUnits: string,
    dist: number,
    time: number
  ): number => {
    switch(mUnits){
      case 'course':
        return time;
      default:
        let m = this.utilsSvc.convertToMeters(mValue, mUnits);
        if (dist < m / 100) {
          return 0;
        }
        return time * (m / dist);
    }
  };

  // Find the relevant numeric range for the given goalDisplayObj
  // for CA goals, selInt values >=0 will specify an interval only
  // use selInt = -1 for DIT goals and to get range of interval sums for CA goals
  findDataRange = (gdo: GoalDisplayObj, selInt: number, metric: string) => {
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
      metric = "rate";
    }
    gdo.items.forEach(item => {
      if (selInt === curInt || this.intervalGraph) {
        // in the right interval?
        if (item.trek !== undefined) {
          let t = this.mainSvc.allTreks[item.trek];
          switch (metric) {
            case "miles":
            case "meters":
            case "kilometers":
              v = this.utilsSvc.convertDist(t.trekDist, metric);
              if (v < minV) {
                minV = v;
              }
              if (v > maxV) {
                maxV = v;
              }
              break;
            case "course":
            case "times":
              v = 1;
              if (v < minV) {
                minV = v;
              }
              if (v > maxV) {
                maxV = v;
              }
              break;
            case "hours":
            case "minutes":
            case 'time':
              v = this.utilsSvc.convertTime(t.duration, metric);
              if (v < minV) {
                minV = v;
              }
              if (v > maxV) {
                maxV = v;
              }
              break;
            case "rate":
              v = this.timeForDistance(
                gdo.goal.metricValue,
                gdo.goal.metricUnits,
                t.trekDist,
                t.duration
              );
              if (v !== 0) {
                if (v < minV) {
                  minV = v;
                }
                if (v > maxV) {
                  maxV = v;
                }
              }
              break;
            case "calories":
              v = t.calories;
              if (v < minV) {
                minV = v;
              }
              if (v > maxV) {
                maxV = v;
              }
              break;
            case "steps":
              v = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
              if (v < minV) {
                minV = v;
              }
              if (v > maxV) {
                maxV = v;
              }
              break;
            default:
          }
          sumInt += v;
        }
      }
      if (item.trek === undefined) {
        // new interval?
        if (sumInt < minInt) {
          minInt = sumInt;
        }
        if (sumInt > maxInt) {
          maxInt = sumInt;
        }
        sumInt = 0;
        curInt++;
      }
    });
    if (this.intervalGraph && gdo.goal.category === CA_GOAL_CAT) {
      maxInt = Math.round(maxInt);
      minInt = Math.trunc(minInt);
      gRange.max = maxInt;
      gRange.min = minInt;
      gRange.range =
        gdo.items.length && maxInt !== minInt ? maxInt - minInt : 10;
    } else {
      maxV = Math.trunc(maxV) + 1;
      minV = Math.trunc(minV);
      gRange.max = maxV;
      gRange.min = minV;
      gRange.range = gdo.items.length && maxV !== minV ? maxV - minV : 10;
    }
    return gRange;
  };

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given display items array has already been sorted by decending date.
  // The 'show' value will be displayed on the bar and the relevant date value will be displayed below the bar.
  // for CA goals, selInt values >=0 will generate graphData for that interval only
  // use selInt = -1 for DIT goals and to get a graph of interval sums for CA goals
  buildGraphData = (
    gdo: GoalDisplayObj,
    selectedInterval: number,
    metric: string
  ): BarGraphInfo => {
    let graphData: BarGraphInfo = {
      items: [],
      range: { max: 0, min: 0, range: 0 }
    };
    let dataRange;
    let dataAdjust = 0; //Math.round(dataRange.range * .1);
    // let metric = gdo.goal.metricUnits;
    let currInt = 0;
    let intSum = 0;
    let v;
    const DITGoal = gdo.goal.category === DIT_GOAL_CAT;
    const { trekLogGreen } = uiTheme.palette[this.mainSvc.colorTheme];

    if (DITGoal && gdo.goal.metricUnits !== 'course') {
      metric = "rate";
    }
    if (DITGoal && gdo.goal.metricUnits === 'course') {
      metric = "rateCourse";
    }
    switch(metric){
      case 'times':
        if (!this.intervalGraph) {
          metric = this.mainSvc.longDistUnits();
          graphData.title = this.mainSvc.longDistUnitsCaps();
        } else {
          graphData.title = 'Occurrences';
        }
        break;
      case "miles":
      case "meters":
      case "kilometers":
        graphData.title = this.mainSvc.longDistUnitsCaps();
        break;
      case "calories":
        graphData.title = 'Calories';
        break;
      case "steps":
        graphData.title = 'Steps';
        break;
      case "course":
        graphData.title = this.intervalGraph ? 'Occurrences' : undefined;
        metric = this.intervalGraph ? metric : 'time';
        break;
      default:
    }
    dataRange = this.findDataRange(gdo, selectedInterval, metric);
    dataRange.range = dataRange.max;
    dataRange.min = 0;
    graphData.range = dataRange;
    gdo.emptyIntervals = 0;
    gdo.items.forEach((item, index) => {
      let barItem: BarData = {} as BarData;
      if (selectedInterval === currInt || this.intervalGraph) {
        if (item.trek !== undefined) {
          // is this a trek item?
          let t = this.mainSvc.allTreks[item.trek];
          barItem.type = t.type;
          barItem.index = index;
          barItem.images = t.trekImages !== undefined;
          barItem.icon = undefined;
          if (gdo.goal.activity === "Burn" || gdo.goal.activity === "Trek") {
            barItem.icon = t.type; // show type icon above bars if displaying multiple trek types at once
          }
          switch (metric) {
            case "miles":
            case "meters":
            case "kilometers":
              v = this.utilsSvc.convertDist(t.trekDist, metric);
              barItem.value = v + dataAdjust;
              barItem.label1 = this.utilsSvc
                .getRoundedDist(t.trekDist, metric)
                .toString();
              break;
            case "course":
            case "times":
              v = 1;
              barItem.value = v + dataAdjust;
              barItem.label1 = v.toString();
              break;
            case "time":
              v = t.duration;
              barItem.value = v + dataAdjust;
              barItem.label1 = this.utilsSvc.timeFromSeconds(v);
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
            case "rateCourse":
              v = t.duration;
              barItem.value = v + dataAdjust; // add adjustment to avoid 0-height bars
              barItem.label1 = this.utilsSvc.timeFromSeconds(v);
              break;
            case "rate":
              v = this.timeForDistance(
                gdo.goal.metricValue,
                gdo.goal.metricUnits,
                t.trekDist,
                t.duration
              );
              barItem.value = v + dataAdjust; // add adjustment to avoid 0-height bars
              barItem.label1 =
                t.trekDist >=
                this.utilsSvc.convertToMeters(
                  gdo.goal.metricValue,
                  gdo.goal.metricUnits
                )
                  ? this.utilsSvc.timeFromSeconds(v)
                  : "n/a";
              break;
            case "calories":
              if (t.calories === null) {
              }
              v = t.calories === null ? 0 : t.calories;
              barItem.value = v + dataAdjust;
              barItem.label1 = v.toString();
              break;
            default:
              barItem.value = 0;
              barItem.label1 = "";
          }
          barItem.indicator = t.date.substr(0, 5);
          barItem.noPress = false; //v === 0;
          if (DITGoal) {
            barItem.indicatorFill = item.meetsGoal ? trekLogGreen : "red";
            graphData.items.push(barItem);
          } else {
            if (selectedInterval === currInt) {
              graphData.items.push(barItem);
            }
          }
          intSum += v;
        }
      }
      if (item.trek === undefined) {
        if (this.intervalGraph) {
          if (intSum) {
            // create interval bar
            barItem.index = currInt;
            barItem.value = intSum + dataAdjust;
            switch (metric) {
              case "miles":
              case "meters":
              case "kilometers":
                let m = this.utilsSvc.convertToMeters(intSum, metric);
                barItem.label1 = this.utilsSvc
                  .getRoundedDist(m, metric)
                  .toString();
                break;
              case "course":
              case "calories":
              case "steps":
              case "times":
                barItem.label1 = intSum.toString();
                break;
              case "time":
                barItem.label1 = this.utilsSvc.timeFromSeconds(Math.round(intSum));
                break;
              case "hours":
                barItem.label1 = (Math.round(intSum * 10) / 10).toString();
                break;
              case "minutes":
                barItem.label1 = Math.round(intSum).toString();
                break;
            }
            barItem.indicator = this.utilsSvc
              .dateFromSortDateYY(item.interval.range.end)
              .substr(0, 5);
            barItem.indicatorFill = item.meetsGoal ? trekLogGreen : "red";
            barItem.noPress = intSum === 0;  // always false?
            graphData.items.push(barItem);
          } else {
            gdo.emptyIntervals++;
          }
        }
        intSum = 0;
        currInt++;
      }
    });
    return graphData;
  };

  getIntervalDates = (items: GoalDisplayItem[], int: number) => {
    let iCount = 0;
    let dates = { start: "", end: "" };

    for (let i = 0; i < items.length; i++) {
      if (items[i].interval !== undefined) {
        if (iCount === int) {
          dates.start = this.utilsSvc.dateFromSortDateYY(
            items[i].interval.range.start
          );
          dates.end = this.utilsSvc.dateFromSortDateYY(
            items[i].interval.range.end
          );
          break;
        }
        iCount++;
      }
    }
    return dates;
  };

  // format a title for the graph
  formatGraphTitle = (gdo: GoalDisplayObj, interval: number): string => {
    let msg = "";
    let g = gdo.goal;

    switch (g.category) {
      case DIT_GOAL_CAT:
        if(g.metricUnits === 'course'){
          msg =
          "Time to " + g.activity + " course";
        } else {
          msg =
          "Time to " + g.activity + " " + g.metricValue + " " + g.metricUnits;
        }
        msg = msg.replace(/Trek /gi, "trek ");
        msg = msg.replace(/Walk /gi, "walk ");
        msg = msg.replace(/Run /gi, "run ");
        msg = msg.replace(/Bike /gi, "bike ");
        msg = msg.replace(/Hike /gi, "hike ");
        msg = msg.replace(/Board /gi, "board ");
        msg = msg.replace(/Drive /gi, "drive ");
        msg = msg.replace(/Burn /gi, "burn ");
        break;
      case CA_GOAL_CAT:
        if (this.intervalGraph) {
          msg = (g.metricUnits === 'course') ? 'times ' : '';
          msg += g.metricUnits + " " + g.activity + " " + g.testUnits;
        } else {
          let iDates = this.getIntervalDates(gdo.items, interval);
          let metric = g.metricUnits;
          if (g.metricUnits === "times") {
            metric = this.mainSvc.longDistUnits();
          }
          if(g.metricUnits === 'course'){
            msg =
            "Time to " + g.activity + " course";
          } else {
            msg =
            metric +
            "/" +
            g.activity +
            ": " +
            iDates.start +
            " - " +
            iDates.end;
          }
        }
        msg = msg.replace(/Trek /gi, "treked ");
        msg = msg.replace(/Walk /gi, "walked ");
        msg = msg.replace(/Run /gi, "run ");
        msg = msg.replace(/Bike /gi, "biked ");
        msg = msg.replace(/Hike /gi, "hiked ");
        msg = msg.replace(/Board /gi, "boarded ");
        msg = msg.replace(/Drive /gi, "driven ");
        msg = msg.replace(/Burn /gi, "burned ");
        break;
      default:
    }
    msg = msg.substr(0, 1).toUpperCase() + msg.substr(1);
    msg = msg.replace(/Burn:/gi, "Trek:");
    msg = msg.replace(/ 1 miles/gi, " 1 mile");
    msg = msg.replace(/daily/gi, "per day");
    msg = msg.replace(/weekly/gi, "per week");
    msg = msg.replace(/monthly/gi, "per month");

    return msg;
  };

  // format a label for info missing in the graph
  formatMissingIntsMsg = (gdo: GoalDisplayObj, eInts: number): string => {
    let plural = eInts === 1 ? "" : "s";
    let msg = "";

    if (eInts) {
      msg = eInts + " ";

      switch (gdo.goal.category) {
        case DIT_GOAL_CAT:
          msg += "day" + plural;
          break;
        case CA_GOAL_CAT:
          if (this.intervalGraph && gdo.goal.testUnits !== "daily") {
            msg += gdo.goal.testUnits + plural;
          } else {
            msg += "day" + plural;
          }
          break;
        default:
      }
      msg = msg.replace(/daily/gi, "day");
      msg = msg.replace(/weekly/gi, "week");
      msg = msg.replace(/monthly/gi, "month");
      msg = msg.replace(/^1 days/gi, "1 day");
      msg = msg.replace(/^1 weeks/gi, "1 week");
      msg = msg.replace(/^1 months/gi, "1 month");
      msg += " (not shown) had no activity";
    }

    return msg;
  };

  // return the 'interval' GoalDisplayItem applicable to the given trek date
  findGDOInterval = (gdo: GoalDisplayObj, trek: TrekObj): number => {
    for (let i = 0; i < gdo.items.length; i++) {
      if (
        gdo.items[i].interval !== undefined &&
        trek.sortDate >= gdo.items[i].interval.range.start &&
        trek.sortDate <= gdo.items[i].interval.range.end
      ) {
        return i;
      }
    }
    return -1;
  };

  checkTrekAgainstGoals = (trek: TrekObj, giveError = true): Promise<any> => {
    let result: { goal: GoalObj; item: GoalDisplayItem }[] = [];
    let goalsOfType: GoalObj[] = [];
    let targetGoals: GoalDisplayObj[];

    return new Promise((resolve, reject) => {
      this.getGoalList()
        .then(() => {
          // take the new trek out of the treks list
          // from a list of goals that include this trekType and are either DIT goals or CA goals that haven't been met:
          //   make a result list of those goals the new trek meets (DITs) or causes to be met (CAs)
          // add the trek back to the treks list
          // return the result list
          this.goalList.forEach(g => {
            if (
            (g.activity === trek.type ||
              g.activity === "Burn" ||
              g.activity === "Trek") && (!g.course || trek.course === g.course)
            ) {
              goalsOfType.push(g);
            }
          });
          if (goalsOfType.length) {
            // are there any goals that involve this kind of trek?
            this.mainSvc.popAllTreksEntry(); // remove trek from allTreks list
            targetGoals = this.processGoalList(goalsOfType); // see what goals looked like before this trek
            this.mainSvc.addAllTreksEntry(trek); // put trek back in list
            targetGoals.forEach(gdo => {
              switch (gdo.goal.category) {
                case DIT_GOAL_CAT:
                  let tMet = gdo.timesMet;
                  this.processTrekDIT(this.mainSvc.allTreks.length - 1, gdo); // this will increment timesMet if this trek achieves the goal
                  if (gdo.timesMet > tMet) {
                    result.push({ goal: gdo.goal, item: undefined });
                  }
                  break;
                case CA_GOAL_CAT:
                  let indx = this.findGDOInterval(gdo, trek);
                  if (indx !== -1) {
                    let gdi = gdo.items[indx];
                    if (!gdi.meetsGoal) {
                      // goal for interval not met yet?
                      gdi.interval.accum += this.getCAGoalTrekValue(
                        trek,
                        gdo.goal
                      );
                      if (gdi.interval.accum >= gdo.goal.metricValue) {
                        result.push({ goal: gdo.goal, item: gdi }); // this trek pushes us over the goal value
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
        .catch(() => {
          if (giveError){
            this.toastSvc.toastOpen({
              tType: "Error",
              content: "No goal list found."
            });
          }
          reject(result);
        });
    });
  };

  // compute the progress percentage for the given GoalDisplayItem
  computeProgress = (dispItem: GoalDisplayObj) => {
    switch (dispItem.goal.category) {
      case DIT_GOAL_CAT:
        return dispItem.numTreks ? dispItem.timesMet / dispItem.numTreks : 0;
      case CA_GOAL_CAT:
        return dispItem.numIntervals
          ? dispItem.timesMet / dispItem.numIntervals
          : 0;
    }
    return 0;
  };
}
