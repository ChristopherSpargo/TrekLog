// This component is used to display maps of treks selected in the Review/GoalDetails components.

import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Keyboard, Dimensions } from 'react-native'
import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';
import { observer, inject } from 'mobx-react';
import IconButton from './IconButtonComponent';
import { NavigationActions, StackActions } from 'react-navigation';

import TrekDisplay, { mapDisplayModeType } from './TrekDisplayComponent';
import NumbersBar from './NumbersBarComponent'
import { TrekInfo, DIST_UNIT_LONG_NAMES, TrekObj, TrekPoint } from './TrekInfoModel';
import { SHORT_CONTROLS_HEIGHT, INVISIBLE_Z_INDEX, INTERVAL_GRAPH_Z_INDEX, 
         HEADER_HEIGHT
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
import { IntervalSvc, INTERVALS_UNITS, SAVED_UNITS, RateRangePathsObj, RangeDataType,
         INTERVAL_AREA_HEIGHT, INTERVAL_GRAPH_HEIGHT } from './IntervalSvc';
import { LoggingSvc, TREK_LIMIT_TYPE_DIST, PointAtLimitInfo } from './LoggingService';
import { CourseTrackingSnapshot, CourseSvc } from './CourseService';
import IncDecComponent from './IncDecComponent';
import HorizontalSlideView from './HorizontalSlideComponent';
import NavMenu from './NavMenuComponent';

const goBack = NavigationActions.back() ;
const INTERVAL_CATS  = ['Distance', 'Time', 'Speed', 'Calories', 'Elevation'];

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
  @observable intervalsActive;
  @observable graphOpen;
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
  @observable mapShapshotFn : Function;
  @observable openNavMenu : boolean;



  tInfo = this.props.trekInfo;
  iSvc = this.props.intervalSvc;
  fS = this.props.filterSvc;
  cS = this.props.courseSvc;
  lSvc = this.props.loggingSvc;
  activeNav : string;
  checkTrekChangeFn : Function;
  changeTrekFn : Function;
  switchSysFn : Function;
  limitProps : LimitsObj = {} as LimitsObj;
  activeIntervalValue = 0;
  activeIntervalUnits = '';
  currRangeData : RangeDataType = 'speed';
  courseSnapshotName : string;
  mapSnapshotPrompt : string;
  courseSnapshotMode : "New" | "Change";
  mapDisplayMode : mapDisplayModeType = "normal";

  coursePath : LatLng[];
  snapshotTrekPath : TrekPoint[];
  snapshotChanged = false;
  intervalCatIndex = 2;           // Speed is the default category when intervals first opened

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
    this.layoutOpts = "NewAll";
    this.zValue = -1;
    this.selectedIntervalIndex = -1;
    this.intervalFormOpen = false;
    this.intervalsActive = false;
    this.graphOpen = false; 
    this.speedDialZoom = false;
    this.keyboardOpen = false;
    this.setOpenItems(false);
    this.setRateRangeObj(undefined)
    this.setTrackingCoursePath(undefined);
    this.setTrackingShapshotItems(undefined);
    this.setReplayRate(1);
    this.setMapSnapshotFn(undefined);
    this.setOpenNavMenu(false);
  }

  componentWillMount() {
    this.changeTrekFn = this.props.navigation.getParam('changeTrekFn');
    this.checkTrekChangeFn = this.props.navigation.getParam('checkTrekChangeFn');
    this.switchSysFn = this.props.navigation.getParam('switchSysFn');
    this.mapDisplayMode = this.props.navigation.getParam('mapDisplayMode', 'normal');
    this.courseSnapshotName = this.props.navigation.getParam('takeSnapshotName');
    this.courseSnapshotMode = this.props.navigation.getParam('takeSnapshotMode');
    // param mapSnapshotPrompt is the prompt displayed when creating or updating a course 
    this.mapSnapshotPrompt = this.props.navigation.getParam('takeSnapshotPrompt');
    this.setTrackingCoursePath(this.cS.trackingSnapshot)
    this.setTrackingShapshotItems(this.cS.trackingSnapshot);
    if (this.cS.trackingSnapshot) {
      this.setTrackingTime(this.cS.trackingSnapshot.courseDuration);
      // this.setTrackingTime(Math.min(this.cS.trackingSnapshot.courseDuration, 
      //   this.cS.trackingSnapshot.trekDuration));
    }
    this.snapshotChanged = false;
    this.setRateRangeObj(this.mapDisplayMode.includes('noSpeeds') ? undefined : this.currRangeData);
    this.iSvc.intervalData = undefined;
    this.setIntervalCatIndex(this.iSvc.show);
  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
    requestAnimationFrame(() => {
      this.setLayoutOpts('NewAll');
      if(this.courseSnapshotName) {
        this.takeCourseMapSnapshot();
      }
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
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  toggleOpenItems = () => {
    this.setOpenItems(!this.openItems);
  }

  // set observable that will cause the bar graph to scroll to the given bar
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

  // switch measurement systems then reformat the rateRangeObj
  switchMeasurementSys = () => {
    this.switchSysFn();
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
  setLayoutOpts = (val: string) => {
    this.layoutOpts = val;
  }
  
  @action
  setStatsOpen = (status: boolean) => {
    this.statsOpen = status;
  }

  // close the stats display  
  closeStats = () => {
    this.setStatsOpen(false);
  }

  setWaiting = (status: boolean) => {
    this.tInfo.setWaitingForSomething(status ? "NoMsg" : undefined);
  }

  @action
  setIntervalFormOpen = (status: boolean) => {
    this.intervalFormOpen = status;
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
    let editAbort = false;
    let tempDist;

    if (!start && this.intervalsActive){
      if((this.iSvc.units !== this.activeIntervalUnits) || (this.iSvc.intervalValue !== this.activeIntervalValue)){
        this.iSvc.units = this.activeIntervalUnits;
        this.iSvc.intervalValue = this.iSvc.units === SAVED_UNITS ? 0 : this.activeIntervalValue;
      }  
      editAbort = true;
      start = true;
    }
    if (start) {
      change =  (this.iSvc.lastIntervalValue !== this.iSvc.intervalValue) || 
                (this.iSvc.lastUnits !== this.iSvc.units) ||
                (this.iSvc.intervalData === undefined);
      this.iSvc.lastIntervalValue = this.iSvc.intervalValue;
      this.iSvc.lastUnits = this.iSvc.units;
      this.iSvc.lastIntervalTrek = this.tInfo.sortDate;
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
          if (!editAbort) {
            this.iSvc.getIntervalData(this.iSvc.intervalDist, this.tInfo.pointList);
            this.iSvc.buildGraphData(this.iSvc.intervalData)
            this.setSpeedDialZoom(false);
            this.setSelectedIntervalIndex(0)
            this.setGraphOpen(true);
            this.iSvc.setIntervalChange(change);
            this.setOpenItems(true);
          }
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
    if(this.intervalsActive || !this.tInfo.intervals) {
      let units = [INTERVALS_UNITS, 'meters', DIST_UNIT_LONG_NAMES[this.tInfo.measurementSystem], 'minutes'];
      this.limitProps = {heading: "Intervals", headingIcon: "RayStartEnd",     
          onChangeFn: this.iSvc.setIntervalValue,    
          label: 'Set interval distance, time or count:', 
          placeholderValue: (this.tInfo.intervals || this.iSvc.lastIntervalValue < 0) ? '0' : this.iSvc.lastIntervalValue.toString(),
          units: units, defaultUnits: units[0]};
          this.tInfo.limitsCloseFn = this.showIntervals;
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

  // set items related to course challenge replay from the given snapshot
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
      let replayOn = this.replayTimerStatus !== "None";

      let coursePtInfo = this.lSvc.getPointAtLimit(ss.coursePath, ss.coursePos, 
                                                    ss.coursePosMax, ss.coursePosType);
      this.setCourseMarker(coursePtInfo.pt);
      let trekPtInfo = this.lSvc.getPointAtLimit(ss.trekPath, ss.trekPos, 
                                                  ss.trekPosMax, ss.trekPosType, true);
      this.snapshotTrekPath = trekPtInfo.path;
      switch(ss.method){
        case 'bestTime':
        case 'courseTime':
        case 'lastTime':
        case 'otherEffort':
          // since coursePos/trekPos are 'Time' in this case, we need to find when each were at a
          // given 'Dist' to compute the time difference.
          // we do this to account for stops during the trek
          if (coursePtInfo.dist < trekPtInfo.dist){       
            // trek is ahead
            if (ss.coursePos < ss.coursePosMax){
              let timeAtDistCourse;

              // if(replayOn){
                // replay is running
                timeAtDistCourse = this.lSvc.getPointAtLimit(ss.coursePath, 
                                                              trekPtInfo.dist, ss.courseDist, 'Dist').time;
                this.setTrackingStatsTime(timeAtDistCourse - Math.min(ss.trekPos, ss.trekPosMax));
              // } else {
              //   // replay not yet started
              //   timeAtDistCourse = this.lSvc.getPointAtLimit(ss.coursePath, 
              //                                                 coursePtInfo.dist, ss.courseDist, 'Dist').time;
              //   this.setTrackingStatsTime(ss.coursePosMax - timeAtDistCourse);
              // }
            } else {        
              // but, course has finished. (course dist shorter than trek)
              // show positions when course finished if replay not running, otherwise let trek play out
              let t = replayOn ? Math.min(ss.trekPos, ss.trekPosMax) : ss.trekPosMax;
              this.setTrackingStatsTime(ss.coursePosMax - t);
            }
          } else {                                        
            // trek is behind 
            if (ss.trekPos < ss.trekPosMax){
              let timeAtDistTrek;

              // if(replayOn){
                // replay is running
                timeAtDistTrek = this.lSvc.getPointAtLimit(ss.trekPath, 
                                                            coursePtInfo.dist, ss.trekDist, 'Dist').time;
                this.setTrackingStatsTime(Math.min(ss.coursePos, ss.coursePosMax) - timeAtDistTrek);
              // } else {
              //   // replay not yet started
              //   timeAtDistTrek = this.lSvc.getPointAtLimit(ss.trekPath, 
              //                                               trekPtInfo.dist, ss.trekDist, 'Dist').time;
              //   this.setTrackingStatsTime(timeAtDistTrek - ss.trekPosMax);
              // }
            } else {        
              // but, trek has finished. (trek dist shorter than course)
              // show positions when trek finished if replay not running, otherwise let course play out
              let t = replayOn ? Math.min(ss.coursePos, ss.coursePosMax) : ss.coursePosMax ;
              this.setTrackingStatsTime(t - ss.trekPosMax);
            }
          }
          break;
        case 'avgRate':
        case 'avgSpeed':
        case 'timeLimit':
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
          }
          break;
        default:
      }
      this.setTrackingStatsDist(trekPtInfo.dist - coursePtInfo.dist)
      ss.lastUpdateTime = new Date().getTime();
    }
  }

  // replay the action of a course tracking trek
  @action
  replayTrackingSequence = () => {
    this.setReplayRate(1);
    if (!this.snapshotChanged) {
      this.cS.updateCourseTrackingSnapshot({coursePos: 0, trekPos: 0});
      this.setTrackingShapshotItems(this.cS.trackingSnapshot);
      this.replayDisplayTime = 1;
    }
    this.setReplayTimerStatus('Play');
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

  // start or pause/resume the replay sequence
  toggleReplay = () => {
    switch(this.replayTimerStatus){
      case 'None':
        this.replayTrackingSequence();
        break;
      case 'Paused':
        this.resumeReplay();
        break;
      case 'Play':
        this.pauseReplay();
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

  // reposition the replay process so the given marker is at the given distance
  repositionReplayPoint = (dist: number, trekOrCourse: "trek" | "course") => {
    let ss = this.cS.trackingSnapshot;
    let coursePtInfo = {} as PointAtLimitInfo;
    let cPos: number, tPos: number;

    switch(trekOrCourse){
      // user dragged the trek marker
      case 'trek':
        // find the time that the trek got to this dist
        let trekPtInfo = this.lSvc.getPointAtLimit(ss.trekPath, dist, ss.trekDist, TREK_LIMIT_TYPE_DIST);
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
    this.snapshotChanged = true;
  }

  // Set the mapSnapshotFn property
  @action
  setMapSnapshotFn = (fn: Function) => {
    this.mapShapshotFn = fn;
  }
  
  // take a snapshot of the map and save as course map image
  takeCourseMapSnapshot = () => {
    this.setMapSnapshotFn(this.courseMapSnapshotTaken);  // this will cause the prompt to display on the map
  }

  // handle the uri (if any) passed back by the snapshot function in TrekDisplay component
  // navigation parameter courseSnapshotName is the name of the course to update or create.
  // navigation parameter courseSnapshotMode can be either 'Update' to change a course default or 
  // 'New' to create a new course.
  courseMapSnapshotTaken = (uri?: string) => {
    let t = this.tInfo.getSaveObj();

    this.cS.saveCourseSnapshot(this.courseSnapshotName, uri, t, this.courseSnapshotMode)
    .then(() => {
      this.setMapSnapshotFn(undefined);
      this.props.navigation.dispatch(goBack)
    })
    .catch((err) => {
      this.props.toastSvc.toastOpen({
        tType: 'Error', 
        content: err
      })
    })
  }

  // set the value for the intervalCatIndex property
  setIntervalCatIndex = (sType: string) => {
    this.intervalCatIndex = INTERVAL_CATS.indexOf(sType)
  }

  @action
  changeIntervalStatType = (sType: string) => {
    this.iSvc.setShow(sType);
    this.setIntervalCatIndex(sType);
  }


  // respond to touch in navigation bar
  setActiveNav = (val) => {
    if ('PrevNext'.includes(val)) {
      this.tInfo.setWaitingForSomething('NoMsg');
    }
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch(val){
        case 'Stats':            // switch between Info' and 'Close' function for this button
          this.setStatsOpen(!this.statsOpen)
          break;
        case 'Prev':          // move to previous trek in list
        case 'Next':          // move to next trek in list
          this.setRateRangeObj();
          this.changeTrekFn(val)  // try to change to the Next/Previous trek
          .then((title: string) =>{            
            if (title !== '') {
              // change was successful 
              this.snapshotChanged = false;
              this.setTrackingCoursePath(this.cS.trackingSnapshot)
              this.setTrackingShapshotItems(this.cS.trackingSnapshot);
              if(this.cS.trackingSnapshot){
                this.setTrackingTime(this.cS.trackingSnapshot.courseDuration);
                // this.setTrackingTime(Math.min(this.cS.trackingSnapshot.courseDuration, 
                //                               this.cS.trackingSnapshot.trekDuration));
              }
              if (this.intervalsActive) { this.cancelIntervalsActive(); }
              this.props.navigation.setParams({ title: title, icon: this.tInfo.type });
              this.tInfo.setWaitingForSomething();
              // set to show full path on map
              this.setSpeedDialZoom(false);
              this.setRateRangeObj(this.currRangeData);
              this.setLayoutOpts("NewAll");    
            }
            else {
              this.tInfo.setWaitingForSomething();
            }
          })
          .catch((err) => alert(err))
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
        case 'calories':
        case 'speed':
          if(this.rateRangeObj){
            this.setRateRangeObj();
          } else {
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
        case "GoBack":
          this.props.navigation.dispatch(goBack);
          break;
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Summary":
        case "Courses":
        case "Goals":
        case "Settings":
        case "Conditions":
          const resetAction = StackActions.reset({
                index: 1,
                actions: [
                  NavigationActions.navigate({ routeName: 'Log', key: 'Home' }),
                  NavigationActions.navigate({ routeName: val, key: 'Key-' + val }),
                ],
              });
          this.props.navigation.dispatch(resetAction);          
          break;
        default:
      }
    });
  }

  render () {

    const {width} = Dimensions.get('window');
    const { fontRegular, fontLight
          } = this.props.uiTheme;
    const { highTextColor, highlightColor, lowTextColor, matchingMask_7, textOnTheme,
            pageBackground, dividerColor,
            trackingStatsBackgroundHeader } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const displayInts = !this.mapDisplayMode.includes('noIntervals');
    const ints = (displayInts && this.intervalsActive ) ? this.iSvc.intervalDist : undefined;
    const iMarkers = ints ? this.iSvc.intervalData.markers : undefined;
    const changeZFn = iMarkers ? this.toggleSpeedDialZoom : this.toggleSpeedDialZoom;
    const sdIcon = iMarkers ? (this.speedDialZoom ? "ZoomOut" : "ZoomIn") 
                            : (this.speedDialZoom ? "ZoomOutMap" : "Location");
    const sdValue = iMarkers ? (this.speedDialZoom ? "All" : "Interval")
                             : (this.speedDialZoom ? "All" : "Current");
    const interval = ((iMarkers !== undefined) && this.speedDialZoom) ? this.selectedIntervalIndex : undefined;
    const showButtonHeight = 20;
    const caHt = SHORT_CONTROLS_HEIGHT;
    const graphAndControlsHt = INTERVAL_AREA_HEIGHT;
    const bottomHeight = (ints && this.graphOpen) ? graphAndControlsHt : 0;
    const prevOk = (this.checkTrekChangeFn !== undefined) && (this.checkTrekChangeFn('Prev') !== -1);
    const nextOk = (this.checkTrekChangeFn !== undefined) && (this.checkTrekChangeFn('Next') !== -1);
    const showControls = this.tInfo.showMapControls;
    const haveElevs = this.tInfo.hasElevations();
    const semiTrans = matchingMask_7;
    const tracking = this.cS.trackingSnapshot !== undefined;
    const graphHeight = INTERVAL_GRAPH_HEIGHT;
    const maxBarHeight = 70;
    const statLabelWidth = (width - 10) / (haveElevs ? 5 : 4);

    const intervalsIcon = ints ? "Edit" : "RayStartEnd";
    const intervalsLabel = ints ? "Edit Intervals" 
                                : (this.tInfo.intervals ? "Show Intervals" : "Set Intervals");
    const showSave = ints && this.iSvc.intervalChange;
    const statsIcon = this.statsOpen ? 'ChevronDown' : 'ChevronUp';
    const statsLabel = this.statsOpen ? 'Close Stats' : 'Open Stats';
    const showPlay = !ints && this.cS.trackingSnapshot;
    const replayOn = this.replayTimerStatus === "Play";
    const playPauseIcon = replayOn ? "Pause" : "Play";
    const playPauseLabel = replayOn ? "Pause Replay" : "Start Replay";
    const playPauseAction = this.replayTimerStatus !== "Play" ? "Play" : "Pause";

    let navMenuItems = 
    [ !ints ? 
        {label: 'Map Options', 
         submenu: [
          {icon: 'Resistor', label: 'Speed Ranges', value: this.currRangeData},
          {icon: statsIcon, label: statsLabel, value: 'Stats'},
        ]} :
        {label: 'Map Options', 
         submenu: [
          {icon: 'Close', label: 'Close Intervals', value: 'IntervalsDone'},
          {icon: intervalsIcon, label: intervalsLabel, value: 'Intervals'},
          {icon: 'Resistor', label: 'Speed Ranges', value: this.currRangeData},
          {icon: statsIcon, label: statsLabel, value: 'Stats'},
        ]},
    {icon: 'ArrowBack', label: 'Go Back', value: 'GoBack'},
    {icon: 'Home', label: 'Home', value: 'Home'},
    {icon: 'Pie', label: 'Activity', value: 'Summary'},
    {icon: 'Course', label: 'Courses', value: 'Courses'},
    {icon: 'Target', label: 'Goals', value: 'Goals'},
    {icon: 'Settings', label: 'Settings', value: 'Settings'},
    {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}]  
    if (!ints && !replayOn){
      navMenuItems[0].submenu.unshift(
        {icon: intervalsIcon, label: intervalsLabel, value: 'Intervals'}
      )
    }
    if (showSave) {
      navMenuItems[0].submenu.unshift(
        {icon: 'CheckMark', label: 'Save Intervals', value: 'IntervalsSave'},
      )
    }
    if (ints){
      navMenuItems[0].submenu.unshift(
        {icon: 'Delete', label: 'Delete Intervals', value: 'IntervalsDelete'},
      )
    }
    if (showPlay) {
      navMenuItems[0].submenu.push(
        {icon: playPauseIcon, label: playPauseLabel, value: playPauseAction},
      )
    }
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
        height: graphHeight,
        marginLeft: 0,
        marginRight: 0,
      },
      graph: {
        paddingHorizontal: 2,
      },
      showControls: {
        // height: showButtonHeight,
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
        alignItems: "center",
      },
      detailsIcon: {
        width: 24,
        height: 24,
        backgroundColor: "transparent"
      },
      buttonText: {
        fontFamily: fontLight,
        fontSize: 18,
        color: lowTextColor,
      },
      buttonTextSelected: {
        fontFamily: fontRegular,
        fontSize: 18,
        color: highTextColor,
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
      },
      statTypeUnderline: {
        marginTop: -1,
        width: statLabelWidth,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: highlightColor,
      },
    })


    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        locked={this.intervalFormOpen}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          {(showControls || tracking) &&
            <TrekLogHeader titleText={this.props.navigation.getParam('title', '')}
                           icon={this.props.navigation.getParam('icon', '')}
                           backgroundColor={tracking ? trackingStatsBackgroundHeader : matchingMask_7}
                           textColor={textOnTheme}
                           position="absolute"
                           backButtonFn={() => this.props.navigation.dispatch(goBack)}
                           borderBottomColor="transparent"
                           openMenuFn={this.openMenu}
            />        
          }
          <TrekDisplay 
            displayMode={this.mapDisplayMode}
            pathToCurrent={this.snapshotTrekPath ? this.snapshotTrekPath : this.tInfo.pointList}
            pathLength={this.snapshotTrekPath ? this.snapshotTrekPath.length : this.tInfo.trekPointCount}
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
            mapType={this.tInfo.currentMapType}
            changeMapFn={this.tInfo.setDefaultMapType}
            changeZoomFn={changeZFn}
            showImagesFn={this.showCurrentImageSet}
            prevFn={prevOk ? (() => this.setActiveNav('Prev')) : undefined}
            nextFn={nextOk ? (() => this.setActiveNav('Next')) : undefined}
            rateRangeObj={this.rateRangeObj}
            toggleRangeDataFn={this.toggleRangeData}
            takeSnapshotFn={this.mapShapshotFn}
            snapshotPrompt={this.mapSnapshotPrompt}
            pauseFn={this.courseMarker ? this.toggleReplay : undefined}
            isPaused={this.replayTimerStatus !== 'Play'}
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
          {this.tInfo.waitingForSomething && 
            <Waiting msg={this.tInfo.waitingMsg}/>
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
                    onPressFn={this.changeIntervalStatType}
                    onPressArg={'Distance'}
                    style={styles.showButton}
                    labelStyle={this.iSvc.show === "Distance" ? styles.buttonTextSelected : styles.buttonText}
                  />
                  <IconButton
                    label="TIME"
                    horizontal
                    onPressFn={this.changeIntervalStatType}
                    onPressArg={'Time'}
                    style={styles.showButton}
                    labelStyle={this.iSvc.show === "Time" ? styles.buttonTextSelected : styles.buttonText}
                  />
                  <IconButton
                    label="SPEED"
                    horizontal
                    onPressFn={this.changeIntervalStatType}
                    onPressArg={'Speed'}
                    style={styles.showButton}
                    labelStyle={this.iSvc.show === "Speed" ? styles.buttonTextSelected : styles.buttonText}
                  />
                  <IconButton
                    label="CALS"
                    horizontal
                    onPressFn={this.changeIntervalStatType}
                    onPressArg={'Calories'}
                    style={styles.showButton}
                    labelStyle={this.iSvc.show === "Calories" ? styles.buttonTextSelected : styles.buttonText}
                  />
                  {haveElevs && 
                    <IconButton
                      label="ELEV"
                      horizontal
                      onPressFn={this.changeIntervalStatType}
                      onPressArg={'Elevation'}
                      style={styles.showButton}
                      labelStyle={this.iSvc.show === "Elevation" ? styles.buttonTextSelected : styles.buttonText}
                    />
                  }
                </View>
                <HorizontalSlideView 
                      endValue={(this.intervalCatIndex * (statLabelWidth+1)) + 5}
                      duration={400}>
                      <View style={styles.statTypeUnderline}/>
                </HorizontalSlideView>                  
                <View style={styles.graphArea}>
                  <View style={styles.graph}>
                    <BarDisplay 
                      data={this.iSvc.intervalGraphData.items} 
                      dataRange={this.iSvc.intervalGraphData.range}
                      selected={this.selectedIntervalIndex}
                      selectFn={this.setSelectedIntervalIndex} 
                      openFlag={this.openItems}
                      maxBarHeight={maxBarHeight}
                      style={{height: graphHeight}}
                      barStyle={{ height: graphHeight, 
                              width: 60,
                              backgroundColor: "transparent" }}
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
            closeFn={this.closeStats}
          />
          <TrekLimitsForm
            open={this.intervalFormOpen}
            limits={this.limitProps}
          />
        </View>
      </NavMenu>
    )   

  }
}

export default SelectedTrek;

