// This component is used to display maps of treks selected in the Review/GoalDetails components.

import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native'
import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';
import { observer, inject } from 'mobx-react';
import IconButton from './IconButtonComponent';
import { NavigationActions } from 'react-navigation';

import TrekDisplay from './TrekDisplayComponent';
import NumbersBar from './NumbersBarComponent'
import { TrekInfo, DIST_UNIT_LONG_NAMES, TrekObj, MapType, TrekPoint } from './TrekInfoModel';
import { SHORT_CONTROLS_HEIGHT, NAV_ICON_SIZE, INVISIBLE_Z_INDEX, INTERVAL_GRAPH_Z_INDEX, HEADER_HEIGHT, 
        } from './App';
import Waiting from './WaitingComponent';
import TrekLimitsForm, {LimitsObj} from './TrekLimitsComponent';
import { M_PER_MILE, UtilsSvc } from './UtilsService';
import { ToastModel } from './ToastModel';
import { FilterSvc } from './FilterService';
import SlideUpView from './SlideUpComponent';
import BarDisplay from './BarDisplayComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { ModalModel } from './ModalModel';
import { IntervalSvc, INTERVALS_UNITS, SAVED_UNITS, RateRangePathsObj, RangeDataType } from './IntervalSvc';
import { LoggingSvc, TREK_LIMIT_TYPE_DIST, PointAtLimitInfo } from './LoggingService';
import { CourseTrackingSnapshot, CourseSvc } from './CourseService';
import IncDecComponent from './IncDecComponent';
export const INTERVAL_AREA_HEIGHT = 115;
export const INTERVAL_GRAPH_HEIGHT = 95;

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'uiTheme', 'toastSvc', 'utilsSvc', 'modalSvc', 
        'filterSvc', 'intervalSvc', 'loggingSvc', 'courseSvc')
@observer
class SelectedTrek extends Component<{
  uiTheme ?: any,
  filterSvc ?: FilterSvc,
  trekInfo ?: TrekInfo,
  toastSvc ?: ToastModel,
  modalSvc ?: ModalModel,
  intervalSvc ?: IntervalSvc,
  loggingSvc ?: LoggingSvc,
  courseSvc ?: CourseSvc,
  utilsSvc ?: UtilsSvc,
  navigation ?: any
}, {} > {

  @observable statsOpen;
  @observable layoutOpts;
  @observable zValue;
  @observable selectedIntervalIndex;
  @observable intervalFormOpen;
  @observable intervalFormDone;
  @observable intervalsActive;
  @observable graphOpen;
  @observable waitingForChange;
  @observable scrollToBar;
  @observable speedDialZoom;
  @observable keyboardOpen;
  @observable openItems;

  @observable rateRangeObj : RateRangePathsObj;

  @observable courseMarker : TrekPoint;
  trackingStatsTime :  number;
  trackingStatsDist :  number;
  trackingTime : number;
  @observable replayTimerStatus : string;
  @observable replayRate : number;


  tInfo = this.props.trekInfo;
  iSvc = this.props.intervalSvc;
  fS = this.props.filterSvc;
  cS = this.props.courseSvc;
  lSvc = this.props.loggingSvc;
  activeNav : string;
  changeTrekFn : Function;
  limitProps : LimitsObj = {} as LimitsObj;
  activeIntervalValue = 0;
  activeIntervalUnits = '';
  currRangeData : RangeDataType = 'speed';

  coursePath : LatLng[];
  snapshotTrekPath : TrekPoint[];

  replayDisplayTime: number;
  replayTimerId;

  keyboardDidShowListener;
  keyboardDidHideListener;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.statsOpen = false;
    this.layoutOpts = "All";
    this.zValue = -1;
    this.selectedIntervalIndex = -1;
    this.intervalFormOpen = false;
    this.intervalFormDone = '';
    this.intervalsActive = false;
    this.graphOpen = false; 
    this.waitingForChange = false;
    this.speedDialZoom = false;
    this.keyboardOpen = false;
    this.setOpenItems(false);
    this.setRateRangeObj(undefined)
    this.setTrackingCoursePath(undefined);
    this.setTrackingShapshotItems(undefined);
    this.setReplayRate(1);
   }

   componentWillMount() {
    this.changeTrekFn = this.props.navigation.getParam('changeTrekFn');
    this.setTrackingCoursePath(this.cS.trackingSnapshot)
    this.setTrackingShapshotItems(this.cS.trackingSnapshot);
    if (this.cS.trackingSnapshot) {
      this.setTrackingTime(this.cS.trackingSnapshot.courseDuration);
      // this.setTrackingTime(Math.min(this.cS.trackingSnapshot.courseDuration, 
      //   this.cS.trackingSnapshot.trekDuration));
    }
    this.setRateRangeObj(this.currRangeData);
   }

   componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
    requestAnimationFrame(() => {
      this.setLayoutOpts('NewAll');
    })
   }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    this.setStatsOpen(false);
    this.setTrackingShapshotItems(undefined);
    this.cS.clearTrackingSnapshot();
  }

  @action
  setKeyboardOpen = (status: boolean) => {
    this.keyboardOpen = status;
  }

  keyboardDidShow = () => {
    this.setKeyboardOpen(true);
  }

  keyboardDidHide = () => {
    this.setKeyboardOpen(false);
  }
  
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  toggleOpenItems = () => {
    this.setOpenItems(!this.openItems);
  }

  // set observable that will cause the bar graph to scroll to a bar
  @action
  setScrollToBar = (barNum: number) => {
    this.scrollToBar = barNum;
  }

  // move the barGraph to the specified bar
  scrollBarGraph = (pos: number) => {
    let oldVal = this.tInfo.updateGraph;

    this.tInfo.setUpdateGraph(true);
    this.setScrollToBar(pos);
    requestAnimationFrame(() => {
      this.tInfo.setUpdateGraph(oldVal);
      this.setScrollToBar(undefined);
    })
  }

  // switch measurement systems then reformat the rateRangeObj
  switchMeasurementSys = () => {
    this.tInfo.switchMeasurementSystem();
    if (this.rateRangeObj){
      this.setRateRangeObj(this.currRangeData)
    }
  }


  // set the rateRangePaths property
  @action
  setRateRangeObj = (type?: RangeDataType) => {
    if(type){
      this.rateRangeObj = this.iSvc.buildRateRangePaths(
        { rangeType: type,
          pointList: this.tInfo.pointList,
          weight: this.tInfo.weight,
          packWeight: this.tInfo.packWeight,
          type: this.tInfo.type,
          hills: this.tInfo.hills
        })
    } else {
      this.rateRangeObj = undefined;
    }
  }

  // Set the snapshotTrekMarker property
  @action
  setCourseMarker = (point: TrekPoint) => {
    this.courseMarker = point;
  }

  @action
  // Set the replayTimerStatus property
  setReplayTimerStatus = (status: string) => {
    this.replayTimerStatus = status;
  }

  // set the replayRate property
  @action
  setReplayRate = (val: number) => {
    this.replayRate = val;
  }

  // increment/decrement the replayRate property
  @action
  updateReplayRate = (change: "inc" | "dec") => {
    if (change === "inc"){
      if(this.replayRate < 10) {
        this.replayRate++;
      }
    } else {
      if(this.replayRate > 1) {
        this.replayRate--;
      }
    }
  }

  // set the trackingStatsTime property
  setTrackingStatsTime = (time: number) => {
    this.trackingStatsTime = time;
  }

  // set the trackingStatsDist property
  setTrackingStatsDist = (dist: number) => {
    this.trackingStatsDist = dist;
  }

  setTrackingTime = (time: number) => {
    this.trackingTime = time;
  }

  // set the background color for the page header then set the mapType
  setMapType = (type: MapType) => {
    this.tInfo.setDefaultMapType(type);
  }

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  }

  setVisible = () => {
    this.setZValue(INTERVAL_GRAPH_Z_INDEX);
  }

  setNotVisible = () => {
    this.setZValue(INVISIBLE_Z_INDEX);
  }

  @action
  setGraphOpen = (val: boolean) => {
    this.graphOpen = val;
  }

  @action
  setLayoutOpts = (val: string, update = true) => {
    this.tInfo.setUpdateMap(update);
    this.layoutOpts = val;
  }
  
  @action
  setStatsOpen = (status: boolean) => {
    this.statsOpen = status;
  }

  @action
  setWaiting = (status: boolean) => {
    this.tInfo.setUpdateMap(false);
    this.waitingForChange = status;
  }

  @action
  setIntervalFormOpen = (status: boolean) => {
    this.intervalFormOpen = status;
  }

  @action
  setIntervalFormDone = (value: string) => {
    this.intervalFormDone = value;
  }

  @action
  setIntervalsActive = (status: boolean) => {
    this.intervalsActive = status;
  }

  toggleRangeData = () => {
    this.currRangeData = this.currRangeData === 'speed' ? 'calories' : 'speed';
    this.setRateRangeObj(this.currRangeData)
  }

  // call the markerToPath function then forceUpdate
  callMarkerToPath = (index: number, pt: LatLng, path: LatLng[]) => {
    this.iSvc.markerToPath(index, pt, path);
    this.forceUpdate();
  }

  // save/delete the current set of intervals with this trek
  saveCurrentIntervals = (del = false) => {
    let t = this.tInfo.getSaveObj();

    if (del) {
      this.props.modalSvc.simpleOpen({heading: 'Delete Intervals', 
            content: "Delete saved intervals?", 
            cancelText: 'CANCEL', okText: 'YES', headingIcon: 'Delete'})
      .then(() => {
        t.intervals = undefined;
        t.intervalDisplayUnits = undefined;
        this.finishIntervalsSave(t, del);
      })
      .catch(() =>{ // CANCEL, DO NOTHING
      })
    } else {
      t.intervals = this.iSvc.intervalData.iDists.slice();
      t.intervalDisplayUnits = this.iSvc.intervalData.displayUnits;
      this.finishIntervalsSave(t, del);
    }
  }

  // finish saving or deleteing the current intervals
  finishIntervalsSave = (t: TrekObj, del : boolean) => {

    this.tInfo.setIntervals(t.intervals);
    this.tInfo.intervalDisplayUnits = t.intervalDisplayUnits;
    this.tInfo.saveTrek(t)
    .then(() => {
      this.props.toastSvc.toastOpen({tType: 'Success', content: 'Intervals ' + (del ? 'deleted.' : 'saved.')});
      this.iSvc.setIntervalChange(false);
      if(del) {
        this.cancelIntervalsActive();
      } 
    })
    .catch(() => {
      this.props.toastSvc.toastOpen({tType: 'Error', content: 'Intervals not ' + (del ? 'deleted.' : 'saved.')});
    })
  }
  // Start displaying the intervals graph or stop displaying it.
  @action
  showIntervals = (start: boolean) => {
    let change = false;
    let saved = false;
    let tempDist;

    this.setIntervalFormDone('')
    if (start) {
      change =  (this.iSvc.lastIntervalValue !== this.iSvc.intervalValue) || (this.iSvc.lastUnits !== this.iSvc.units) ||
                (this.iSvc.intervalData === undefined);
      this.iSvc.lastIntervalValue = this.iSvc.intervalValue;
      this.iSvc.lastUnits = this.iSvc.units;
      switch(this.iSvc.units){
        case 'meters':
          tempDist = this.iSvc.intervalValue;
          break;
        case INTERVALS_UNITS:
          if (this.iSvc.intervalValue > 0) {
            tempDist = (this.tInfo.trekDist / this.iSvc.intervalValue) + (1 / this.iSvc.intervalValue);
          } else {
            this.iSvc.intervalValue = tempDist = 0;
          }
          break;
        case 'miles':
          tempDist = this.iSvc.intervalValue * M_PER_MILE;
          break;
        case 'kilometers':
          tempDist = this.iSvc.intervalValue * 1000;
          break;
        case 'minutes':
          tempDist = this.iSvc.intervalValue * 60;     // convert minutes to seconds
          change = true;
          saved = true;
          break;
        case SAVED_UNITS:
          tempDist = -1;
          this.iSvc.intervalValue = -1;
          change = false;
          saved = true;
          break;
        default:
      }
      if (this.iSvc.intervalDistOK(tempDist)) {
        this.iSvc.intervalDist = tempDist;
        this.setIntervalsActive(true);
        this.setIntervalFormOpen(false);
        this.activeIntervalValue = this.iSvc.intervalValue;
        this.activeIntervalUnits = this.iSvc.units;
        if(change || saved){
          this.iSvc.getIntervalData(this.iSvc.intervalDist, this.tInfo.pointList);
          this.iSvc.buildGraphData(this.iSvc.intervalData)
          this.tInfo.setUpdateMap(true);
          this.setSpeedDialZoom(false);
          this.setSelectedIntervalIndex(0)
          this.setGraphOpen(true);
          this.iSvc.setIntervalChange(change);
          this.setOpenItems(true);
        }
      } else {
        this.props.toastSvc.toastOpen({tType: 'Error', content: 'Interval distance too small.'});
        this.openIntervalForm();
      }
    } else {
      this.cancelIntervalsActive();
    }
  }
  
  // indicate that intervals are not active, close interval graph
  @action
  cancelIntervalsActive = () => {
    if(this.intervalsActive){
      this.setLayoutOpts("All");
      this.setSpeedDialZoom(false);
      this.setGraphOpen(false);
      this.setOpenItems(false)
    }
    this.iSvc.intervalDist = 0;
    this.iSvc.intervalData = undefined;
    this.setIntervalsActive(false);
    this.setIntervalFormOpen(false);
    this.iSvc.setIntervalChange(false);
  }

  // Open the Trek Intervals form using DISTANCE parameters
  openIntervalForm = () => {
    this.tInfo.setUpdateMap(false);
    if(this.intervalsActive || !this.tInfo.intervals) {
      let units = [INTERVALS_UNITS, 'meters', DIST_UNIT_LONG_NAMES[this.tInfo.measurementSystem], 'minutes'];
      this.limitProps = {heading: "Intervals", headingIcon: "RayStartEnd",     
          onChangeFn: this.iSvc.setIntervalValue,    
          label: 'Set interval distance, time or count:', 
          placeholderValue: (this.tInfo.intervals || this.iSvc.lastIntervalValue < 0) ? '0' : this.iSvc.lastIntervalValue.toString(),
          units: units, defaultUnits: units[0], 
          closeFn: this.showIntervals};
      this.setIntervalFormOpen(true);
    }
    else {
      this.iSvc.units = SAVED_UNITS;
      this.iSvc.intervalDist = -1;
      this.showIntervals(true)
    }
  }

  // Set the property that keeps trak of whick Interval is currently in focus
  @action
  setSelectedIntervalIndex = (val: number) => {
    this.tInfo.setUpdateMap(true);
    this.tInfo.setUpdateGraph(true);
    this.selectedIntervalIndex = val;
  }

  // set the value of the speedDialZoom property
  @action
  setSpeedDialZoom = (status: boolean) => {
    this.speedDialZoom = status;
  }
  
  // toggle the value of the speedDialZoom property
  toggleSpeedDialZoom = (val: string, toggle = true) => {
    if (toggle) { this.setSpeedDialZoom(!this.speedDialZoom); }
    this.setLayoutOpts(val);
  }

  // show the images for the selected image marker
  showCurrentImageSet = (index: number) => {
    let title = this.tInfo.formatImageTitle(index, 0);
    this.props.navigation.navigate('Images', {cmd: 'show', setIndex: index, title: title});
  }

  // create a LatLng[] for the tracking course path
  setTrackingCoursePath = (ss: CourseTrackingSnapshot) => {
    if (ss === undefined) {
      this.coursePath = undefined;
    } else {
      this.coursePath = this.props.utilsSvc.cvtPointListToLatLng(ss.coursePath);
    }
  }

  // set items related to course challeng replay from the given snapshot
  @action
  setTrackingShapshotItems = (ss: CourseTrackingSnapshot) => {
    if (ss === undefined) {
      this.setCourseMarker(undefined);
      this.setTrackingStatsDist(undefined)
      this.setTrackingStatsTime(undefined)
      this.snapshotTrekPath = undefined;
      this.trackingTime = undefined;
      this.stopReplayTimer();
    } else {
      let coursePtInfo = this.lSvc.getPointAtLimit(ss.coursePath, ss.coursePos, 
                                                    ss.coursePosMax, ss.coursePosType);
      this.setCourseMarker(coursePtInfo.pt);
      let trekPtInfo = this.lSvc.getPointAtLimit(ss.trekPath, ss.trekPos, 
                                                  ss.trekPosMax, ss.trekPosType, true);
      this.snapshotTrekPath = trekPtInfo.path;

      if (ss.method === 'courseTime') {

        // since coursePos/trekPos are 'Time' in this case, we need to find when each were at a
        // given 'Dist' to compute the time difference.
        // we do this to account for stops during the trek
        if (coursePtInfo.dist < trekPtInfo.dist){       
          // trek is ahead
          if (ss.coursePos < ss.coursePosMax){
            let timeAtDistCourse = this.lSvc.getPointAtLimit(ss.coursePath, 
                                                            trekPtInfo.dist, ss.courseDist, 'Dist').time;
            this.setTrackingStatsTime(timeAtDistCourse - Math.min(ss.trekPos, ss.trekPosMax));
          } else {        
            // but, course has finished. (course dist shorter than trek)
            // show positions when course finished if replay not running, otherwise let trek play out
            let t = this.replayTimerStatus === "None" ? ss.trekPosMax : Math.min(ss.trekPos, ss.trekPosMax);
            this.setTrackingStatsTime(ss.coursePosMax - t);
          }
        } else {                                        
          // trek is behind 
          if (ss.trekPos < ss.trekPosMax){
            let timeAtDistTrek = this.lSvc.getPointAtLimit(ss.trekPath, 
                                                            coursePtInfo.dist, ss.trekDist, 'Dist').time;
            this.setTrackingStatsTime(Math.min(ss.coursePos, ss.coursePosMax) - timeAtDistTrek);
          } else {        
            // but, trek has finished. (trek dist shorter than course)
            // show positions when trek finished if replay not running, otherwise let course play out
            let t = this.replayTimerStatus === "None" ? ss.coursePosMax : Math.min(ss.coursePos, ss.coursePosMax);
            this.setTrackingStatsTime(t - ss.trekPosMax);
          }
        }
      } else {

        // here the course marker is advancing at a selected rate and the time data in the course path
        // isn't being used.  Compute time-at-distance for course by dist/courseInc.
        if (coursePtInfo.dist < trekPtInfo.dist){       // trek is ahead
          let timeAtTrekDist = trekPtInfo.dist / ss.courseInc;
          this.setTrackingStatsTime(timeAtTrekDist - trekPtInfo.time);
        } else {                                        // trek is behind
          let timeAtCourseDist = this.lSvc.getPointAtLimit(ss.trekPath, 
                                                            coursePtInfo.dist, ss.trekDist, 'Dist').time;

          // we don't use coursePtInfo.time here since it reflects the actual time from the data
          // in the course defining path.
          let courseTimeAtDist = coursePtInfo.dist / ss.courseInc;
          this.setTrackingStatsTime(courseTimeAtDist - timeAtCourseDist);
          // alert(coursePtInfo.dist + '\n' + courseTimeAtDist + '\n' + 
          // timeAtCourseDist + '\n' + ss.coursePosType + '\n' +
          //  ss.coursePos + '\n' + ss.courseDuration + '\n' + ss.coursePosMax)
        }
      }
      this.setTrackingStatsDist(trekPtInfo.dist - coursePtInfo.dist)
      ss.lastUpdateTime = new Date().getTime();
    }
  }

  // replay the action of a course tracking trek
  @action
  replayTrackingSequence = () => {
    this.setReplayRate(1);
    this.cS.updateCourseTrackingSnapshot({coursePos: 0, trekPos: 0});
    this.setReplayTimerStatus('Play');
    this.setTrackingShapshotItems(this.cS.trackingSnapshot);
    this.replayDisplayTime = 1;
    this.replayTimerId = window.setInterval(() => {

        if (this.replayTimerStatus === 'Play') {

          // Since this kind of timer doesn't run in the background, compute tic count using getTime
          let elapsedSecs = Math.round((new Date().getTime() - this.cS.trackingSnapshot.lastUpdateTime) / 1000);
          this.replayDisplayTime += elapsedSecs * this.replayRate;
          this.setTrackingTime(this.replayDisplayTime);
          this.cS.updateCourseTrackingSnapshot(
                        {coursePos: this.replayDisplayTime * this.cS.trackingSnapshot.courseInc , 
                         trekPos: this.replayDisplayTime * this.cS.trackingSnapshot.trekInc});
          this.setTrackingShapshotItems(this.cS.trackingSnapshot);
          
          if (this.replayOver(this.cS.trackingSnapshot)) {
            // stop replay timer since we've reached end of replay duration
            this.stopReplayTimer();
          } 
        }
    }, 1000)
  }

  // return true if both of the replay positions is at the end
  replayOver = (ss: CourseTrackingSnapshot) => {
    return ss.coursePos >= ss.coursePosMax && ss.trekPos >= ss.trekPosMax;
  }

  // stop the replay timer
  stopReplayTimer = () => {
    if(this.replayTimerStatus !== 'None'){
      window.clearInterval(this.replayTimerId);
      this.setReplayTimerStatus('None');
    }
  }

  // pause replay
  pauseReplay = () => {
    this.setReplayTimerStatus('Paused');
  }

  // resume replay
  resumeReplay = () => {
    this.cS.trackingSnapshot.lastUpdateTime = new Date().getTime();
    this.setReplayTimerStatus('Play');
  }

  // handle a drag of the trek marker
  trekMarkerMoved = (pt: LatLng) => {
    let ss = this.cS.trackingSnapshot;
    let path = this.props.utilsSvc.cvtPointListToLatLng(ss.trekPath);
    let segPt = this.iSvc.findNearestPoint(pt, path);     // find point on path nearest to drop point
    // now compute the path distance to that point
    let dist = this.lSvc.segmentDist(ss.trekPath, 0, segPt.segIndex);
    dist += this.props.utilsSvc.calcDist(pt.latitude, pt.longitude, 
                                              ss.trekPath[segPt.segIndex].l.a, ss.trekPath[segPt.segIndex].l.o);
    this.repositionReplayPoint(dist, "trek")
  }

  // handle a drag of the course marker
  courseMarkerMoved = (pt: LatLng) => {
    let ss = this.cS.trackingSnapshot;
    let path = this.props.utilsSvc.cvtPointListToLatLng(ss.coursePath);
    let segPt = this.iSvc.findNearestPoint(pt, path);     // find point on path nearest to drop point
    // now compute the path distance to that point
    let dist = this.lSvc.segmentDist(ss.coursePath, 0, segPt.segIndex);
    dist += this.props.utilsSvc.calcDist(pt.latitude, pt.longitude, 
                                          ss.coursePath[segPt.segIndex].l.a, ss.coursePath[segPt.segIndex].l.o);
    this.repositionReplayPoint(dist, "course")
  }

  // reposition the replay process to the point at which the given marker is at the given distance
  repositionReplayPoint = (dist: number, trekOrCourse: "trek" | "course") => {
    let ss = this.cS.trackingSnapshot;
    let coursePtInfo = {} as PointAtLimitInfo;
    let cPos: number, tPos: number;

    switch(trekOrCourse){
      // user dragged the trek marker
      case 'trek':
        // find the time that the trek got to this dist
        let trekPtInfo = this.lSvc.getPointAtLimit(ss.trekPath, dist, ss.trekDist, TREK_LIMIT_TYPE_DIST);
        // alert(JSON.stringify(trekPtInfo,null,2) + '\n' + ss.method)
        tPos = trekPtInfo.time;

        if (ss.coursePosType === TREK_LIMIT_TYPE_DIST) {
          // find the distance to the course marker at this time
          cPos = trekPtInfo.time * ss.courseInc;
        } else {
          cPos = trekPtInfo.time;
        }
        break;
      // user dragged the course marker
      case 'course':
        // find the time that the course got to this dist
        if (ss.coursePosType === TREK_LIMIT_TYPE_DIST) {
          // find the distance to the course marker at this time
          cPos = dist;
          coursePtInfo.time = dist / ss.courseInc;
        } else {
          coursePtInfo = this.lSvc.getPointAtLimit(ss.coursePath, dist, ss.courseDist, TREK_LIMIT_TYPE_DIST);
          cPos = coursePtInfo.time;
        }
        tPos = coursePtInfo.time;
        break;
      default:
    }
    this.replayDisplayTime = tPos;
    this.cS.updateCourseTrackingSnapshot({coursePos: cPos, trekPos: tPos, lastUpdateTime: new Date().getTime()});
    this.setTrackingTime(tPos);
    this.setTrackingShapshotItems(this.cS.trackingSnapshot);
  }

  // respond to touch in navigation bar
  setActiveNav = (val) => {
    if ('PrevNext'.includes(val)) {
      this.setWaiting(true);
    }
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch(val){
        case 'Stats':            // switch between Info' and 'Close' function for this button
          this.tInfo.setUpdateMap(false);
          this.setStatsOpen(!this.statsOpen)
          break;
        case 'Prev':          // move to previous trek in list
        case 'Next':          // move to next trek in list
          let title;
          this.setRateRangeObj();
          title = this.changeTrekFn(val);  // try to change to the Next/Previous trek
          if (title !== '') {
            // change was successful 
            this.setTrackingShapshotItems(undefined);
            this.setTrackingCoursePath(this.cS.trackingSnapshot)
            this.setTrackingShapshotItems(this.cS.trackingSnapshot);
            if(this.cS.trackingSnapshot){
              this.setTrackingTime(this.cS.trackingSnapshot.courseDuration);
              // this.setTrackingTime(Math.min(this.cS.trackingSnapshot.courseDuration, 
              //                               this.cS.trackingSnapshot.trekDuration));
            }
            if (this.intervalsActive) { this.cancelIntervalsActive(); }
            this.props.navigation.setParams({ title: title, icon: this.tInfo.type });
            this.setWaiting(false);
            // set to show full path on map
            this.setSpeedDialZoom(false);
            this.setRateRangeObj(this.currRangeData);
            this.setLayoutOpts("NewAll");    
          }
          else {
            this.setWaiting(false);
          }
          break;
        case 'Intervals':
          this.setStatsOpen(false);
          this.openIntervalForm();
          break;
        case 'IntervalsDelete':
          this.saveCurrentIntervals(true);
          break;
        case 'IntervalsDone':
          this.cancelIntervalsActive();
          break;
        case 'IntervalsSave':
          this.saveCurrentIntervals();
          break;
        case 'IntervalsContinue':
          this.setIntervalFormDone('Close');
          break;
        case 'IntervalsCancel':
          if (this.intervalsActive){
            if((this.iSvc.units !== this.activeIntervalUnits) || (this.iSvc.intervalValue !== this.activeIntervalValue)){
              this.iSvc.units = this.activeIntervalUnits;
              this.iSvc.intervalValue = this.iSvc.units === SAVED_UNITS ? 0 : this.activeIntervalValue;
              this.showIntervals(true);
            } else {
              this.setIntervalFormDone('Keyboard');
              this.setIntervalFormOpen(false);
            }  
          } else {
            this.setIntervalFormDone('Dismiss');
          }
          break;
        case 'calories':
        case 'speed':
          if(this.rateRangeObj){
            this.setRateRangeObj();
          } else {
            this.tInfo.setUpdateMap(true);
            this.setRateRangeObj(val);
          }
          break;
        case 'Play':
          if(this.replayTimerStatus === 'Paused'){
            this.resumeReplay();
          } else {
            this.replayTrackingSequence();
          }
          break;
        case 'Pause':
          this.pauseReplay();
          break;
        default:
      }
    });
  }

  render () {

    const { controlsArea, navItemWithLabel, navItemLabel, navIcon } = this.props.uiTheme;
    const { highTextColor, highlightColor, lowTextColor, matchingMask_7, textOnTheme,
            pageBackground, dividerColor, navIconColor, navItemBorderColor, matchingMask_5,
            trackingStatsBackgroundHeader } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const ints = (this.intervalsActive ) ? this.iSvc.intervalDist : undefined;
    const iMarkers = ints ? this.iSvc.intervalData.markers : undefined;
    const changeZFn = iMarkers ? this.toggleSpeedDialZoom : this.toggleSpeedDialZoom;
    const sdIcon = iMarkers ? (this.speedDialZoom ? "ZoomOut" : "ZoomIn") 
                            : (this.speedDialZoom ? "ZoomOutMap" : "Location");
    const sdValue = iMarkers ? (this.speedDialZoom ? "All" : "Interval")
                             : (this.speedDialZoom ? "All" : "Current");
    const interval = ((iMarkers !== undefined) && this.speedDialZoom) ? this.selectedIntervalIndex : undefined;
    const showButtonHeight = 20;
    const caHt = SHORT_CONTROLS_HEIGHT;
    const graphAndControlsHt = INTERVAL_AREA_HEIGHT + SHORT_CONTROLS_HEIGHT;
    const bottomHeight = (ints && this.graphOpen) ? graphAndControlsHt : 0;
    const prevOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Prev', true) === 'OK');
    const nextOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Next', true) === 'OK');
    const showControls = this.tInfo.showMapControls;
    const showNav = showControls || this.statsOpen;
    const semiTrans = this.tInfo.defaultMapType === 'hybrid' ? matchingMask_7 : matchingMask_5;
    const tracking = this.cS.trackingSnapshot !== undefined;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      caAdjust: {
        height: caHt,
        backgroundColor: showControls ? semiTrans : 'transparent',
      },
      rowLayout1: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      center: {
        justifyContent: "center",
      },
      graphAndControls: {
        backgroundColor: "transparent",
        minHeight: graphAndControlsHt,
        zIndex: this.zValue,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
      },
      graphArea: {
        height: INTERVAL_GRAPH_HEIGHT,
        marginLeft: 0,
        marginRight: 0,
      },
      graph: {
        paddingHorizontal: 2,
      },
      showControls: {
        height: showButtonHeight,
        flexDirection: "row",
        paddingHorizontal: 5,
        paddingTop: 2,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      showButton: {
        flex: 1,
        height: showButtonHeight,
        paddingBottom: 2,
        paddingHorizontal: 0,
        borderBottomWidth: 2,
        borderStyle: "solid",
        borderColor: "transparent",
      },
      showButtonSelected: {
        flex: 1,
        height: showButtonHeight,
        paddingBottom: 3,
        paddingHorizontal: 0,
        borderBottomWidth: 2,
        borderStyle: "solid",
        borderColor: highlightColor,
      },
      detailsIcon: {
        width: 24,
        height: 24,
        backgroundColor: "transparent"
      },
      buttonText: {
        fontSize: 16,
        color: lowTextColor,
      },
      buttonTextSelected: {
        fontSize: 16,
        color: highTextColor,
      },
      button: {
        color: "white",
        fontSize: 16
      },
      navLabelColor: {
        color: highTextColor,
      },
      incDecArea: {
        position: "absolute",
        left: 5,
        top: HEADER_HEIGHT + 75,
        width: 50,
        height: 120,
      }
    })


    return (
      <View style={styles.container}>
        {(showControls || tracking) &&
          <TrekLogHeader titleText={this.props.navigation.getParam('title', '')}
                                    icon={this.props.navigation.getParam('icon', '')}
                                    backgroundColor={tracking ? trackingStatsBackgroundHeader : matchingMask_7}
                                    textColor={textOnTheme}
                                    position="absolute"
                                    backButtonFn={() => this.props.navigation.dispatch(goBack)}
                                    borderBottomColor="transparent"
          />        
        }
        <TrekDisplay 
          pathToCurrent={this.snapshotTrekPath ? this.snapshotTrekPath : this.tInfo.pointList}
          trackingHeader={this.cS.trackingSnapshot ? this.cS.trackingSnapshot.header : undefined}
          trackingMarker={this.courseMarker}
          trackingDiffDist={this.trackingStatsDist}
          trackingDiffTime={this.trackingStatsTime}
          trackingPath={this.coursePath}
          trackingTime={this.trackingTime}
          timerType={this.replayTimerStatus}
          trekMarkerDragFn={this.trekMarkerMoved}
          courseMarkerDragFn={this.courseMarkerMoved}
          layoutOpts={this.layoutOpts} 
          intervalMarkers={iMarkers}
          intervalLabelFn={this.iSvc.intervalLabel}
          selectedInterval={this.selectedIntervalIndex}
          selectedPath={ints ? this.iSvc.intervalData.segPaths[this.selectedIntervalIndex] : undefined}
          selectFn={this.setSelectedIntervalIndex} 
          bottom={bottomHeight} 
          speedDialIcon={sdIcon}
          speedDialValue={sdValue}
          markerDragFn={this.callMarkerToPath}
          mapType={this.tInfo.defaultMapType}
          changeMapFn={this.setMapType}
          changeZoomFn={changeZFn}
          showImagesFn={this.showCurrentImageSet}
          prevFn={prevOk ? (() => this.setActiveNav('Prev')) : undefined}
          nextFn={nextOk ? (() => this.setActiveNav('Next')) : undefined}
          rateRangeObj={this.rateRangeObj}
          toggleRangeDataFn={this.toggleRangeData}
        />
        {(this.replayTimerStatus === 'Play' || this.replayTimerStatus === 'Paused') &&
          <View style={styles.incDecArea}>
            <IncDecComponent
              inVal={this.replayRate.toString()}
              label="x"
              onChangeFn={this.updateReplayRate}
            />
          </View>
        }
        {this.waitingForChange && 
          <Waiting/>
        }
        <View style={styles.graphAndControls}>
          <SlideUpView 
            bgColor={pageBackground}
            startValue={graphAndControlsHt}
            endValue={0}
            open={this.graphOpen}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={{height: graphAndControlsHt, backgroundColor: pageBackground}}>
              <View style={styles.showControls}>
                <IconButton
                  label="DIST"
                  horizontal
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Distance'}
                  style={this.iSvc.show === "Distance" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Distance" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="ELEV"
                  horizontal
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Elevation'}
                  style={this.iSvc.show === "Elevation" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Elevation" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="TIME"
                  horizontal
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Time'}
                  style={this.iSvc.show === "Time" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Time" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="SPEED"
                  horizontal
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Speed'}
                  style={this.iSvc.show === "Speed" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Speed" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="CALS"
                  horizontal
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Calories'}
                  style={this.iSvc.show === "Calories" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Calories" ? styles.buttonTextSelected : styles.buttonText}
                />
              </View>
              <View style={styles.graphArea}>
                <View style={styles.graph}>
                  <BarDisplay 
                        data={this.iSvc.intervalGraphData.items} 
                        dataRange={this.iSvc.intervalGraphData.range}
                        selected={this.selectedIntervalIndex}
                        selectFn={this.setSelectedIntervalIndex} 
                        barWidth={60}
                        openFlag={this.openItems}
                        maxBarHeight={70}
                        style={{height: 95, backgroundColor: "transparent"}}
                        scrollToBar={this.scrollToBar}
                      />
                </View>
              </View>
            </View>
          </SlideUpView>
        </View>
        <NumbersBar 
          bottom={0} 
          open={this.statsOpen}
          interval={interval}
          intervalData={this.iSvc.intervalData}
          format='small'
          sysChangeFn={this.switchMeasurementSys}
        />
        <TrekLimitsForm
          open={this.intervalFormOpen}
          done={this.intervalFormDone}
          limits={this.limitProps}
        />
        {!this.intervalFormOpen &&
          <View style={[controlsArea, styles.caAdjust]}>
            {(ints && this.tInfo.intervals) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="Delete"
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsDelete"
                label="Delete"
                labelStyle={navItemLabel}
              />
            }
            {(ints && this.iSvc.intervalChange) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="CheckMark"
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsSave"
                label="Save"
                labelStyle={navItemLabel}
              />
            }
            {ints &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="Close"
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsDone"
                label="Close"
                labelStyle={navItemLabel}
              />
            }
            {(ints || showNav) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon={ints ? "Edit" : "RayStartEnd"}
                style={navItemWithLabel}
                iconStyle={navIcon}
                borderColor={navItemBorderColor}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="Intervals"
                label={ints ? "Edit" : "Intervals"}
                labelStyle={navItemLabel}
              />
            }
            {(ints || showNav) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon={'Resistor'}
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg={this.currRangeData}
                label="Speed"
                labelStyle={navItemLabel}
              />
            }
            {(ints || showNav) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon={this.statsOpen ? 'ChevronDown' : 'ChevronUp'}
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="Stats"
                label="Stats"
                labelStyle={navItemLabel}
              />
            }
            {((ints || showNav) && this.cS.trackingSnapshot) &&
              <IconButton
                iconSize={NAV_ICON_SIZE}
                icon={this.replayTimerStatus !== "Play" ? "Play" : "Pause"}
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg={this.replayTimerStatus !== "Play" ? "Play" : "Pause"}
                label={this.replayTimerStatus !== "Play" ? "Play" : "Pause"}
                labelStyle={navItemLabel}
              />
            }
          </View>
        }
        {(this.intervalFormOpen) &&
          <View style={[controlsArea, styles.caAdjust]}>
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="ArrowBack"
              style={navItemWithLabel}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsCancel"
              label="Cancel"
              labelStyle={navItemLabel}
          />
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="CheckMark"
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsContinue"
              label="Continue"
              labelStyle={navItemLabel}
            />
          </View>
        }
      </View>
    )   

  }
}

export default SelectedTrek;

