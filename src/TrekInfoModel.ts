import { observable, action } from 'mobx';
import { Alert } from 'react-native';
import { LatLng } from 'react-native-maps';
import BackgroundGeolocation from 'react-native-mauron85-background-geolocation';

import { UtilsSvc, CM_PER_INCH, LB_PER_KG, M_PER_FOOT} from './UtilsService';
import { NO_USER, UsersObj } from './SettingsComponent';
import { WeatherData } from './WeatherSvc';
import { StorageSvc } from './StorageService';
import { ModalModel } from './ModalModel';
import { uiTheme } from './App';

// Class containing information about and service functions for a Trek

export const CURR_DATA_VERSION = '4.4';   // version 2 added weather conditions data
                                          // version 3 added hiking data (packWeight)
                                          // version 4 converted to storing with smaller key names
                                          // version 4.2 store calories computation
                                          // version 4.3 store drivingACar status
                                          // version 4.4 change calorie calculation

export type MapType = "none" | "standard" | "satellite" | "hybrid" | "terrain" | "mutedStandard";

export const TREK_TYPE_WALK = "Walk";
export const TREK_TYPE_RUN  = "Run";
export const TREK_TYPE_BIKE = "Bike";
export const TREK_TYPE_HIKE = "Hike";

export type TrekType = "Walk" | "Run" | "Bike" | "Hike";
export const WALK_SELECT_BIT = 1;
export const RUN_SELECT_BIT  = 2;
export const BIKE_SELECT_BIT = 4;
export const HIKE_SELECT_BIT = 8;
export const ALL_SELECT_BITS = 15;

export const TREK_SELECT_BITS = {
  Walk: WALK_SELECT_BIT,
  Run:  RUN_SELECT_BIT,
  Bike: BIKE_SELECT_BIT,
  Hike: HIKE_SELECT_BIT,
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
    user:           string,
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
}

export interface TrekTypeDataNumeric  {
  Walk: number,
  Run:  number,
  Bike: number,
  Hike: number
}

export interface TrekTimeInterval {
  duration:       number,
  distance:       number,
  speed:          number,
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
  statsOpen ?:          boolean,
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
  saveDialogOpen ?:     boolean,
  trekLabelFormOpen ?:  boolean,
  cancelDialogOpen ?:   boolean,
  showMapInLog ?:       boolean,
}

export type MeasurementSystemType = "US" | "Metric";
export const DEFAULT_STRIDE_LENGTHS : TrekTypeDataNumeric = // stridelengths are stored in cm
  {Walk: 0, Run: 0, Bike: 31 * CM_PER_INCH * 3.1416, Hike: 0};
export const STRIDE_CONVERSION_FACTORS = {Walk: 1, Run: 1, Bike: 3.1416, Hike: 1}
export const STRIDE_UNIT_CHOICES = {US: 'in', Metric: 'cm'};
export const WEIGHT_UNIT_CHOICES = {US: 'lb', Metric: 'kg'};
export const WEIGHT_UNIT_LONG_NAMES = {US: 'pounds', Metric: 'kilograms'};
export const DIST_UNIT_CHOICES = {US: 'mi', Metric: 'km'};
export const DIST_UNIT_LONG_NAMES = {US: 'miles', Metric: 'kilometers'};
export const SHORT_TO_LONG_DIST_NAMES = {ft: 'feet', m: 'meters', mi: 'miles', km: 'kilometers'};
export const LONG_TO_SHORT_DIST_NAMES = {feet: 'ft', meters: 'm', miles: 'mi', kilometers: 'km'};
export const SMALL_DIST_UNITS = {mi: 'ft', km: 'm'};
export const SMALL_DIST_LONG_NAMES = {US: 'feet', Metric: 'meters'};
export const SPEED_UNIT_CHOICES = {US: 'mph', Metric: 'kph'};
export const DIST_UNIT_GRAPH_CHOICES = {US: 'miles', Metric: 'kilometers'};
export const SMALL_DIST_CUTOFF = 165; //meters

export const TREK_TYPE_CHOICES = [ TREK_TYPE_WALK, TREK_TYPE_RUN, TREK_TYPE_BIKE, TREK_TYPE_HIKE ];
export const TREK_VERBS_OBJ = {Walk: 'Walking', Run: 'Running', Bike: 'Biking', Hike: 'Hiking'};
export const TREK_TYPE_LABELS = {Walk: 'Walk', Run: 'Run', Bike: 'Bike', Hike: 'Hike'};
export const DETAIL_STEP_NAMES = {Walk: 'Step', Run: 'Stride', Bike: 'Wheel', Hike: 'Step'};
export const STEP_NAMES = {Walk: 'Step', Run: 'Stride', Bike: 'Step', Hike: 'Step', Trek: 'Step'};
export const PLURAL_STEP_NAMES = {Walk: 'Steps', Run: 'Strides', Bike: 'Steps', Hike: 'Steps', Trek: 'Steps'};

export const PACK_APPLIES_TO = {Hike: true};
export const SWITCH_SPEED_AND_TIME = {speed: 'time', time: 'speed'};
export const SWITCH_MEASUREMENT_SYSTEM = {US: 'Metric', Metric: 'US'};

export class TrekInfo {

  // properties in the TrekObj
              dataVersion = CURR_DATA_VERSION;
  @observable user;
  @observable date;
              sortDate = '';
  @observable startTime;
              endTime = '';
  @observable type : TrekType;
              weight = 0;
  @observable packWeight;
              strideLength = 0;
  @observable conditions : WeatherData;
  @observable duration;
  @observable trekDist;
              totalGpsPoints = 0;
              pointList : TrekPoint[];
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

// properties used for program state
  @observable appReady;
  @observable measurementSystem : MeasurementSystemType;
  @observable logging;
  @observable layoutOpts;
  @observable timerOn;
  @observable trekSaved;
  @observable dataReady;
  @observable typeSelections;
  @observable defaultMapType : MapType;
  @observable limitsActive;
  @observable timeLimit;
  @observable distLimit;
  @observable statsOpen;
  @observable timeframe;                          // time frame used to select summaries and reviews
  @observable trekCount;
  @observable averageSpeed;
  @observable timePerDist;
  @observable speedNow ;
  @observable currentDist;
  @observable currentCalories;
  @observable currentNetCalories;
  @observable showSpeedOrTime;                    // Flag to switch between showing Dist/Time and Time/Dist
  @observable speedDialZoom;
  @observable trekImageCount;                     // Number of images/videos in this trek 
  @observable trekPointCount;                     // Number of GPS points currently in the trek path
  @observable showMapInLog   : boolean;
  @observable pendingReview : boolean;
  
  startMS = 0;                                    // trek start time in milliseconds
  trekTimerId = 0;                                // id for the 1-second timer used during logging
  initialLoc : LatLng;                            // location detected when TrekLog first starts
  strideLengths = DEFAULT_STRIDE_LENGTHS;         // array of lengths used to compute steps/revs by trek type
  calculatedValuesTimer = CALC_VALUES_INTERVAL;   // counter used to keep certain display values updated
  resObj : RestoreObject;                         // state object used to restore log session if app terminated


  allTreks : TrekObj[] = [];                      // All treks maintained in memory for performance
  updateMap = true;                               // Flag used to limit trek map updates
  updateGraph = true;                             // Flag used to limit updates to barGraphs        
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
  updateDashboard = false;
  settingsFound = '';
  haveShownDriving = false;

  currentUserSettings = {                         // used to restore current user settings after Reviewing Treks
    weight: 0,                                    // in kg
    packWeight: 0,                                // in kg
  }

  constructor ( private utilsSvc: UtilsSvc, private storageSvc: StorageSvc, private modalSvc: ModalModel ) {
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.appReady = false;
    this.dataReady = false;
    this.date = '';
    this.startTime = '';
    this.type = 'Walk';
    this.user = '';
    this.packWeight = 0;
    this.logging = false;
    this.pointList = [];
    this.duration = 0;
    this.trekDist = 0;
    this.timerOn = false;
    this.trekSaved = false;
    this.averageSpeed = 'N/A';
    this.timePerDist = 'N/A';
    this.speedNow = 'N/A';
    this.currentDist = 'N/A';
    this.currentCalories = 'N/A';
    this.currentNetCalories = 'N/A';
    this.showSpeedOrTime = 'speed';
    this.layoutOpts = 'Current';
    this.trekCount = 0;
    this.conditions = undefined;
    this.timeframe = 'TWeek';
    this.typeSelections = 0;
    this.defaultMapType = 'standard';
    this.limitsActive = false;
    this.timeLimit = 0;
    this.distLimit = 0;
    this.statsOpen = false;
    this.trekImageCount = 0;
    this.intervals = undefined;
    this.speedDialZoom = true;
    this.trekPointCount = 0;
    this.showMapInLog = false;
    this.pendingReview = false;
  }

  // read the Settings object and initialize the corresponding properties. Also read the list of treks.
  init = () => {
    return new Promise<string> ((resolve, reject) => {
      this.settingsFound = "OK";
      if (!this.dataReady){
        // we haven't read the list of treks yet (initialized)
        // Get the list of uses (previously known as users)
        this.storageSvc.fetchUserList()
        .then((result : any) => {
          let users = JSON.parse(result) as UsersObj;
          // set the current use to the most rescent use
          if (users.lastUser === NO_USER){
            this.settingsFound = "NO_USES";
            reject('NO_USES');
          }
          this.updateUser(users.lastUser);
          // next, get the use's settings
          this.storageSvc.fetchUserSettings(this.user)
          .then((result : any) => {
            let data = JSON.parse(result);
            this.defaultTrekType = data.type;
            this.updatePackWeight(data.packWeight || 0);
            this.setTypeSelections(TREK_SELECT_BITS.All);
            this.updateType(data.type);   // set the underlying default trek type
            this.updateMeasurementSystem(data.measurementSystem);
            this.weight = data.weights[data.weights.length-1].weight;
            this.updateStrideLengths(data.strideLengths);
            this.strideLength = this.strideLengths[this.type];
            this.currentUserSettings.weight = this.weight;
            this.currentUserSettings.packWeight = this.packWeight;
            // Then, get the treks
            this.readAllTreks(this.user)
            .then((status) => {
              resolve(status)
            })
            .catch(() => {})
          })
          .catch (() => {
            this.settingsFound = "NO_SETTINGS";
            reject('NO_SETTINGS');
            // Error reading settings for last use
          })      
        })
        .catch (() => {
          this.settingsFound = "NO_USES";
          reject('NO_USES');
          // Error reading list of uses
        })      
      }
      else {
        // already initialized
        resolve('ALREADY_DONE');
      }
    })    
}

// read populate the allTreks array with the treks for the given user
readAllTreks = (user: string) => {
  const {infoConfirmColor, infoConfirmTextColor} = uiTheme.palette;
  return new Promise<string> ((resolve, _reject) => {
    this.storageSvc.fetchAllTreks(user)
    .then((result) => {
      this.allTreks = result.list;
      this.setTrekCount();
      if (result.upgraded > 0){
        this.modalSvc.simpleOpen({heading: 'Data Upgraded', 
              content: "Upgraded " + result.upgraded + " treks to match the current TrekLog version.", 
              okText: 'OK', headingStartColor: infoConfirmColor, 
              headingTextColor: infoConfirmTextColor, headingIcon: 'Delete'});
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
      user:         this.user,
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
    this.user           = data.user;
    this.date           = data.date;
    this.type           = data.type;
    this.weight         = data.weight;
    this.strideLength   = data.type !== TREK_TYPE_BIKE ? data.strideLength : 0;
    this.startTime      = data.startTime;
    this.endTime        = data.endTime;
    this.packWeight     = data.packWeight;
    this.conditions     = data.conditions;
    this.duration       = data.duration;
    this.trekDist       = data.trekDist;
    this.totalGpsPoints = data.totalGpsPoints;
    this.pointList      = data.pointList;
    this.setTrekPointCount();
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
      statsOpen:          this.statsOpen,
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
      saveDialogOpen:     this.saveDialogOpen,
      trekLabelFormOpen:  this.trekLabelFormOpen,
      cancelDialogOpen:   this.cancelDialogOpen,
      showMapInLog:       this.showMapInLog,
    }
    return rObj;
  }

  @action
  restoreLogState = (resObj: RestoreObject) => {
    BackgroundGeolocation.getLocations((dataPts) => {
        BackgroundGeolocation.startTask(taskKey => {
          this.setDataReady(false);
          this.startMS =            resObj.startMS;
          this.updateMeasurementSystem(resObj.measurementSystem);
          // first, rebuild the pointList from the Geolocation service
          resObj.trek.pointList = dataPts.map((pt) => {
            return ({l:{a: pt.latitude, o: pt.longitude}, 
                     t: Math.round((pt.time - this.startMS) / 1000), s: pt.speed}) as TrekPoint;
          })
          this.setTrekProperties(resObj.trek);
          this.updateStrideLengths(resObj.strideLengths);
          this.initialLoc =         resObj.initialLoc;
          this.setLimitsActive(resObj.limitsActive);
          this.setTimeLimitInfo({value: resObj.timeLimit, units: resObj.units});
          this.setDistLimitInfo({value: resObj.distLimit, units: resObj.units});
          this.limitTrekDone =      resObj.limitTrekDone;
          this.lastTime =           resObj.lastTime;
          this.lastDist =           resObj.lastDist;
          this.units =              resObj.units;
          this.lastTimeUnits =      resObj.lastTimeUnits;
          this.lastDistUnits =      resObj.lastDistUnits;
          this.setStatsOpen(resObj.statsOpen);
          this.dtMin =              resObj.dtMin;
          this.dtMax =              resObj.dtMax;
          this.defaultTrekType =    resObj.defaultTrekType;
          this.minPointDist =       resObj.minPointDist;
          this.setLogging(resObj.logging);
          this.setTimerOn(resObj.timerOn);
          this.setShowMapInLog(resObj.showMapInLog);
          this.updateTrekSaved(resObj.trekSaved);
          this.setTypeSelections(resObj.typeSelections);
          this.updateShowSpeedOrTime(resObj.showSpeedOrTime);
          this.setDefaultMapType(resObj.defaultMapType);
          this.currentUserSettings.weight = this.weight;            // from setTrekProperties
          this.currentUserSettings.packWeight = this.packWeight;    // "
          this.updateCalculatedValues(true);
          this.setSaveDialogOpen(resObj.saveDialogOpen);
          this.setTrekLabelFormOpen(resObj.trekLabelFormOpen);
          this.setCancelDialogOpen(resObj.cancelDialogOpen);
          this.readAllTreks(this.user);                             // this will set dataReady to true
          BackgroundGeolocation.endTask(taskKey);
        });
      },
      (err) => {Alert.alert('Resume Error', JSON.stringify(err));}
    )
  }

  // Save the given trek object to the database and optionally add entry to in-memory list of treks.
  saveTrek = (trek: TrekObj, addEntry = 'add') : Promise<string> => {

    return new Promise((resolve, reject) => {
      if (trek.pointList === undefined || trek.pointList.length === 0) { reject('Empty Trek'); }
      if ( addEntry === 'add' ) { this.addAllTreksEntry(trek); }
      if ( addEntry === 'update' ) { this.updateAllTreksEntry(trek); }
      this.storageSvc.storeTrek(trek)
      .then(() => {
        resolve('Ok');
      })
      .catch (() => {
        reject('Save Error');
      })  
    })
    
  }

  // Remove the given trek object from the database and optionally remove its entry from in-memory list of treks.
  deleteTrek = (trek: TrekObj, remove = true) : Promise<string> => {

    let key = this.storageSvc.getTrekKey(trek);
    return new Promise((resolve, reject) => {
      this.storageSvc.removeTrek(trek)
      .then(() =>{
        if (remove) { this.removeAllTreksEntry(key); }
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
  removeAllTreksEntry = (key: string) => {
    let i = this.allTreks.findIndex((trek) => this.storageSvc.getTrekKey(trek) === key);
    if (i !== -1) {
      this.allTreks.splice(i, 1); // remove trek from allTreks list
      this.setTrekCount();
    }
  }

  // update the entry for the given trek in the allTreks array
  @action 
  updateAllTreksEntry = (trek: TrekObj) => {
    let key = this.storageSvc.getTrekKey(trek);
    let i = this.allTreks.findIndex((t) => this.storageSvc.getTrekKey(t) === key);
    if (i !== -1) {
      this.allTreks[i] = trek; // replace allTreks list entry
    }
  }

  ////////////////////////////////////////// End of Treks Database Handling

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

  // set the value of the statsOpen property
  @action
  setStatsOpen = (status: boolean) => {
    this.statsOpen = status;
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

  // set the value of the updateMap flag
  // this flag can be used to avoid unnecessary map updates
  setUpdateMap = (status: boolean) => {
    this.updateMap = status;
  }

  // set the value of the updateGraph flag
  // this flag can be used to avoid unnecessary bar Graph updates
  setUpdateGraph = (status: boolean) => {
    this.updateGraph = status;
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
  @action
  setDefaultMapType = (val: MapType) => {
    this.setUpdateMap(true);
    this.defaultMapType = val;
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
      user:         this.user,
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
    this.elevationGain = gain;
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
    let path = this.pointList.map((pt) =>{ return {latitude: pt.l.a, longitude: pt.l.o}; }); // copy just the LatLng data from trek path
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

    currSet.images.splice(imageIndex, 1);
    if (currSet.images.length === 0) {
      this.trekImages.splice(imageSetIndex, 1);
      if (this.trekImages.length === 0) {
        this.trekImages = undefined;
      }
    } else {
      newIndx = currSet.images.length > imageIndex ? imageIndex : imageIndex - 1;
    }
    this.saveTrek(this.getSaveObj(), 'update');
    this.setTrekImageCount(this.getTrekImageCount());
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

  // set the value of the trekPointCount property
  @action
  setTrekPointCount = () => {
    this.trekPointCount = this.pointListLength();
  }

  // set the pointList property
  @action
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
    return this.trekPointCount === 0 ? undefined : this.pointList[this.trekPointCount - 1];
  }

  // return the distance units for the current system
  distUnits = () => {
    return DIST_UNIT_CHOICES[this.measurementSystem];
  }

  // return the distance units for the current system
  longDistUnits = () => {
    return DIST_UNIT_LONG_NAMES[this.measurementSystem];
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
  speedUnits = () => {
    return SPEED_UNIT_CHOICES[this.measurementSystem];
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
    // if (force || this.statsOpen){
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

    this.currentNetCalories = this.utilsSvc.cvtToNetCalories(this.currentCalories, 
                                          this.weight, this.duration);
  }

  // compute the value for the calories property
  computeCalories = () => {
    this.calories = this.utilsSvc.computeCalories(this.pointList, this.type, 
        this.hills, this.weight, this.getPackWeight());
  }

  // Set the user to the given value
  @action
  updateUser = (value: string) => {
    this.user = value;
  }

  // make sure certain user settings values reflect current values from the settings record
  restoreCurrentUserSettings = () => {
    this.weight = this.currentUserSettings.weight;
    this.updatePackWeight(this.currentUserSettings.packWeight);
  }

  // Set the conditions to the given value
  @action
  updateConditions = (value: any) => {
    this.conditions = value;
  }

  // Set the user to the given value
  @action
  updateMeasurementSystem = (value: MeasurementSystemType) => {
    this.measurementSystem = value;
  }

  // Switch the measurement system that values are displayed in
  @action
  switchMeasurementSystem = () => {
    this.updateMeasurementSystem(SWITCH_MEASUREMENT_SYSTEM[this.measurementSystem] as MeasurementSystemType);
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

  // Set the type to the given value
  @action
  updateType = (value: TrekType) => {
    this.type = value;
    this.strideLength = this.strideLengths[value];
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

  // Indicate whether DISTANCE should show in the status bar
  @action
  updateShowSpeedOrTime = (mode: string) => {
    this.showSpeedOrTime = mode;
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
  formattedDist = (dist = this.trekDist) => {
    return this.utilsSvc.formatDist(dist, DIST_UNIT_CHOICES[this.measurementSystem]);
  }

  // Return the number of steps represented by the trek distance
  formattedSteps = (perMin = false, dist = this.trekDist, time = this.duration) => {
    let steps;

    steps = this.utilsSvc.computeStepCount(dist, this.strideLength);
    return this.utilsSvc.formatSteps(this.type, steps, perMin ? time : undefined);
  }

  // Return the speed value from the last GPS point formatted so it can be displayed
  // the raw meters/second speed will be returned if the mpsOnly parameter is true.
  formattedCurrentSpeed = (system = this.measurementSystem, mpsOnly = false) => {
    let speed = 0;
    let point : TrekPoint;
    let pll = this.trekPointCount;
    let speedMPS = 0;

    if ((pll > 0) && this.timerOn) {
      point = this.pointList[pll - 1];
      // now convert meters/sec to mph or kph
      if (this.duration - point.t < MAX_TIME_SINCE) {
        speedMPS = point.s;
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

  formattedDuration = (dur = this.duration) => {
    return this.utilsSvc.formatDuration(dur);
  }

  formattedAvgSpeed = () => {
    return this.utilsSvc.formatAvgSpeed(this.measurementSystem, this.trekDist, this.duration);
  }

  formattedTimePerDist = () => {
    return this.utilsSvc.formatTimePerDist(DIST_UNIT_CHOICES[this.measurementSystem], this.trekDist, this.duration);
  }

  // return total or net calories burned depending on the "total" param
  formattedCalories = (totalCals, total = true, time = this.duration) => {
    return (total 
              ? totalCals.toString() 
              : this.utilsSvc.cvtToNetCalories(totalCals, this.weight, time).toString()
           )
  }

  // find the elevation range for the given list of ElevationData items
  getElevationRange = (list ?: ElevationData[]) => {
    if (list === undefined) { 
      if (!this.hasElevations()) { return undefined; }
      list = this.elevations; 
    }
    return this.getNumericRange(list);
  }


  // find the max and min of an array of numbers
  // return a NumericRange object
  getNumericRange = (list : number[]) : NumericRange => {
    let range : NumericRange = {max: 0, min: 0, range: 0};

    if (list.length){
      range.max = -5000;
      range.min = 100000;
      list.forEach((val) => {
        if (val > range.max){ range.max = val; }
        if (val < range.min){ range.min = val; }
      })
      range.range = range.max - range.min;
    }
    return range;
  }

  // return the starting (First) or current (Last) altitude for the Trek
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


    return Math.round((egPct) * 100).toString() + '%';
  }

  // return true if trek has Weather data
  hasWeather = () : boolean => {
    return this.conditions !== undefined;
  }

}