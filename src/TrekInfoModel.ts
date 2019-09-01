import { observable, action } from 'mobx';
import { Alert } from 'react-native';
import { LatLng } from 'react-native-maps';
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';

import { UtilsSvc,LB_PER_KG, M_PER_FOOT} from './UtilsService';
import { GroupsObj, GroupSvc, SettingsObj } from './GroupService';
import { WeatherData } from './WeatherSvc';
import { StorageSvc } from './StorageService';
import { ModalModel, CONFIRM_INFO } from './ModalModel';
import { COLOR_THEME_DARK, ThemeType, COLOR_THEME_LIGHT } from './App';
import { Course } from './CourseService';
import { CourseTrackingMethod } from './TrackingMethodComponent';

// Class containing information about and service functions for a Trek

export const CURR_DATA_VERSION = '5.3';   
  // version 2 added weather conditions data
  // version 3 added hiking data (packWeight)
  // version 4 converted to storing with smaller key names
  // version 4.2 store calories computation
  // version 4.3 store drivingACar status
  // version 4.4 change calorie calculation
  // version 5.0 start using files instead of AsyncData
  // version 5.1 start storing images in Pictures/TrekLog directory
  // version 5.2 truncate speed values to 4 significant digits
  // version 5.3 set start point time to 0 and duration to end point time

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

export interface LaLo {
  a: number,      // latitude value
  o: number       // longitude value
}

// Define an object for the data kept for each GPS point in the Trek
export interface TrekPoint {
  l: LaLo,        // location
  t: number,      // time (seconds) point recieved
  s: number,      // speed reported at pt
}

export type ElevationData = number;

export interface NumericRange {
  max: number,
  min: number,
  range: number
}

export const BACKGROUND_IMAGES = 1;

export const IMAGE_TYPE_PHOTO = 1;
export const IMAGE_TYPE_VIDEO = 2;

export enum TrekImageType { IMAGE_TYPE_PHOTO, IMAGE_TYPE_VIDEO };

export const IMAGE_TYPE_INFO = [{}, {name: "Photo", icon: "Camera"}, {name: "Video", icon: "Video"}];

export const IMAGE_ORIENTATION_PORTRATE = 1;
export const IMAGE_ORIENTATION_PORTRATE_180 = 2;
export const IMAGE_ORIENTATION_LANDSCAPE_270 = 3;
export const IMAGE_ORIENTATION_LANDSCAPE_90 = 4;

export enum TrekImageOrientationType { IMAGE_ORIENTATION_PORTRATE , IMAGE_ORIENTATION_PORTRATE_180,
                            IMAGE_ORIENTATION_LANDSCAPE_270, IMAGE_ORIENTATION_LANDSCAPE_90 };

export interface TrekImage {
  uri:          string,
  orientation:  TrekImageOrientationType,
  type:         TrekImageType, 
  time ?:       number,
  label ?:      string,
  note ?:       string,
}

export interface TrekImageSet {
  loc:          LaLo,         // location images were taken
  images:       TrekImage[];
}

// Define the object stored in the database for a Trek
export interface TrekObj {
    dataVersion:    string,
    group:          string,
    date:           string,
    sortDate:       string,
    startTime:      string,
    endTime:        string,
    type:           TrekType,
    weight:         number,             // in kg
    packWeight:     number,             // weight of backpack if Hike
    strideLength:   number,             // in cm
    conditions:     WeatherData,
    duration:       number,
    trekDist:       number,             // in meters
    totalGpsPoints: number,             // count of GPS points without smoothing
    pointList:      TrekPoint[],
    hills:          string,             // hilliness of the path (flat, light, heavy)
    elevations:     ElevationData[],    // array of elevations along the trek
    elevationGain:  number,
    intervals ?:    number[],           // array of interval distances
    intervalDisplayUnits ?: string,     // units used to display interval distances
    trekLabel ?:    string,             // descriptive label for this trek
    trekNotes ?:    string,             // free-form notes on this trek
    trekImages ?:   TrekImageSet[],     // pictures/videos taken while logging
    calories ?:     number,             // calories burned
    drivingACar ?:  boolean,            // true if user was driving a car for the trek
    course ?:       string,             // course association
}

export interface TrekTypeDataNumeric  {
  Walk?: number,
  Run?:  number,
  Bike?: number,
  Hike?: number,
  Board?: number,
  Drive?: number
}

export interface TrekTimeInterval {
  duration:       number,
  distance:       number,
  speed:          number,
}

export interface TrackingObject {
  courseName: string,           // name of the course used for tracking
  method: CourseTrackingMethod, // method used for tracking
  goalValue: number,            // goal time (sec) or speed/rate (mps)
  pointList: TrekPoint[],       // point data to use for computing the tracking movement
  path: LatLng[],               // path to show on screen of the course being tracked
  markerLocation: TrekPoint,    // current point on the course path for the marker
  markerValue: number,          // current value of data being tracked (dist or time)
  duration: number,             // duration of course
  distance: number,             // distance of course
  type: string,                 // type of data to track (distance or time)
  maxValue: number,             // max value to end tracking
  incrementValue: number,       // amount to move marker every interval
  initialValue: number,         // starting point for marker on course path
  timerInterval: number,        // milliseconds between each marker movement
  startTime: number             // when timer was started milliseconds
  header?:  string,             // header for the tracking status display
  timeDiff: number,             // current time differential with trek
  distDiff: number              // current dist differential with trek
}

export interface RestoreObject {
  trek ?:               TrekObj,
  measurementSystem ?:  MeasurementSystemType,
  strideLengths ?:      TrekTypeDataNumeric,
  initialLoc ?:         LatLng;
  limitsActive ?:       boolean,
  timeLimit ?:          number,
  distLimit ?:          number,
  limitTrekDone ?:      boolean,
  limitTimerId ?:       number,
  lastTime ?:           number,
  lastDist ?:           number,
  units ?:              string,
  lastTimeUnits ?:      string,
  lastDistUnits ?:      string,
  layoutOpts ?:         string,
  dtMin ?:              string,
  dtMax ?:              string,
  defaultTrekType ?:    string,
  minPointDist ?:       number,
  startMS ?:            number,  
  logging ?:            boolean,
  trekTimerId ?:        number,
  timerOn ?:            boolean,
  trekSaved ?:          boolean,
  typeSelections ?:     number,
  showSpeedOrTime ?:    string,
  defaultMapType ?:     MapType,
  currentMapType ?:     MapType,
  saveDialogOpen ?:     boolean,
  trekLabelFormOpen ?:  boolean,
  cancelDialogOpen ?:   boolean,
  showMapInLog ?:       boolean,
  colorTheme ?:         ThemeType,
  backgroundImage ?:    number,
  trackingObj?:         TrackingObject,
  trekTimerPaused ?:    boolean,
  trackingMethod  ?:    CourseTrackingMethod,
  trackinigValue  ?:    number,
  trackingCourse  ?:    Course,
}

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

export const SWITCH_SPEED_AND_TIME = {speed: 'time', time: 'speed'};

export const INVALID_NAMES = [
  'new', 'courses', 'groups', 'settings', 'goals', 'treklog', 'course', 'cancel'
]

export const FAKE_SELECTION = '#none';
export const RESP_OK = 'OK';
export const RESP_CANCEL = 'CANCEL';
export const RESP_NO_MATCH = 'PATH DOES NOT MATCH\n';
export const RESP_BAD_LENGTH = 'WRONG PATH LENGTH\n';
export const RESP_HAS_LINK = 'LINK ALREADY PRESENT';

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
export const MSG_COURSE_LIST_READ = "COURSE LIST READ ERROR\n";
export const MSG_COURSE_LIST_WRITE = "COURSE LIST WRITE ERROR\n";
export const MSG_STARTING_LOC = 'BAD STARTING LOCATION\n';
export const MSG_NEW_COURSE_RECORD = 'NEW COURSE RECORD\n';
export const MSG_NEW_COURSE = 'NEW COURSE\n';


export class TrekInfo {

  // properties in the TrekObj
              dataVersion = CURR_DATA_VERSION;
  @observable group;
  @observable date;
              sortDate = '';
  @observable startTime;
              endTime = '';
  @observable type : TrekType;
              weight = 0;
  @observable packWeight : number;
              strideLength = 0;
  @observable conditions : WeatherData;
  @observable duration : number;
  @observable trekDist : number;
              totalGpsPoints = 0;
              pointList : TrekPoint[] = [];
              hills;
              elevations;
              elevationGain;
  @observable intervals;
              intervalDisplayUnits;
  @observable trekLabel;
  @observable trekNotes;
              trekImages : TrekImageSet[];
              calories = 0;
              drivingACar = false;
  @observable course : string;

// properties used for program state
  @observable appReady;
  @observable waitingForSomething;
  @observable measurementSystem : MeasurementSystemType;
  @observable trekPointCount;
  @observable logging;
  @observable layoutOpts;
  @observable timerOn;
  @observable trekSaved;
  @observable dataReady;
  @observable typeSelections;
  @observable currentMapType : MapType;
  @observable limitsActive;
  @observable timeLimit;
  @observable distLimit;
  @observable timeframe;                          // time frame used to select summaries and reviews
  @observable trekCount;
  @observable averageSpeed;
  @observable timePerDist;
  @observable speedNow ;
  @observable currentDist;
  @observable currentCalories;
  @observable currentNetCalories;
  @observable showSpeedOrTime;                    // Flag to switch between showing Dist/Time and Time/Dist
  @observable showStepsPerMin;                    // Flag to switch between showing Total Steps and Steps/Min
  @observable showTotalCalories;                  // Flag to switch between showing Calories and Calories/Min
  @observable speedDialZoom;
  @observable trekImageCount;                     // Number of images/videos in this trek 
  @observable showMapInLog   : boolean;
  @observable pendingReview : boolean;
  @observable colorTheme : ThemeType;
  @observable showMapControls;
  @observable currentBackground;
  @observable trackingMarkerLocation : TrekPoint;
  @observable trackingDiffTime : number;
  @observable trackingDiffDist : number;
  @observable trackingValue : number;             // value associated with tracking method
  @observable trackingMethod : CourseTrackingMethod;   // method being used to track progress .vs. course
  @observable currentTime: string;
  @observable currentDate: string;

  startMS = 0;                                    // trek start time in milliseconds
  trekTimerId = 0;                                // id for the 1-second timer used during logging
  trekTimerPaused = false;                        // flag to pause timer when save/discard dialog displayed
  initialLoc : LatLng;                            // location detected when TrekLog first starts
  strideLengths = DEFAULT_STRIDE_LENGTHS;         // array of lengths used to compute steps/revs by trek type
  calculatedValuesTimer = CALC_VALUES_INTERVAL;   // counter used to keep certain display values updated
  resObj : RestoreObject;                         // state object used to restore log session if app terminated
  trackingObj : TrackingObject;                   // object that holds tracking marker information       

  trackingCourse : Course;                        // course selected to track

  defaultMapType : MapType;
  allTreks : TrekObj[] = [];                      // All treks maintained in memory for performance
  dtMin = '';
  dtMax = '';
  defaultTrekType = '';
  limitTimerId = 0;                               // id for timer used for time-limited treks
  lastTime = 15;                                  // used to provide default value for time-limit form
  lastDist = 0;                                   // used to provide default value for distance-limit form   
  units = '';                                     // units specified in limit form (meters, miles, minutes, hours)
  lastTimeUnits = 'minutes';
  lastDistUnits = 'miles';
  lastPackWeight = undefined;                     // used to provide default value for pack weight form
  limitTrekDone = false;
  limitTimeoutFn : Function;
  minPointDist = 1;
  currSpeedRange = 0;                             // current speed range for user (used to compute calories)
  saveDialogOpen = false;                         // state of Save this Trek dialog form (used for Restore)
  trekLabelFormOpen = false;                      // state of Trek Label dialog form (used for Restore)
  cancelDialogOpen = false;                       // state of Cancel this Trek Log dialog form (used for Restore)
  updateDashboard : string = '';
  settingsFound = '';
  pendingInit = true;
  haveShownDriving = false;
  waitingMsg = "";
  limitsCloseFn: Function;
  currentTimeIntervalId: number;

  currentGroupSettings = {                         // used to restore current group settings after Reviewing Treks
    weight: 0,                                    // in kg
    packWeight: 0,                                // in kg
  }
  // badPointList : number[];                     // **Debug

  constructor ( private utilsSvc: UtilsSvc, private storageSvc: StorageSvc, private modalSvc: ModalModel,
    private groupSvc: GroupSvc ) {
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.appReady = false;
    this.dataReady = false;
    this.trekPointCount = 0;
    this.date = '';
    this.startTime = '';
    this.type = 'Walk';
    this.group = '';
    this.packWeight = 0;
    this.logging = false;
    this.duration = 0;
    this.trekDist = 0;
    this.setTrekLabel('');
    this.setTrekNotes('');
    this.setCourseLink(undefined);
    this.timerOn = false;
    this.trekSaved = false;
    this.averageSpeed = 'N/A';
    this.timePerDist = 'N/A';
    this.speedNow = 'N/A';
    this.currentDist = 'N/A';
    this.currentCalories = 'N/A';
    this.currentNetCalories = 'N/A';
    this.showSpeedOrTime = 'speed';
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.layoutOpts = 'Current';
    this.trekCount = 0;
    this.conditions = undefined;
    this.timeframe = 'TMonth';
    this.typeSelections = 0;
    this.currentMapType = 'standard';
    this.limitsActive = false;
    this.timeLimit = 0;
    this.distLimit = 0;
    this.trekImageCount = 0;
    this.intervals = undefined;
    this.speedDialZoom = true;
    this.showMapInLog = false;
    this.pendingReview = false;
    this.setColorTheme(COLOR_THEME_DARK);
    this.setCurrentBackground(BACKGROUND_IMAGES);
    this.clearTrackingObj();
    this.setTrackingDiffTime(0);
    this.setTrackingDiffDist(0);
    this.setTrackingValue(0);
    this.setWaitingForSomething();
    this.setTrackingMethod('courseTime');
    this.setDefaultMapType('standard');
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
              // set the current use to the most recent group
              this.setColorTheme(groups.theme || COLOR_THEME_DARK);
              this.setMeasurementSystem(groups.measurementSystem);
              this.setTrekLogGroupProperties(groups.lastGroup || groups.groups[0])
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
  this.defaultTrekType = newSettings.type;
  this.updateStrideLengths(newSettings.strideLengths);
  this.updateType(newSettings.type);   // set the default trek type, strideLength and currentMapType
  this.updateGroup(newSettings.group);
  this.weight = newSettings.weights[newSettings.weights.length-1].weight;
  this.updatePackWeight(newSettings.packWeight || 0);
  this.setTypeSelections(TREK_SELECT_BITS.All);
  this.currentGroupSettings.weight = this.weight;
  this.currentGroupSettings.packWeight = this.packWeight;
}

// change the logging group to the given group
setTrekLogGroupProperties = (group: string, settings ?: SettingsObj) => {
  let newSettings = settings;

  return new Promise<any>((resolve, reject) => {
      if (!newSettings) {
        this.groupSvc.readGroupSettings(group)
        .then((result : SettingsObj) => {
          newSettings = result;
          this.changeGroupSettings(newSettings);
          this.groupSvc.saveGroups(newSettings.group)   // set new last group in groups object
          .then(() => resolve(this.readAllTreks([group])))
          .catch((err) => reject('Error: SAVE_GROUPS:\n' + err))
        })
        .catch((err) => {
          reject('Error: READ_GROUP_SETTINGS:\n' + err)
        });       // Error reading group settings
      }   
      else {
        this.changeGroupSettings(newSettings);
        this.groupSvc.saveGroups(newSettings.group)
        .then(() => resolve(this.readAllTreks([group])))
        .catch((err) => reject('Error: SAVE_GROUPS:\n' + err))
    }
  })
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
      resolve('OK');
    })
    .catch(() => {
      // error reading treks
      this.setDataReady(true);
      resolve('NO_TREKS');
    })
  })
}

  // Compose and return an object containing all relevant trek properties
  getSaveObj = (noPointList = false) :TrekObj => {
    let savObj : TrekObj = {
      dataVersion:  this.dataVersion,
      group:        this.group,
      date:         this.date,
      sortDate:     this.sortDate,
      startTime:    this.startTime,
      endTime:      this.endTime,
      type:         this.type,
      weight:       this.weight,
      packWeight:   this.type === 'Hike' ? this.packWeight : 0,
      strideLength: this.strideLength,
      conditions:   this.conditions,
      duration:     this.duration,
      pointList:    undefined,
      trekDist:     this.trekDist,
      totalGpsPoints: this.totalGpsPoints,
      hills:        this.hills,
      elevations:   this.elevations,
      elevationGain: this.elevationGain,
      intervals:    this.intervals,
      intervalDisplayUnits: this.intervalDisplayUnits,
      trekLabel:    this.trekLabel,
      trekNotes:    this.trekNotes,
      trekImages:   this.trekImages,
      calories:     this.calories,
      drivingACar:  this.drivingACar,
      course:       this.course,
    }
    if (!noPointList){
      savObj.pointList =    this.pointList;
    }
    return savObj;
  }
  
  // set the trek properties from the given trek objeck
  @action
  setTrekProperties = (data: TrekObj) => {
    this.dataVersion    = data.dataVersion || '1';
    this.sortDate       = data.sortDate;
    this.group          = data.group;
    this.date           = data.date;
    this.type           = data.type;
    this.updateType(data.type);         // this also sets currentMapType
    this.strideLength   = data.strideLength;
    this.weight         = data.weight;
    this.startTime      = data.startTime;
    this.endTime        = data.endTime;
    this.packWeight     = data.packWeight;
    this.conditions     = data.conditions;
    this.duration       = data.duration || 0;
    this.trekDist       = data.trekDist;
    this.totalGpsPoints = data.totalGpsPoints;
    this.setPointList(data.pointList);
    this.elevations     = data.elevations;
    this.elevationGain  = data.elevationGain;
    // this.hills          = data.hills;
    this.hills          = this.utilsSvc.analyzeHills(this.elevations, this.elevationGain, this.trekDist);
    this.intervals      = data.intervals;
    this.intervalDisplayUnits = data.intervalDisplayUnits;
    this.trekLabel      = data.trekLabel;
    this.trekNotes      = data.trekNotes;
    this.trekImages     = data.trekImages;
    this.calories       = data.calories;
    this.drivingACar    = data.drivingACar;
    this.course         = data.course;
    this.setTrekImageCount(this.getTrekImageCount());
    this.updateCalculatedValues(true);
  }

  // return an object containing what we need to restore logging if TrekLog is terminated by the system 
  // during a trek.
  getRestoreObject = () : RestoreObject => {
    let rObj : RestoreObject = {
      trek:               this.getSaveObj(true),  // all points will be restored from BackgroundGeolocation
      measurementSystem:  this.measurementSystem,
      strideLengths:      this.strideLengths,
      initialLoc:         this.initialLoc,
      limitsActive:       this.limitsActive,
      timeLimit:          this.timeLimit,
      distLimit:          this.distLimit,
      limitTrekDone:      this.limitTrekDone,
      limitTimerId:       this.limitTimerId,
      lastTime:           this.lastTime,
      lastDist:           this.lastDist,
      units:              this.units,
      lastTimeUnits:      this.lastTimeUnits,
      lastDistUnits:      this.lastDistUnits,
      layoutOpts:         this.layoutOpts,
      dtMin:              this.dtMin,
      dtMax:              this.dtMax,
      defaultTrekType:    this.defaultTrekType,
      minPointDist:       this.minPointDist,
      startMS:            this.startMS,         
      logging:            this.logging,
      trekTimerId:        this.trekTimerId,
      timerOn:            this.timerOn,
      trekSaved:          this.trekSaved,
      typeSelections:     this.typeSelections,
      showSpeedOrTime:    this.showSpeedOrTime,
      defaultMapType:     this.defaultMapType,
      currentMapType:     this.currentMapType,
      saveDialogOpen:     this.saveDialogOpen,
      trekLabelFormOpen:  this.trekLabelFormOpen,
      cancelDialogOpen:   this.cancelDialogOpen,
      showMapInLog:       this.showMapInLog,
      colorTheme:         this.colorTheme,
      backgroundImage:    this.currentBackground,
      trekTimerPaused:    this.trekTimerPaused,
      trackingObj:        this.trackingObj,
      trackingMethod:     this.trackingMethod,
      trackinigValue:     this.trackingValue,
      trackingCourse:     this.trackingCourse,
    }
    return rObj;
  }

  @action
  restoreLogState = (resObj: RestoreObject) => {
      this.setDataReady(false);
      BackgroundGeolocation.getLocations((dataPts) => {
        BackgroundGeolocation.startTask(taskKey => {
          this.startMS =            resObj.startMS;
          // first, rebuild the pointList from the Geolocation service
          resObj.trek.pointList = dataPts.map((pt) => {
            return ({l:{a: pt.latitude, o: pt.longitude}, 
                     t: Math.round((pt.time - this.startMS) / 1000), s: pt.speed}) as TrekPoint;
          })
          this.setMeasurementSystem(resObj.measurementSystem);
          this.setTrekProperties(resObj.trek);
          this.updateStrideLengths(resObj.strideLengths);
          this.setColorTheme(resObj.colorTheme);
          this.initialLoc =         resObj.initialLoc;
          this.setLimitsActive(resObj.limitsActive);
          this.setTimeLimitInfo({value: resObj.timeLimit, units: resObj.units});
          this.setDistLimitInfo({value: resObj.distLimit, units: resObj.units});
          this.limitTrekDone =      resObj.limitTrekDone;
          this.setCurrentBackground(resObj.backgroundImage);
          this.lastTime =           resObj.lastTime;
          this.lastDist =           resObj.lastDist;
          this.units =              resObj.units;
          this.lastTimeUnits =      resObj.lastTimeUnits;
          this.lastDistUnits =      resObj.lastDistUnits;
          this.dtMin =              resObj.dtMin;
          this.dtMax =              resObj.dtMax;
          this.defaultTrekType =    resObj.defaultTrekType;
          this.minPointDist =       resObj.minPointDist;
          this.setLogging(resObj.logging);
          this.setTimerOn(resObj.timerOn);
          this.updateTrekSaved(resObj.trekSaved);
          this.setTypeSelections(resObj.typeSelections);
          this.updateShowSpeedOrTime(resObj.showSpeedOrTime);
          this.defaultMapType = resObj.defaultMapType;
          this.setCurrentMapType(resObj.currentMapType);
          this.currentGroupSettings.weight = this.weight;            // from setTrekProperties
          this.currentGroupSettings.packWeight = this.packWeight;    // "
          this.setSaveDialogOpen(resObj.saveDialogOpen);
          this.setTrekLabelFormOpen(resObj.trekLabelFormOpen);
          this.setCancelDialogOpen(resObj.cancelDialogOpen);
          this.setShowMapInLog(resObj.showMapInLog);
          this.setTrekTimerPaused(resObj.trekTimerPaused);
          this.trackingObj = resObj.trackingObj;
          this.setTrackingValue(resObj.trackinigValue);
          this.setTrackingMethod(resObj.trackingMethod);
          this.trackingCourse = resObj.trackingCourse;
          this.startCurrentTimeTimer();
          this.readAllTreks(this.group);                             // this will set dataReady to true
          BackgroundGeolocation.endTask(taskKey);
        });
      },
      (err) => {Alert.alert('Resume Error', JSON.stringify(err));}
    )
  }

  // Save the given trek object to the database and optionally add/update entry to in-memory list of treks.
  saveTrek = (trek: TrekObj, addEntry : "add" | "update" | "none" = 'update') : Promise<string> => {

    return new Promise((resolve, reject) => {
      if(trek.sortDate === undefined || trek.startTime === undefined) {
        alert(trek.sortDate + '\n' + trek.startTime)
      }
      if (trek.pointList === undefined || trek.pointList.length === 0) { reject('Empty Trek'); }
      if ( addEntry !== 'none' ) { this.updateAllTreksList(trek, addEntry); }
      this.storageSvc.storeTrekData(trek)
      .then(() => {
        resolve('Ok');
      })
      .catch (() => {
        reject('Save Error');
      })  
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
    this.allTreks.push(trek);
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
      this.allTreks[i] = trek; // replace allTreks list entry
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

  // clear the trackingObj and trackingMarkerLocation
  clearTrackingObj = () => { 
    this.setTrackingMarkerLocation(undefined);
    this.trackingObj = undefined;   
  }

  // update selected values of the trackingObj
  updateTrackingObj = (updates: any) => {
    this.trackingObj = {...this.trackingObj, ...updates};
  }

  // set the value of the trackingMarkerLocation property
  @action
  setTrackingMarkerLocation = (loc?: TrekPoint) => { 
    this.trackingMarkerLocation = loc;
  }

  // set the value of the trackingDiffTime property
  @action
  setTrackingDiffTime = (diff: number) => { 
    this.trackingDiffTime = diff;
  }

  // set the value of the trackingDiffDist property
  @action
  setTrackingDiffDist = (diff: number) => { 
    this.trackingDiffDist = diff;
  }

  @action
  setTrackingValue = (value: number) => {
    this.trackingValue = value;
  }

  @action
  setTrackingMethod = (value: CourseTrackingMethod) => {
    this.trackingMethod = value;
  }

  @action
  setTrackingValueInfo = (info: {value: number, method: CourseTrackingMethod}) => {
    this.setTrackingValue(info.value);
    this.setTrackingMethod(info.method);
  }

  // clear properties related to course tracking
  @action
  clearTrackingItems = () => {
    this.trackingCourse = undefined;
    this.clearTrackingObj();
    this.setTrackingDiffDist(undefined);
    this.setTrackingDiffTime(undefined);
  }

  // set the value of the trekTimerPaused property
  setTrekTimerPaused = (status: boolean) => {
    this.trekTimerPaused = status;
  }

  // set the value of the waitingForSomething property
  @action
  setWaitingForSomething = (item?: "NoMsg" | "Location" | "NearbyCourses" | "Conditions") => {
    if (!item) {
      this.waitingForSomething = false;
      this.waitingMsg = "";
    } else {
      switch(item){
        case "NoMsg":
          this.waitingMsg = "";
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
        default:
      }
      this.waitingForSomething = true;
    }
  }

  // set the value of the updateDashboard property
  setUpdateDashboard = (status: string) => {
    this.updateDashboard = status;
  }

  // set the current background image
  @action
  setCurrentBackground = (index: number) => {
    this.currentBackground = index;
  }

  // change background image to next image or blank
  toggleCurrentBackground = () => {
    if(this.currentBackground === BACKGROUND_IMAGES){
      this.setCurrentBackground(0)
    }
    else {
      this.setCurrentBackground(this.currentBackground + 1);
    }
  }

  // return true if there is a background image being shown
  haveBackgroundImage = () => {
    return this.currentBackground !== BACKGROUND_IMAGES;
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

  // set the value for the saveDialogOpen property
  setSaveDialogOpen = (status: boolean) => {
    this.saveDialogOpen = status;
  }

  // set the value for the trekLabelFormOpen property
  setTrekLabelFormOpen = (status: boolean) => {
    this.trekLabelFormOpen = status;
  }

  // set the value for the cancelDialogOpen property
  setCancelDialogOpen = (status: boolean) => {
    this.cancelDialogOpen = status;
  }

  // set the value for the appReady property
  @action
  setAppReady = (status: boolean) => {
    this.appReady = status;
  }

  // set the value of the showMap property
  @action
  setShowMapInLog = (status: boolean) => {
    this.showMapInLog = status;
  }

  @action
  setTimeLimit = (value: number) => {
    this.timeLimit = value;
  }

  setTimeLimitInfo = (info: {value: number, units: string}) => {
    this.setTimeLimit(info.value);
    this.units = info.units;
  }

  @action
  setDistLimit = (value: number) => {
    this.distLimit = value;
  }

  setDistLimitInfo = (info: {value: number, units: string}) => {
    this.setDistLimit(info.value);
    this.units = info.units;
  }

  // return the type of limit on the trek in progress. return undefined if no limit.
  trekLimitType = () :string => {
    if (this.distLimit) { return 'Dist'; }
    if (this.timeLimit) { return 'Time'; }
    return undefined;
  }

  @action
  // set packWeight (assume kilos)
  updatePackWeight = (value: number) => {
    this.packWeight = value;
  }

  @action
  // set packWeight (convert to kilos if necessary)
  setPackWeight = (value: number) => {
    this.packWeight = this.measurementSystem === 'US' ? (value / LB_PER_KG) : value;
  }

  @action
  // set course 
  setCourseLink = (name: string) => {
    this.course = name;
  }

  // set packWeight from the info object (convert to kilos if nec)
  setPackWeightInfo = (info: {value: number, units ?: string}) => {
    this.setPackWeight(info.value);
  }

  @action 
  setLimitsActive = (status: boolean) => {
    this.limitsActive = status;
  }

  // set the value of the minPointDist property
  setMinPointDist = (value: number) => {
    this.minPointDist = value;
  }

  // update the value of the trekLabel property
  @action
  setTrekLabel = (val: string) => {
    this.trekLabel = val;
  }

  // update the value of the intervals property
  @action
  setIntervals = (val: number[]) => {
    this.intervals = val;
  }

  // return true if this trek has a label value defined
  trekHasLabel = () : boolean => {
    return (this.trekLabel !== undefined) && (this.trekLabel !== '');
  }

  // return true if this trek has a notes value defined
  trekHasNotes = () : boolean => {
    return (this.trekNotes !== undefined) && (this.trekNotes !== '');
  }

  // return a value for the trek label
  getTrekLabel = () => {
    return this.trekHasLabel() ? this.trekLabel : 'No Label';
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

  // update the value of the trekNotes property
  @action
  setTrekNotes = (val: string) => {
    this.trekNotes = val;
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

  // reset properties of the TrekObj
  @action
  clearTrek = () => {
    this.setTrekProperties({
      dataVersion:  this.dataVersion,
      group:         this.group,
      date:         this.date,
      type:         this.type,
      weight:       this.weight,
      strideLength: this.strideLength,
      pointList:    [],
      calories:     0,
      packWeight:   this.packWeight,
      trekDist:     0,
    } as TrekObj)
  }

  // Set the value of logging
  @action
  setLogging = (value: boolean) => {
    this.logging = value;
  }

  // Set the value of the timerOn property
  @action
  setTimerOn = (status: boolean) => {
    this.timerOn = status;
  }

  // Set the value of the elevations property
  @action
  setElevations = (elevs: ElevationData[]) => {
    this.elevations = elevs;
  }

  // Set the value of the elevationGain property
  @action
  setElevationGain = (gain: number) => {
    this.elevationGain = this.utilsSvc.fourSigDigits(gain);
  }

  // Set the value of the hills property
  @action
  setHills = (hills: string) => {
    this.hills = hills;
  }

  // set the value of the speedDialZoom property
  @action
  setSpeedDialZoom = (status: boolean) => {
    this.speedDialZoom = status;
  }
  
  
  // set the data properties related to elevations for this trek
  @action
  setElevationProperties = () : Promise<string> => {
    let path = this.utilsSvc.cvtPointListToLatLng(this.pointList); // use the LatLng version of the path
    return new Promise((resolve, reject) => {
      this.utilsSvc.getElevationsArray(path, this.trekDist)
      .then((data : ElevationData[]) =>{
        this.setElevations(data.slice());
        this.setElevationGain(this.utilsSvc.getElevationGain(this.elevations));
        this.setHills(this.utilsSvc.analyzeHills(this.elevations, this.elevationGain, this.trekDist));
        if (this.hills !== 'Level') {
          this.computeCalories();
        }
        resolve('OK');
      })
      .catch((err) =>{ 
        reject(err); 
      })
    })
  }

  // add the given uri to the trek and associate it with the given location
  // associate image with last image if user hasn't moved more than 20 meters
  @action
  addTrekImage = (uri: string, orient: number, type: number, loc: LaLo, time: number) => {
    if(this.trekImages === undefined) { this.trekImages = [{loc: loc, images: []}]; }
    let n = this.trekImages.length;
    let d = this.utilsSvc.calcDist(this.trekImages[n-1].loc.a, this.trekImages[n-1].loc.o, loc.a, loc.o);
    if (d > 20){
      this.trekImages.push({loc: loc, images: []});  // too far from last image, create new set
      n++;
    }
    this.trekImages[n-1].images.push({uri: uri, orientation: orient, type: type, time: time});
    this.setTrekImageCount(this.getTrekImageCount());
  }

  // delete the given TrekImage from the given TrekImageSet
  deleteTrekImage = (imageSetIndex: number, imageIndex: number) : number => {
    let currSet = this.trekImages[imageSetIndex];
    let newIndx = -1;
    let delUri = currSet.images[imageIndex].uri;

    currSet.images.splice(imageIndex, 1);
    if (currSet.images.length === 0) {
      this.trekImages.splice(imageSetIndex, 1);
      if (this.trekImages.length === 0) {
        this.trekImages = undefined;
      }
    } else {
      newIndx = currSet.images.length > imageIndex ? imageIndex : imageIndex - 1;
    }
    this.saveTrek(this.getSaveObj());
    this.setTrekImageCount(this.getTrekImageCount());
    this.storageSvc.removeDataItem(delUri)
    .then(() => {})
    .catch((err) => {
      Alert.alert('Picture Delete Error', 'Picture Location:\n' + delUri + '\nError:\n' + err);
    })
    return newIndx;
  }

  // return the last trekImageSet
  endImageSet = () : TrekImageSet => {
    return (this.haveTrekImages() ? this.trekImages[this.trekImages.length - 1] : undefined);
  }

  // set the value of the trekImageCount property
  @action
  setTrekImageCount = (count : number) => {
    this.trekImageCount = count;
  }

  // return the count of trekImages
  getTrekImageCount = () => {
    let count = 0;
    let sets = this.getTrekImageSetCount();

    for(let i = 0; i < sets; i++ ){
      count += this.trekImages[i].images.length;
    }
    return count;
  }

  // return the count of trekImageSets
  getTrekImageSetCount = () => {
    return this.trekImages ? this.trekImages.length : 0;
  }

  // return true if the trek has any images
  haveTrekImages = () => {
    return this.trekImageCount !== 0;
  }

  // format a title for the given image number from the given image set
  formatImageTitle = (set: number, iNum: number, showUri = false) : string => {
    let image = this.trekImages[set].images[iNum];
    let imageType = IMAGE_TYPE_INFO[image.type].name;
    let title = imageType;
    if (showUri ) {
      return image.uri;
      title = image.uri + '\n' + imageType;
    }
    if (image.time){
      title += ' at ' +  this.utilsSvc.formatTime(image.time);
    }
    return title;
  }

  // set the value of the trekPointCount property
  @action
  setTrekPointCount = () => {
    this.trekPointCount = this.pointList.length;
  }

  // set the pointList property
  setPointList = (list: TrekPoint[]) => {
    this.pointList = list;
    this.setTrekPointCount();
  }

  // Return TRUE if GPS pointList is empty
  pointListEmpty = () : boolean => {
    return (!this.pointList || (this.pointList.length === 0));
  }

  // Return the length of the pointList
  pointListLength = () => {
    return this.pointListEmpty() ? 0 : this.pointList.length;
  }

  // Return the last point in the trek or undefined if no points
  lastPoint = () => {
    return this.pointList.length === 0 ? undefined : this.pointList[this.pointList.length - 1];
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
  
  // set the value of the duration property
  @action
  setDuration = (dur: number) => {
    this.duration = dur;
  }

  // set the value of the startMS property
  @action
  setStartMS = (ms: number) => {
    this.startMS = ms;
  }

  // compute and update various display values
  @action
  updateCalculatedValues = (force = false) => {
      this.updateSpeedNow();
      this.updateAverageSpeed();
      this.updateCurrentCalories(force);
      this.updateCurrentDist();
    // }
  }

  // compute the current speed and uptate the currentSpeed property
  @action
  updateSpeedNow = () => {
    this.speedNow = this.formattedCurrentSpeed();
  }

  // format the avgerageSpeed and timePerDist properties
  @action
  updateAverageSpeed = () => {
    this.averageSpeed = this.formattedAvgSpeed();
    this.timePerDist = this.formattedTimePerDist();
  }

  // format the currentDist property using the trekDist property
  @action
  updateCurrentDist = () => {
    this.currentDist = this.formattedDist();
  }

  // update the current calories property from the calories property.
  // compute the calories property if appropriate or specified
  @action
  updateCurrentCalories = (compute = false) => {
    if (this.timerOn || compute){
      this.computeCalories();
    }
    this.currentCalories = this.formattedCalories(this.calories);

    this.currentNetCalories = this.utilsSvc.getCaloriesPerMin(this.currentCalories, this.duration);
  }

  // compute the value for the calories property
  computeCalories = () => {
    this.calories = this.utilsSvc.computeCalories(this.pointList, this.type, 
        this.hills, this.weight, this.getPackWeight());
  }

  // Set the group to the given value
  @action
  updateGroup = (value: string) => {
    this.group = value;
  }

  // make sure certain group settings values reflect current values from the settings record
  restoreCurrentGroupSettings = () => {
    this.weight = this.currentGroupSettings.weight;
    this.updatePackWeight(this.currentGroupSettings.packWeight);
  }

  // Set the conditions to the given value
  @action
  updateConditions = (value: any) => {
    this.conditions = value;
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
    this.updateCalculatedValues(true);
  }

  // set/clear the bit in typeSelections representing the given type
  @action
  updateTypeSelections = (value: TrekType, set: boolean) => {
    if (set) {
      this.typeSelections = this.typeSelections | TREK_SELECT_BITS[value];
    } else {
      this.typeSelections = this.typeSelections ^ TREK_SELECT_BITS[value];
    }
  }

  // set the typeSelections property to the given value
  @action
  setTypeSelections = (value: number) => {
    this.typeSelections = value;
  }

  // Set the Trek Type to the given value
  // Also set the strideLength and currentMapType properties accordingly
  @action
  updateType = (value: TrekType) => {
    this.type = value;
    this.strideLength   = STEPS_APPLY[value] ? this.strideLengths[value] : 0;
    if(value === TREK_TYPE_HIKE){
      this.setCurrentMapType('terrain');    // default to 'terrain' map for Hikes
    } else {
      this.setCurrentMapType(this.defaultMapType);
    }
  }

  // Set timeframe to the given value
  @action
  updateTimeframe = (value: string) => {
    this.timeframe = value;
  }

  // get the weight of the pack if applicable (kg)
  getPackWeight = () => {
    return (this.type === 'Hike') ? this.packWeight : 0; 
  }
  
  // get the total weight for weight related calculations (kg)
  getTotalWeight = () => {
    return this.weight + this.getPackWeight(); 
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

  // Set the saved status of the trek to the given value
  @action
  updateTrekSaved = (status: boolean) => {
    this.trekSaved = status;
  }

  // Indicate whether Avg Speed or Time/Dist should show in the status
  @action
  updateShowSpeedOrTime = (mode: string) => {
    this.showSpeedOrTime = mode;
  }

  // Indicate whether Steps or Steps/Min should show in the status
  @action
  updateShowStepsPerMin = (status: boolean) => {
    this.showStepsPerMin = status;
  }

  // Indicate whether Calories or Calories/Min should show in the status
  @action
  updateShowTotalCalories = (status: boolean) => {
    this.showTotalCalories = status;
  }

  // convert the given distance (meters) to feet if necessary
  convertDist = (dist: number, round = false) => {
    if (this.measurementSystem === 'Metric') { return dist; }
    return (round ? Math.round(dist / M_PER_FOOT) : (dist / M_PER_FOOT));
  }

  // convert the given weight (kg)) to lb if necessary
  convertWeight = (wt: number, round = false) => {
    if (this.measurementSystem === 'Metric') { return wt; }
    return (round ? Math.round(wt * LB_PER_KG) : (wt * LB_PER_KG));
  }

  // Return the trek distance formatted for display with appropriate units
  formattedDist = (dist = this.trekDist, system = this.measurementSystem) => {
    return this.utilsSvc.formatDist(dist, DIST_UNIT_CHOICES[system]);
  }

  // Return the number of steps represented by the trek distance
  formattedSteps = (perMin = false, dist = this.trekDist, time = this.duration) => {
    let steps;

    steps = this.utilsSvc.computeStepCount(dist, this.strideLength);
    return this.utilsSvc.formatSteps(this.type, steps, perMin ? time : undefined);
  }

  formattedDuration = (dur = this.duration) => {
    return this.utilsSvc.formatDuration(dur);
  }

  formattedAvgSpeed = () => {
    return this.utilsSvc.formatAvgSpeed(this.measurementSystem, this.trekDist, this.duration);
  }

  formattedTimePerDist = () => {
    return this.utilsSvc.formatTimePerDist(DIST_UNIT_CHOICES[this.measurementSystem], this.trekDist, this.duration);
  }

  // Return the speed value from the last GPS point formatted so it can be displayed
  // the raw meters/second speed will be returned if the mpsOnly parameter is true.
  formattedCurrentSpeed = (system = this.measurementSystem, mpsOnly = false) => {
    let speed = 0;
    let point : TrekPoint;
    let pll = this.pointList.length;
    let speedMPS = 0;

    if ((pll > 0) && this.timerOn) {
      point = this.pointList[pll - 1];
      // now convert meters/sec to mph or kph
      if (this.duration - point.t < MAX_TIME_SINCE) {
        speedMPS = point.s || 0;
        speed = this.utilsSvc.computeRoundedAvgSpeed(system, speedMPS, 1);
      }
      else {
        // been too long since last GPS point, punt
        speed = 0;
      }
      if (!mpsOnly) {
        switch(system){
          case 'Metric':
            return speed + ' kph';    // return km/hr
          case 'US':
          return speed + ' mph';      // return km/hr
        }      
      }
    }
    return mpsOnly ? speedMPS : 'N/A';
  }

  // return total calories burned or burn rate depending on the "total" param
  formattedCalories = (totalCals, total = true, time = this.duration) => {
    return (total 
              ? totalCals.toString() 
              : this.utilsSvc.getCaloriesPerMin(totalCals, time).toString()
           )
  }

  // find the elevation range for the given list of ElevationData items
  getElevationRange = (list ?: ElevationData[]) => {
    if (list === undefined) { 
      if (!this.hasElevations()) { return undefined; }
      list = this.elevations; 
    }
    return this.utilsSvc.getNumericRange(list);
  }


  // return the starting (First) or current (Last) altitude for the Trek
  // TODO: save elevation range with trek to avoid computing every time
  formattedTrekElevation = (pos: string) : string => {
    let elev;

    if (this.hasElevations()) {
      switch(pos) {
        case 'First':
          elev = this.elevations[0];
          break;
        case 'Last':
          elev = this.elevations[this.elevations.length-1];
          break;
        case 'Max':
          elev = this.getElevationRange(this.elevations).max;
          break;
        case 'Min':
          elev = this.getElevationRange(this.elevations).min;
          break;
        default:
      }
    }
    return this.formattedElevation(elev)
  }  

  // return the given elevation formatted for the measuring system
  formattedElevation =(elev?: number) : string => {
    if (elev === undefined) { return 'N/A'; }
    return this.utilsSvc.formatDist(elev, SMALL_DIST_UNITS[DIST_UNIT_CHOICES[this.measurementSystem]])
  }

  // return whether the data for this trek contains altitude info
  hasElevations = () : boolean => {
    return (this.elevations !== undefined && this.elevations.length !== 0);
  }

  formattedElevationGainPct = () => {
    let egPct = this.trekDist === 0 ? 0 : (this.elevationGain / this.trekDist);


    return Math.round((egPct) * 100).toString() + ' %';
  }

  // return true if trek has Weather data
  hasWeather = () : boolean => {
    return this.conditions !== undefined;
  }

}