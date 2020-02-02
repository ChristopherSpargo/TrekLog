import { observable, action } from 'mobx';
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import { Alert } from 'react-native';

import { LatLng } from 'react-native-maps';
import { CourseTrackingMethod } from './TrackingMethodComponent';
import { TrekInfo, TrekPoint, TrekState } from "./TrekInfoModel";
import { Course} from './CourseService';
import { CALC_VALUES_INTERVAL, LogStateProperties, TrekLoggingState } from './LoggingService';
import { MainSvc, MainStateProperties, RESP_OK, TREK_TYPE_HIKE } from './MainSvc';

export interface TrackingObject {
  courseName: string,           // name of the course used for tracking
  method: CourseTrackingMethod, // method used for tracking
  goalValue: number,            // goal time (sec) or speed/rate (mps)
  goalTime: string,             // goal time as a time string (hh:mm:ss)
  pointList: TrekPoint[],       // course point data to use for computing the tracking movement
  lastIndex1: number,           // index of pointList array with current marker location
  lastIndex2: number,           // index of pointList array with marker at current trek distance
  path: LatLng[],               // path to show on screen of the course being tracked
  markerLocation: TrekPoint,    // current point on the course path for the marker
  markerValue: number,          // current value of data being tracked (dist or time)
  duration: number,             // duration of course
  distance: number,             // distance of course
  type: string,                 // type of data to track (distance or time)
  maxValue: number,             // max value to end tracking
  incrementValue: number,       // amount to move marker every interval
  initialValue: number,         // starting point for marker on course path
  timerId: number,              // id of interval timer
  timerInterval: number,        // milliseconds between each marker movement
  startTime: number             // when timer was started milliseconds
  challengeTitle: string,       // title string for tracking status during course challenge
  header?:  string,             // header for the tracking status display
  timeDiff: number,             // current time differential with trek
  distDiff: number              // current dist differential with trek
}

export interface RestoreObject {
  trek ?:               TrekState,
  mainState ?:          MainStateProperties,
  logState ?:           LogStateProperties
}

export class LogState {
  // properties used for logging state
  @observable trekPointCount;
  @observable logging;
  @observable timerOn;
  @observable trekSaved;
  @observable limitsActive;
  @observable timeLimit;
  @observable distLimit;
  @observable showMapInLog   : boolean;
  @observable currentDisplayImageSet : number;
  @observable allowImageDisplay : boolean;
  @observable pendingReview : boolean;
  @observable trackingMarkerLocation : TrekPoint;
  @observable trackingDiffTime : number;
  @observable trackingDiffTimeStr : string;
  @observable trackingDiffDist : number;
  @observable trackingDiffDistStr : string;
  @observable trackingValue : number;             // value associated with tracking method
  @observable trackingMethod : CourseTrackingMethod;   // method being used to track progress .vs. course
  @observable loggingState : TrekLoggingState;

  startMS = 0;                                    // trek start time in milliseconds
  trekTimerId = 0;                                // id for the 1-second timer used during logging
  trekTimerPaused = false;                        // flag to pause timer when save/discard dialog displayed
  trackingObj : TrackingObject;                   // object that holds tracking marker information       
  trackingCourse : Course;                        // course selected to track
  

  limitTimerId = 0;                               // id for timer used for time-limited treks
  lastTime = 15;                                  // used to provide default value for time-limit form
  lastDist = 0;                                   // used to provide default value for distance-limit form   
  units = '';                                     // units specified in limit form (meters, miles, minutes, hours)
  lastDistUnits = 'miles';
  lastPackWeight = undefined;                     // used to provide default value for pack weight form
  limitTrekDone = false;
  limitTimeoutFn : Function;
  haveShownDriving = false;
  trackingMarkerTimerId: number;
  pointsSinceSmooth = 0;
  calculatedValuesTimer = CALC_VALUES_INTERVAL;   // counter used to keep certain display values updated
  saveDialogOpen = false;                         // state of Save this Trek dialog form (used for Restore)
  cancelDialogOpen = false;                       // state of Cancel this Trek Log dialog form (used for Restore)

  constructor ( public trek: TrekInfo, 
                private mainSvc: MainSvc) {
  }

  @action
  initializeObservables = () => {
    this.showMapInLog = false;
    this.currentDisplayImageSet = undefined;
    this.allowImageDisplay = true;
    this.logging = false;
    this.timerOn = false;
    this.trekSaved = false;
    this.limitsActive = false;
    this.timeLimit = 0;
    this.distLimit = 0;
    this.pendingReview = false;
    this.trackingValue = 0;
    this.trackingMethod = 'courseTime';
    this.loggingState = 'Not Logging';
  }

  getLoggingRestoreProperties = () : LogStateProperties => {
    return {
      // properties used for program state
      limitsActive:       this.limitsActive,
      timeLimit:          this.timeLimit,
      distLimit:          this.distLimit,
      limitTrekDone:      this.limitTrekDone,
      lastTime:           this.lastTime,
      lastDist:           this.lastDist,
      units:              this.units,
      lastDistUnits:      this.lastDistUnits,
      startMS:            this.startMS,         
      logging:            this.logging,
      loggingState:       this.loggingState,
      timerOn:            this.timerOn,
      trekSaved:          this.trekSaved,
      saveDialogOpen:     this.saveDialogOpen,
      cancelDialogOpen:   this.cancelDialogOpen,
      showMapInLog:       this.showMapInLog,
      currentDisplayImageSet: this.currentDisplayImageSet,
      alllowImageDisplay: this.allowImageDisplay,
      trekTimerPaused:    this.trekTimerPaused,
      trackingObj:        this.trackingObj,
      trackingMethod:     this.trackingMethod,
      trackingValue:      this.trackingValue,
      trackingCourse:     this.trackingCourse,
    }
  }

  @action
  restoreLoggingState = (data: LogStateProperties)  => {
      // properties used for program state
      this.limitsActive =       data.limitsActive;
      this.timeLimit =          data.timeLimit;
      this.distLimit =          data.distLimit;
      this.limitTrekDone =      data.limitTrekDone;
      this.lastTime =           data.lastTime;
      this.lastDist =           data.lastDist;
      this.units =              data.units;
      this.lastDistUnits =      data.lastDistUnits;
      this.logging =            data.logging;
      this.loggingState =       data.loggingState;
      this.timerOn =            data.timerOn;
      this.trekSaved =          data.trekSaved;
      this.saveDialogOpen =     data.saveDialogOpen;
      this.cancelDialogOpen =   data.cancelDialogOpen;
      this.showMapInLog =       data.showMapInLog;
      this.currentDisplayImageSet = data.currentDisplayImageSet;
      this.allowImageDisplay = data.alllowImageDisplay;

      this.trekTimerPaused =    data.trekTimerPaused;
      this.trackingObj =        data.trackingObj;
      this.trackingMethod =     data.trackingMethod;
      this.trackingValue =      data.trackingValue;
      this.trackingCourse =     data.trackingCourse;
  }

  // return an object with all properties from the given trek
  getTrekRestoreProperties = () : TrekState => {
    return {
      dataVersion   : this.trek.dataVersion,
      group         : this.trek.group,
      date          : this.trek.date,
      sortDate      : this.trek.sortDate,
      startTime     : this.trek.startTime,
      endTime       : this.trek.endTime,
      type          : this.trek.type,
      weight        : this.trek.weight,
      packWeight    : this.trek.packWeight,
      strideLength  : this.trek.strideLength,
      conditions    : this.trek.conditions,
      duration      : this.trek.duration,
      trekDist      : this.trek.trekDist,
      hills         : this.trek.hills,
      elevations    : this.trek.elevations,
      elevationGain : this.trek.elevationGain,
      trekLabel     : this.trek.trekLabel,
      trekNotes     : this.trek.trekNotes,
      trekImages    : this.trek.trekImages,
      calories      : this.trek.calories,
      drivingACar   : this.trek.drivingACar,
      course        : this.trek.course,
      showSpeedStat : this.trek.showSpeedStat,
    }  
  }

  @action
  restoreTrekState = (data: TrekState) => {
      this.trek.dataVersion   = data.dataVersion;
      this.trek.group         = data.group;
      this.trek.date          = data.date;
      this.trek.sortDate      = data.sortDate;
      this.trek.startTime     = data.startTime;
      this.trek.endTime       = data.endTime;
      this.trek.type          = data.type;
      this.trek.weight        = data.weight;
      this.trek.packWeight    = data.packWeight;
      this.trek.strideLength  = data.strideLength;
      this.trek.conditions    = data.conditions;
      this.trek.duration      = data.duration;
      this.trek.trekDist      = data.trekDist;
      this.trek.pointList     = data.pointList;
      this.trek.totalGpsPoints= data.totalGpsPoints;
      this.trek.hills         = data.hills;
      this.trek.elevations    = data.elevations;
      this.trek.elevationGain = data.elevationGain;
      this.trek.trekLabel     = data.trekLabel;
      this.trek.trekNotes     = data.trekNotes;
      this.trek.trekImages    = data.trekImages;
      this.trek.calories      = data.calories;
      this.trek.drivingACar   = data.drivingACar;
      this.trek.course        = data.course;
      this.trek.showSpeedStat = data.showSpeedStat;
  }

  @action
  restoreTrekLogState = (resObj: RestoreObject) => {
    return new Promise<string> ((resolve, reject) => {
      this.mainSvc.setDataReady(false);
      BackgroundGeolocation.getLocations((dataPts) => {
        BackgroundGeolocation.startTask(taskKey => {
          this.startMS =            resObj.logState.startMS;
          // first, rebuild the pointList from the Geolocation service
          resObj.trek.totalGpsPoints = dataPts.length;
          resObj.trek.pointList = dataPts.map((pt) => {
            return ({l:{a: pt.latitude, o: pt.longitude}, 
                     t: Math.round((pt.time - this.startMS) / 1000), s: pt.speed}) as TrekPoint;
          })
          this.mainSvc.restoreMainState(resObj.mainState)
          this.restoreTrekState(resObj.trek);
          this.restoreLoggingState(resObj.logState)
          this.mainSvc.currentGroupSettings.weight = this.trek.weight;            
          this.mainSvc.currentGroupSettings.packWeight = this.trek.packWeight;    
          this.mainSvc.setCurrentMapType(this.trek.type === TREK_TYPE_HIKE ? 'terrain' 
                                                                : this.mainSvc.defaultMapType)
          this.mainSvc.setDataReady(true);
          resolve(RESP_OK);
          BackgroundGeolocation.endTask(taskKey);
        });
        },
        (err) => {
          Alert.alert('Resume Error', JSON.stringify(err));
          reject('Error');
        }
      )
    })
  }

   // return an object containing what we need to restore logging if TrekLog is terminated by the system 
  // during a trek.
  getRestoreObject = () : RestoreObject => {
    if (!this.timerOn && !this.pendingReview){
      return undefined;
    }
    return {
      trek: this.getTrekRestoreProperties(),
      logState: this.getLoggingRestoreProperties(),
      mainState: this.mainSvc.getMainStateProperties()
    };
  }  
}

