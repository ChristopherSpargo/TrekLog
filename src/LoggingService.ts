import { action } from "mobx";
import { Location } from "@mauron85/react-native-background-geolocation";

import {
  TrekInfo,
  CALC_VALUES_INTERVAL,
  LaLo,
  TrekPoint,
  TrackingObject,
  TREK_TYPE_DRIVE,
  RESP_OK,
} from "./TrekInfoModel";
import { UtilsSvc, MPH_TO_MPS, DRIVING_A_CAR_SPEED } from "./UtilsService";
import { Course, CourseSvc} from './CourseService';
import { CourseTrackingMethod } from './TrackingMethodComponent';
import { LocationSvc } from "./LocationService";
import { ModalModel } from "./ModalModel";
import { ToastModel } from "./ToastModel";

const SPEED_RANGES_MPS = [
  2 * MPH_TO_MPS,
  4 * MPH_TO_MPS,
  8 * MPH_TO_MPS,
  16 * MPH_TO_MPS,
  32 * MPH_TO_MPS,
  64 * MPH_TO_MPS
];
const DIST_FILTER_VALUES = [2, 4, 8, 12, 20, 40, 64];
export const SMOOTH_INTERVAL = 12; // smooth route and recompute distance every so many points
export const MIN_SIG_SPEED = {
  Walk: 0.2235,
  Run: 0.447,
  Bike: 1.341,
  Hike: 0.2235,
  Board: .447,
  Drive: 1.341
}; // used to smooth based on type
export const KINK_FACTOR = 1.7; // min height (meters) of "kinks" in the route (think triangle height)
export const MIN_POINT_DIST_LIMITED_WALK = 1; // minimum relevant when walking limited
export const MIN_POINT_DIST_LIMITED_RUN = 1; // minimum relevant distance when running limited
export const MIN_POINT_DIST_LIMITED_BIKE = 3; // minimum relevant distance when biking limited
export const MIN_POINT_DIST_LIMITED_HIKE = 1; // minimum relevant distance when hiking limited
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

export const TREK_LIMIT_TYPE_TIME = 'Time';
export const TREK_LIMIT_TYPE_DIST = 'Dist';
export type TrekLimitType = 'Time' | 'Dist';

export interface PointAtLimitInfo {
  pt: TrekPoint,
  dist: number,
  time: number,
  index: number,
  path?: TrekPoint[]
}

export class LoggingSvc {

  pointsSinceSmooth = 0;

  constructor(
    private utilsSvc: UtilsSvc,
    private trekInfo: TrekInfo,
    private locationSvc: LocationSvc,
    private courseSvc: CourseSvc,
    private modalSvc: ModalModel,
    private toastSvc: ToastModel
  ) {}

  // Start a new Trek logging process
  startTrek = () => {
    this.resetTrek();
    this.trekInfo.setLogging(true);
  };

  // reset properties related to the logging process
  resetTrek = () => {
    this.trekInfo.setTrekTimerPaused(false);
    this.trekInfo.updateTrekSaved(false);
    this.pointsSinceSmooth = 0;
    this.trekInfo.totalGpsPoints = 0;
    this.trekInfo.trekImages = undefined;
    this.trekInfo.setTrekImageCount(0);
    this.trekInfo.hills = "Unknown";
    this.trekInfo.drivingACar = false;
    this.trekInfo.haveShownDriving = false;
    this.trekInfo.setTrekLabel("");
    this.trekInfo.setTrekNotes("");
  };

  stopTrek = () => {
    this.stopTrackingTimer(this.trekInfo.trackingObj);
    this.stopTrekTimer();
    this.trekInfo.setLogging(false);
    let limit = this.trekInfo.trekLimitType();
    if ( limit ) {            // is this a limited trek?
      switch(limit){
        case TREK_LIMIT_TYPE_TIME:
          this.stopLimitTimer();
          if (this.trekInfo.limitTrekDone) {
            // only do if user finished the time
            this.trekInfo.setPointList( 
              this.utilsSvc.truncateTrekPath(this.trekInfo.pointList, this.trekInfo.timeLimit, limit));
          }
          break;
        case TREK_LIMIT_TYPE_DIST:
          this.trekInfo.setPointList( 
          this.utilsSvc.truncateTrekPath(this.trekInfo.pointList, this.trekInfo.distLimit, limit));
          break;
        default:
      }
    } 
    if (this.trekInfo.lastPoint() !== undefined){
      this.updateDuration(this.trekInfo.lastPoint().t * 1000);
    }
    this.setEndTime();
    this.smoothTrek();
    this.trekInfo.updateCalculatedValues(true);
  }
  // stop time limit timer
  stopLimitTimer = () => {
    window.clearInterval(this.trekInfo.limitTimerId);
  };

  startPositionTracking = (gotPos: Function) => {
    // Get the current GPS position
    this.trekInfo.setWaitingForSomething("Location");
    this.locationSvc.getCurrentLocation(
      (location: Location) => {
        this.trekInfo.setWaitingForSomething();
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
    this.trekInfo.setMinPointDist(
      this.trekInfo.limitsActive
        ? MIN_POINT_DISTS_LIMITED[this.trekInfo.type]
        : 1
    );
    this.locationSvc.startGeoLocation(gotPos, startFresh, {
      distanceFilter: this.trekInfo.minPointDist,
      stopOnTerminate: false
    });
  };

  // Set the starting date for the trek.
  // Format date to dd/mm/yy.
  @action
  setDate = () => {
    this.trekInfo.date = new Date().toLocaleDateString();
  };

  // Set the starting date and time for the trek.
  // Format time to hh:mm AM/PM
  @action
  setStartTime = () => {
    this.setDate();
    this.trekInfo.startTime = this.utilsSvc.formatTime();
    this.trekInfo.sortDate = this.utilsSvc.formatSortDate(
      this.trekInfo.date,
      this.trekInfo.startTime
    );
    this.trekInfo.startMS = new Date().getTime(); // get time in milliseconds
  };

  // Set the ending time for the trek.  Format time to hh:mm AM/PM
  @action
  setEndTime = () => {
    this.trekInfo.endTime = this.utilsSvc.formatTime(
      this.trekInfo.startMS + this.trekInfo.duration * 1000
    );
  };

  // Indicate no end time
  @action
  clearEndTime = () => {
    this.trekInfo.endTime = "";
  };

  @action
  setLayoutOpts = (val: string) => {
    switch (val) {
      case "hybrid":
      case "terrain":
      case "standard":
        this.trekInfo.setDefaultMapType(val);
        break;
      default:
        this.trekInfo.layoutOpts = val;
    }
  };

  // Start the duration (seconds) timer and the current speed updater (actually for all calculatedValues)
  // Normally, we want the current speed to be calculated just after receiving a data point.
  // But, if we're stopped, that may never come (at least not for a while) so we update to show we're stopped.
  @action
  startTrekTimer = () => {
    this.trekInfo.setTimerOn(true); // indicate that the duration timer is on
    this.trekInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL; // set to compute currentSpeed, etc. every so often
    this.trekInfo.trekTimerId = window.setInterval(() => {
      if (!this.trekInfo.trekTimerPaused) {
        if (--this.trekInfo.calculatedValuesTimer === 0) {
          // calculatedValues have not been updated recently, user must be stopped
          this.trekInfo.updateCalculatedValues(true);
          this.trekInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL;
          // make sure distance filter is at minimum since we're stopped
          if (this.trekInfo.minPointDist !== 1) {
            this.trekInfo.setMinPointDist(1);
            this.locationSvc.updateGeolocationConfig({
              distanceFilter: this.trekInfo.minPointDist
            });
          }
        }
        this.updateDuration();
      }
    }, 1000);
  };

  // Stop the duration timer
  stopTrekTimer = () => {
    this.trekInfo.updateCalculatedValues(true);
    if (this.trekInfo.timerOn) {
      window.clearInterval(this.trekInfo.trekTimerId);
      this.trekInfo.setTimerOn(false);
    }
  };

  // Reset the trek duration to time since start or to the given number of milliseconds
  updateDuration = (value?: number) => {
    let now = new Date().getTime();
    if (value !== undefined) {
      this.trekInfo.setStartMS(now - value);
    }
    this.trekInfo.setDuration(Math.round((now - this.trekInfo.startMS) / 1000));
  };

  // Add a point with the given location to the pointList. Update the trek distance and smooth the path
  // every so often.
  // Return TRUE if point added
  @action
  addPoint = (pos: Location): boolean => {
    let added = false;
    let tInfo = this.trekInfo;

    if(tInfo.logging){
      if (tInfo.totalGpsPoints === 0) {
        // start Trek timer after recieving first GPS reading
        this.startTrekTimer();
        this.setStartTime();
        tInfo.setTrekTimerPaused(true);
      }
      tInfo.totalGpsPoints++;
      if (pos.speed === undefined || pos.speed === null) {
        //sometimes the speed property is undefined (why? I don't know)
        if (!tInfo.pointListEmpty()) {
          pos.speed = tInfo.pointList[tInfo.trekPointCount - 1].s; // use prior point speed
        } else {
          pos.speed = 0;
        }
      }
      let newPt = {
        l: { a: pos.latitude, o: pos.longitude },
        t: Math.round((pos.time - tInfo.startMS) / 1000),
        s: this.utilsSvc.fourSigDigits(pos.speed)
      };
      let lastPt = tInfo.trekPointCount ? tInfo.pointList[tInfo.trekPointCount - 1] : undefined;
        // check for point unbelievably far from last pt (check for high implied speed)
      let badPt = false;
        // lastPt && (newPt.s > 0) &&
        // this.utilsSvc.computeImpliedSpeed(newPt, lastPt) > newPt.s * 5;

      let secondZero = newPt.s === 0 && (lastPt && lastPt.s === 0);

      let newFirstPt = tInfo.trekPointCount === 1 && (badPt || secondZero)
      // leave out bad points and multiple 0-speed points
      if (newFirstPt || !(badPt || secondZero)) {
  
        if (!newFirstPt) {
          this.pointsSinceSmooth++;
          let newDist = this.newPointDist(newPt.l.a, newPt.l.o);
          tInfo.pointList.push(newPt);
          tInfo.setTrekPointCount();
          if (tInfo.trekPointCount === 2) {

            // trek is officially under way
            tInfo.setTrekTimerPaused(false);
            this.updateDuration();
            if(this.trekInfo.trackingCourse){
              // need to establish tracking object
              this.setTrackingObj(this.trekInfo.trackingCourse, newPt.t,
                                           this.trekInfo.trackingMethod, this.trekInfo.trackingValue)
              .then(() => {
                this.startTrackingMarker(this.trekInfo.trackingObj);
                this.trekInfo.trackingCourse = undefined;
                this.setLayoutOpts('All');
                this.trekInfo.setSpeedDialZoomedIn(false);
              })      
              .catch((err) => alert(err))          
            }
          }
          tInfo.drivingACar =
            tInfo.drivingACar || tInfo.type === TREK_TYPE_DRIVE 
                              || newPt.s / MPH_TO_MPS > DRIVING_A_CAR_SPEED;
          tInfo.updateSpeedNow();
          if (!tInfo.limitsActive) {
            // don't change distance filter if limited trek
            let range = this.utilsSvc.findRangeIndex(newPt.s, SPEED_RANGES_MPS);
            if (range !== -1 && range !== tInfo.currSpeedRange) {
              // update the distance filter to reflect the new speed range
              tInfo.currSpeedRange = range;
              tInfo.minPointDist = DIST_FILTER_VALUES[range];
              this.locationSvc.updateGeolocationConfig({
                distanceFilter: tInfo.minPointDist
              });
            }
          }
          if (this.pointsSinceSmooth >= SMOOTH_INTERVAL) {
            this.smoothTrek();
            tInfo.updateCalculatedValues(true);
          } else {
            this.updateDist(newDist);
            tInfo.updateAverageSpeed();
          }
          tInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL;
          added = true;
        } else {
          newPt.t = 0;
          tInfo.pointList[0] = newPt; // replace 0-speed first point with new 0-speed pt
          this.setStartTime();
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
    let n = this.trekInfo.pointList.length;
    if (n === 0) {
      return 0;
    }
    return this.utilsSvc.calcDist(
      this.trekInfo.pointList[n - 1].l.a,
      this.trekInfo.pointList[n - 1].l.o,
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
    let numPts = this.trekInfo.trekPointCount;
    this.clearDist();
    if (numPts > 0) {
      this.utilsSvc.setPointDistances(this.trekInfo.pointList);
      this.updateDist(this.trekInfo.pointList[numPts - 1].d);
    }
  };

  // Reset the trek distance
  clearDist = () => {
    this.setTrekDist(0);
  };

  // Add the distance between the 2 given points to the trek distance
  addPointDist = (p1: LaLo, p2: LaLo) => {
    this.updateDist(this.utilsSvc.calcDist(p1.a, p1.o, p2.a, p2.o));
  };

  // Add the given value to the trek distance.
  // Set the distance property of the ending point in the trek's pointList
  updateDist = (dist: number) => {
    this.setTrekDist(this.trekInfo.trekDist + dist);
    this.trekInfo.pointList[this.trekInfo.pointList.length - 1].d = this.trekInfo.trekDist;
  };

  // set the value of the trekDist property
  @action
  setTrekDist = (dist: number) => {
    this.trekInfo.trekDist = this.utilsSvc.fourSigDigits(dist);
  };

  // Reduce the amount of zig-zag in the point path (every so often)
  @action
  smoothTrek = (k = KINK_FACTOR) => {
    this.trekInfo.setPointList(
      this.smooth(this.trekInfo.pointList, k, MIN_SIG_SPEED[this.trekInfo.type])
    );
    this.pointsSinceSmooth = 0;
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
    this.trekInfo.setTrekLabelFormOpen(true);
  };

  // close the trek label form
  closeLabelForm = () => {
    this.modalSvc.setLabelFormOpen(false);
    this.trekInfo.setTrekLabelFormOpen(false);
  };

  // Let the user edit the trek label and notes
  editTrekLabel = (newTrek = false, focusField?: string) => {
    return new Promise((resolve, reject) => {
      this.trekInfo.setTrekLabelFormOpen(true);
      this.modalSvc
        .openLabelForm({
          heading: this.trekInfo.type + " Description",
          label: this.trekInfo.trekLabel,
          notes: this.trekInfo.trekNotes,
          headingIcon: "NoteText",
          okText: "SAVE",
          cancelText: newTrek ? "SKIP" : "CANCEL",
          focus: focusField
        })
        .then((resp: any) => {
          this.trekInfo.setTrekLabelFormOpen(false);
          this.trekInfo.setTrekLabel(resp.label);
          this.trekInfo.setTrekNotes(resp.notes);
          if (!newTrek) {
            this.trekInfo
              .saveTrek(this.trekInfo.getSaveObj())
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
          this.trekInfo.setTrekLabelFormOpen(false);
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
    alert('no points' + '\n' + limit + '\n' + max + '\n' + type )
    return undefined;
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

        this.trekInfo.trackingObj = {
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
        this.trekInfo.setTrackingMarkerLocation(pList[0])
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
        this.trekInfo.setTrackingDiffDist(tObj.distDiff);
        this.trekInfo.setTrackingDiffTime(tObj.timeDiff);
        this.trekInfo.setTrackingMarkerLocation(tObj.markerLocation);
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
    ptInfo = this.getPointAtLimit(tObj.pointList, 
                                  tObj.markerValue, tObj.maxValue, tObj.type);

    tObj.timerId = window.setInterval(() => {
      if (ptInfo !== undefined){
        tObj.lastIndex1 = ptInfo.index;
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
      this.trekInfo.setTrackingMarkerLocation(ptInfo.pt);
    }
    // the following will stop changing the dist difference if the course is finishes first
    // since ptInfo will stop changing
    if(this.trekInfo.pointList.length){
      // let trekDistAtTime = this.getPointAtLimit(this.trekInfo.pointList, ptInfo.time, 
      //                                             this.trekInfo.duration, TREK_LIMIT_TYPE_TIME).dist;
      // tObj.distDiff = trekDistAtTime - ptInfo.dist;    // negative if trek is behind, positive if ahead
      tObj.distDiff = this.trekInfo.trekDist - ptInfo.dist;    // negative if trek is behind, positive if ahead
      this.trekInfo.setTrackingDiffDist(tObj.distDiff);
    }

    if (tObj.method === 'courseTime' || tObj.method === 'bestTime' || tObj.method === 'lastTime') {
      // locate when the course was/will be at a distance equal to that of the trek
      let tatdInfo = this.getPointAtLimit(tObj.pointList, this.trekInfo.trekDist, 
                                      tObj.distance, TREK_LIMIT_TYPE_DIST, false, tObj.lastIndex2);
      timeAtTrekDist = tatdInfo.time;
      tObj.lastIndex2 = tatdInfo.index;
    } else {
      // compute when the course was/will be at a distance equal to that of the trek
      timeAtTrekDist = this.trekInfo.trekDist / tObj.incrementValue;
    }
    tObj.timeDiff = timeAtTrekDist - this.trekInfo.duration;  // negative if trek is behind, positive if ahead
    this.trekInfo.setTrackingDiffTime(tObj.timeDiff);
  }

}
