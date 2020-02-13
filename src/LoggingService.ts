import { action } from 'mobx';
import { Location } from "@mauron85/react-native-background-geolocation";

import {
  TrekInfo,
  LaLo,
  TrekPoint,
  ElevationData
} from "./TrekInfoModel";
import { UtilsSvc, MPH_TO_MPS, DRIVING_A_CAR_SPEED } from "./UtilsService";
import { Course, CourseSvc} from './CourseService';
import { CourseTrackingMethod } from './TrackingMethodComponent';
import { LocationSvc } from "./LocationService";
import { ModalModel } from "./ModalModel";
import { ToastModel } from "./ToastModel";
import { MainSvc, TREK_TYPE_DRIVE, RESP_OK } from './MainSvc';
import { TrekSvc } from './TrekSvc';
import { LogState, TrackingObject } from './LogStateModel';

const SPEED_RANGES_MPS = [
  2 * MPH_TO_MPS,
  4 * MPH_TO_MPS,
  8 * MPH_TO_MPS,
  16 * MPH_TO_MPS,
  32 * MPH_TO_MPS,
  64 * MPH_TO_MPS
];
const DIST_FILTER_VALUES = [2, 4, 8, 12, 20, 40, 64];
export const STATIONARY_DIST_FILTER_VALUE = 5;  // m to move before pos tracking resumes after stopping
export const STOPPED_TIME_MS = 5000;
const ACTIVITY_INTERVAL_VALUES = [1000, 1000, 1000, 1000, 1000, 1000, 1000];
export const SMOOTH_INTERVAL = 10; // smooth route and recompute distance every so many points
export const MIN_SIG_SPEED = {
  Walk: 0.2235,
  Run: 0.447,
  Bike: 1.341,
  Hike: 0.2235,
  Board: .447,
  Drive: 1.341
}; // used to smooth based on type
export const KINK_FACTOR = 1.7; // min height (m) of "kinks" to keep in the route (triangle height)
export const MIN_POINT_DIST_LIMITED_WALK  = 1; // minimum relevant when walking limited
export const MIN_POINT_DIST_LIMITED_RUN   = 1; // minimum relevant distance when running limited
export const MIN_POINT_DIST_LIMITED_BIKE  = 3; // minimum relevant distance when biking limited
export const MIN_POINT_DIST_LIMITED_HIKE  = 1; // minimum relevant distance when hiking limited
export const MIN_POINT_DIST_LIMITED_BOARD = 3; // minimum relevant distance when boarding limited
export const MIN_POINT_DIST_LIMITED_DRIVE = 7; // minimum relevant distance when driving limited
export const MIN_POINT_DISTS_LIMITED = {
  Walk: MIN_POINT_DIST_LIMITED_WALK,
  Bike: MIN_POINT_DIST_LIMITED_BIKE,
  Run: MIN_POINT_DIST_LIMITED_RUN,
  Hike: MIN_POINT_DIST_LIMITED_HIKE,
  Board: MIN_POINT_DIST_LIMITED_BOARD,
  Drive: MIN_POINT_DIST_LIMITED_DRIVE
};

export const CALC_VALUES_INTERVAL = 3;  // number of seconds between updates of 'current' values (speedNow, etc.)
export const MAX_TIME_SINCE = 3;        // max seconds since last GPS point before we punt on current values


export const START_VIB = 250;
export const STOP_VIB =  500;

export const TREK_LIMIT_TYPE_TIME = 'Time';
export const TREK_LIMIT_TYPE_DIST = 'Dist';
export type TrekLimitType = 'Time' | 'Dist';
export type TrekLoggingState = 'Not Logging' | 'Logging' | 'Request Stop' | 'Review' | 
                                'Aborting' | "Stopping";

export interface PointAtLimitInfo {
  pt: TrekPoint,      // point found (computed) at dist/time
  dist: number,       // distance of path from beginning of pointlist to pt
  time: number,       // time "
  index: number,      // index of TrekPoint that starts the path segment containing pt 
  path?: TrekPoint[]  // path to point (pt)
}

export interface LogStateProperties {
  logging ?:            boolean,
  loggingState ?:       TrekLoggingState,
  timerOn ?:            boolean,
  trekSaved ?:          boolean,
  limitsActive ?:       boolean,
  timeLimit ?:          number,
  distLimit ?:          number,
  limitTrekDone ?:      boolean,
  lastTime ?:           number,
  lastDist ?:           number,
  units ?:              string,
  lastDistUnits ?:      string,
  startMS ?:            number,  
  saveDialogOpen ?:     boolean,
  cancelDialogOpen ?:   boolean,
  showMapInLog ?:       boolean,
  currentDisplayImageSet ?: number,
  alllowImageDisplay ?: boolean,
  trackingObj?:         TrackingObject,
  trekTimerPaused ?:    boolean,
  trackingMethod  ?:    CourseTrackingMethod,
  trackingValue  ?:     number,
  trackingCourse  ?:    Course,
}

export class LoggingSvc {

  newTrek = this.logState.trek;
  zeroSpeedTimerId: number;
  moving: boolean = false;

  constructor(
    public logState: LogState,
    private mainSvc: MainSvc,
    private utilsSvc: UtilsSvc,
    private trekSvc: TrekSvc,
    private locationSvc: LocationSvc,
    private courseSvc: CourseSvc,
    private modalSvc: ModalModel,
    private toastSvc: ToastModel,
  ) {
    // this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.clearTrackingItems();
    this.setTrackingDiffTime(0);
    this.setTrackingDiffDist(0);
    this.setTrackingValue(0);
    this.setTrackingMethod('courseTime');
  }

  // Set the value of logging
  @action
  setLogging = (value: boolean) => {
    this.logState.logging = value;
  }

  // Set the value of loggingState
  @action
  setLoggingState = (state: TrekLoggingState) => {
    this.logState.loggingState = state;
    switch(state){
      case 'Not Logging':
      case 'Review':
      case 'Stopping':
        this.setLogging(false);
        break;
      default:
        this.setLogging(true);
    }
  }

  // Start a new Trek logging process
  startTrek = () => {
    this.resetTrek();
  };

  @action
  // reset properties related to the logging process
  resetTrek = () => {
    this.logState.timeLimit = 0;
    this.logState.distLimit = 0;
    this.logState.pointsSinceSmooth = 0;
    this.setTrekTimerPaused(false);
    this.logState.haveShownDriving = false;
    this.trekSvc.setTrekImageCount(this.newTrek, 0);
    this.setAllowImageDisplay(true);
    this.trekSvc.resetTrek(this.newTrek);
    this.setTrekPointCount();
  };

  stopTrek = () => {
    this.stopTrackingTimer(this.logState.trackingObj);
    this.stopTrekTimer();
    let limit = this.trekLimitType();
    if ( limit ) {            // is this a limited trek?
      switch(limit){
        case TREK_LIMIT_TYPE_TIME:
          this.stopLimitTimer();
          if (this.logState.limitTrekDone) {
            // only do if user finished the time
            this.updatePointList(
                this.utilsSvc.truncateTrekPath(this.newTrek.pointList, this.logState.timeLimit, limit));
          }
          break;
        case TREK_LIMIT_TYPE_DIST:
          this.updatePointList( 
              this.utilsSvc.truncateTrekPath(this.newTrek.pointList, this.logState.distLimit, limit));
          break;
        default:
      }
    } 
    if (this.trekSvc.lastPoint(this.newTrek) !== undefined){
      this.updateDuration(this.trekSvc.lastPoint(this.newTrek).t * 1000);
    }
    this.trekSvc.setEndTime(this.newTrek, this.utilsSvc.formatTime(this.logState.startMS + this.newTrek.duration * 1000));
    this.smoothTrek();
    this.trekSvc.updateCalculatedValues(this.newTrek, this.logState.timerOn, true);
  }

  // update the group specific properties from the mainSvc
  @action
  updateGroupProperties = () => {
    let update = {group: this.mainSvc.group,
                  strideLength: this.mainSvc.strideLength,
                  type: this.mainSvc.defaultTrekType,
                  weight: this.mainSvc.weight,
                  packWeight: this.mainSvc.packWeight};
    this.trekSvc.updateGroupProperties(this.newTrek, update);
  }

  // set the value for the saveDialogOpen property
  setSaveDialogOpen = (status: boolean) => {
    this.logState.saveDialogOpen = status;
  }

  // set the value for the cancelDialogOpen property
  setCancelDialogOpen = (status: boolean) => {
    this.logState.cancelDialogOpen = status;
  }
  
  @action
  setTimeLimit = (value: number) => {
    this.logState.timeLimit = value;
  }

  setTimeLimitInfo = (info: {value: number, units: string}) => {
    this.setTimeLimit(info.value);
    this.logState.units = info.units;
  }

  @action
  setDistLimit = (value: number) => {
    this.logState.distLimit = value;
  }

  setDistLimitInfo = (info: {value: number, units: string}) => {
    this.setDistLimit(info.value);
    this.logState.units = info.units;
  }

  // set packWeight from the info object (convert to kilos if nec)
  setPackWeightInfo = (info: {value: number, units ?: string}) => {
    this.trekSvc.setPackWeight(this.newTrek, info.value);
  }

  // return the type of limit on the trek in progress. return undefined if no limit.
  trekLimitType = () :string => {
    if (this.logState.distLimit !== 0) { return 'Dist'; }
    if (this.logState.timeLimit !== 0) { return 'Time'; }
    return undefined;
  }

  @action 
  setLimitsActive = (status: boolean) => {
    this.logState.limitsActive = status;
  }

  // stop time limit timer
  stopLimitTimer = () => {
    window.clearInterval(this.logState.limitTimerId);
  };

  // set the value of the showMap property
  @action
  setShowMapInLog = (status: boolean) => {
    this.logState.showMapInLog = status;
  }

  // set the value of the allowImageDisplay property
  @action
  setAllowImageDisplay = (status: boolean) => {
    this.logState.allowImageDisplay = status;
  }
  
  // set the value of the currentDisplayImageSet property
  @action
  setCurrentDisplayImageSet = (index: number) => {
    if (this.trekSvc.getTrekImageSetCount(this.newTrek) > index){
      this.logState.currentDisplayImageSet = index;
    }
  }

  startPositionTracking = (gotPos: Function) => {
    // Get the current GPS position
    this.mainSvc.setWaitingForSomething("Location");
    this.locationSvc.getCurrentLocation(
      (location: Location) => {
        this.mainSvc.setWaitingForSomething();
        gotPos(location);
        this.watchGeolocationPosition(gotPos, true);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  };

  // Start the geolocation service
  watchGeolocationPosition = (gotPos: Function, startFresh: boolean) => {
    this.locationSvc.removeGeolocationListeners(); // clear existing callbacks

    // Start watching position, use an appropriate distance filter value
    // set distanceFilter limit in meters
    this.mainSvc.setMinPointDist(
      this.logState.limitsActive
        ? MIN_POINT_DISTS_LIMITED[this.newTrek.type]
        : STATIONARY_DIST_FILTER_VALUE
    );
    this.locationSvc.startGeoLocation(gotPos, startFresh, {
      distanceFilter: this.mainSvc.minPointDist,
      stopOnTerminate: false
    });
  };

  // Set the starting date for the trek.
  // Format date to dd/mm/yy.
  @action
  setDate = () => {
    this.trekSvc.setDate(this.newTrek, new Date().toLocaleDateString());
  };

  // Set the starting date and time for the trek.
  // Format time to hh:mm AM/PM
  @action
  setStartTime = () => {
    this.setDate();
    this.trekSvc.setStartTime(this.newTrek, this.utilsSvc.formatTime());
    this.trekSvc.setSortDate(this.newTrek, 
                             this.utilsSvc.formatSortDate(this.newTrek.date, this.newTrek.startTime));
    this.logState.startMS = new Date().getTime(); // get time in milliseconds
  };

  // Indicate no end time
  @action
  clearEndTime = () => {
    this.trekSvc.setEndTime(this.newTrek, '');
  };

  // set the value of the trekPointCount property
  @action
  setTrekPointCount = () => {
    this.logState.trekPointCount = this.trekSvc.pointListLength(this.newTrek);
  }

  // set the value of the startMS property
  @action
  setStartMS = (ms: number) => {
    this.logState.startMS = ms;
  }

  @action
  setLayoutOpts = (val: string) => {
    switch (val) {
      case "hybrid":
      case "terrain":
      case "standard":
        this.mainSvc.setDefaultMapType(val);
        break;
      default:
        this.mainSvc.layoutOpts = val;
    }
  };

  // Start the duration (seconds) timer and the current speed updater (actually for all calculatedValues)
  // Normally, we want the current speed to be calculated just after receiving a data point.
  // But, if we're stopped, that may never come (at least not for a while) so we update to show we're stopped.
  @action
  startTrekTimer = () => {
    this.setTimerOn(true); // indicate that the duration timer is on
    this.logState.calculatedValuesTimer = CALC_VALUES_INTERVAL; // set to compute currentSpeed, etc. every so often
    this.logState.trekTimerId = window.setInterval(() => {
      if (!this.logState.trekTimerPaused) {
        if (--this.logState.calculatedValuesTimer === 0) {
          // calculatedValues have not been updated recently, user must be stopped
          this.trekSvc.updateCalculatedValues(this.newTrek, this.logState.timerOn, true);
          this.logState.calculatedValuesTimer = CALC_VALUES_INTERVAL;
          // make sure distance filter is at minimum since we're starting
          if (this.mainSvc.minPointDist !== 1) {
            this.mainSvc.setMinPointDist(1);
            this.locationSvc.updateGeolocationConfig({
              distanceFilter: this.mainSvc.minPointDist
            });
          }
        }
        this.updateDuration();
      }
    }, 1000);
  };

  // Set the value of the timerOn property
  @action
  setTimerOn = (status: boolean) => {
    this.logState.timerOn = status;
  }

  // set the value of the trekTimerPaused property
  setTrekTimerPaused = (status: boolean) => {
    this.logState.trekTimerPaused = status;
  }

  // Set the saved status of the trek to the given value
  @action
  updateTrekSaved = (status: boolean) => {
    this.logState.trekSaved = status;
  }

  // Stop the duration timer
  stopTrekTimer = () => {
    this.trekSvc.updateCalculatedValues(this.newTrek, this.logState.timerOn, true);
    if (this.logState.timerOn) {
      window.clearInterval(this.logState.trekTimerId);
      this.setTimerOn(false);
    }
  };

  // Reset the trek duration to time since start or to the given number of milliseconds
  updateDuration = (value?: number) => {
    let now = new Date().getTime();
    if (value !== undefined) {
      this.setStartMS(now - value);
    }
    this.trekSvc.setDuration(this.newTrek, Math.round((now - this.logState.startMS) / 1000));
  };

  // a point has been seen, start a timer to denote stationary status
  resetZeroSpeedTimer = (speed: number) => {
    if(speed !== 0 || this.moving){
      if (!this.moving){
        this.moving = true;
        // alert("moving again")
      }
      this.cancelZeroSpeedTimer();
      this.zeroSpeedTimerId = window.setTimeout(() => {
          this.moving = false;
          // alert("not moving")
          this.mainSvc.currSpeedRange = 99;
          this.mainSvc.setMinPointDist(STATIONARY_DIST_FILTER_VALUE);
          this.locationSvc.updateGeolocationConfig({
            distanceFilter: STATIONARY_DIST_FILTER_VALUE
          });
      }, STOPPED_TIME_MS);
    }
  }

  // a non-zero speed point has been seen, cancel timer (if necessary)
  cancelZeroSpeedTimer = () => {
    if(this.zeroSpeedTimerId !== undefined) {
      window.clearTimeout(this.zeroSpeedTimerId);
      this.zeroSpeedTimerId = undefined;
    }
  }

  // Add a point with the given location to the pointList. Update the trek distance and smooth the path
  // every so often.
  // Return TRUE if point added
  @action
  addPoint = (pos: Location): boolean => {
    let added = false;
    let badPt = false;
    let newFirstPt = false;

    if(this.logState.logging){
      badPt = newFirstPt = false;
      if (this.newTrek.totalGpsPoints === 0) {
        // start Trek timer after recieving first GPS reading
        this.startTrekTimer();
        this.setStartTime();
        this.setTrekTimerPaused(true);
      }
      this.newTrek.totalGpsPoints++;
      if (pos.speed === undefined || pos.speed === null) {
        //sometimes the speed property is undefined (why? I don't know)
        if (!this.trekSvc.pointListEmpty(this.newTrek)) {
          pos.speed = this.newTrek.pointList[this.logState.trekPointCount - 1].s; // use prior point speed
        } else {
          pos.speed = 0;
        }
      }
      let newPt = {
        l: { a: pos.latitude, o: pos.longitude },
        t: Math.round((pos.time - this.logState.startMS) / 1000),
        s: this.utilsSvc.fourSigDigits(pos.speed),
        d: 0
      };
      let tpc = this.logState.trekPointCount;
      let lastPt = tpc > 0 ? this.newTrek.pointList[tpc - 1] : undefined;
        // check for point unbelievably far from last pt (check for high implied speed)
      if (tpc === 1){
        newFirstPt = this.utilsSvc.computeImpliedSpeed(newPt, lastPt) > Math.max(lastPt.s , newPt.s); 
      } else {
        // if not, check for point unbelievably far from last pt (check for high implied speed)
        badPt = lastPt && 
              this.utilsSvc.computeImpliedSpeed(newPt, lastPt) > Math.max(newPt.s, lastPt.s) * 3;
      }
        
      // leave out bad points
      if (newFirstPt || !badPt) {
  
        if (!newFirstPt) {
          this.logState.pointsSinceSmooth++;
          let newDist = this.newPointDist(newPt.l.a, newPt.l.o);
          this.newTrek.pointList.push(newPt);
          this.setTrekPointCount();
          if (this.logState.trekPointCount === 2) {

            // trek is officially under way
            this.setTrekTimerPaused(false);
            this.updateDuration();
            if(this.logState.trackingCourse){
              // need to establish tracking object
              this.setTrackingObj(this.logState.trackingCourse, newPt.t, 
                                  this.logState.trackingMethod, this.logState.trackingValue)
              .then(() => {
                this.startTrackingMarker(this.logState.trackingObj);
                this.logState.trackingCourse = undefined;
                this.setLayoutOpts('All');
                this.mainSvc.setSpeedDialZoomedIn(false);
              })      
              .catch((err) => alert(err))          
            }
          }
          this.newTrek.drivingACar =
            this.newTrek.drivingACar || this.newTrek.type === TREK_TYPE_DRIVE 
                              || newPt.s / MPH_TO_MPS > DRIVING_A_CAR_SPEED;
          this.trekSvc.updateSpeedNow(this.newTrek, this.logState.timerOn);
          if (!this.logState.limitsActive) {
            this.resetZeroSpeedTimer(newPt.s);
            // don't change distance filter if limited trek
            let range = this.utilsSvc.findRangeIndex(newPt.s, SPEED_RANGES_MPS);
            if (range !== -1 && range !== this.mainSvc.currSpeedRange) {
              // update the distance filter  and activity interval to reflect the new speed range
              this.mainSvc.currSpeedRange = range;
              this.mainSvc.minPointDist = DIST_FILTER_VALUES[range];
              this.locationSvc.updateGeolocationConfig({
                distanceFilter: this.mainSvc.minPointDist,
                activitiesInterval: ACTIVITY_INTERVAL_VALUES[range]
              });
            }
          }
          if (this.logState.pointsSinceSmooth >= SMOOTH_INTERVAL) {
            this.smoothTrek();
            this.trekSvc.updateCalculatedValues(this.newTrek, this.logState.timerOn, true);
          } else {
            this.trekSvc.updateDist(this.newTrek, newDist);
            this.trekSvc.updateAverageSpeed(this.newTrek);
          }
          this.logState.calculatedValuesTimer = CALC_VALUES_INTERVAL;
          added = true;
        } 
        else {
          // if(newFirstPt){
            newPt.t = 0;
            this.newTrek.pointList[0] = this.utilsSvc.copyObj(newPt); // replace first point with new pt
            this.setStartTime();
            this.setTrekPointCount();
          // } 
          // else {        // update location of last point
          //   let endPt = this.logState.trekPointCount- 1;
          //   this.newTrek.pointList[endPt].l.a = newPt.l.a;
          //   this.newTrek.pointList[endPt].l.o = newPt.l.o; 
          // }
        }
      }
    }
    return added;
  };

  // Calculate distance (meters) between given point (lat,long) and the 'compareIndex' point in the given list.
  getPointDist = (
    lat: number,
    lng: number,
    list: TrekPoint[],
    compareIndex: number
  ) => {
    let n = list.length;
    if (n === 0 || n <= compareIndex) {
      return 0;
    }
    return this.utilsSvc.calcDist(
      list[compareIndex].l.a,
      list[compareIndex].l.o,
      lat,
      lng
    );
  };

  // check the distance from the given point to the last point added to the trek
  newPointDist = (lat: number, lng: number) => {
    let n = this.newTrek.pointList.length;
    if (n === 0) {
      return 0;
    }
    return this.utilsSvc.calcDist(
      this.newTrek.pointList[n - 1].l.a,
      this.newTrek.pointList[n - 1].l.o,
      lat,
      lng
    );
  };

  // Compute the distance between the points in the given list at the given 2 indicies.
  segmentDist = (list: TrekPoint[], first: number, last: number): number => {
    let dist = 0;

    for (let i = first + 1; i <= last; i++) {
      dist += this.getPointDist(list[i].l.a, list[i].l.o, list, i - 1);
    }
    return dist;
  };

  // Compute the total distance of the trek.
  totalDist = () => {
    let numPts = this.logState.trekPointCount;
    this.clearDist();
    if (numPts > 0) {
      this.utilsSvc.setPointDistances(this.newTrek.pointList);
      this.trekSvc.updateDist(this.newTrek, this.newTrek.pointList[numPts - 1].d);
    }
  };

  // Reset the trek distance
  clearDist = () => {
    this.trekSvc.setTrekDist(this.newTrek, 0);
  };

  // Add the distance between the 2 given points to the trek distance
  addPointDist = (p1: LaLo, p2: LaLo) => {
    this.trekSvc.updateDist(this.newTrek, this.utilsSvc.calcDist(p1.a, p1.o, p2.a, p2.o));
  };

  // set the pointList of the trek object and the trekPointCount
  updatePointList = (list: TrekPoint[]) => {
    this.trekSvc.setPointList(this.newTrek, list);
    this.setTrekPointCount();
  }

  // Reduce the amount of zig-zag in the point path (every so often)
  @action
  smoothTrek = (k = KINK_FACTOR) => {
    this.updatePointList(this.smooth(this.newTrek.pointList, k, MIN_SIG_SPEED[this.newTrek.type]));
    this.logState.pointsSinceSmooth = 0; 
    this.totalDist();
  };

  /* Stack-based Douglas Peucker line simplification routine 
   returned is a reduced google.maps.LatLng array 
   After code by  Dr. Gary J. Robinson,
   Environmental Systems Science Centre,
   University of Reading, Reading, UK
  */

  smooth = (source: TrekPoint[], kink: number, minSigSpeed: number) => {
    /* source[] Input coordinates in google.maps.LatLngs    */
    /* kink in metres, kinks above this depth are kept  */
    /* kink depth is the height of the triangle abc where a-b and b-c are two consecutive line segments */
    let n_source, n_stack, n_dest, start, end, i, sig;
    let dev_sqr, max_dev_sqr, band_sqr;
    let x12, y12, d12, x13, y13, d13, x23, y23, d23;
    let F = (Math.PI / 180.0) * 0.5;
    let index = []; /* aray of indexes of source points to include in the reduced line */
    let sig_start = []; /* indices of start & end of working section */
    let sig_end = [];
    let sDiff = 0;
    let sigSpeed = -1;

    /* check for simple cases */

    if (source.length < 3) return source.slice(); /* one or two points */

    /* more complex case. initialize stack */

    n_source = source.length;
    band_sqr =
      (kink * 360.0) / (2.0 * Math.PI * 6378137.0); /* Now in degrees */
    band_sqr *= band_sqr;
    n_dest = 0;
    sig_start[0] = 0;
    sig_end[0] = n_source - 1;
    n_stack = 1;

    /* while the stack is not empty  ... */
    while (n_stack > 0) {
      /* ... pop the top-most entries off the stacks */

      start = sig_start[--n_stack];
      end = sig_end[n_stack];

      if (end - start > 1) {
        /* any intermediate points ? */

        /* ... yes, so find most deviant intermediate point to
                         either side of line joining start & end points */

        x12 = source[end].l.o - source[start].l.o;
        y12 = source[end].l.a - source[start].l.a;
        if (Math.abs(x12) > 180.0) x12 = 360.0 - Math.abs(x12);
        x12 *= Math.cos(
          F * (source[end].l.a + source[start].l.a)
        ); /* use avg lat to reduce lng */
        d12 = x12 * x12 + y12 * y12;
        sigSpeed = -1;

        for (i = start + 1, sig = start, max_dev_sqr = -1.0; i < end; i++) {
          x13 = source[i].l.o - source[start].l.o;
          y13 = source[i].l.a - source[start].l.a;
          if (Math.abs(x13) > 180.0) x13 = 360.0 - Math.abs(x13);
          x13 *= Math.cos(F * (source[i].l.a + source[start].l.a));
          d13 = x13 * x13 + y13 * y13;

          x23 = source[i].l.o - source[end].l.o;
          y23 = source[i].l.a - source[end].l.a;
          if (Math.abs(x23) > 180.0) x23 = 360.0 - Math.abs(x23);
          x23 *= Math.cos(F * (source[i].l.a + source[end].l.a));
          d23 = x23 * x23 + y23 * y23;

          if (d13 >= d12 + d23) dev_sqr = d23;
          else if (d23 >= d12 + d13) dev_sqr = d13;
          else
            dev_sqr = ((x13 * y12 - y13 * x12) * (x13 * y12 - y13 * x12)) / d12; // solve triangle

          // see if we have a new max deviant point
          if (dev_sqr > max_dev_sqr) {
            sig = i;
            max_dev_sqr = dev_sqr;
          }
          // keep points that deviate in speed significantly
          if (sigSpeed === -1) {
            if (source[i].s > minSigSpeed) {
              sDiff = Math.abs(source[i].s - source[start].s);
              if (sDiff > source[start].s * 0.25) {
                sigSpeed = i;
              }
            }
          }
        }

        if (max_dev_sqr < band_sqr && sigSpeed === -1) {
          /* is there a significantly deviant intermediate point ? */
          /* ... no, so transfer current start point */
          index[n_dest++] = start;
        } else {
          /* ... yes, so push two sub-sections on stack for further processing */
          if (max_dev_sqr >= band_sqr) {
            // prefer point deviant by distance
            sig_start[n_stack] = sig;
            sig_end[n_stack++] = end;
            sig_start[n_stack] = start;
            sig_end[n_stack++] = sig;
          } else {
            // otherwise, save point deviant by speed
            sig_start[n_stack] = sigSpeed;
            sig_end[n_stack++] = end;
            sig_start[n_stack] = start;
            sig_end[n_stack++] = sigSpeed;
          }
        }
      } else {
        /* ... no intermediate points, so transfer current start point */
        index[n_dest++] = start;
      }
    }

    /* transfer last point */
    index[n_dest++] = n_source - 1;

    /* make return array */
    let r = [];
    for (let i = 0; i < n_dest; i++) r.push(source[index[i]]);
    return r;
  };

  // return true if the trekLabelForm is open
  labelFormIsOpen = (): boolean => {
    return this.modalSvc.labelFormOpen;
  };

  // open the trek label form
  openLabelForm = () => {
    this.modalSvc.setLabelFormOpen(true);
    this.mainSvc.setTrekLabelFormOpen(true);
  };

  // close the trek label form
  closeLabelForm = () => {
    this.modalSvc.setLabelFormOpen(false);
    this.mainSvc.setTrekLabelFormOpen(false);
  };

  // Let the user edit the trek label and notes
  editTrekLabel = (trek: TrekInfo, newTrek = false, focusField?: string) => {
    return new Promise((resolve, reject) => {
      this.mainSvc.setTrekLabelFormOpen(true);
      this.modalSvc
        .openLabelForm({
          heading: trek.type + " Description",
          label: trek.trekLabel,
          notes: trek.trekNotes,
          headingIcon: "NoteText",
          okText: "SAVE",
          cancelText: newTrek ? "SKIP" : "CANCEL",
          focus: focusField
        })
        .then((resp: any) => {
          this.mainSvc.setTrekLabelFormOpen(false);
          this.trekSvc.setTrekLabel(trek, resp.label);
          this.trekSvc.setTrekNotes(trek, resp.notes);
          if (!newTrek) {
            this.mainSvc
              .saveTrek(trek)
              .then(() => {
                this.toastSvc.toastOpen({
                  tType: "Success",
                  content: "Description updated."
                });
                resolve("OK");
              })
              .catch(() => {
                this.toastSvc.toastOpen({
                  tType: "Error",
                  content: "Error updating description."
                });
                reject("ERROR");
              });
          } else {
            resolve("OK");
          }
        })
        .catch(() => {
          // CANCEL, DO NOTHING
          this.mainSvc.setTrekLabelFormOpen(false);
          reject("CANCEL");
        });
    });
  }

  // return a point in the given path that occurrs at the given time/distance in the trek
  getPointAtLimit = (points: TrekPoint[], limit: number, 
                     max: number, type: string, getPath = false, lastIndex = 0) : PointAtLimitInfo => {
    let accum = 0, dAccum = 0, tAccum = 0;
    let val = 0;
    let timeLimit = type === TREK_LIMIT_TYPE_TIME;    
    const nPts = points.length;
    let t : number, d : number, part : number, newP : LaLo;
    let path : TrekPoint[] = [];
    let lastPt : TrekPoint;
    
    if(limit > max) { limit = max; }
    if (points.length > 0) {
      if(getPath) { path.push(points[0]); }
      for(let i=lastIndex + 1; i < nPts; i++){
        val = timeLimit ? points[i].t : points[i].d;
        if (val >= limit) {                  // will this point complete the limit?
          dAccum = points[i-1].d;
          tAccum = points[i-1].t;
          accum = timeLimit ?  tAccum : dAccum;
          t = points[i].t - tAccum;            // duration of this segment
          d = points[i].d - dAccum;            // distance of this segment
          val = timeLimit ? t : d;
          part = (limit - accum) / val;              // what % of the value for this segment do we need?
          dAccum += part * d;
          tAccum += part * t;
          let newPTime = Math.round(tAccum);
          let newPDist = this.utilsSvc.fourSigDigits(dAccum);

          // now get a point that is 'part' % into the distance/time between these 2 points
          newP = this.utilsSvc.pointWithinSegment(points[i-1].l, points[i].l, part);
          if(!isFinite(newP.a) || val < 0){ 
            // bit of bad data (0 dist segment or 0 time segment?)
            alert('bad data ' + val + ' | ' + newP.a )
            return undefined;
          }
          lastPt = {l: newP, t: newPTime, s: points[i-1].s, d: newPDist};
          if(getPath) { path.push(lastPt); }
          return {pt: lastPt, dist: dAccum, time: tAccum, index: i-1, path: getPath ? path : undefined};
        }
        else {
          if(getPath) { path.push(points[i]); }
        }
      }
      let pt = points[nPts-1];
      return { pt: pt, dist: pt.d, time: pt.t, index: nPts-2, path: getPath ? path : undefined};
    }
    return undefined;
  }

  // clear the trackingObj and trackingMarkerLocation
  clearTrackingObj = () => { 
    this.setTrackingMarkerLocation(undefined);
    this.logState.trackingObj = undefined;   
  }

  // update selected values of the trackingObj
  updateTrackingObj = (updates: any) => {
    this.logState.trackingObj = {...this.logState.trackingObj, ...updates};
  }

  // set the value of the trackingMarkerLocation property
  @action
  setTrackingMarkerLocation = (loc?: TrekPoint) => { 
    this.logState.trackingMarkerLocation = loc;
  }

  // set the value of the trackingDiffTime property
  @action
  setTrackingDiffTime = (diff: number) => { 
    this.logState.trackingDiffTime = diff;
    this.logState.trackingDiffTimeStr = diff !== undefined ? this.utilsSvc.timeFromSeconds(Math.abs(diff)) : '';
  }

  // set the value of the trackingDiffDist property
  @action
  setTrackingDiffDist = (diff: number) => { 
    this.logState.trackingDiffDist = diff;
    this.logState.trackingDiffDistStr = diff !== undefined ? 
                                                  this.mainSvc.formattedDist(Math.abs(diff)) : '';
  }

  @action
  setTrackingValue = (value: number) => {
    this.logState.trackingValue = value;
  }

  @action
  setTrackingMethod = (value: CourseTrackingMethod) => {
    this.logState.trackingMethod = value;
  }

  @action
  setTrackingValueInfo = (info: {value: number, method: CourseTrackingMethod}) => {
    this.setTrackingValue(info.value);
    this.setTrackingMethod(info.method);
  }

  // clear properties related to course tracking
  @action
  clearTrackingItems = () => {
    this.logState.trackingCourse = undefined;
    this.clearTrackingObj();
    this.setTrackingDiffDist(undefined);
    this.setTrackingDiffTime(undefined);
  }

  // setup the trackingObj from the given trek, trackingMethod and trackingValue
  // set values to work with a timer duration of 1000ms.
  // add one to start time since the timer must tick once before display begins
  setTrackingObj = (course: Course, startTime: number, trackingMethod: CourseTrackingMethod,
                      trackingValue: number) => {
    return new Promise<any>((resolve, reject) => {

      let pList : TrekPoint[];
      this.courseSvc.getTrackingPath(course, trackingMethod)
      .then((result) => {
        pList = result.list;
        let params = this.courseSvc.getTrackingParams(course, trackingMethod, trackingValue, result.trek);

        this.logState.trackingObj = {
          courseName: course.name,
          method: trackingMethod,
          goalValue: trackingValue,
          goalTime: this.utilsSvc.timeFromSeconds(trackingValue),
          pointList: pList,
          lastIndex1: 0,
          lastIndex2: 0,
          path: this.utilsSvc.cvtPointListToLatLng(pList),
          markerLocation: pList[0],
          markerValue: 0,
          duration: params.dur,
          distance: params.tDist,
          maxValue: params.maxV,
          initialValue: (startTime + 1) * params.inc,
          incrementValue: params.inc,
          timerId: undefined,
          timerInterval: 1000,
          startTime: 0,
          challengeTitle: 'Challenge ' + course.name,
          header:  this.courseSvc.formatTrackingHeader(trackingMethod, trackingValue),
          timeDiff: 0,
          distDiff: 0,
          type: params.type
        };
        this.setTrackingMarkerLocation(pList[0])
        resolve(RESP_OK);
      })
      .catch((err) => reject(err))
    })
  }

  // reset the tracking marker timer (recovering from a reset)
  restartTrackingMarker = (tObj: TrackingObject) => {
    setTimeout(() => {
      this.stopTrackingTimer(tObj);
      if(tObj.markerValue < tObj.maxValue){

          // adjust the marker value to account for the elapsed time since lastUpdate
        let elapsedTics = (new Date().getTime() - tObj.startTime) / tObj.timerInterval;
        let startValue  = tObj.initialValue + (elapsedTics * tObj.incrementValue);
        this.startTrackingMarker(tObj, tObj.startTime, startValue);
      } else {

        // don't restart timer, just display the differentials
        this.setTrackingDiffDist(tObj.distDiff);
        this.setTrackingDiffTime(tObj.timeDiff);
        this.setTrackingMarkerLocation(tObj.markerLocation);
      }      
    }, 2000);
  }

  // start a timer and update a trackingMarker position from a list of points (path)
  startTrackingMarker = (tObj: TrackingObject, start?: number, startValue?: number) => {
    let ptInfo : PointAtLimitInfo;
    let elapsedTics: number;

    tObj.startTime = start || new Date().getTime();
    tObj.markerValue = startValue || tObj.initialValue;
    elapsedTics = (new Date().getTime() - tObj.startTime) / tObj.timerInterval;

    // get initial tracking marker position
    ptInfo = this.getPointAtLimit(tObj.pointList, 
                                  tObj.markerValue, tObj.maxValue, tObj.type);

    // start the tacking interval timer
    tObj.timerId = window.setInterval(() => {
      if (ptInfo !== undefined){
        tObj.lastIndex1 = ptInfo.index; // note segment index in pointlist where position was found
        this.computeCourseTrackingInfo(tObj, ptInfo);

        // if final tracking marker position has not been displayed, prepare the new markerValue
        if(tObj.markerValue <= tObj.maxValue){
          tObj.markerLocation = ptInfo.pt;

          // Since this kind of timer doesn't run in the background, compute tic count using getTime
          elapsedTics = (new Date().getTime() - tObj.startTime) / tObj.timerInterval;
          tObj.markerValue = tObj.initialValue + (elapsedTics * tObj.incrementValue);
          ptInfo = this.getPointAtLimit(tObj.pointList, tObj.markerValue, 
                                        tObj.maxValue, tObj.type, false, tObj.lastIndex1);
        }
      }
    }, tObj.timerInterval)
  }

  // stop the trackingMarker timer
  stopTrackingTimer = (tObj: TrackingObject) => {
    if(tObj !== undefined) {
      window.clearInterval(tObj.timerId);
      tObj.timerId = undefined;
    }
  }

  @action
  // use action decorator here to consolidate updates of the 3 observable values.
  // this makes a big difference in performance.
  
  // compute the time and distance differential for the current Course Challenge
  // given are a trackingObject and a PointAtLimitInfo object for the current tracking marker location
  // Distance differential is distForTrek - distAtTrackingMarker
  // Time differential is the time the tracking marker was/will be at 
  // the currentTrekDistance - currentTrekDuration
  // Keep a copy of these values in the trackingObj to use in recovery scenario
  computeCourseTrackingInfo = (tObj: TrackingObject, ptInfo: PointAtLimitInfo ) => {
    let timeAtTrekDist : number;

    if(tObj.markerValue <= tObj.maxValue){
      this.setTrackingMarkerLocation(ptInfo.pt);
    }
    // the following will stop changing the dist difference if the course is finishes first
    // since ptInfo will stop changing
    if(this.newTrek.pointList.length){
      // let trekDistAtTime = this.getPointAtLimit(this.trekInfo.pointList, ptInfo.time, 
      //                                             this.trekInfo.duration, TREK_LIMIT_TYPE_TIME).dist;
      // tObj.distDiff = trekDistAtTime - ptInfo.dist;    // negative if trek is behind, positive if ahead
      tObj.distDiff = this.newTrek.trekDist - ptInfo.dist;    // negative if trek is behind, positive if ahead
      this.setTrackingDiffDist(tObj.distDiff);
    }

    if (tObj.method === 'courseTime' || tObj.method === 'bestTime' || tObj.method === 'lastTime') {
      // locate when the course was/will be at a distance equal to that of the trek
      let tatdInfo = this.getPointAtLimit(tObj.pointList, this.newTrek.trekDist, 
                                      tObj.distance, TREK_LIMIT_TYPE_DIST, false, tObj.lastIndex2);
      timeAtTrekDist = tatdInfo.time;
      tObj.lastIndex2 = tatdInfo.index;
    } else {
      // compute when the course was/will be at a distance equal to that of the trek
      timeAtTrekDist = this.newTrek.trekDist / tObj.incrementValue;
    }
    tObj.timeDiff = timeAtTrekDist - this.newTrek.duration;  // negative if trek is behind, positive if ahead
    this.setTrackingDiffTime(tObj.timeDiff);
  }

  // find the elevation range for the given list of ElevationData items
  getElevationRange = (list : ElevationData[]) => {
    return this.utilsSvc.getNumericRange(list);
  }

  // return the starting (First) or current (Last) altitude for the Trek
  // TODO: save elevation range with trek to avoid computing every time
  formattedTrekElevation = (elevations: ElevationData[], item: string) : string => {
    let result;

    if (elevations !== undefined && elevations.length) {
      switch(item) {
        case 'First':
          result = elevations[0];
          break;
        case 'Last':
          result = elevations[elevations.length-1];
          break;
        case 'Max':
          result = this.getElevationRange(elevations).max;
          break;
        case 'Min':
          result = this.getElevationRange(elevations).min;
          break;
        default:
      }
    }
    return this.mainSvc.formattedElevation(result)
  }  

  formattedElevationGainPct = (elevGain: number, dist: number) => {
    let egPct = dist === 0 ? 0 : (elevGain / dist);
    return Math.round((egPct) * 100).toString() + ' %';
  }



}
