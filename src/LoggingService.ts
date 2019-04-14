import { action } from 'mobx';
import { Location } from 'react-native-mauron85-background-geolocation';

import { TrekInfo, CALC_VALUES_INTERVAL, LaLo, TrekPoint} from './TrekInfoModel'
import { UtilsSvc, MPH_TO_MPS, DRIVING_A_CAR_SPEED } from './UtilsService';
import { LocationSvc } from './LocationService';
import { ModalModel } from './ModalModel';
import { ToastModel } from './ToastModel';

const SPEED_RANGES_MPS = [0, 1 * MPH_TO_MPS, 2 * MPH_TO_MPS, 4 * MPH_TO_MPS, 8 * MPH_TO_MPS, 
      16 * MPH_TO_MPS, 32 * MPH_TO_MPS, 64 * MPH_TO_MPS, 128 * MPH_TO_MPS, 256 * MPH_TO_MPS,
      512 * MPH_TO_MPS, 1024 * MPH_TO_MPS];
const DIST_FILTER_VALUES = [1, 1, 1, 2, 2, 4, 8, 16, 32, 64, 256];
export const SMOOTH_INTERVAL = 6;         // smooth route and compute distance every so many points
export const MIN_SIG_SPEED = 
      {Walk: .2235, Run: .4470, Bike: 1.341, Hike: .2235};  // used to smooth based on type
export const KINK_FACTOR = 1.7;           // min height (meters) of "kinks" in the route (think triangle height)
export const MIN_POINT_DIST_LIMITED_WALK  =  1;  // minimum relevant when walking limited
export const MIN_POINT_DIST_LIMITED_RUN   =  1;  // minimum relevant distance when running limited
export const MIN_POINT_DIST_LIMITED_BIKE  =  3;  // minimum relevant distance when biking limited
export const MIN_POINT_DIST_LIMITED_HIKE  =  1;    // minimum relevant distance when hiking limited
export const MIN_POINT_DISTS_LIMITED = {
  'Walk':  MIN_POINT_DIST_LIMITED_WALK,   
  'Bike':  MIN_POINT_DIST_LIMITED_BIKE,
  'Run':   MIN_POINT_DIST_LIMITED_RUN,
  'Hike':  MIN_POINT_DIST_LIMITED_HIKE
}

export class LoggingSvc {

  pointsSinceSmooth = 0;

  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo, private locationSvc: LocationSvc,
                private modalSvc: ModalModel, private toastSvc: ToastModel ) {
  }

  // Start a new Trek logging process
  startTrek = () => {
    this.resetTrek();
    this.trekInfo.setLogging(true);
  }

  // reset properties related to the logging process
  resetTrek = () => {
    this.trekInfo.updateTrekSaved(false);
    this.pointsSinceSmooth = 0;
    this.trekInfo.totalGpsPoints = 0;
    this.trekInfo.trekImages = undefined;
    this.trekInfo.setTrekImageCount(0);
    this.trekInfo.hills = 'Unknown';
    this.trekInfo.drivingACar = false;
    this.trekInfo.haveShownDriving = false;
  }

  stopTrek = () => {
    this.stopTrekTimer();
    this.trekInfo.setLogging(false);
    this.setEndTime();
    if (this.trekInfo.timeLimit) {
      this.stopLimitTimer();
      if (this.trekInfo.limitTrekDone) {               // only do next statement if user finished the time
        this.updateDuration(this.trekInfo.timeLimit)
      }
    }
    this.smoothTrek();
    this.trekInfo.updateCalculatedValues(true);
  }

  // stop time limit timer
  stopLimitTimer = () => {
    window.clearInterval(this.trekInfo.limitTimerId);     
  }

  startPositionTracking = (gotPos: Function) => {
    // Get the current GPS position
        this.locationSvc.getCurrentLocation((location : Location) => {    
        this.addPoint(location);
        this.watchGeolocationPosition(gotPos, true);
      },
      { enableHighAccuracy: true, 
        maximumAge        : 0, 
        timeout           : 30000
      }
    );
  }


  // Start the geolocation service
  watchGeolocationPosition = (gotPos: Function, startFresh: boolean) => {
    this.locationSvc.removeGeolocationListeners();  // clear existing callbacks

    // Start watching position, use an appropriate distance filter value
    // set distanceFilter limit in meters
    this.trekInfo.setMinPointDist(this.trekInfo.limitsActive ? MIN_POINT_DISTS_LIMITED[this.trekInfo.type] : 1);
    this.locationSvc.startGeoLocation(gotPos, startFresh, 
                    { distanceFilter: this.trekInfo.minPointDist, stopOnTerminate: false });
  }

  // Set the starting date for the trek. 
  // Format date to dd/mm/yy.
  @action
  setDate = () => {
    this.trekInfo.date = (new Date).toLocaleDateString();
  }

  // Set the starting date and time for the trek. 
  // Format time to hh:mm AM/PM
  @action
  setStartTime = () => {
    this.setDate();
    this.trekInfo.startTime = this.utilsSvc.formatTime();
    this.trekInfo.sortDate = this.utilsSvc.formatSortDate(this.trekInfo.date, this.trekInfo.startTime);
    this.trekInfo.startMS = new Date().getTime();    // get time in milliseconds
  }

  // Set the ending time for the trek.  Format time to hh:mm AM/PM
  @action
  setEndTime = () => {
    this.trekInfo.endTime = this.utilsSvc.formatTime();
  }

  // Indicate no end time
  @action
  clearEndTime = () => {
    this.trekInfo.endTime = '';
  }

  @action
  setLayoutOpts = (val: string, update = true) => {
    this.trekInfo.setUpdateMap(update);
    switch(val){
      case 'hybrid':
      case 'terrain':
      case 'standard':
        this.trekInfo.setDefaultMapType(val);
        break;
      default:
        this.trekInfo.layoutOpts = val;
    }
  }

  // Start the duration (seconds) timer and the current speed updater (actually for all calculatedValues)
  // Normally, we want the current speed to be calculated just after receiving a data point.
  // But, if we're stopped, that may never come (at least not for a while) so we update to show we're stopped.
  @action
  startTrekTimer = () => {
    this.trekInfo.setTimerOn(true);                        // indicate that the duration timer is on
    this.trekInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL;  // set to compute currentSpeed, etc. every so often
    this.trekInfo.trekTimerId = window.setInterval(() => {
      if(--this.trekInfo.calculatedValuesTimer === 0) {
        // calculatedValues have not been updated recently, user must be stopped
        this.trekInfo.updateCalculatedValues(true);
        this.trekInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL;          
      }
      this.updateDuration();
    }, 1000);
  }

  // Stop the duration timer
  stopTrekTimer = () => {
    this.trekInfo.updateCalculatedValues(true);
    if (this.trekInfo.timerOn){
      window.clearInterval(this.trekInfo.trekTimerId);
      this.trekInfo.setTimerOn(false);
    }
  }

  // Reset the trek duration to time since start or to the given number of milliseconds
  updateDuration = (value?: number) => {
    let now = new Date().getTime();
    if (value !== undefined) {
      this.trekInfo.setStartMS(now - value);
    }
    this.trekInfo.setDuration(Math.round((now - this.trekInfo.startMS) / 1000));
  }

  // Add a point with the given location to the pointList. Update the trek distance and smooth the path
  // every so often.
  // Return TRUE if point added
  @action
  addPoint = (pos: Location) : boolean => {
    let added = false;
    if (this.trekInfo.totalGpsPoints === 0) {  // start Trek timer after recieving first GPS reading
      this.startTrekTimer();
      this.setStartTime();
    }
    this.trekInfo.totalGpsPoints++;
    if (this.trekInfo.endTime === '') { this.updateDuration(); }
    let newPt = {l:{a: pos.latitude, o: pos.longitude}, 
                    t: Math.round((pos.time - this.trekInfo.startMS) / 1000), s: pos.speed};
    if(newPt.s === undefined){  //sometimes the speed property is undefined (why? I don't know)
      if(!this.trekInfo.pointListEmpty()){ 
        newPt.s = this.trekInfo.pointList[this.trekInfo.pointList.length - 1].s; // use prior point speed
      }
      else {
        newPt.s = 0;
      }
    }
    // discard all but 1 0-speed points at beginning of trek (gps honing in)
    if(this.trekInfo.trekPointCount !== 1 || newPt.s !== 0 || this.trekInfo.pointList[0].s !== 0){
      this.pointsSinceSmooth++;
      let newDist = this.newPointDist(pos.latitude, pos.longitude);
      this.trekInfo.pointList.push(newPt);
      this.trekInfo.setTrekPointCount();
      this.trekInfo.drivingACar = this.trekInfo.drivingACar || (newPt.s/MPH_TO_MPS) > DRIVING_A_CAR_SPEED;
      this.trekInfo.updateSpeedNow();
      if (!this.trekInfo.limitsActive){  // don't change distance filter if limited trek
        let range = this.utilsSvc.findRangeIndex(pos.speed, SPEED_RANGES_MPS);
        if ((range !== -1) && (range != this.trekInfo.currSpeedRange)) {
          // update the distance filter to reflect the new speed range
          this.trekInfo.currSpeedRange = range;
          this.trekInfo.minPointDist = DIST_FILTER_VALUES[range];
          this.locationSvc.updateGeolocationConfig({distanceFilter: this.trekInfo.minPointDist});
        }
      }
      if (this.pointsSinceSmooth >= SMOOTH_INTERVAL) {
        this.smoothTrek();
        this.trekInfo.updateCalculatedValues();
      }
      else {
        this.updateDist(newDist);
      } 
      this.trekInfo.calculatedValuesTimer = CALC_VALUES_INTERVAL;
      added = true;
    }
    else {
      this.trekInfo.pointList[0] = newPt; // replace 0-speed point with new 0-speed pt
    }
    return added;
  }

  // Calculate distance (meters) between given point (lat,long) and the 'compareIndex' point in the given list.
  getPointDist = (lat: number, lng: number, list: TrekPoint[], compareIndex: number) => {
    let n = list.length;
    if (n === 0 || n <= compareIndex){
      return 0;
    }
    return (this.utilsSvc.calcDist(list[compareIndex].l.a, list[compareIndex].l.o, lat, lng));
  }

  // check the distance from the given point to the last point added to the trek
  newPointDist = (lat: number, lng: number,) => { 
    let n = this.trekInfo.trekPointCount;
    if (n === 0) {return 0;}
    return (this.utilsSvc.calcDist(this.trekInfo.pointList[n-1].l.a, this.trekInfo.pointList[n-1].l.o, lat, lng));
}

  // Compute the distance between the points in the given list at the given 2 indicies. 
  segmentDist = (list: TrekPoint[], first: number, last: number) : number => {
    let dist = 0;

    for(let i = first+1; i <= last; i++){
      dist += this.getPointDist(list[i].l.a, list[i].l.o, list, i-1);
    }
    return dist;
  }

  // Compute the total distance of the trek.  
  totalDist = () => {
    this.clearDist();
    if (this.trekInfo.trekPointCount > 1){
      this.updateDist(this.segmentDist(this.trekInfo.pointList, 0, this.trekInfo.trekPointCount - 1));      
    }
  }

  // Reset the trek distance
  clearDist = () => {
    this.setTrekDist(0);
  }

  // Add the distance between the 2 given points to the trek distance
  addPointDist = (p1: LaLo, p2: LaLo) => {
    this.updateDist(this.utilsSvc.calcDist(p1.a, p1.o, p2.a, p2.o));
  }

  // Add the given value to the trek distance.
  // Change the display units from meters or feet to kilometers or miles if the distance gets large
  updateDist = (dist: number) => {
    this.setTrekDist(this.trekInfo.trekDist + dist);
  }

  // set the value of the trekDist property
  @action
  setTrekDist = (dist: number) => {
    this.trekInfo.trekDist = dist;
  }

  // Reduce the amount of zig-zag in the point path (every so often)
  @action
  smoothTrek = () => {
    this.trekInfo.setPointList(this.smooth(this.trekInfo.pointList, KINK_FACTOR, 
                  MIN_SIG_SPEED[this.trekInfo.type]));
    this.pointsSinceSmooth = 0;
    this.totalDist();
  }

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
      var n_source, n_stack, n_dest, start, end, i, sig;    
      var dev_sqr, max_dev_sqr, band_sqr;
      var x12, y12, d12, x13, y13, d13, x23, y23, d23;
      var F = ((Math.PI / 180.0) * 0.5 );
      var index = []; /* aray of indexes of source points to include in the reduced line */
      var sig_start = []; /* indices of start & end of working section */
      var sig_end = [];  
      var sDiff = 0;
      var sigSpeed = -1;
  
      /* check for simple cases */
  
      if ( source.length < 3 ) 
          return(source.slice());    /* one or two points */
  
      /* more complex case. initialize stack */
  
      n_source = source.length;
      band_sqr = kink * 360.0 / (2.0 * Math.PI * 6378137.0);  /* Now in degrees */
      band_sqr *= band_sqr;
      n_dest = 0;
      sig_start[0] = 0;
      sig_end[0] = n_source-1;
      n_stack = 1;
  
      /* while the stack is not empty  ... */
      while ( n_stack > 0 ){
  
          /* ... pop the top-most entries off the stacks */
  
          start = sig_start[--n_stack];
          end = sig_end[n_stack];
  
          if ( (end - start) > 1 ){  /* any intermediate points ? */        
  
                  /* ... yes, so find most deviant intermediate point to
                         either side of line joining start & end points */                                   
  
              x12 = (source[end].l.o - source[start].l.o);
              y12 = (source[end].l.a - source[start].l.a);
              if (Math.abs(x12) > 180.0) 
                  x12 = 360.0 - Math.abs(x12);
              x12 *= Math.cos(F * (source[end].l.a + source[start].l.a));/* use avg lat to reduce lng */
              d12 = (x12*x12) + (y12*y12);
              sigSpeed = -1;
  
              for ( i = start + 1, sig = start, max_dev_sqr = -1.0; i < end; i++ ){                                    
  
                  x13 = (source[i].l.o - source[start].l.o);
                  y13 = (source[i].l.a - source[start].l.a);
                  if (Math.abs(x13) > 180.0) 
                      x13 = 360.0 - Math.abs(x13);
                  x13 *= Math.cos (F * (source[i].l.a + source[start].l.a));
                  d13 = (x13*x13) + (y13*y13);
  
                  x23 = (source[i].l.o - source[end].l.o);
                  y23 = (source[i].l.a - source[end].l.a);
                  if (Math.abs(x23) > 180.0) 
                      x23 = 360.0 - Math.abs(x23);
                  x23 *= Math.cos(F * (source[i].l.a + source[end].l.a));
                  d23 = (x23*x23) + (y23*y23);
  
                  if ( d13 >= ( d12 + d23 ) )
                      dev_sqr = d23;
                  else if ( d23 >= ( d12 + d13 ) )
                      dev_sqr = d13;
                  else
                      dev_sqr = (x13 * y12 - y13 * x12) * (x13 * y12 - y13 * x12) / d12;// solve triangle
  
                  // see if we have a new max deviant point
                  if ( dev_sqr > max_dev_sqr  ){
                      sig = i;
                      max_dev_sqr = dev_sqr;
                  }
                  // keep points that deviate in speed significantly
                  if (sigSpeed === -1) {
                    if (source[i].s > minSigSpeed) {
                      sDiff = Math.abs(source[i].s - source[start].s);
                      if (sDiff > source[start].s * .25) {
                        sigSpeed = i;
                      }
                    }
                  } 
              }
  
              if ( (max_dev_sqr < band_sqr) && (sigSpeed === -1) ){   /* is there a significantly deviant intermediate point ? */
                  /* ... no, so transfer current start point */
                  index[n_dest++] = start;
              }
              else{
                  /* ... yes, so push two sub-sections on stack for further processing */
                  if (max_dev_sqr >= band_sqr){ // prefer point deviant by distance
                    sig_start[n_stack] = sig;
                    sig_end[n_stack++] = end;
                    sig_start[n_stack] = start;
                    sig_end[n_stack++] = sig;
                  } else {                      // otherwise, save point deviant by speed
                    sig_start[n_stack] = sigSpeed;
                    sig_end[n_stack++] = end;
                    sig_start[n_stack] = start;
                    sig_end[n_stack++] = sigSpeed;
                  }
              }
          }
          else{
                  /* ... no intermediate points, so transfer current start point */
                  index[n_dest++] = start;
          }
      }
  
      /* transfer last point */
      index[n_dest++] = n_source-1;
  
      /* make return array */
      var r = [];
      for(let i=0; i < n_dest; i++)
          r.push(source[index[i]]);
      return r;
  
    }
  
    // return true if the trekLabelForm is open
    labelFormIsOpen = () : boolean => {
      return this.modalSvc.labelFormOpen;
    }

    // open the trek label form
    openLabelForm = () => {
      this.modalSvc.setLabelFormOpen(true);
      this.trekInfo.setTrekLabelFormOpen(true);
    }

    // close the trek label form
    closeLabelForm = () => {
      this.modalSvc.setLabelFormOpen(false);
      this.trekInfo.setTrekLabelFormOpen(false);
    }

    editTrekLabel = (newTrek = false) => {
      // Let the user edit the trek label and notes
      return new Promise((resolve, reject) => {
        this.trekInfo.setTrekLabelFormOpen(true);
        this.modalSvc.openLabelForm({heading: this.trekInfo.type + " Description", 
                                      label: this.trekInfo.trekLabel, 
                                      notes: this.trekInfo.trekNotes,
                                      headingIcon: 'NoteText',
                                      cancelText: !newTrek ? 'CANCEL' : undefined,
                                      })
        .then((resp : any) => {
          this.trekInfo.setTrekLabelFormOpen(false);
          this.trekInfo.setTrekLabel(resp.label);
          this.trekInfo.setTrekNotes(resp.notes);
          if (!newTrek){
            this.trekInfo.saveTrek(this.trekInfo.getSaveObj(), 'update')
            .then(() => {
              this.toastSvc.toastOpen({tType: 'Success', content: 'Description updated.'});
              resolve('OK');
            })
            .catch(() => {
              this.toastSvc.toastOpen({tType: 'Error', content: 'Error updating description.'});
              reject('ERROR');
            })
          }
          else {
            resolve('OK');
          }
        })
        .catch(() =>{ // CANCEL, DO NOTHING
          this.trekInfo.setTrekLabelFormOpen(false);
          reject('CANCEL');
        })
      })
    }
  
    
}

