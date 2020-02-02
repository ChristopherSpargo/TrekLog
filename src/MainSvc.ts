import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';

import { UtilsSvc,LB_PER_KG, M_PER_FOOT} from './UtilsService';
import { GroupsObj, GroupSvc, SettingsObj } from './GroupService';
import { StorageSvc } from './StorageService';
import { ModalModel, CONFIRM_INFO } from './ModalModel';
import { COLOR_THEME_DARK, ThemeType, COLOR_THEME_LIGHT } from './App';
import { ImageSvc } from './ImageService';
import { TrekObj, TrekTypeDataNumeric } from './TrekInfoModel';
import { RestoreObject } from './LogStateModel';

// Class containing properties and service functions for the TrekLog App

export const CURRENT_TREKLOG_VERSION = '1.1';

export type MapType = "none" | "standard" | "satellite" | "hybrid" | "terrain" | "mutedStandard";

export const TREK_TYPE_WALK = "Walk";
export const TREK_TYPE_RUN  = "Run";
export const TREK_TYPE_BIKE = "Bike";
export const TREK_TYPE_HIKE = "Hike";
export const TREK_TYPE_BOARD = "Board";
export const TREK_TYPE_DRIVE = "Drive";

export type TrekType = "Walk" | "Run" | "Bike" | "Hike" | "Board" | "Drive";
export const WALK_SELECT_BIT = 1;
export const RUN_SELECT_BIT  = 2;
export const BIKE_SELECT_BIT = 4;
export const HIKE_SELECT_BIT = 8;
export const BOARD_SELECT_BIT = 16;
export const DRIVE_SELECT_BIT = 32
export const ALL_SELECT_BITS = 63;

export const TREKS_WITH_STEPS_BITS = WALK_SELECT_BIT + RUN_SELECT_BIT + HIKE_SELECT_BIT;

export const TREK_SELECT_BITS = {
  Walk: WALK_SELECT_BIT,
  Run:  RUN_SELECT_BIT,
  Bike: BIKE_SELECT_BIT,
  Hike: HIKE_SELECT_BIT,
  Board: BOARD_SELECT_BIT,
  Drive: DRIVE_SELECT_BIT,
  All:  ALL_SELECT_BITS
}


export const CALC_VALUES_INTERVAL = 3;  // number of seconds between updates of 'current' values (speedNow, etc.)
export const MAX_TIME_SINCE = 3;        // max seconds since last GPS point before we punt on current values


export const START_VIB = 250;
export const STOP_VIB =  500;


export type MeasurementSystemType = "US" | "Metric";
export const SYSTEM_TYPE_METRIC = 'Metric';
export const SYSTEM_TYPE_US = 'US';
export const SWITCH_MEASUREMENT_SYSTEM = {US: 'Metric', Metric: 'US'};

export const DEFAULT_STRIDE_LENGTHS : TrekTypeDataNumeric = // stridelengths are stored in cm
  {Walk: 0, Run: 0, Hike: 0};
export const STRIDE_UNIT_CHOICES = {US: 'in', Metric: 'cm'};
export const WEIGHT_UNIT_CHOICES = {US: 'lb', Metric: 'kg'};
export const WEIGHT_UNIT_LONG_NAMES = {US: 'pounds', Metric: 'kilograms'};
export const DIST_UNIT_CHOICES = {US: 'mi', Metric: 'km'};
export const DIST_UNIT_LONG_NAMES = {US: 'miles', Metric: 'kilometers'};
export const DIST_UNIT_LONG_NAMES_CAPS = {US: 'Miles', Metric: 'Kilometers'};
export const SHORT_TO_LONG_DIST_NAMES = {ft: 'feet', m: 'meters', mi: 'miles', km: 'kilometers'};
export const LONG_TO_SHORT_DIST_NAMES = {feet: 'ft', meters: 'm', miles: 'mi', kilometers: 'km'};
export const SMALL_DIST_UNITS = {mi: 'ft', km: 'm'};
export const SMALL_DIST_UNITS_SYS = {US: 'ft', Metric: 'm'};
export const SMALL_DIST_LONG_NAMES = {US: 'feet', Metric: 'meters'};
export const SPEED_UNIT_CHOICES = {US: 'mph', Metric: 'kph'};
export const DIST_UNIT_GRAPH_CHOICES = {US: 'miles', Metric: 'kilometers'};
export const SMALL_DIST_CUTOFF = 325; //meters

export const TREK_TYPE_CHOICES = [ TREK_TYPE_WALK, TREK_TYPE_DRIVE, TREK_TYPE_RUN, TREK_TYPE_BIKE, 
                                    TREK_TYPE_BOARD, TREK_TYPE_HIKE];
export const TREK_VERBS_OBJ = {Walk: 'Walking', Run: 'Running', Bike: 'Biking', 
                               Hike: 'Hiking', Board: 'Boarding', Drive: 'Driving'};
export const TREK_TYPE_LABELS = {Walk: 'Walk', Run: 'Run', Bike: 'Bike', 
                                 Hike: 'Hike', Board: 'Board', Drive: 'Drive'};
export const STEPS_APPLY = {Walk: true, Run: true, Hike: true};
export const STEP_NAMES = {Walk: 'Step', Run: 'Stride', Bike: 'Step',
                           Hike: 'Step', Trek: 'Step', Board: 'Step', Drive: 'Step'};
export const PLURAL_STEP_NAMES = {Walk: 'Steps', Run: 'Strides', Bike: 'Steps', 
                                  Hike: 'Steps', Trek: 'Steps', Board: 'Steps', Drive: 'Steps'};

export type SortByTypes = "Dist" | "Time" | "Date" | "Speed" | "Steps" | "Cals";
export type ShowTypes = "Dist" | "Time" | "Steps" | "Speed" | "Cals" | "Date";

export type SpeedStatType = 'speedNow' | 'speedAvg' | 'time';
export const SWITCH_SPEED_STAT = {speedNow: 'speedAvg', speedAvg: 'time', time: 'speedNow'};

export const INVALID_NAMES = [
  'new', 'courses', 'groups', 'settings', 'goals', 'treklog', 'course', 'cancel'
]

export const FAKE_SELECTION = '#none';
export const RESP_OK = 'OK';
export const RESP_CANCEL = 'CANCEL';
export const RESP_NO_MATCH = 'PATH DOES NOT MATCH\n';
export const RESP_BAD_LENGTH = 'WRONG PATH LENGTH\n';
export const RESP_HAS_LINK = 'LINK ALREADY PRESENT';

export const MSG_TREK_LIST_READ_ERROR = 'ERROR READING TREK LIST';
export const MSG_LINK_NOT_ADDED = 'LINK NOT ADDED\n';
export const MSG_LINK_NOT_CHANGED = 'LINK NOT CHANGED\n';
export const MSG_LINK_NOT_REMOVED = 'LINK NOT REMOVED\n';
export const MSG_LINK_ADDED = 'COURSE LINK ADDED\n';
export const MSG_REMOVE_LINK_ERROR = 'ERORR REMOVING LINK\n';
export const MSG_REMOVE_EFFORT = 'ERORR REMOVING EFFORT\n';
export const MSG_HAS_LINK = 'ALREADY LINKED\n';
export const MSG_NO_EFFORT = 'EFFORT NOT FOUND\n';
export const MSG_EFFORT_PATH = 'EFFORT PATH READ FAIL\n';
export const MSG_UPDATING_TREK = 'ERROR UPDATING TREK\N';
export const MSG_COURSE_READ = 'COURSE READ FAIL\n';
export const MSG_COURSE_WRITE = 'COURSE WRITE FAIL\n';
export const MSG_EFFORT_READ = 'EFFORT READ FAIL\n';
export const MSG_EFFORT_WRITE = 'EFFORT WRITE FAIL\n';
export const MSG_NEW_EFFORT = 'FAIL TO CREATE EFFORT\n';
export const MSG_NO_LIST = "NO LIST\n";
export const MSG_NONE_NEARBY = "NO NEARBY COURSES\n";
export const MSG_COURSE_LIST_READ = "COURSE LIST READ ERROR\n";
export const MSG_COURSE_LIST_WRITE = "COURSE LIST WRITE ERROR\n";
export const MSG_STARTING_LOC = 'BAD STARTING LOCATION\n';
export const MSG_NEW_COURSE_RECORD = 'NEW COURSE RECORD\n';
export const MSG_NEW_COURSE = 'NEW COURSE\n';
export const MSG_PICTURES_LIST_READ = "PICTURES LIST READ ERROR\n";
export const MSG_TREK_READ_ERROR = "ERROR READING TREK";

export interface MainStateProperties 
{
  group ?:              string,
  measurementSystem ?:  MeasurementSystemType,
  strideLengths ?:      TrekTypeDataNumeric,
  initialLoc ?:         LatLng;
  layoutOpts ?:         string,
  dtMin ?:              string,
  dtMax ?:              string,
  defaultTrekType ?:    TrekType,
  minPointDist ?:       number,
  defaultMapType ?:     MapType,
  currentMapType ?:     MapType,
  trekLabelFormOpen ?:  boolean,
  colorTheme ?:         ThemeType,
  groups ?:             GroupsObj,
}

export class MainSvc {

// properties used for program state
  @observable appReady : boolean;
  @observable dataReady : boolean;
  @observable group: string;
  @observable waitingForSomething: boolean;
  @observable measurementSystem : MeasurementSystemType;
  @observable layoutOpts;
  @observable currentMapType : MapType;
  @observable trekCount;
  @observable speedDialZoomedIn: boolean;
  @observable colorTheme : ThemeType;
  @observable showMapControls;
  @observable currentTime: string;
  @observable currentDate: string;

  initialLoc : LatLng;                            // location detected when TrekLog first starts
  strideLengths = DEFAULT_STRIDE_LENGTHS;         // array of lengths used to compute steps/revs by trek type

  defaultMapType : MapType;
  trekLabelFormOpen = false;                      // state of Trek Label dialog form (used for Restore)
  allTreks : TrekObj[] = [];                      // All treks maintained in memory for performance
  allTreksGroup : string;
  dtMin = '';
  dtMax = '';
  defaultTrekType : TrekType;
  strideLength: number;
  minPointDist = 1;
  currSpeedRange = 0;                             // current speed range for user (used to compute calories)
  updateDashboard : string = '';
  settingsFound = '';
  pendingInit = true;
  waitingMsg = "";
  currentTimeIntervalId: number;
  todaySD = this.utilsSvc.formatShortSortDate();
  weight: number;
  packWeight: number;
  limitsCloseFn: Function;

  currentGroupSettings = {                         // used to restore current group settings after Reviewing Treks
    weight: 0,                                     // in kg
    packWeight: 0,                                 // in kg
  }
  resObj : RestoreObject;           // state object used to restore logging session if app terminated

  constructor ( private utilsSvc: UtilsSvc, private storageSvc: StorageSvc, private modalSvc: ModalModel,
    private groupSvc: GroupSvc, private imageSvc: ImageSvc ) {
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.appReady = false;
    this.dataReady = false;
    this.layoutOpts = 'Current';
    this.trekCount = 0;
    this.currentMapType = 'standard';
    this.speedDialZoomedIn = true;
    this.setColorTheme(COLOR_THEME_DARK);
    this.setWaitingForSomething();
    this.setDefaultMapType('standard');
    this.startCurrentTimeTimer();
  }

  // return the properties that need to be saved for a Restore operation
  getMainStateProperties = () : MainStateProperties => {
    return {
      group:              this.group,
      measurementSystem:  this.measurementSystem,
      strideLengths:      this.strideLengths,
      initialLoc:         this.initialLoc,
      layoutOpts:         this.layoutOpts,
      dtMin:              this.dtMin,
      dtMax:              this.dtMax,
      defaultTrekType:    this.defaultTrekType,
      minPointDist:       this.minPointDist,
      defaultMapType:     this.defaultMapType,
      currentMapType:     this.currentMapType,
      trekLabelFormOpen:  this.trekLabelFormOpen,
      colorTheme:         this.colorTheme,
      groups:             this.groupSvc.groups,
    }
  }

  // restore various properties during a Restore
  @action
  restoreMainState = (data: MainStateProperties) => {
      this.groupSvc.groups =    data.groups;
      this.group =              data.group;
      this.updateStrideLengths(data.strideLengths);
      this.setColorTheme(data.colorTheme);
      this.measurementSystem =  data.measurementSystem;
      this.initialLoc =         data.initialLoc;
      this.layoutOpts =         data.layoutOpts;
      this.dtMin =              data.dtMin;
      this.dtMax =              data.dtMax;
      this.minPointDist =       data.minPointDist;
      this.updateDefaultType(data.defaultTrekType);
      this.setCurrentMapType(data.currentMapType);
      this.setTrekLabelFormOpen(data.trekLabelFormOpen);
      this.startCurrentTimeTimer();
    }


  // read the Settings object and initialize the corresponding properties. Also read the list of treks.
  init = () => {

    return new Promise<string> ((resolve, reject) => {
        this.settingsFound = "OK";
        if (!this.dataReady){
            this.pendingInit = true;
            this.groupSvc.readGroups()       // read group list from database
            .then((groups : GroupsObj) => {
              // set the current group to the most recent group
              this.setColorTheme(groups.theme || COLOR_THEME_DARK);
              this.setMeasurementSystem(groups.measurementSystem);
              this.setTrekLogGroupProperties(groups.lastGroup || groups.groups[0], null, false)
              .then((status) => {
                this.pendingInit = false;
                resolve(status)
              })
              .catch(() => {
                // Error reading settings for group
                this.pendingInit = false;
                this.settingsFound = "NO_SETTINGS";
                reject('NO_SETTINGS');
              })
            })
            .catch (() => {
              // Error reading list of groups
              this.pendingInit = false;
              this.settingsFound = "NO_GROUPS";
              reject('NO_GROUPS');
            })      
        }
        else {
          // already initialized
          this.pendingInit = false;
          resolve('ALREADY_DONE');
        }
  })    
}

  // set the current date display property
  @action
  setCurrentDate = () => {
    this.currentDate = this.utilsSvc.formattedLongDate();
  }

  // set the current time display property
  @action
  setCurrentTime = () => {
    this.currentTime = this.utilsSvc.formatTime();
  }

  // start a timer that tics every second to keep a displayable date and time
  startCurrentTimeTimer = () => {
    this.currentTimeIntervalId = window.setInterval(() => {
      this.setCurrentDate();
      this.setCurrentTime();
    }, 1000)
  }

  // change settings related to the logging group
  @action
  changeGroupSettings = (newSettings: SettingsObj) => {
    this.updateStrideLengths(newSettings.strideLengths);
    this.updateDefaultType(newSettings.type);   // set the default trek type, strideLength and currentMapType
    this.updateGroup(newSettings.group);
    this.weight = newSettings.weights[newSettings.weights.length-1].weight;
    this.updatePackWeight(newSettings.packWeight || 0);
    // this.setTypeSelections(TREK_SELECT_BITS.All);
    this.currentGroupSettings.weight = this.weight;
    this.currentGroupSettings.packWeight = this.packWeight;
  }

  // change the logging group to the given group
  setTrekLogGroupProperties = (group: string, settings ?: SettingsObj, readTreks = true) => {
    let newSettings = settings;

    return new Promise<any>((resolve, reject) => {
        if (!newSettings) {
          this.groupSvc.readGroupSettings(group)
          .then((result : SettingsObj) => {
            newSettings = result;
            this.changeGroupSettings(newSettings);
            this.groupSvc.saveGroups(newSettings.group)   // set new last group in groups object
            .then(() => resolve(readTreks ? this.readAllTreks([group]) : RESP_OK))    // revisit
            .catch((err) => reject('Error: SAVE_GROUPS:\n' + err))
          })
          .catch((err) => {
            this.setDataReady(true);
            reject('Error: READ_GROUP_SETTINGS:\n' + err)
          });       // Error reading group settings
        }   
        else {
          this.changeGroupSettings(newSettings);
          this.groupSvc.saveGroups(newSettings.group)
          .then(() => {
            if(readTreks) { 
              resolve(this.readAllTreks([group])); 
            } else {
              this.setDataReady(true);
              resolve(RESP_OK);
            }
          })
          .catch((err) => {
            this.setDataReady(true);
            reject('Error: SAVE_GROUPS:\n' + err)
          })
      }
    })
  }

  // make sure certain group settings values reflect current values from the settings record
  restoreCurrentGroupSettings = (trek: TrekObj) => {
    trek.weight = this.currentGroupSettings.weight;
    trek.packWeight = this.currentGroupSettings.packWeight;
    this.weight = this.currentGroupSettings.weight;
    this.packWeight = this.currentGroupSettings.packWeight;
  }

  // populate the allTreks array with the treks for the given groups
  readAllTreks = (groups: string[]) => {
    return new Promise<string> ((resolve, _reject) => {
      // this.setDataReady(false);
      this.storageSvc.readAllTrekFiles(groups)
      .then((result) => {
        this.allTreks = result.list;
        this.setTrekCount();
        if (result.upgraded > 0){
          this.modalSvc.simpleOpen({heading: 'Data Upgraded', 
                content: "Upgraded " + result.upgraded + " treks to match the current TrekLog version.", 
                okText: 'OK', dType: CONFIRM_INFO, headingIcon: 'Update'});
        }
        this.setDataReady(true);
        this.allTreksGroup = groups.length === 1 ?  groups[0] : 'Multiple';
        // alert(this.allTreksGroup + ' : ' + this.allTreks.length)
        resolve('OK');
      })
      .catch(() => {
        // error reading treks
        this.setDataReady(true);
        resolve('NO_TREKS');
      })
    })
  }

  
  // Save the given trek object to the database and optionally add/update entry to in-memory list of treks.
  saveTrek = (trek: any, addEntry : "add" | "update" | "none" = 'update') : Promise<string> => {
    let saveData: TrekObj;

    return new Promise((resolve, reject) => {
      if(trek.sortDate === undefined || trek.startTime === undefined || trek.calories === undefined ||
        trek.pointList === undefined || trek.pointList.length === 0) {
        alert(trek.sortDate + '\n' + trek.startTime + '\n' + trek.calories
               + '\n' + trek.pointList)
        reject('Invalid Trek');
      } else {
        if(trek.getSaveObj){      // is this a TrekInfo object?
          if(trek.calories === undefined){
          }
          saveData = trek.getSaveObj();   // if so, get the saveable object (TrekObj)
        } else {
          saveData = trek;
        }
        if ( addEntry !== 'none' ) { this.updateAllTreksList(saveData, addEntry); }
        this.imageSvc.addTrekImages(trek);
        this.storageSvc.storeTrekData(saveData)
        .then(() => {
          resolve('Ok');
        })
        .catch (() => {
          reject('Save Error');
        })  
      }
    })
    
  }

  getTrekId = (trek: TrekObj) => {
    return trek.group + trek.sortDate;
  }

  // Remove the given trek object from the database and optionally remove its entry from in-memory list of treks.
  deleteTrek = (trek: TrekObj, remove = true) : Promise<string> => {

    let id = this.getTrekId(trek);
    return new Promise((resolve, reject) => {
      this.storageSvc.removeTrekData(trek)
      .then(() =>{
        if (remove) { this.removeAllTreksEntry(id); }
        resolve('Ok');
      })
      .catch(() => {
        reject('Error');
      })
    })
  }

  // add the given trek to the allTreks array
  addAllTreksEntry = (trek: TrekObj) => {
    this.allTreks.push(this.utilsSvc.copyObj(trek));
    this.setTrekCount();
  }

  // remove the last entry from the allTreks array
  popAllTreksEntry = () : TrekObj => {
    let t = this.allTreks.pop();
    this.setTrekCount();
    return t;
  }

  // remove the trek with the given key from the allTreks array
  @action 
  removeAllTreksEntry = (id: string) => {
    let i = this.allTreks.findIndex((trek) => this.getTrekId(trek) === id);
    if (i !== -1) {
      this.imageSvc.removeTrekImages(this.allTreks[i].trekImages);  // remove images from allImages
      this.allTreks.splice(i, 1); // remove trek from allTreks list
      this.setTrekCount();
    }
  }

  // update/add the entry for the given trek in the allTreks array
  @action 
  updateAllTreksList = (trek: TrekObj, updateType = 'update') => {
    let id = this.getTrekId(trek);
    let i = this.allTreks.findIndex((t) => this.getTrekId(t) === id);
    if (i !== -1) {
      this.allTreks[i] = this.utilsSvc.copyObj(trek); // replace allTreks list entry
    } else {
      if(updateType === 'add'){
        this.addAllTreksEntry(trek);  // add it if not found
      }
    }
  }

  ////////////////////////////////////////// End of Treks Database Handling

  @action
  setShowMapControls = (status: boolean) => {
    this.showMapControls = status;
  }

  // set the value of the waitingForSomething property
  @action
  setWaitingForSomething = (item?: "NoMsg" | "Location" | "NearbyCourses" | "Conditions" | 
                "LoadingTreks" | "ElevationData") => {
    if (!item) {
      this.waitingForSomething = false;
      this.waitingMsg = "";
    } else {
      switch(item){
        case "NoMsg":
          this.waitingMsg = "";
          break;
          case "LoadingTreks":
          this.waitingMsg = "Loading Trek Data...";
          break;
          case "Location":
          this.waitingMsg = "Obtaining current location...";
          break;
        case "NearbyCourses":
          this.waitingMsg = "Searching for nearby courses...";
          break;
        case "Conditions":
          this.waitingMsg = "Obtaining weather conditions...";
          break;
        case "ElevationData":
          this.waitingMsg = "Retrieving Elevation Data...";
        default:
      }
      this.waitingForSomething = true;
    }
  }

  // set the value of the updateDashboard property
  setUpdateDashboard = (status: string) => {
    this.updateDashboard = status;
  }

  // set the value of the colorTheme property
  @action
  setColorTheme = (val: ThemeType) => {
    this.colorTheme = val;
  }

  //swap the color theme property
  swapColorTheme = () => {
    if (this.colorTheme === COLOR_THEME_DARK){
      this.setColorTheme(COLOR_THEME_LIGHT);
    } else {
      this.setColorTheme(COLOR_THEME_DARK);
    }
  }

  // set the value for the trekLabelFormOpen property
  setTrekLabelFormOpen = (status: boolean) => {
    this.trekLabelFormOpen = status;
  }

  // set the value for the appReady property
  @action
  setAppReady = (status: boolean) => {
    this.appReady = status;
  }

  // set the value of the minPointDist property
  setMinPointDist = (value: number) => {
    this.minPointDist = value;
  }

  // update the value of the defaultMapType property
  setDefaultMapType = (val: MapType) => {
    this.defaultMapType = val;
    this.setCurrentMapType(val);
  }

  // update the value of the currentMapType property
  @action
  setCurrentMapType = (val: MapType) => {
    this.currentMapType = val;
  }

  // signal that the TrekInfo objec has been initialized
  @action
  setDataReady = (val: boolean) => {
    this.dataReady = val;
  }

  // update the count of treks in the allTreks array
  @action
  setTrekCount = () => {
    this.trekCount = this.allTreks.length;
  }

  // set the value of the speedDialZoomedIn property
  @action
  setSpeedDialZoomedIn = (status: boolean) => {
    this.speedDialZoomedIn = status;
  }
  
  // return the distance units for the current system
  distUnits = (sys: MeasurementSystemType = this.measurementSystem) => {
    return DIST_UNIT_CHOICES[sys];
  }

  // return the distance units for the current system
  longDistUnits = () => {
    return DIST_UNIT_LONG_NAMES[this.measurementSystem];
  }

  // return the distance units for the current system
  longDistUnitsCaps = () => {
    return DIST_UNIT_LONG_NAMES_CAPS[this.measurementSystem];
  }

  // return the small distance units for the current system
  smallDistUnits = () => {
    let units = this.distUnits();

    if (units in SMALL_DIST_UNITS) {
      units = SMALL_DIST_UNITS[units];
    }
    return units;
  }

  // return the speed units for the current system
  speedUnits = (sys: MeasurementSystemType = this.measurementSystem) => {
    return SPEED_UNIT_CHOICES[sys];
  }
  
  // Set the group to the given value
  @action
  updateGroup = (value: string) => {
    this.group = value;
  }

  // Set the measurement system to the given value
  @action
  setMeasurementSystem = (value: MeasurementSystemType) => {
    this.measurementSystem = value;
  }

  // Switch the measurement system that values are displayed in
  @action
  switchMeasurementSystem = () => {
    this.setMeasurementSystem(SWITCH_MEASUREMENT_SYSTEM[this.measurementSystem] as MeasurementSystemType);
  }

  // Set the Trek Type to the given value
  // Also set the strideLength and currentMapType properties accordingly
  @action
  updateDefaultType = (value: TrekType) => {
    this.defaultTrekType = value;
    this.strideLength   = STEPS_APPLY[value] ? this.strideLengths[value] : 0;
    if(value === TREK_TYPE_HIKE){
      this.setCurrentMapType('terrain');    // default to 'terrain' map for Hikes
    } else {
      this.setCurrentMapType(this.defaultMapType);
    }
  }

  @action
  // set packWeight (assume kilos)
  updatePackWeight = (value: number) => {
    this.packWeight = value;
  }

  // Set the strideLengths object to the given value
  @action
  updateStrideLengths = (value: any) => {
    if( value ) {
      this.strideLengths = value;
    }
    else {
      this.strideLengths = DEFAULT_STRIDE_LENGTHS;
    }
  }

  // convert the given distance (meters) to feet if necessary
  convertDist = (dist: number, round = false) => {
    if (this.measurementSystem === 'Metric') { return (round ? Math.round(dist) : dist); }
    return (round ? Math.round(dist / M_PER_FOOT) : (dist / M_PER_FOOT));
  }

  // convert the given weight (kg)) to lb if necessary
  convertWeight = (wt: number, round = false) => {
    if (this.measurementSystem === 'Metric') { return wt; }
    return (round ? Math.round(wt * LB_PER_KG) : (wt * LB_PER_KG));
  }

  // return the given elevation formatted for the measuring system
  formattedElevation =(elev?: number) : string => {
    if (elev === undefined) { return 'N/A'; }
    return this.utilsSvc.formatDist(elev, SMALL_DIST_UNITS[DIST_UNIT_CHOICES[this.measurementSystem]])
  }

  // Return the given distance formatted for display with appropriate units
  formattedDist = (dist, system = this.measurementSystem) => {
    return this.utilsSvc.formatDist(dist, DIST_UNIT_CHOICES[system]);
  }

  // Return the given duration formatted for display with appropriate units
  formattedDuration = (dur: number) => {
    return this.utilsSvc.formatDuration(dur);
  }

}