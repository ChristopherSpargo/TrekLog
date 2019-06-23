import { observable, action } from "mobx"
import { DatePickerAndroid } from 'react-native'
import { TrekInfo, TrekType, TrekObj, DIST_UNIT_CHOICES, 
         MeasurementSystemType, TREK_SELECT_BITS, NumericRange, ALL_SELECT_BITS } from './TrekInfoModel'
import { UtilsSvc, TimeFrame } from './UtilsService';
import { SortByTypes, ShowTypes, TIME_FRAMES_NEXT } from './ReviewComponent'
import { ToastModel } from "./ToastModel";

export type SortDirection = "Ascend" | "Descend";
export const SORT_DIRECTIONS = ['Ascend', 'Descend'];
export const SORT_DIRECTION_OTHER = {Ascend: 'Descend', Descend: 'Ascend'};
export const SORT_DIRECTION_ICONS = {Ascend: 'ArrowUp', Descend: 'ArrowDown'}

export interface FilterSettingsObj {
  typeSels: number,
  distMin: number,
  distMax: number,
  distUnits: string,
  timeMin: number,
  timeMax: number,
  dateMin: string,
  dateMax: string,
  speedMin: number,
  speedMax: number,
  speedUnits: string,
  calsMin: number,
  calsMax: number,
  stepsMin: number,
  stepsMax: number,
  sortBy: SortByTypes,
  sortDirection: string,
  timeframe: string
}

export interface BarData  {
  value: any,         // value that determines the size (height) of the bar
  label1: string,     // line 1 of bar label
  label2: string,     // line 2 (if any) of bar label
  type?: string,      // type of trek this is for
  icon?: string,      // icon to show if different types in graph
  images?: boolean,   // true if trek has any images
  indicator: string,   // label shown below bars, like an X axis, that also indicates which bar is in focus 
                      // (currently Trek date - blue and bold if focused, black and normal if not) 
  indicatorFill: string, // color for indicator text
  index?: number,     // index in the source data array for this bar
  noPress?: boolean,  // true if bar should not be pressed
}

export interface BarGraphInfo {
  items: BarData[],
  range: NumericRange
}


export class FilterSvc {

  @observable selectedTrekIndex;
  @observable scrollToBar;
  @observable dataReady;
  updateCount = 0;

  // filter values
  @observable trekType;
  @observable distMin;
  @observable distMax;
  @observable timeMin;
  @observable timeMax;
  @observable speedMin;
  @observable speedMax;
  @observable calsMin;
  @observable calsMax;
  @observable stepsMin;
  @observable stepsMax;
  @observable dateMin;
  @observable dateMax;

  // graph display values
  @observable sortBy : SortByTypes;
  @observable sortDirection;
  @observable show : ShowTypes;
  @observable sortByDate : boolean;

  // default filter values
  @observable dateDefMin : string;
  @observable dateDefMax : string;
  @observable distDefMin : string;
  @observable distDefMax : string;
  @observable timeDefMin : string;
  @observable timeDefMax : string;
  @observable speedDefMin : string;
  @observable speedDefMax : string;
  @observable calsDefMin : string;
  @observable calsDefMax : string;
  @observable stepsDefMin : string;
  @observable stepsDefMax : string;
  @observable filterRuns : number;
  @observable foundType : boolean;
  @observable groupList : string[];

  filterMode = '';
  barGraphData: BarGraphInfo = {items: [], range: {max: 0, min: 0, range: 0}};
  filter : FilterSettingsObj;
  filteredTreks : number[] = [];   // Treks to show in graph

  runAfterFilterTreks : Function[] = [];    // functions to run each time a new filtered treks list is made

  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo, 
                private toastSvc: ToastModel ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.selectedTrekIndex = -1;
    this.trekType = '';
    this.distMin = '';
    this.distMax = '';
    this.timeMin = '';
    this.timeMax = '';
    this.speedMin= '';
    this.speedMax= '';
    this.calsMin = '';
    this.calsMax = '';
    this.stepsMin = '';
    this.stepsMax = '';
    this.dateMin = '';
    this.dateMax = '';
    this.sortBy = 'Dist';
    this.sortDirection = SORT_DIRECTIONS[1];
    this.show = 'Dist';
    this.sortByDate = true;
    this.dataReady = false;
    this.dateDefMin = '';
    this.dateDefMax = '';
    this.distDefMin = '';
    this.distDefMax = '';
    this.timeDefMin = '';
    this.timeDefMax = '';
    this.speedDefMin = '';
    this.speedDefMax = '';
    this.calsDefMin = '';
    this.calsDefMax = '';
    this.stepsDefMin = '';
    this.stepsDefMax = '';
    this.setFilterRuns(0);
    this.setFoundType(false);
    this.clearGroupList();
  }

  // set observable that will cause the bar graph to scroll to a bar
  @action
  setScrollToBar = (barNum: number) => {
    this.scrollToBar = barNum;
  }

  // move the barGraph to the specified bar
  scrollBarGraph = (pos: number) => {
    let oldVal = this.trekInfo.updateGraph;

    this.trekInfo.setUpdateGraph(true);
    this.setScrollToBar(pos);
    requestAnimationFrame(() => {
      this.trekInfo.setUpdateGraph(false);
      this.setScrollToBar(undefined);
      this.trekInfo.setUpdateGraph(oldVal);
    })
  }

  // Parse string for intiger, return 0 if NaN
  getFlt = (val: string, precision = 1) : number => {
    let n = Math.round(parseFloat(val) * precision) / precision;
    return isNaN(n) ? 0 : n;
  }

  // return an object with the current filter values
  getFilterSettingsObj = (useSortDate = true) : FilterSettingsObj => {
    let dMin = this.dateMin;
    let dMax = this.dateMax;

    if (useSortDate === true){
      dMin = this.dateMin === '' ? '' : this.utilsSvc.formatSortDate(this.dateMin, '12:00 AM');
      dMax = this.dateMax === '' ? '' : this.utilsSvc.formatSortDate(this.dateMax,'11:59 PM');
    }

    return {
      typeSels:      this.filterMode === 'Dashboard' ? ALL_SELECT_BITS : this.trekInfo.typeSelections,
      distMin:       this.getFlt(this.distMin, 100),
      distMax:       this.getFlt(this.distMax, 100),
      distUnits:     this.trekInfo.distUnits(),
      timeMin:       this.getFlt(this.timeMin, 100),
      timeMax:       this.getFlt(this.timeMax, 100),
      dateMin:       dMin,
      dateMax:       dMax,
      speedMin:      this.getFlt(this.speedMin, 100),
      speedMax:      this.getFlt(this.speedMax, 100),
      speedUnits:    this.trekInfo.speedUnits(),
      calsMin:       this.getFlt(this.calsMin),
      calsMax:       this.getFlt(this.calsMax),
      stepsMin:      this.getFlt(this.stepsMin),
      stepsMax:      this.getFlt(this.stepsMax),
      sortBy:        this.sortByDate ? 'Date' : this.sortBy,
      sortDirection: this.sortDirection,
      timeframe:     this.trekInfo.timeframe
    }
  }

  // return true if any extra filter is set
  extraFilterSet = () : boolean => {
    return (this.distMin !== '' || this.distMax !== '' ||
            this.timeMin !== '' || this.timeMax !== '' ||
            this.speedMin !== '' || this.speedMax !== '' ||
            this.calsMin !== '' || this.calsMax !== '' ||
            this.stepsMin !== '' || this.stepsMax !== ''
           )
  }

  getTitleActivity = (sels = this.trekInfo.typeSelections) => {
    switch(sels){
      case TREK_SELECT_BITS['Walk']:
        return 'Walk';
      case TREK_SELECT_BITS['Bike']:
        return 'Bike';
      case TREK_SELECT_BITS['Run']:
        return 'Run';
      case TREK_SELECT_BITS['Hike']:
        return 'Hike';
      default:
        return 'Trek';
    }
  }

  // return true if the filteredTreks array has no entries
  filteredTreksEmpty = () => {
    return ((this.filteredTreks === undefined) || (this.filteredTreks.length === 0));
  }

  formatTitleMessage = (titleMsg: string, sels = this.trekInfo.typeSelections) => {
    let plural = this.filteredTreks.length === 1 ? '' : 's';
    return (titleMsg + '  ' +  this.filteredTreks.length + ' ' + this.getTitleActivity(sels) + plural);
  }

  // set the trek type for filtering data
  @action
  setTrekType = (value?: string) => {
    if (value !== undefined){
      this.trekType = value;
    }
    else {
      this.trekType = this.trekInfo.type;
    }
  }
  
  // set the timeframe for review data
  @action
  setTimeframe = (value: string, selectAfter = true) => {
    let dates : TimeFrame = this.utilsSvc.getTimeFrame(value);

    this.trekInfo.updateTimeframe(value);
    if (value !== 'Custom') {
      this.dateMin = dates.start;
      this.dateMax = dates.end;
      this.trekInfo.setUpdateGraph(true);
      this.filterTreks(selectAfter);
    }
    else {
      this.trekInfo.setUpdateGraph(false);
    }
  }

  // find a timeframe that has some treks in it starting with the given timeframe
  findActiveTimeframe = (startTF = 'TWeek', selectAfter = false) => {
    let tf = startTF;

    this.setTimeframe(tf, selectAfter);
    if (tf === 'Custom') {
      this.trekInfo.setUpdateGraph(true);
      this.filterTreks(selectAfter);
    }
    else {
      while((this.filteredTreks.length === 0) && (tf !== 'All')) {
        tf = TIME_FRAMES_NEXT[tf];
        this.setTimeframe(tf, selectAfter);
      }
    }
  }

  @action
  updateFSO = () => {
      this.filter = this.getFilterSettingsObj();
  }

  // Set the Trek type filter property.
  @action
  setType = (value: TrekType, toggle: boolean) => {
    this.trekInfo.setUpdateGraph(true);
    if (!toggle) {  // set selection to value
      this.trekInfo.setTypeSelections(TREK_SELECT_BITS[value]);
    } else {    // toggle bit value within selection
      this.trekInfo.updateTypeSelections(value, !(this.trekInfo.typeSelections & TREK_SELECT_BITS[value]));
    }
    requestAnimationFrame(() => {
      this.filterTreks();      
    })
  }

  // Set the Trek type selections filter property to the given value.
  @action
  setTypeSels = (value: number) => {
    this.trekInfo.setUpdateGraph(true);
    this.trekInfo.setTypeSelections(value );
    this.filterTreks();      
  }

  // add the given group to the group list
  @action
  addGroupListItem = (group: string) => {
    if(this.groupList.indexOf(group) === -1) {
      this.groupList.push(group);
    }
  }

  // remove the given group from the group list
  @action
  removeGroupListItem = (group: string) => {
    let i = this.groupList.indexOf(group);
    if (i !== -1) {
      this.groupList.splice(i,1);
    }
  }

  // clear the group list
  @action
  clearGroupList = () => {
    this.groupList = [];
  }

  // return true if the given group is in the groupList
  isInGroupList = (group: string) => {
    return this.groupList.indexOf(group) !== -1;
  }

  @action
  setFilterRuns = (val: number) => {
    this.filterRuns = val;
  }

  @action
  setFoundType = (status: boolean) => {
    this.foundType = status;
  }

  incFilterRuns = () => {
    this.setFilterRuns(this.filterRuns + 1);
  }

  @action
  setDistMin = (value: string) => {
    this.distMin = value;
  }

  @action
  setDistMax = (value: string) => {
    this.distMax = value;
  }

  @action
  setTimeMin = (value: string) => {
    this.timeMin = value;
  }

  @action
  setTimeMax = (value: string) => {
    this.timeMax = value;
  }

  @action
  setSpeedMin = (value: string) => {
    this.speedMin = value;
  }

  @action
  setSpeedMax = (value: string) => {
    this.speedMax = value;
  }

  @action
  setCalsMin = (value: string) => {
    this.calsMin = value;
  }

  @action
  setCalsMax = (value: string) => {
    this.calsMax = value;
  }

  @action
  setStepsMin = (value: string) => {
    this.stepsMin = value;
  }

  @action
  setStepsMax = (value: string) => {
    this.stepsMax = value;
  }

  @action
  setDistDefMin = (value: string) => {
    this.distDefMin = value;
  }

  @action
  setDistDefMax = (value: string) => {
    this.distDefMax = value;
  }

  // get the minimu trek date filter value
  @action
  getDateMin = () => {
    let oldMin = this.dateMin;
    let dt, min, max;

    this.trekInfo.setUpdateGraph(false);
    this.setDateMin('', 'Filter');
    dt = this.utilsSvc.getYMD(new Date(oldMin !== '' ? oldMin : this.dateDefMin));
    min = this.utilsSvc.getYMD(new Date(this.dateDefMin));
    max = this.utilsSvc.getYMD(new Date(this.dateMax !== '' ? this.dateMax : this.dateDefMax));
    DatePickerAndroid.open({
      date: new Date(dt.year, dt.month, dt.day),
      minDate: new Date(min.year, min.month, min.day),
      maxDate: new Date(max.year, max.month, max.day),
    })
    // @ts-ignore
    .then(({action, year, month, day}) => {
      if (action === DatePickerAndroid.dateSetAction){
        this.setTimeframe('Custom');
        this.setDateMin(new Date(year,month,day).toLocaleDateString(), 'None');
        requestAnimationFrame(() => {
          this.trekInfo.setUpdateGraph(true);
          this.filterTreks()
        })
      }
      else {
        this.trekInfo.setUpdateGraph(false);
        this.setDateMin(oldMin, 'None');
        requestAnimationFrame(() => {
          this.filterTreks(false)
        })
      }
    })
    .catch(() =>{
      this.trekInfo.setUpdateGraph(false);
    })
  }

  @action
  setDateMin = (value: string, filter = 'Select') => {
    this.trekInfo.dtMin = value;
    this.dateMin = value;
    switch(filter){
      case 'Select':
        this.filterTreks();
        break;
      case 'Filter':
        this.filterTreks(false);
        break;
      case 'None':
      default:
    }
  }

  // get the maximum trek date filter value
  getDateMax = () => {
    let oldMax = this.dateMax;
    let dt, min, max;

    this.trekInfo.setUpdateGraph(false);
    this.setDateMax('', 'Filter');
    dt = this.utilsSvc.getYMD(new Date(oldMax !== '' ? oldMax : this.dateDefMax));
    max = this.utilsSvc.getYMD(new Date(this.dateDefMax));
    min = this.utilsSvc.getYMD(new Date(this.dateMin !== '' ? this.dateMin : this.dateDefMin));
    DatePickerAndroid.open({
      date: new Date(dt.year, dt.month, dt.day),
      minDate: new Date(min.year, min.month, min.day),
      maxDate: new Date(max.year, max.month, max.day),
    })
    // @ts-ignore
    .then(({action, year, month, day}) => {
      if (action === DatePickerAndroid.dateSetAction){
        this.setTimeframe('Custom');
        this.setDateMax(new Date(year,month,day).toLocaleDateString(), 'None');
        requestAnimationFrame(() => {
          this.trekInfo.updateGraph = true;
          this.filterTreks()
        })
      }
      else {
        this.setDateMax(oldMax, 'None');
        requestAnimationFrame(() => {
          this.filterTreks(false)
        })
      }
    })
    .catch(() =>{})
  }
  
  @action
  setDateMax = (value: string, filter = 'Select') => {
    this.trekInfo.dtMax = value;
    this.dateMax = value;
    switch(filter){
      case 'Select':
        this.filterTreks();
        break;
      case 'Filter':
        this.filterTreks(false);
        break;
      case 'None':
      default:
    }
  }

  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setShow = (value: ShowTypes) => {
    this.show = value;
    this.setSortDirection(this.sortDirection);
  }

  // do a simple set of the sortBy and sortDirection properties with no side effects
  @action
  setSortByAndDirection = (sb: SortByTypes, dir: SortDirection) => {
    this.sortBy = sb;
    this.sortDirection = dir;
  }

  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setSortBy = (value: SortByTypes) => {
    this.sortBy = value;
    this.setShow(value); 
  }

  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setSortByDate = (value: boolean) => {
    this.sortByDate = value;
  }

  // toggle the sort by date property
  @action
  toggleSortByDate = () => {
    this.setSortByDate(!this.sortByDate);
    this.setSortDirection(this.sortDirection);
  }

  // set the sortDirection filter property and process the existing filteredTreks
  @action
  setSortDirection = (value: string) => {
      this.sortDirection = value;
      this.sortExistingTreks();
  }

  // Change the sorting direction 
  toggleSortDirection = () => {
    this.setSortDirection(SORT_DIRECTION_OTHER[this.sortDirection]);
  }

  @action
  setDataReady = (value: boolean) => {
    this.dataReady = value && this.trekInfo.dataReady;
  }

  setFilteredTreks = (list: number[]) => {
    this.filteredTreks = list;
  }

  getPackWeight = (t : TrekObj) => {
    return (t.type === "Hike" ? t.packWeight : 0);
  }

  // Check the given trek aginst the filter values.  Return true if trek passes all filters.
  checkTrek = (trek: TrekObj) => {

    let dist = this.utilsSvc.convertDist(trek.trekDist, this.filter.distUnits);
    let speed = this.utilsSvc.convertSpeed(trek.trekDist, trek.duration, this.filter.speedUnits);
    let time = trek.duration / 60;
    let cals = trek.calories;
    let steps = this.utilsSvc.computeStepCount(trek.trekDist, trek.strideLength);
    let date = trek.sortDate;
    if (!(this.trekInfo.typeSelections & TREK_SELECT_BITS[trek.type])) { return false; }
    if (this.filter.dateMin && (date < this.filter.dateMin)) { return false; }
    if (this.filter.dateMax && (date > this.filter.dateMax)) { return false; }
    if (this.filter.distMin && (dist < this.filter.distMin)) { return false; }
    if (this.filter.distMax && (dist > this.filter.distMax)) { return false; }
    if (this.filter.timeMin && (time < this.filter.timeMin)) { return false; }
    if (this.filter.timeMax && (time > this.filter.timeMax)) { return false; }
    if (this.filter.speedMin && (speed < this.filter.speedMin)) { return false; }
    if (this.filter.speedMax && (speed > this.filter.speedMax)) { return false; }
    if (this.filter.calsMin && (cals < this.filter.calsMin)) { return false; }
    if (this.filter.calsMax && (cals > this.filter.calsMax)) { return false; }
    if (this.filter.stepsMin && (steps < this.filter.stepsMin)) { return false; }
    if (this.filter.stepsMax && (steps > this.filter.stepsMax)) { return false; }
    
    return true;
  }

  // Compare the appropriate properties based on the sortBy and startWith filter values
  sortFunc = (a: number, b: number) : number => {
    let uSvc = this.utilsSvc;
    let ta = this.trekInfo.allTreks[a];
    let tb = this.trekInfo.allTreks[b];

    switch(this.filter.sortBy){
      case 'Dist':
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ? 
                ta.trekDist - tb.trekDist : tb.trekDist - ta.trekDist);
      case 'Time':
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ? 
                ta.duration - tb.duration : tb.duration - ta.duration);
      case 'Date':
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ?   
              (parseInt(ta.sortDate, 10) - parseInt(tb.sortDate, 10)) : 
              (parseInt(tb.sortDate, 10) - parseInt(ta.sortDate, 10))); 
      case 'Speed':
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ? 
              (ta.duration ? (ta.trekDist / ta.duration) : 0) - 
              (tb.duration ? (tb.trekDist / tb.duration) : 0) : 
              (tb.duration ? (tb.trekDist / tb.duration) : 0) - 
              (ta.duration ? (ta.trekDist / ta.duration) : 0)); 
      case 'Cals':
        let ca = ta.calories;
        let cb = tb.calories;
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ? ca - cb : cb - ca);
      case 'Steps':
        return (this.filter.sortDirection === SORT_DIRECTIONS[0] ? 
              uSvc.computeStepCount(ta.trekDist, ta.strideLength) - 
              uSvc.computeStepCount(tb.trekDist, tb.strideLength) : 
              uSvc.computeStepCount(tb.trekDist, tb.strideLength) - 
              uSvc.computeStepCount(ta.trekDist, ta.strideLength)); 
      default:
        return 0;
    }
  }

  // return a list of treks sorted and filtered by the current settings
  filterAndSort = () : number[] => {
    let foundSelectedType = false;
    let treks : number[] = [];

    if (this.trekInfo.allTreks.length) {
      this.updateFSO();
      for( let i=0; i<this.trekInfo.allTreks.length; i++){
        if (this.checkTrek(this.trekInfo.allTreks[i])){
          treks.push(i);
          if ((this.trekInfo.typeSelections & TREK_SELECT_BITS[this.trekInfo.allTreks[i].type])) { 
            foundSelectedType = true; 
          } 
        }
      }
      treks.sort(this.sortFunc);
    }
    this.setFilteredTreks(treks);
    this.incFilterRuns();
    this.setFoundType(foundSelectedType);
    return treks;
  }

  // Apply the filter to all the treks
  @action
  filterTreks = (selectAfterFilter = true) => {
    let treks : number[] = this.filterAndSort();

    this.getFilterDefaults(treks);
    if (selectAfterFilter){
      this.buildGraphData(treks);        
      this.setDataReady(true);
      if (this.filteredTreks.length) {
        this.trekSelected(0);
        this.scrollBarGraph(0);
      }
      else {
        this.setSelectedTrekIndex(-2);
      }
      this.runAfterFilterFns();
    }
  }

  runAfterFilterFns = () => {
    this.runAfterFilterTreks.forEach((fn) => {
      fn();
    });
  }
  
  // add to the list of after filter functions, return the insert index + 1;
  setAfterFilterFn = (fn : Function) => {
    return this.runAfterFilterTreks.push(fn);
  }

  // remove after filter function
  removeAfterFilterFn = (index) => {
    this.runAfterFilterTreks.splice(index,1);
  }

  // sort the existing filtered list of treks
  @action
  sortExistingTreks = () => {
    if (this.filteredTreks.length){
      this.updateFSO();
      let treks = [...this.filteredTreks];
      treks.sort(this.sortFunc);
      this.buildGraphData(treks);
      this.setFilteredTreks(treks);
      this.trekSelected(0);
      this.scrollBarGraph(0);
    }
  }

  // Set the Trek at the given index in filteredTreks as the current Trek.
  trekSelected = (indx: number, update = false) => {
    let trek = this.trekInfo.allTreks[this.filteredTreks[indx]];
    this.trekInfo.setTrekProperties(trek);
    if (!trek.elevations) { // read and save elevation data for trek if necessary
      this.trekInfo.setElevationProperties()
      .then(() => {
        this.toastSvc.toastOpen({tType: 'Info', content: 'Retreived elevation data.'})
        trek.elevations = this.trekInfo.elevations;
        trek.elevationGain = this.trekInfo.elevationGain;
        trek.hills = this.trekInfo.hills;
        trek.calories = this.trekInfo.calories;
        this.trekInfo.saveTrek(trek, 'none')
        // this.trekInfo.setUpdateGraph(true);
        this.setSelectedTrekIndex(indx);
      })
      .catch(() => {
        this.toastSvc.toastOpen({tType: 'Error', content: 'Error retreiving elevation data.'})
        // this.trekInfo.setUpdateGraph(true);
        this.setSelectedTrekIndex(indx);
      })
    } else {
      if (update) { this.trekInfo.setUpdateGraph(true); }
      this.setSelectedTrekIndex(indx);
    }
  }

  // Set the property that keeps trak of whick Trek is currently in focus
  @action
  setSelectedTrekIndex = (val: number) => {
    if(val === -2) { this.trekInfo.setUpdateGraph(false); }
    this.selectedTrekIndex = val;
  }


  @action
  setFilterItem = (item: string, value: string, update = true) => {
      switch(item){
        case 'distMin':
          this.setDistMin(value);
          break;
        case 'distMax':
          this.setDistMax(value);
          break;
        case 'timeMin':
          this.setTimeMin(value);
          break;
        case 'timeMax':
          this.setTimeMax(value);
          break;
          case 'speedMin':
          this.setSpeedMin(value);
          break;
        case 'speedMax':
          this.setSpeedMax(value);
          break;
        case 'calsMin':
          this.setCalsMin(value);
          break;
        case 'calsMax':
          this.setCalsMax(value);
          break;
          case 'stepsMin':
          this.setStepsMin(value);
          break;
        case 'stepsMax':
          this.setStepsMax(value);
          break;
        default:
      }
      if (update) {
        this.filterTreks()
      }
  }

  // Reset the values in the Dist filter fields
  @action
  resetDistFilter = (update = true) => {
    this.setDistMin('');
    this.setDistMax('');
    if (update){
        this.filterTreks();
    } 
  }

  // Reset the values in the Time filter fields
  @action
  resetTimeFilter = (update = true) => {
    this.setTimeMin('');
    this.setTimeMax('');
    if (update){
        this.filterTreks();
    } 
  }

  // Reset the values in the Speed filter fields
  @action
  resetSpeedFilter = (update = true) => {
    this.setSpeedMin('');
    this.setSpeedMax('');
    if (update){
        this.filterTreks();
    } 
  }

  // Reset the values in the Calories filter fields
  @action
  resetCalsFilter = (update = true) => {
    this.setCalsMin('');
    this.setCalsMax('');
    if (update){
        this.filterTreks();
    } 
  }

  // Reset the values in the Steps filter fields
  @action
  resetStepsFilter = (update = true) => {
    this.setStepsMin('');
    this.setStepsMax('');
    if (update){
        this.filterTreks();
    } 
  }

  // find the max and min values for each sortable property in the given Trek list
  @action
  getFilterDefaults = (tn: number[]) => {
    let dtMin = '99999999', dtMax = '00000000';
    let dsMin = 1000000,    dsMax = -1;
    let tmMin = 1000000,    tmMax = -1;
    let spMin = 1000000,    spMax = -1;
    let caMin = 1000000,    caMax = -1;
    let stMin = 1000000,    stMax = -1;
    let spd, cals, steps;
    let uSvc = this.utilsSvc;
    let mSys = this.trekInfo.measurementSystem;


    if (tn.length !== 0){
      for(let i=0; i<tn.length; i++) {
        let trek = this.trekInfo.allTreks[tn[i]];
        let d = trek.sortDate;
        if(d < dtMin) { dtMin = d; this.dateDefMin = trek.date};
        if(d > dtMax) { dtMax = d; this.dateDefMax = trek.date};
        if(this.distMin === '' && trek.trekDist < dsMin) { dsMin = trek.trekDist};
        if(this.distMax === '' && trek.trekDist > dsMax) { dsMax = trek.trekDist};
        if(this.timeMin === '' && trek.duration < tmMin) { tmMin = trek.duration};
        if(this.timeMax === '' && trek.duration > tmMax) { tmMax = trek.duration};
        spd = uSvc.computeRoundedAvgSpeed(mSys, trek.trekDist, trek.duration);
        if(this.speedMin === '' && spd < spMin) { spMin = spd};
        if(this.speedMax === '' && spd > spMax) { spMax = spd};
        cals = trek.calories;
        if(this.calsMin === '' && cals < caMin) { caMin = cals};
        if(this.calsMax === '' && cals> caMax) { caMax = cals};
        steps = uSvc.computeStepCount(trek.trekDist, trek.strideLength);
        if(this.stepsMin === '' && steps < stMin) { stMin = steps};
        if(this.stepsMax === '' && steps> stMax) { stMax = steps};
      }
    } else {
      dsMin = 0 ; dsMax = -.5;
      tmMin = 0 ; tmMax = -.5;
      spMin = 0 ; spMax = -.5;
      caMin = caMax = 0;
      stMin = stMax = 0;
    }
    if(this.distMin === '') {
      this.distDefMin = Math.trunc(uSvc.getBigDistance(dsMin, mSys)).toString();
    } else {
      this.distDefMin = '';
    }
    if(this.distMax === '') {
      this.distDefMax = Math.round(uSvc.getBigDistance(dsMax, mSys) + .5).toString();
    } else {
      this.distDefMax = '';
    }
    if(this.timeMin === '') {
      this.timeDefMin = Math.trunc(tmMin / 60).toString();
    } else {
      this.timeDefMin = '';
    }
    if(this.timeMax === '') {
      this.timeDefMax = Math.round((tmMax / 60) + .5).toString();
    } else {
      this.timeDefMax = '';
    }
    if(this.speedMin === '') {
      this.speedDefMin = Math.trunc(spMin).toString();
    } else {
      this.speedDefMin = '';
    }
    if(this.speedMax === '') {
      this.speedDefMax = Math.round(spMax + .5).toString();
    } else {
      this.speedDefMax = '';
    }
    if(this.calsMin === '')  {
      this.calsDefMin = caMin.toString();
    } else {
      this.calsDefMin = '';
    }
    if(this.calsMax === '')  {
      this.calsDefMax = caMax.toString();
    } else {
      this.calsDefMax = '';
    }
    if(this.stepsMin === '') {
      this.stepsDefMin = stMin.toString();
    } else {
      this.stepsDefMin = '';
    }
    if(this.stepsMax === '') {
      this.stepsDefMax = stMax.toString();
    } else {
      this.stepsDefMax = '';
    }
  }

  // clear the data array used for the bar graph
  clearBarGraphData = () => {
    this.barGraphData.items = [];
  }

  // add the given barData item to the barGraphData array
  addBarGraphData = (item: BarData) => {
    this.barGraphData.items.push(item);
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given treks array has already been sorted using the sortBy value.
  // The 'show' value will be displayed on the bar and the Date value will be displayed above the bar.
  buildGraphData = (treks: number[]) => {
    let thisSortDate = this.utilsSvc.formatSortDate();
    let dataRange = this.findDataRange(treks, this.show, this.trekInfo.measurementSystem)

    this.clearBarGraphData();
    this.barGraphData.range = dataRange;
    for(let tn=0; tn<treks.length; tn++) {
      let t = this.trekInfo.allTreks[treks[tn]];
      let barItem : BarData = this.getBarItem(t, thisSortDate, this.show);
      this.addBarGraphData(barItem);
    }
  }

  getBarItem = (t: TrekObj, thisSortDate: string, show: string) : BarData => {
    let barItem : BarData = {} as BarData;
    barItem.type = t.type;
    barItem.icon = t.type;      // show type icon above bars
    barItem.images = t.trekImages !== undefined;
    switch(show){
      case "Dist":
        let d = this.utilsSvc.getRoundedDist(t.trekDist, this.trekInfo.distUnits(), true);
        barItem.value = d;
        barItem.label1 = d.toString();
        break;
      case "Time":
        barItem.value = t.duration;
        barItem.label1 = this.utilsSvc.timeFromSeconds(t.duration);
        break;
      case "Date":
        let db = this.utilsSvc.daysBetween(thisSortDate, t.sortDate)
        barItem.value = db;
        barItem.label1 = t.date.substr(0,5) + '/' + t.sortDate.substr(2,2);
        barItem.label2 = t.startTime;
        break;
      case "Steps":
        let s = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
        // let spm = this.utilsSvc.computeStepsPerMin(s, t.duration);
        barItem.value = s;
        barItem.label1 = s.toString();
        break;
      case "Speed":
        let speed = this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, t.trekDist, t.duration);
        barItem.value = speed; 
        barItem.label1 = speed.toString();
        break;
      case "Cals":
        barItem.value = t.calories;
        barItem.label1 = (barItem.value).toString();
        break;
      default:
        barItem.value = 0;
        barItem.label1 = '';
        barItem.label2 = '';
    }
    barItem.indicator = t.date.substr(0,5); 
    return barItem;
}

  // Return the range of the selected data item in the given list of treks
  findDataRange = (list: number[], data: string, system: MeasurementSystemType) => {
    let minD = '999999999999';
    let maxD = '000000000000';
    let minV = 999999;
    let maxV = -999999
    let range;

    list.forEach((ti) => {
      let trek = this.trekInfo.allTreks[ti];
      switch(data){
        case 'Date':
        case 'Age':
          if (trek.sortDate < minD) { minD = trek.sortDate; }
          if (trek.sortDate > maxD) { maxD = trek.sortDate; }
          break;
        case 'Dist':
          let d = this.utilsSvc.convertDist(trek.trekDist, DIST_UNIT_CHOICES[system])
          if (d < minV) { minV = d; }
          if (d > maxV) { maxV = d; }
          break;
        case 'Time':
          if (trek.duration < minV) { minV = trek.duration; }
          if (trek.duration > maxV) { maxV = trek.duration; }
          break;
        case 'Speed':
          let s = this.utilsSvc.computeRoundedAvgSpeed(system, trek.trekDist, trek.duration);
          if (s < minV) { minV = s; }
          if (s > maxV) { maxV = s; }
          break;
        case 'Cals':
          let c = trek.calories;
          if (c < minV) { minV = c; }
          if (c > maxV) { maxV = c; }
          break;
        case 'Steps':
          let st = this.utilsSvc.computeStepCount(trek.trekDist, trek.strideLength);
          if (st < minV) { minV = st; }
          if (st > maxV) { maxV = st; }
          break;
        default:
      }
    })
    if (data === 'Date' || data === 'Age'){ 
      maxV = this.utilsSvc.daysBetween(this.utilsSvc.formatSortDate(), minD);
      minV = this.utilsSvc.daysBetween(this.utilsSvc.formatSortDate(), maxD);
    }
    maxV = Math.round(maxV*10)/10;
    minV = Math.round(minV*10)/10;
    range = maxV - minV;
    return {max: maxV, min: minV, range: range}
  }

}
