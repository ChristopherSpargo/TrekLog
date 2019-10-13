import { observable, action } from "mobx"
import { DatePickerAndroid } from 'react-native'
import { TrekInfo, TrekType, TrekObj, DIST_UNIT_CHOICES, SortByTypes, ShowTypes,
         MeasurementSystemType, TREK_SELECT_BITS, ALL_SELECT_BITS, TREK_TYPE_HIKE, 
         RESP_OK, RESP_CANCEL } from './TrekInfoModel'
import { UtilsSvc, TimeFrame, TIME_FRAMES_NEXT, TIME_FRAME_CUSTOM  } from './UtilsService';
import { ToastModel } from "./ToastModel";
import { BarData, BarGraphInfo } from './BarDisplayComponent';

export type SortDirection = "Ascend" | "Descend";
export const SORTDIRECTION_ASCEND = "Ascend";
export const SORTDIRECTION_DESCEND = "Descend";
export const SORT_DIRECTIONS = [SORTDIRECTION_ASCEND, SORTDIRECTION_DESCEND];
export const SORT_DIRECTION_OTHER = {Ascend: SORTDIRECTION_DESCEND, Descend: SORTDIRECTION_ASCEND};
export const SORT_DIRECTION_ICONS = {Ascend: 'ArrowUp', Descend: 'ArrowDown'}
export const FILTERMODE_DASHBOARD = 'Dashboard';
export const FILTERMODE_REVIEW = 'Review';
export const FILTERMODE_FROM_STATS = 'ReviewFromStats';

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

export class FilterSvc {

  @observable selectedTrekIndex;
  @observable scrollToBar;
  @observable dataReady;
  selectedTrekDate = '';
  trekType : TrekType;

  // filter values
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
  @observable showAvgSpeed: boolean;
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;

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
  @observable ftChecksum : number;
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
    this.setDefaultSortValues();
    this.show = 'Dist';
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
    this.setFTChecksum(0);
    this.setFoundType(false);
    this.setFilterRuns(0);
    this.clearGroupList();
  }

  @action
  setShowAvgSpeed = (status: boolean) => {
    this.showAvgSpeed = status;
  }

  @action
  setShowTotalCalories = (status: boolean) => {
    this.showTotalCalories = status;
  }

  @action
  setShowStepsPerMin = (status: boolean) => {
    this.showStepsPerMin = status;
  }

  // toggle the selected flag
  toggleShowValue = (type: string) => {
    switch(type){
      case 'Speed':
        this.setShowAvgSpeed(!this.showAvgSpeed);
        break;
      case 'Steps':
        this.setShowStepsPerMin (!this.showStepsPerMin);
        break;
      case 'Cals':
        this.setShowTotalCalories(!this.showTotalCalories);
        break;
    }
  }

  // set observable that will cause the bar graph to scroll to a bar
  @action
  setScrollToBar = (barNum: number) => {
    this.scrollToBar = barNum;
  }

  // move the barGraph to the specified bar
  scrollBarGraph = (pos: number) => {
    this.setScrollToBar(pos);
    requestAnimationFrame(() => {
      this.setScrollToBar(undefined);
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
      typeSels:      this.filterMode === FILTERMODE_DASHBOARD ? ALL_SELECT_BITS 
                                                              : this.trekInfo.typeSelections,
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
      case TREK_SELECT_BITS['Board']:
        return 'Board';
      case TREK_SELECT_BITS['Drive']:
        return 'Drive';
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
  setTrekType = (value?: TrekType) => {
    if (value !== undefined){
      this.trekType = value;
    }
    else {
      this.trekType = this.trekInfo.type;
    }
  }
  
  // set the timeframe for review data
  @action
  setTimeframe = (value: string) => {

    this.trekInfo.updateTimeframe(value);
    if (value !== TIME_FRAME_CUSTOM) {
      let dates : TimeFrame = this.utilsSvc.getTimeFrame(value);
      this.dateMin = dates.start;
      this.dateMax = dates.end;
    }
    this.filterTreks();             // this sets dateDefMin and Max
    if(this.dateMin === '') { this.setDateMin(this.dateDefMin, "None"); }
    if(this.dateMax === '') { this.setDateMax(this.dateDefMax, "None"); }
  }

  // find a timeframe that has some treks in it starting with the given timeframe
  findActiveTimeframe = (startTF = 'TMonth') => {
    let tf = startTF;

    this.setTimeframe(tf);
    if (tf !== TIME_FRAME_CUSTOM) {
      while((this.filteredTreks.length === 0) && (tf !== 'All')) {
        tf = TIME_FRAMES_NEXT[tf];
        this.setTimeframe(tf);
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
    this.trekInfo.setTypeSelections(value );
    this.filterTreks();      
  }

  // add the given group to the group list
  @action
  addGroupListItem = (group: string) => {
    if(!this.isInGroupList(group)) {
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
  setFoundType = (status: boolean) => {
    this.foundType = status;
  }

  @action
  setFTChecksum = (val: number) => {
    this.ftChecksum = val;
  }

  @action
  setFilterRuns = (val: number) => {
    this.filterRuns = val;
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

  // get the minimum trek date filter value
  @action
  getDateMin = () => {
    let dt;

    return new Promise<any>((resolve) => {
      dt = this.utilsSvc.getYMD(new Date(this.getDateMinValue()));
      DatePickerAndroid.open({
        date: new Date(dt.year, dt.month, dt.day),
      })
      // @ts-ignore
      .then(({action, year, month, day}) => {
        if (action === DatePickerAndroid.dateSetAction){
          this.setDateMin(new Date(year,month,day).toLocaleDateString(), 'None');
          this.setTimeframe(TIME_FRAME_CUSTOM);
          resolve(RESP_OK)
        }
        else {
          resolve(RESP_OK)
        }
      })
      .catch(() =>{
        resolve(RESP_CANCEL)
      })
    })
  }

  @action
  setDateMin = (value: string, filter : "Select" | "Filter" | "None") => {
    this.trekInfo.dtMin = value;
    this.dateMin = value;
    switch(filter){
      case 'Select':
        this.filterTreks();
        this.buildAfterFilter();
        break;
      case 'Filter':
        this.filterTreks();
        break;
      case 'None':
      default:
    }
  }

  // get the maximum trek date filter value
  @action
  getDateMax = () => {
    let dt;

    return new Promise<any>((resolve) => {

      dt = this.utilsSvc.getYMD(new Date(this.getDateMaxValue()));
      DatePickerAndroid.open({
        date: new Date(dt.year, dt.month, dt.day),
      })
      // @ts-ignore
      .then(({action, year, month, day}) => {
        if (action === DatePickerAndroid.dateSetAction){
          this.setDateMax(new Date(year,month,day).toLocaleDateString(), 'None');
          this.setTimeframe(TIME_FRAME_CUSTOM);
          resolve(RESP_OK)
        }
        else {
          resolve(RESP_OK)
        }
      })
      .catch(() =>{resolve(RESP_CANCEL)})
    })
  }
  
  @action
  setDateMax = (value: string, filter : "Select" | "Filter" | "None" ) => {
    this.trekInfo.dtMax = value;
    this.dateMax = value;
    switch(filter){
      case 'Select':
        this.filterTreks();
        this.buildAfterFilter();
        break;
      case 'Filter':
        this.filterTreks();
        break;
      case 'None':
      default:
    }
  }

  // return either the dateMin value or dateDefMin value
  getDateMinValue = () :string => {
    return this.dateMin === '' ? this.dateDefMin : this.dateMin;
  }

  // return either the dateMax value or dateDefMax value
  getDateMaxValue = () :string => {
    return this.dateMax === '' ? this.dateDefMax : this.dateMax;
  }
  
  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setShow = (value: ShowTypes) => {
    this.show = value;
    this.sortAndBuild();
}

  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setSortBy = (value: SortByTypes) => {
    if (value === 'Date'){
      this.toggleSortByDate();
    } else {
      if(value !== this.sortBy){    
        this.sortBy = value;
        this.setShow(value); 
      } else {
        this.toggleSortDirection();
        this.sortAndBuild();
      }
    }
  }

  // set the default sort parameters
  @action
  setDefaultSortValues = () => {
    this.sortDirection = SORTDIRECTION_DESCEND; // init to sort Descending
    this.sortByDate = true;                     // by date
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
    this.sortAndBuild();
}

  // set the sortDirection filter property and process the existing filteredTreks
  @action
  setSortDirection = (value: string) => {
      this.sortDirection = value;
  }

  // Reverse the sort direction and resort and rebuild grap data
  toggleSort = () => {
    this.toggleSortDirection();
    this.sortAndBuild();
  }

  // Change the sorting direction 
  toggleSortDirection = () => {
    this.setSortDirection(SORT_DIRECTION_OTHER[this.sortDirection]);
  }

  // sort existing treks and rebuild graph data
  sortAndBuild = () => {
    this.sortExistingTreks();
    this.buildAfterFilter();
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

    if (!(this.trekInfo.typeSelections & TREK_SELECT_BITS[trek.type])) { return false; }
    let date = trek.sortDate;
    if (this.filter.dateMin && (date < this.filter.dateMin)) { return false; }
    if (this.filter.dateMax && (date > this.filter.dateMax)) { return false; }
    let dist = this.utilsSvc.convertDist(trek.trekDist, this.filter.distUnits);
    if (this.filter.distMin && (dist < this.filter.distMin)) { return false; }
    if (this.filter.distMax && (dist > this.filter.distMax)) { return false; }
    let time = trek.duration / 60;
    if (this.filter.timeMin && (time < this.filter.timeMin)) { return false; }
    if (this.filter.timeMax && (time > this.filter.timeMax)) { return false; }
    let speed = this.utilsSvc.convertSpeed(trek.trekDist, trek.duration, this.filter.speedUnits);
    if (this.filter.speedMin && (speed < this.filter.speedMin)) { return false; }
    if (this.filter.speedMax && (speed > this.filter.speedMax)) { return false; }
    let cals = trek.calories;
    if (this.filter.calsMin && (cals < this.filter.calsMin)) { return false; }
    if (this.filter.calsMax && (cals > this.filter.calsMax)) { return false; }
    let steps = this.utilsSvc.computeStepCount(trek.trekDist, trek.strideLength);
    if (this.filter.stepsMin && (steps < this.filter.stepsMin)) { return false; }
    if (this.filter.stepsMax && (steps > this.filter.stepsMax)) { return false; }
    
    return true;
  }

  // Compare the appropriate properties based on the sortBy and startWith filter values
  sortFunc = (a: number, b: number) : number => {
    let uSvc = this.utilsSvc;
    let ta = this.trekInfo.allTreks[a];
    let tb = this.trekInfo.allTreks[b];
    let ascendingSort = this.filter.sortDirection === SORTDIRECTION_ASCEND;

    switch(this.filter.sortBy){
      case 'Dist':
        return (ascendingSort ? 
                ta.trekDist - tb.trekDist : tb.trekDist - ta.trekDist);
      case 'Time':
        return (ascendingSort ? 
                ta.duration - tb.duration : tb.duration - ta.duration);
      case 'Date':
        return (ascendingSort ?   
              (parseInt(ta.sortDate, 10) - parseInt(tb.sortDate, 10)) : 
              (parseInt(tb.sortDate, 10) - parseInt(ta.sortDate, 10))); 
      case 'Speed':
        let spa = (ta.duration ? (ta.trekDist / ta.duration) : 0);
        let spb = (tb.duration ? (tb.trekDist / tb.duration) : 0);
        if(!this.showAvgSpeed){
          spa = (ta.duration / uSvc.convertDist(ta.trekDist, this.trekInfo.distUnits()))
          spb = (tb.duration / uSvc.convertDist(tb.trekDist, this.trekInfo.distUnits()))
        }
        return (ascendingSort ? spa - spb : spb - spa);
      case 'Cals':
        let ca = ta.calories;
        let cb = tb.calories;
        if(!this.showTotalCalories){
          ca = uSvc.getCaloriesPerMin(ca, ta.duration, true);
          cb = uSvc.getCaloriesPerMin(cb, tb.duration, true);
        }
        return (ascendingSort ? ca - cb : cb - ca);
      case 'Steps':
        let sa = uSvc.computeStepCount(ta.trekDist, ta.strideLength);
        let sb = uSvc.computeStepCount(tb.trekDist, tb.strideLength);
        if(this.showStepsPerMin){
          sa = uSvc.computeStepsPerMin(sa, ta.duration, true);
          sb = uSvc.computeStepsPerMin(sb, tb.duration, true);
        }
        return (ascendingSort ? sa - sb : sb - sa); 
      default:
        return 0;
    }
  }

  // return a list of indicies into the trekInfo.allTreks list sorted and filtered per current settings
  @action
  filterAndSort = () : number[] => {
    let foundSelectedType = false;
    let treks : number[] = [];
    let cSum = 0;

    this.updateFSO();
    // include the date range in the checksum
    cSum = this.getFlt(this.filter.dateMax) + this.getFlt(this.filter.dateMin);
    if (this.trekInfo.allTreks.length) {
      for( let i=0; i<this.trekInfo.allTreks.length; i++){
        if (this.checkTrek(this.trekInfo.allTreks[i])){
          treks.push(i);      // push index of this TrekObj
          cSum += this.getFlt(this.trekInfo.allTreks[i].sortDate);
          if ((this.trekInfo.typeSelections & TREK_SELECT_BITS[this.trekInfo.allTreks[i].type])) { 
            foundSelectedType = true; 
          } 
        }
      }
      treks.sort(this.sortFunc);
    }
    // add groupList.length to checksum to account for groups with no applicable treks
    this.setFTChecksum(cSum + this.groupList.length);     
    this.setFilteredTreks(treks);
    this.setFilterRuns(++this.filterRuns);
    this.setFoundType(foundSelectedType);
    return treks;
  }

  // build the graph data, set the selectedTrekIndex value and run the after filtering treks functions
  @action
  buildAfterFilter = () => {
    this.buildGraphData(this.filteredTreks);        
    this.setDataReady(true);
    if (this.filteredTreks.length) {
      let sel = this.findCurrentSelection();
      this.trekSelected(sel);
      this.scrollBarGraph(sel);
    }
    else {
      this.setSelectedTrekIndex(-2);
    }
    this.runAfterFilterFns();
  }

  // Apply the filter to all the treks
  @action
  filterTreks = () => {
    let treks : number[] = this.filterAndSort();
    
    this.getFilterDefaults(treks);
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
      this.filteredTreks.sort(this.sortFunc);
    }
  }

  // Set the Trek at the given index in filteredTreks as the current Trek.
  trekSelected = (indx: number) => {
    let trek = this.trekInfo.allTreks[this.filteredTreks[indx]];
    this.trekInfo.setTrekProperties(trek);
    if (trek.type === TREK_TYPE_HIKE && !trek.elevations) { // read and save elevation data for Hike if necessary
      this.trekInfo.setElevationProperties()
      .then(() => {
        this.toastSvc.toastOpen({tType: 'Info', content: 'Retreived elevation data.'})
        trek.elevations = this.trekInfo.elevations;
        trek.elevationGain = this.trekInfo.elevationGain;
        trek.hills = this.trekInfo.hills;
        trek.calories = this.trekInfo.calories;
        this.trekInfo.saveTrek(trek, 'none')
        this.setSelectedTrekIndex(indx);
      })
      .catch(() => {
        this.toastSvc.toastOpen({tType: 'Error', content: 'Error retreiving elevation data.'})
        this.setSelectedTrekIndex(indx);
      })
    } else {
      this.setSelectedTrekIndex(indx);
    }
  }

  // Set the property that keeps trak of whick Trek is currently in focus
  @action
  setSelectedTrekIndex = (val: number) => {
    this.selectedTrekIndex = val;
    this.selectedTrekDate = val < 0 ? '' : this.trekInfo.allTreks[this.filteredTreks[val]].sortDate;
  }

  // find the index for the trek with the date matching selectedTrekDate
  findCurrentSelection = () : number => {
    if (this.selectedTrekDate === '') { return 0; }
    for (let i=0; i<this.filteredTreks.length; i++) {
      if (this.trekInfo.allTreks[this.filteredTreks[i]].sortDate === this.selectedTrekDate) {
        return i;
      }
    }
    return 0;
  }

  @action
  setFilterItem = (item: string, value: string) => {
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
      this.filterTreks();
      this.runAfterFilterFns();
  }

  // Reset the values in the Dist filter fields
  @action
  resetDistFilter = () => {
    this.setDistMin('');
    this.setDistMax('');
  }

  // Reset the values in the Time filter fields
  @action
  resetTimeFilter = () => {
    this.setTimeMin('');
    this.setTimeMax('');
  }

  // Reset the values in the Speed filter fields
  @action
  resetSpeedFilter = () => {
    this.setSpeedMin('');
    this.setSpeedMax('');
  }

  // Reset the values in the Calories filter fields
  @action
  resetCalsFilter = () => {
    this.setCalsMin('');
    this.setCalsMax('');
  }

  // Reset the values in the Steps filter fields
  @action
  resetStepsFilter = () => {
    this.setStepsMin('');
    this.setStepsMax('');
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

  // set the title property of the barGraphData object
  formatGraphTitle = (sType: ShowTypes) => {
    let title = undefined;
    switch(sType){
      case 'Dist':
        title = this.trekInfo.longDistUnitsCaps();
        break;
      case 'Cals':
        title = this.showTotalCalories ? 'Calories' : 'Calories/min';
        break;
      case 'Steps':
        title = this.showStepsPerMin ? 'Steps/min' : 'Steps';
        break;
      case 'Speed':
        title = this.showAvgSpeed ? this.trekInfo.speedUnits() : 'Time/' + this.trekInfo.distUnits();
        break;
    }
    return title;
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given treks array has already been sorted using the sortBy value.
  // The 'show' value will be displayed on the bar and the Date value will be displayed above the bar.
  buildGraphData = (treks: number[]) => {
    let thisSortDate = this.utilsSvc.formatSortDate();
    let dataRange = this.findDataRange(treks, this.show, this.trekInfo.measurementSystem)

    dataRange.min = 0;
    dataRange.range = dataRange.max
    this.clearBarGraphData();
    this.barGraphData.title = this.formatGraphTitle(this.show);
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
        // barItem.label1 = t.date.substr(0,5) + '/' + t.sortDate.substr(2,2);
        // barItem.label2 = t.startTime;
        break;
      case "Steps":
        let s = this.utilsSvc.computeStepCount(t.trekDist, t.strideLength);
        if(this.showStepsPerMin){ s = this.utilsSvc.computeStepsPerMin(s, t.duration)}
        barItem.value = s;
        barItem.label1 = s.toString();
        break;
      case "Speed":
        let speed = this.showAvgSpeed 
            ? this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, t.trekDist, t.duration)
            : (t.duration / this.utilsSvc.convertDist(t.trekDist, this.trekInfo.distUnits()))
        barItem.value = speed; 
        barItem.label1 = this.showAvgSpeed ? speed.toString() : this.utilsSvc.timeFromSeconds(speed);
        break;
      case "Cals":
        barItem.value = this.showTotalCalories ? t.calories 
                          : this.utilsSvc.getCaloriesPerMin(t.calories, t.duration)
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
          let s = this.showAvgSpeed 
            ? this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, trek.trekDist, trek.duration)
            : (trek.duration / this.utilsSvc.convertDist(trek.trekDist, this.trekInfo.distUnits()))
          if (s < minV) { minV = s; }
          if (s > maxV) { maxV = s; }
          break;
        case 'Cals':
          let c = this.showTotalCalories ? trek.calories 
                          : this.utilsSvc.getCaloriesPerMin(trek.calories, trek.duration)
          if (c < minV) { minV = c; }
          if (c > maxV) { maxV = c; }
          break;
        case 'Steps':
          let st = this.utilsSvc.computeStepCount(trek.trekDist, trek.strideLength);
          if(this.showStepsPerMin){ st = this.utilsSvc.computeStepsPerMin(st, trek.duration)}
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
