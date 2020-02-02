import { action, observable } from 'mobx';
import Fuse from 'fuse.js';

import { homeHelpData } from './HelpHome';
import { statViewHelpData } from './HelpLogStatView';
import { trekTypesHelpData } from './HelpTrekTypes';
import { loggingTrekHelpData } from './HelpLoggingTrek';
import { useGroupHelpData } from './HelpUseGroups';
import { challengeCourseHelpData } from './HelpChallengeCourse';
import { limitByDistHelpData } from './HelpLimitDist';
import { limitByTimeHelpData } from './HelpLimitTime';

export const HELP_SEARCH_MENU = 'Help_Search_Menu';
export const HELP_HOME = 'Help_Home';
export const HELP_LOG_STAT_VIEW = "Help_Log_Stat_View";
export const HELP_LOG_MAP_VIEW = "Help_Log_Map_View";
export const HELP_TREK_TYPES = 'Help_Trek_Types';
export const HELP_LOGGING_A_TREK = 'Help_Logging_A_Trek';
export const HELP_USE_GROUPS = 'Help_Use_Groups';
export const HELP_CHALLENGE_COURSE = 'Help_Challenge_Course';
export const HELP_LIMIT_BY_TIME = 'Help_Limit_By_Time';
export const HELP_LIMIT_BY_DIST = 'Help_Limit_By_Dist';
export const HELP_GOALS = 'Help_Goals';
export const HELP_SETTINGS = 'Help_Settings';
export const HELP_COURSES = 'Help_Courses';
export const HELP_ID_ICONS = {
  'Help_Home': {icon: 'Home'},
  'Help_Trek_Types': {icon: 'BulletedList'},
  'Help_Log_Stat_View': {icon: 'Clipboard'},
  'Help_Log_Map_View': {icon: 'Map'},
  'Help_Logging_A_Trek': {icon: 'CheckeredFlag', color: 'green'},
  'Help_Use_Groups': {icon: 'FolderOpenOutline'},
  'Help_Challenge_Course': {icon: 'Course'},
  'Help_Limit_By_Time': {icon: 'TimerSand'},
  'Help_Limit_By_Dist': {icon: 'CompassMath'},
  'Help_Goals': {icon: 'Target'},
  'Help_Settings': {icon: 'Settings'},
  'Help_Courses': {icon: 'Course'}
}

export const helpContextDescriptions = {
  'Help_Search_Menu': 'Search Results',
  'Help_Home': 'Home Screen',
  'Help_Log_Stat_View': 'Log Stat View',
  'Help_Log_Map_View': 'Log Map View',
  'Help_Trek_Types': 'Trek Types',
  'Help_Logging_A_Trek': 'Logging a Trek',
  'Help_Use_Groups': 'Use Groups',
  'Help_Challenge_Course': 'Challenge a Course',
  'Help_Limit_By_Time': 'Limit by Time',
  'Help_Limit_By_Dist': 'Limit by Distance',
  'Help_Goals': 'Goals',
  'Help_Settings': 'Settings',
  'Help_Courses': 'Courses'
}

export interface HelpSearchItem  {
  key: string,
  data: string[]
}

export interface HelpStackItem {
  id:           string,
  entryPoint:   boolean
}

export class HelpSvc {

  @observable helpContext: string;

  helpSearchList: HelpSearchItem[];
  searchOptions: Fuse.FuseOptions<HelpSearchItem> = {
    id: "key",
    shouldSort: true,
    caseSensitive: false,
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    location: 0,
    distance: 10000,
    maxPatternLength: 32,
    minMatchCharLength: 4,
    keys: ['data']
  }
  
    fuse

  helpStack : HelpStackItem[] = [];
  helpLength: number = 0;
  helpLengthOnEntry: number = 0;

  constructor() {
    this.buildHelpSearchList();
  }

  // build a searchable structure for the fuzzy search function
  buildHelpSearchList = () => {
    this.helpSearchList = [];
    this.helpSearchList.push({key: 'Help_Home', data: homeHelpData})
    this.helpSearchList.push({key: 'Help_Log_Stat_View', data: statViewHelpData})
    this.helpSearchList.push({key: 'Help_Trek_Types', data: trekTypesHelpData})
    this.helpSearchList.push({key: 'Help_Logging_A_Trek', data: loggingTrekHelpData})
    this.helpSearchList.push({key: 'Help_Use_Groups', data: useGroupHelpData})
    this.helpSearchList.push({key: 'Help_Challenge_Course', data: challengeCourseHelpData})
    this.helpSearchList.push({key: 'Help_Limit_By_Time', data: limitByTimeHelpData})
    this.helpSearchList.push({key: 'Help_Limit_By_Dist', data: limitByDistHelpData})
  }

  // call the fuzzy search function with the given search text
  // return the resulting array
  searchForHelp = (searchText: string) => {
    this.fuse = new Fuse(this.helpSearchList, this.searchOptions);
    return this.fuse.search(searchText);
  }

  // push the given contextId onto the helpStack
  @action
  pushHelp = (contextId: string, entryPoint = false) => {
    this.helpStack.push({id: contextId, entryPoint: entryPoint});
    this.helpLength = this.helpStack.length;
    this.helpContext = contextId;
  }

  // pop the end item from the help stack.  set helpContext to end item if stack not empty
  @action
  popHelp = (entryPoint = false) => {
    if (entryPoint) {
      this.resetHelpStack();
    }
    this.helpStack.pop();
    this.helpLength = this.helpStack.length;
    if(this.helpLength) {
      this.helpContext = this.helpStack[this.helpLength - 1].id;
    }
  }

  // return true if top of stack is entry point item
  atEntryPoint = () => {
    if(this.helpLength === 0) { return false; }
    return this.helpStack[this.helpLength - 1].entryPoint;
  }

  // return the index the given item in the help stack
  // return -1 if not found
  findHelpItem = (item: string) => {
    for(let i=0; i<this.helpStack.length; i++){
      if (this.helpStack[i].id === item){ return i; }
    }
    return -1;
  }

  // take the given help contextId out of the help stack
  @action
  removeHelpStackItem = (itemId: string) => {
    let ind = this.findHelpItem(itemId);
    if (ind !== -1) {
      this.helpStack.splice(ind, 1);
    }
  }

  // reset the helpStack to 1 item
  @action
  resetHelpStack = () => {
    while(this.helpLength && !this.helpStack[this.helpLength - 1].entryPoint) {
      this.popHelp();
    }
  }

  // return the description associated with the given help contextId
  getHelpDescription = (contextId: string) => {
    return helpContextDescriptions[contextId];
  }

}

