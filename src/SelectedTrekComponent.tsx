// This component is used to display maps of treks selected in the Review component.

import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, Keyboard } from 'react-native'
import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';
import { observer, inject } from 'mobx-react';
import IconButton from './IconButtonComponent';
import { NavigationActions } from 'react-navigation';

import TrekDisplay from './TrekDisplayComponent';
import NumbersBar from './NumbersBarComponent'
import { TrekInfo, TrekObj, DIST_UNIT_LONG_NAMES, SHORT_TO_LONG_DIST_NAMES,
         NumericRange, TrekPoint } from './TrekInfoModel';
import { CONTROLS_HEIGHT, HEADER_ICON_SIZE, HEADER_TEXT_COLOR, NAV_ICON_SIZE, INVISIBLE_Z_INDEX, INTERVAL_GRAPH_Z_INDEX } from './App';
import Waiting from './WaitingComponent';
import TrekLimitsForm, {LimitsObj} from './TrekLimitsComponent';
import { M_PER_MILE, UtilsSvc } from './UtilsService';
import { ToastModel } from './ToastModel';
import { BarData, BarGraphInfo, FilterSvc } from './FilterService';
import SlideUpView from './SlideUpComponent';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import BarDisplay from './BarDisplayComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { ModalModel } from './ModalModel';
export const INTERVAL_AREA_HEIGHT = 145;
export const INTERVAL_GRAPH_HEIGHT = 125;
export interface DistAndPoint {
  dist: number,
  point: LatLng
}
export interface SegmentAndPoint {
  segIndex: number,
  point: LatLng
}

export const SAVED_UNITS = "saved";
export const INTERVALS_UNITS = "intervals";

export interface IntervalData {
  markers     ?: LatLng[],        // location on map for marker
  displayUnits ?: string,         // units used to display interval distances
  intDist     ?: number,          // interval distance (meters)
  segIndicies ?: number[],        // trek path segment that contains each marker
  segPaths    ?: LatLng[][],      // path from this marker to the next
  segPoints   ?: TrekPoint[][],   // segPath as full TrekPoints
  endDists    ?: number[],        // ending distances for each interval
  startTimes  ?: number[],        // starting times for intervals
  iDists      ?: number[],        // distance for each interval
  distRange   ?: NumericRange,    // range for interval distances
  times       ?: number[],        // duration values for each segment
  timeRange   ?: NumericRange,    // range for interval durations
  elevs       ?: number[],        // elevation readings at each marker
  elevRange   ?: NumericRange,    // range for interval elevations
  speeds      ?: number[]         // average speed for each segment
  speedRange  ?: NumericRange,    // range for interval speeds
  cals        ?: number[]         // calories for each segment
  calsRange   ?: NumericRange,    // range for interval calories
}

const goBack = NavigationActions.back() ;

@inject('trekInfo')
@observer
export class TrekTypeHeader extends Component<{
  icon ?: string,
  titleText : string,
  trekInfo ?: TrekInfo,
  navigation ?: any
}, {} > {

  render() {
    const iconName = this.props.icon || this.props.trekInfo.type;
    const styles = StyleSheet.create({
      header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "transparent",
      },
      icon: {
        width: HEADER_ICON_SIZE,
        height: HEADER_ICON_SIZE,
        backgroundColor: "transparent"
      },
      text: {
        fontSize: 22,
        fontWeight: "300",
        color: HEADER_TEXT_COLOR,
        marginHorizontal: 8
      }
    })

    return (
     <View style={styles.header}>
      {(iconName !== '*') &&
          <SvgIcon
            style={styles.icon}
            size={HEADER_ICON_SIZE}
            paths={APP_ICONS[iconName]}
            fill={HEADER_TEXT_COLOR}
          />
      }
      <Text style={styles.text}>{this.props.titleText}</Text>
     </View> 
    )
  }
}


@inject('trekInfo', 'uiTheme', 'toastSvc', 'utilsSvc', 'modalSvc', 'filterSvc')
@observer
class SelectedTrek extends Component<{
  uiTheme ?: any,
  filterSvc ?: FilterSvc,
  trekInfo ?: TrekInfo,
  toastSvc ?: ToastModel,
  modalSvc ?: ModalModel,
  utilsSvc ?: UtilsSvc,
  navigation ?: any
}, {} > {

  @observable statsOpen;
  @observable layoutOpts;
  @observable zValue;
  @observable show;
  @observable selectedIntervalIndex;
  @observable intervalFormOpen;
  @observable intervalFormDone;
  @observable intervalsActive;
  @observable graphOpen;
  @observable waitingForChange;
  @observable scrollToBar;
  @observable speedDialZoom;
  @observable keyboardOpen;
  @observable intervalChange;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  activeNav : string;
  changeTrekFn : Function;
  limitProps : LimitsObj = {} as LimitsObj;
  intervalDist = 0;
  intervalValue = 0;
  lastIntervalValue = 0;
  units = '';
  lastUnits = '';
  activeIntervalValue = 0;
  activeIntervalUnits = '';
  graphBarWidth = 50;
  intervalData : IntervalData;
  intervalGraphData: BarGraphInfo = {items: [], range: {max: 0, min: 0, range: 0}};

  keyboardDidShowListener;
  keyboardDidHideListener;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  static navigationOptions = ({navigation}) => {
   
    return {
      header: <TrekLogHeader titleText={navigation.getParam('title','')}
                                  //  icon="*"
                                   icon={navigation.getParam('icon','')}
                                   backButtonFn={() =>  navigation.dispatch(goBack)}
              />,
    };
  }  

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.statsOpen = false;
    this.layoutOpts = "All";
    this.zValue = -1;
    this.show = 'Time';
    this.selectedIntervalIndex = -1;
    this.intervalFormOpen = false;
    this.intervalFormDone = '';
    this.intervalsActive = false;
    this.graphOpen = false; 
    this.waitingForChange = false;
    this.speedDialZoom = false;
    this.keyboardOpen = false;
    this.intervalChange = false;
   }

   componentWillMount() {
    this.changeTrekFn = this.props.navigation.getParam('changeTrekFn');
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
  setShow = (val: string) => {
    this.show = val;
    this.tInfo.setUpdateGraph(true);
    this.buildGraphData(this.intervalData);
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

  setIntervalValue = (vals: any) => {
    this.intervalValue = vals.value;
    this.units = vals.units;
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

  @action
  setIntervalChange = (status: boolean) => {
    this.intervalChange = status;
  }

  // check that we have a reasonable value for Interval Distance
  intervalDistOK = (dist = this.intervalDist) => {
    if (this.intervalValue === -1) { return true; }
    if (this.intervalValue === 0) { return false; }
    return (this.tInfo.trekDist / dist) < 100;
  }

  // Start displaying the intervals graph or stop displaying it.
  @action
  showIntervals = (start: boolean) => {
    let change = false;
    let saved = false;
    let tempDist;

    this.setIntervalFormDone('')
    if (start) {
      change =  (this.lastIntervalValue !== this.intervalValue) || (this.lastUnits !== this.units) ||
                (this.intervalData === undefined);
      this.lastIntervalValue = this.intervalValue;
      this.lastUnits = this.units;
      switch(this.units){
        case 'meters':
          tempDist = this.intervalValue;
          break;
        case INTERVALS_UNITS:
          if (this.intervalValue > 0) {
            tempDist = (this.tInfo.trekDist / this.intervalValue) + (1 / this.intervalValue);
          } else {
            this.intervalValue = tempDist = 0;
          }
          break;
        case 'miles':
          tempDist = this.intervalValue * M_PER_MILE;
          break;
        case 'kilometers':
          tempDist = this.intervalValue * 1000;
          break;
        case SAVED_UNITS:
          tempDist = -1;
          this.intervalValue = -1;
          change = false;
          saved = true;
        }
      if (this.intervalDistOK(tempDist)) {
        this.intervalDist = tempDist;
        this.setIntervalsActive(true);
        this.setIntervalFormOpen(false);
        this.activeIntervalValue = this.intervalValue;
        this.activeIntervalUnits = this.units;
        if(change || saved){
          this.getIntervalData(this.intervalDist, this.tInfo.pointList);
          this.buildGraphData(this.intervalData)
          this.tInfo.setUpdateMap(true);
          this.setSpeedDialZoom(false);
          this.setSelectedIntervalIndex(0)
          this.setGraphOpen(true);
          this.setIntervalChange(change);
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
    }
    this.intervalDist = 0;
    this.intervalData = undefined;
    this.setIntervalsActive(false);
    this.setIntervalFormOpen(false);
    this.setIntervalChange(false);
  }

  // Open the Trek Intervals form using DISTANCE parameters
  openIntervalForm = () => {
    this.tInfo.setUpdateMap(false);
    if(this.intervalsActive || !this.tInfo.intervals) {
      let units = [INTERVALS_UNITS, 'meters', DIST_UNIT_LONG_NAMES[this.tInfo.measurementSystem]];
      this.limitProps = {heading: "Intervals", headingIcon: "LinearScale",     
          onChangeFn: this.setIntervalValue,    
          label: 'Set interval distance or count:', 
          placeholderValue: (this.tInfo.intervals || this.lastIntervalValue < 0) ? '0' : this.lastIntervalValue.toString(),
          units: units, defaultUnits: units[0], 
          closeFn: this.showIntervals};
      this.setIntervalFormOpen(true);
    }
    else {
      this.units = SAVED_UNITS;
      this.intervalDist = -1;
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

  // return the squared distance between 2 points
  dist2 = (v: LatLng, w: LatLng) : number => { 
    return ((v.latitude - w.latitude) * (v.latitude - w.latitude)) + 
    ((v.longitude - w.longitude) * (v.longitude - w.longitude)) }

  // return the distance squared between a point (p) and a line segment(v,w)
  distToSegmentSquared = (p: LatLng, v: LatLng, w: LatLng) : DistAndPoint => {
    let l2 = this.dist2(v, w);
    if (l2 == 0) return {dist: this.dist2(p, v), point: v};
    let t = ((p.latitude - v.latitude) * (w.latitude - v.latitude) + 
             (p.longitude - v.longitude) * (w.longitude - v.longitude)) / l2;
    t = Math.max(0, Math.min(1, t));
    let nearestPt = { latitude: v.latitude + t * (w.latitude - v.latitude),
                      longitude: v.longitude + t * (w.longitude - v.longitude) }
    return {dist: this.dist2(p, nearestPt), point: nearestPt};
  }
  
  // find the nearest segment of a given path to a given point
  findNearestPoint = (point: LatLng, path: LatLng[]) : SegmentAndPoint => {
    let segAndPt = {segIndex: -1, point: undefined};
    let shortestDist = 1000000;
    let segStart: LatLng, segEnd: LatLng;
    let dist: number;
    let distAndPt: DistAndPoint;

    if (path.length > 1) {
      for( let i = 0; i < path.length-1; i++) {
        segStart = {latitude: path[i].latitude, longitude: path[i].longitude};
        segEnd = {latitude: path[i+1].latitude, longitude: path[i+1].longitude};
        distAndPt = this.distToSegmentSquared(point, segStart, segEnd);
        dist = distAndPt.dist;
        if (dist < shortestDist){
          shortestDist = dist;
          segAndPt.segIndex = i;
          segAndPt.point = distAndPt.point;
        }
      }
    }
    return segAndPt;
  }

  // Handle onDragEnd event for interval marker
  // Find the nearest point in the segment of the marker or the one after it to the given drop point.
  // Then find the segment of the main trek that contains the new marker location.
  markerToPath = (index: number, pt: LatLng, path: LatLng[]) => {
    let segAndPt: SegmentAndPoint;
    let iData = this.intervalData;
    let validPath : LatLng[];

    validPath = iData.segPaths[index].concat(iData.segPaths[index+1]);
    segAndPt = this.findNearestPoint(pt, validPath);    // restrict search to validPath
    segAndPt = this.findNearestPoint(segAndPt.point, path); // get segAndPt.segIndex relative to full path
    this.tInfo.setUpdateMap(true);
    this.tInfo.setUpdateGraph(true);
    this.moveIntervalMarker(index, segAndPt, this.tInfo.pointList);
    this.buildGraphData(this.intervalData);
    this.setIntervalChange(true);
    this.forceUpdate();
  } 

  intervalLabel = (index: number) : string => {
    let lUnits = SHORT_TO_LONG_DIST_NAMES[this.intervalData.displayUnits];
    return this.props.utilsSvc.formatDist(this.intervalData.endDists[index], lUnits);
  }
  
  // The interval marker at 'index' has moved to 'newLoc'.
  // The final marker cannot be moved
  //  - Recompute the values of given interval and interval after that.
  @action
  moveIntervalMarker = (index: number, newLoc: SegmentAndPoint, tPath: TrekPoint[]) => {
    let tInfo = this.tInfo;
    let uSvc = this.props.utilsSvc;
    let iData = this.intervalData;
    let lastMarkerIndex = iData.markers.length - 1;
    let segD, partD;
    const nElevs = tInfo.hasElevations() ? tInfo.elevations.length - 1 : 0;
    const segIndex = newLoc.segIndex;
    let segST : number, segET : number;
    let pathAndPoints : {path: LatLng[], points: TrekPoint[]};
    
    // update point for marker (endpoint of interval)
    iData.markers[index] = newLoc.point;

    // update which trek segment has the marker
    iData.segIndicies[index] = segIndex;

    // update the path for the interval
    pathAndPoints = this.getIntervalPath(index, tPath);
    iData.segPaths[index] = pathAndPoints.path;
    iData.segPoints[index] = pathAndPoints.points;

    // update the distance of the interval
    iData.iDists[index] = this.pathDist(iData.segPaths[index]);

    // update the trek distance where the interval ends
    iData.endDists[index] = (index === 0 ? 0 : iData.endDists[index-1]) + iData.iDists[index];

    // update the path for the next interval
    pathAndPoints = this.getIntervalPath(index + 1, tPath);
    iData.segPaths[index + 1] = pathAndPoints.path;
    iData.segPoints[index + 1] = pathAndPoints.points;

    // update the distance of the next interval
    iData.iDists[index + 1] = this.pathDist(iData.segPaths[index + 1]);
    // update the start time for the next interval
      // get the length of the trek segment with this marker (end of this interval)
      segD = uSvc.calcDistLaLo(tPath[segIndex].l, tPath[segIndex + 1].l ); 

      // get the length of the part of that segment that is before this marker
      partD = uSvc.calcDistLaLo(tPath[segIndex].l, 
                  {a: iData.markers[index].latitude, o: iData.markers[index].longitude}) / segD;      

      segST = tPath[segIndex].t;
      segET = tPath[segIndex + 1].t;
      iData.startTimes[index + 1] = segST + ((segET - segST) * partD);

    // update the length of time for the next interval
    iData.times[index + 1] = ((index + 1) === lastMarkerIndex ? tInfo.duration : iData.startTimes[index + 2])
                               - iData.startTimes[index + 1];

    // update the length of time for this interval
    iData.times[index] = iData.startTimes[index + 1] - iData.startTimes[index];

    // update the elevation value for this interval (use rough midpoint)
      if (index > 0){
        iData.elevs[index] = 
          tInfo.elevations[
            Math.round(((iData.endDists[index - 1] + (iData.iDists[index] / 2)) / tInfo.trekDist) * nElevs)];
      }
      else {
        iData.elevs[index] = 
          tInfo.elevations[Math.round(((iData.iDists[index] / 2) / tInfo.trekDist) * nElevs)];
      }

    // update the elevation value for the next interval (use rough midpoint)
    iData.elevs[index + 1] = 
    tInfo.elevations[Math.round(((iData.endDists[index] + (iData.iDists[index + 1] / 2)) / tInfo.trekDist) * nElevs)];

    // update the average speed for the interval
    iData.speeds[index] = 
      uSvc.computeRoundedAvgSpeed(tInfo.measurementSystem, iData.iDists[index], iData.times[index]);

    // update the average speed for the next interval
    iData.speeds[index + 1] = 
      uSvc.computeRoundedAvgSpeed(tInfo.measurementSystem, iData.iDists[index + 1], iData.times[index + 1]);

    // update the average speed for the interval
    iData.cals[index] =  uSvc.computeCalories(iData.segPoints[index],
                          tInfo.type, tInfo.hills, tInfo.weight, tInfo.getPackWeight());

    // update the average speed for the next interval
    iData.cals[index + 1] = uSvc.computeCalories(iData.segPoints[index + 1],
                          tInfo.type, tInfo.hills, tInfo.weight, tInfo.getPackWeight());

    // recompute the interval data ranges
    this.getDataRanges();
}

  // Return a LatLng[] for the path for the interval 'index'
  getIntervalPath = (index: number, tPath: TrekPoint[]) : {path: LatLng[], points: TrekPoint[]} => {
    let path: LatLng[] = [];
    let points: TrekPoint[] = [];
    let iData = this.intervalData;
    let iSeg = 0;
    let uSvc = this.props.utilsSvc;

    if (index > 0){
      path.push(iData.markers[index-1]);          // first point of interval is last pt of previous
      points.push(iData.segPoints[index - 1][iData.segPoints[index-1].length-1]); 
      iSeg = iData.segIndicies[index-1];
    }
    else {
      points.push(tPath[0]);
      path.push(uSvc.cvtLaLoToLatLng(tPath[0].l));   // first point of first interval is start of trek
    }
    while(iSeg < iData.segIndicies[index]){
      iSeg++;
      path.push(uSvc.cvtLaLoToLatLng(tPath[iSeg].l)); // add segments from trek till the one containing the marker point
      points.push(tPath[iSeg])
    }
    path.push(iData.markers[index]);            // last point of interval is marker point
    if (iSeg < tPath.length-1){
      let d = uSvc.calcDistLaLo(uSvc.cvtLatLngToLaLo(iData.markers[index]), tPath[iSeg + 1].l);
      let part = d / uSvc.calcDistLaLo(tPath[iSeg].l, tPath[iSeg + 1].l);
      points.push({l: uSvc.cvtLatLngToLaLo(iData.markers[index]), s: tPath[iSeg].s, 
              t: tPath[iSeg].t + ((tPath[iSeg + 1].t - tPath[iSeg].t) * part)});
    }
    return {path: path, points: points};
  }

  // Compute the distance between the points in the given list at the given 2 indicies. 
  pathDist = (list: LatLng[]) : number => {
    let dist = 0;

    for(let i = 0; i < list.length-1; i++){
      dist += this.props.utilsSvc.calcDistLatLng(list[i+1], list[i]);
    }
    return dist;
  }

  getIntervalDisplayUnits = (units: string) => {
    let val = '';
    
    switch(units){
      case 'kilometers':
        val = 'km';
        break;
      case 'meters':
        val = 'm';
        break;
      case 'miles':
        val = 'mi';
        break;
      case INTERVALS_UNITS:
        val = this.tInfo.distUnits();
        break;
      case SAVED_UNITS:
        val = this.tInfo.intervalDisplayUnits || this.tInfo.distUnits();
        break;
      default:
    }
    return val;
  }

  // Given the interval distance, compute marker locations and values of several data categories for each interval.
  getIntervalData = (iDist: number, tPath: TrekPoint[]) => {
    let uSvc = this.props.utilsSvc;
    let iData : IntervalData;
    let dist = 0, eDist = 0, testDist, halfDist;
    let intervalStartTime, intervalTime, newTime;
    let intIndex = 0;
    const nElevs = this.tInfo.hasElevations() ? this.tInfo.elevations.length-1 : 0;
    let tempPts = uSvc.copyTrekPath(tPath); // copy path data
    const nPts = tempPts.length;
    let endTrekPt = tempPts[nPts - 1];
    let finalPt = 0;
    let d : number, part : number;
    
    this.intervalData = { markers: [], segIndicies: [], iDists: [], segPaths: [], segPoints: [], 
                          startTimes: [], endDists: [], elevs: [], times: [], speeds: [], cals: [] };
    iData = this.intervalData;
    iData.displayUnits = this.getIntervalDisplayUnits(this.units);
    if (tempPts.length > 0) {
      intervalStartTime = tempPts[0].t || 0;
      for(let i=1; i<nPts; i++){
        if(i === (nPts - 1)) { 
          finalPt = .01; 
        };
        if (dist === 0) {                                // new interval?

          // if trek has saved intervals and we're not replacing them then use saved interval distances
          testDist = (this.tInfo.intervals && (iDist === -1  )) ? this.tInfo.intervals[intIndex] : iDist;
          intervalStartTime = tempPts[i - 1].t || 0;  // update start time for new interval
          iData.segPaths.push([]);                    // add new array to hold segment path LatLngs
          iData.segPoints.push([]);                    // add new array to hold segment path TrekPoints
          iData.startTimes.push(intervalStartTime);
          if (nElevs) {                               // set the elevation value for this interval
            halfDist = (testDist > this.tInfo.trekDist - eDist) ? this.tInfo.trekDist - eDist : testDist;
            iData.elevs.push(this.tInfo.elevations[
                Math.round( ((eDist + (halfDist / 2)) / this.tInfo.trekDist) * nElevs)]);
          }
        }
        // add last point to current segment path
        iData.segPaths[intIndex].push({latitude: tempPts[i-1].l.a, longitude: tempPts[i-1].l.o});
        iData.segPoints[intIndex].push(tempPts[i-1]);
        d = uSvc.calcDistLaLo(tempPts[i-1].l, tempPts[i].l);
        if (dist + d >= (testDist + finalPt)) {      // will the distance to this point complete the interval?
          part = (testDist - dist) / d;              // yes, what % of the distance do we need?
          // compute the point time for the replacement point
          newTime = Math.round((tempPts[i].t - tempPts[i - 1].t) * part + tempPts[i - 1].t);
          intervalTime = newTime - intervalStartTime; // compute the duration for this interval
          iData.times.push(intervalTime);
          iData.segIndicies.push(i-1);               // save which trek segment has end of interval (marker)
          iData.speeds.push(this.props.utilsSvc.computeRoundedAvgSpeed(this.tInfo.measurementSystem, testDist, intervalTime));
          eDist += testDist;                         // update ending distance accumulator
          iData.endDists.push(eDist);
          // now get a point that is 'part' % into the distance between these 2 points
          let newP : TrekPoint = {} as TrekPoint;
          newP.l = uSvc.pointWithinSegment(tempPts[i-1].l, tempPts[i].l, part);
          newP.t = newTime;
          newP.s = tempPts[i-1].s;
          iData.markers.push(uSvc.cvtLaLoToLatLng(newP.l));    // we'll put a marker here at the end of the segment
          iData.segPaths[intIndex].push(uSvc.cvtLaLoToLatLng(newP.l));  // push end GPS point of this segment
          iData.segPoints[intIndex].push(newP);
          iData.cals.push(uSvc.computeCalories(iData.segPoints[intIndex],
                            this.tInfo.type, this.tInfo.hills, this.tInfo.weight, this.tInfo.getPackWeight()));
          iData.iDists.push(testDist);        // save length of this interval
          i--;                                // set to do this point over
          tempPts[i] = newP;                  // make this the starting point of the next segment and reprocess
          dist = 0;                           // reset interval distance accumulator
          intIndex++;                         // update interval counter
        }
        else {
          dist += d;            // increase distance since last marker
        }
      }

      if(dist > 0){
        // add ending values for everything
        iData.endDists.push(this.tInfo.trekDist);
        iData.markers.push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        intervalTime = endTrekPt.t - intervalStartTime;
        iData.segIndicies.push(nPts-1);  // save which trek segment has end of interval (marker)
        iData.segPaths[intIndex].push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        iData.segPoints[intIndex].push(endTrekPt);
        iData.iDists.push(dist);
        iData.times.push(intervalTime);
        iData.speeds.push(this.props.utilsSvc.computeRoundedAvgSpeed(this.tInfo.measurementSystem, dist, intervalTime));
        iData.cals.push(uSvc.computeCalories(iData.segPoints[intIndex], 
                          this.tInfo.type, this.tInfo.hills, this.tInfo.weight, this.tInfo.getPackWeight()));
}
      this.getDataRanges();
    }
  }

  // get the data ranges for the elevs, times and speeds arrays if the intervalData obj
  getDataRanges = () => {
    let iData = this.intervalData;

    if (this.tInfo.hasElevations()) {
      // set range information for elevations
      iData.elevRange = this.tInfo.getNumericRange(iData.elevs);
    }

    // set range information for times
    iData.timeRange = this.tInfo.getNumericRange(iData.times);

    // set range information for speeds
    iData.speedRange = this.tInfo.getNumericRange(iData.speeds);

    // set range information for calories
    iData.calsRange = this.tInfo.getNumericRange(iData.cals);

    // set range information for distances
    iData.distRange = this.tInfo.getNumericRange(iData.iDists);
  }
  
  // clear the data array used for the bar graph
  clearGraphData = () => {
    this.intervalGraphData.items = [];
    this.intervalGraphData.range = {max: 0, min: 0, range: 0};
  }

  // add the given barData item to the intervalGraphData array
  addGraphData = (item: BarData) => {
    this.intervalGraphData.items.push(item);
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given treks array has already been sorted using the sortBy value.
  buildGraphData = (intData : IntervalData) => {

    this.clearGraphData();
    switch(this.show){
      case 'Distance':
        this.intervalGraphData.range = intData.distRange;
        this.graphBarWidth = 51;
        break;
        case 'Elevation':
        this.intervalGraphData.range = intData.elevRange;
        this.graphBarWidth = 51;
        break;
      case 'Speed':
        this.intervalGraphData.range = intData.speedRange;
        this.graphBarWidth = 51;
        break;
      case 'Time':
        this.intervalGraphData.range = intData.timeRange;
        this.graphBarWidth = 51;
        break;
      case 'Calories':
        this.intervalGraphData.range = intData.calsRange;
        this.graphBarWidth = 51;
        break;
        
    }
    for(let i = 0; i<intData.markers.length; i++) {
      let barItem : any = {};
      switch(this.show){
        case "Time":
          barItem.value = intData.times[i];
          barItem.label1 = this.props.utilsSvc.timeFromSeconds(intData.times[i]);
          break;
        case "Speed":
          barItem.value = intData.speeds[i];
          barItem.label1 = intData.speeds[i].toString() + ' ' + this.tInfo.speedUnits();
          break;
        case "Elevation":
          let e = Math.round(this.tInfo.convertDist(intData.elevs[i]));
          barItem.value = intData.elevs[i];
          barItem.label1 = e.toString() + ' ' + this.tInfo.smallDistUnits();
          break;
        case "Distance":
          barItem.value = intData.iDists[i];
          barItem.label1 = this.props.utilsSvc.formatDist(intData.iDists[i], intData.displayUnits);
          break;
        case "Calories":
          barItem.value = intData.cals[i];
          barItem.label1 = intData.cals[i].toString();
          break;
        default:
          barItem.value = 0;
          barItem.label1 = '';
      }
      barItem.indicator = (i+1).toString();
      this.addGraphData(barItem);
    }
  }

  // // switch measurements system then update the bar graph
  // switchMeasurementSystem = () => {
  //   let fn = this.props.navigation.getParam('switchSysFn');
  //   if (fn !== undefined){
  //     fn();             // call parent's switch function (Review component)
  //   } else {
  //     this.tInfo.switchMeasurementSystem();
  //   }
  //   if(this.intervalData !== undefined) {
  //     this.buildGraphData(this.intervalData);
  //     this.tInfo.setUpdateGraph(true);
  //     this.tInfo.setUpdateMap(true);
  //     this.forceUpdate();
  //   }
  // }

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
      t.intervals = this.intervalData.iDists.slice();
      t.intervalDisplayUnits = this.intervalData.displayUnits;
      this.finishIntervalsSave(t, del);
    }
  }

  // finish saving or deleteing the current intervals
  finishIntervalsSave = (t: TrekObj, del : boolean) => {

    this.tInfo.setIntervals(t.intervals);
    this.tInfo.intervalDisplayUnits = t.intervalDisplayUnits;
    this.tInfo.saveTrek(t, 'update')
    .then(() => {
      this.props.toastSvc.toastOpen({tType: 'Success', content: 'Intervals ' + (del ? 'deleted.' : 'saved.')});
      this.setIntervalChange(false);
      if(del) {
        this.cancelIntervalsActive();
      } 
    })
    .catch(() => {
      this.props.toastSvc.toastOpen({tType: 'Error', content: 'Intervals not ' + (del ? 'deleted.' : 'saved.')});
    })
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
    this.props.navigation.navigate('Images', {cmd: 'show', setIndex: index});
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
          title = this.changeTrekFn(val);  // try to change to the Next/Previous trek
          if (title !== '') {
            // change was successful 
            if(this.intervalsActive && (this.units === SAVED_UNITS)){
              // can't assume an interval set for new trek if none saved
              if (!this.tInfo.intervals ) { this.cancelIntervalsActive(); }
            }
            if (this.intervalsActive && this.tInfo.intervals){
              // prepare to display saved intervals for this trek
              this.units = SAVED_UNITS;
              this.intervalDist = -1;
              this.intervalValue = -1;
            }
            if(this.intervalsActive && (this.units === INTERVALS_UNITS)){
              // prepare to show fixed number of intervals for this trek
              this.intervalDist = this.tInfo.trekDist / this.intervalValue;
            }
            if(this.intervalsActive && !this.intervalDistOK()) {  
              // intervalDist is too small for this trek
              this.openIntervalForm();
              this.props.toastSvc.toastOpen({tType: 'Error', content: 'Interval distance too small.'});
              this.setWaiting(false);
              this.setLayoutOpts("NewAll");          
            } else {
              if (this.intervalsActive) {
                // rebuild interval data for this trek
                this.getIntervalData(this.intervalDist, this.tInfo.pointList);
                this.buildGraphData(this.intervalData);
                this.setSpeedDialZoom(false); 
                this.setSelectedIntervalIndex(0);
                this.scrollBarGraph(0);
              }
              this.props.navigation.setParams({ title: title, icon: this.tInfo.type });
              this.setWaiting(false);
              // set to show full path on map
              this.setLayoutOpts("NewAll");    
            }     
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
            if((this.units !== this.activeIntervalUnits) || (this.intervalValue !== this.activeIntervalValue)){
              this.units = this.activeIntervalUnits;
              this.intervalValue = this.units === SAVED_UNITS ? 0 : this.activeIntervalValue;
              this.showIntervals(true);
            } else {
              this.setIntervalFormDone('Keyboard');
              this.setIntervalFormOpen(false);
            }  
          } else {
            this.setIntervalFormDone('Dismiss');
          }
          break;
        default:
      }
    });
  }

  render () {

    const { controlsArea, navItem, navIcon, roundedTop } = this.props.uiTheme;
    const { highTextColor, highlightColor, lowTextColor,
            pageBackground, dividerColor, navIconColor,
             } = this.props.uiTheme.palette;
    const ints = (this.intervalsActive ) ? this.intervalDist : undefined;
    const iMarkers = ints ? this.intervalData.markers : undefined;
    const changeZFn = iMarkers ? this.toggleSpeedDialZoom : this.toggleSpeedDialZoom;
    const sdIcon = iMarkers ? (this.speedDialZoom ? "ZoomOut" : "ZoomIn") 
                            : (this.speedDialZoom ? "ZoomOutMap" : "Location");
    const sdValue = iMarkers ? (this.speedDialZoom ? "All" : "Interval")
                             : (this.speedDialZoom ? "All" : "Current");
    const interval = ((iMarkers !== undefined) && this.speedDialZoom) ? this.selectedIntervalIndex : undefined;
    const showButtonHeight = 20;
    const caHt = CONTROLS_HEIGHT - 20;
    const bottomHeight = (ints && this.graphOpen) ? INTERVAL_AREA_HEIGHT + caHt: caHt;
    const prevOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Prev', true) === 'OK');
    const nextOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Next', true) === 'OK');

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      caAdjust: {
        height: caHt,
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
        backgroundColor: pageBackground,
        height: INTERVAL_AREA_HEIGHT,
        zIndex: this.zValue,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: caHt,
        overflow: "hidden",
      },
      topBorder: {
        borderTopWidth: 2,
        borderStyle: "solid",
        borderTopColor: dividerColor,
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
        flexDirection: "row",
        paddingHorizontal: 10,
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
      }
    })

    const borderTop = (ints || this.statsOpen) ? {borderTopColor: highTextColor} : roundedTop;

    return (
      <View style={styles.container}>
        <TrekDisplay 
          layoutOpts={this.layoutOpts} 
          intervalMarkers={iMarkers}
          intervalLabelFn={this.intervalLabel}
          selectedInterval={this.selectedIntervalIndex}
          selectedPath={ints ? this.intervalData.segPaths[this.selectedIntervalIndex] : undefined}
          selectFn={this.setSelectedIntervalIndex} 
          bottom={bottomHeight} 
          speedDialIcon={sdIcon}
          speedDialValue={sdValue}
          markerDragFn={this.markerToPath}
          changeMapFn={this.tInfo.setDefaultMapType}
          changeZoomFn={changeZFn}
          showImagesFn={this.showCurrentImageSet}
          prevFn={prevOk ? (() => this.setActiveNav('Prev')) : undefined}
          nextFn={nextOk ? (() => this.setActiveNav('Next')) : undefined}
        />
        {this.waitingForChange && 
          <Waiting/>
        }
        <View style={styles.graphAndControls}>
          <SlideUpView 
            bgColor="white"
            startValue={INTERVAL_AREA_HEIGHT}
            endValue={0}
            open={this.graphOpen}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={roundedTop}>
              <View style={styles.showControls}>
                <IconButton
                  label="DIST"
                  onPressFn={this.setShow}
                  onPressArg={'Distance'}
                  style={this.show === "Distance" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.show === "Distance" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="ELEV"
                  onPressFn={this.setShow}
                  onPressArg={'Elevation'}
                  style={this.show === "Elevation" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.show === "Elevation" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="TIME"
                  onPressFn={this.setShow}
                  onPressArg={'Time'}
                  style={this.show === "Time" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.show === "Time" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="SPEED"
                  onPressFn={this.setShow}
                  onPressArg={'Speed'}
                  style={this.show === "Speed" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.show === "Speed" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="CALS"
                  onPressFn={this.setShow}
                  onPressArg={'Calories'}
                  style={this.show === "Calories" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.show === "Calories" ? styles.buttonTextSelected : styles.buttonText}
                />
              </View>
              <View style={styles.graphArea}>
                <View style={styles.graph}>
                  <BarDisplay 
                        data={this.intervalGraphData.items} 
                        dataRange={this.intervalGraphData.range}
                        selected={this.selectedIntervalIndex}
                        selectFn={this.setSelectedIntervalIndex} 
                        barWidth={60}
                        maxBarHeight={85}
                        style={{height: 115, backgroundColor: "transparent"}}
                        scrollToBar={this.scrollToBar}
                      />
                </View>
              </View>
            </View>
          </SlideUpView>
        </View>
        <NumbersBar 
          bottom={caHt} 
          numbersHeight={this.graphOpen ? INTERVAL_AREA_HEIGHT : undefined}
          open={this.statsOpen}
          interval={interval}
          intervalData={this.intervalData}
        />
        <TrekLimitsForm
          bottom={this.keyboardOpen ? 0 : caHt}
          open={this.intervalFormOpen}
          done={this.intervalFormDone}
          limits={this.limitProps}
        />
        {!this.intervalFormOpen &&
        <View style={[controlsArea, styles.caAdjust, borderTop]}>
          {(ints && this.tInfo.intervals) &&
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="Delete"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsDelete"
            />
          }
          {(ints && this.intervalChange) &&
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="CheckMark"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsSave"
            />
          }
          {ints &&
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="Close"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsDone"
            />
          }
          {(!ints) &&
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="LinearScale"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Intervals"
            />
          }
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon={this.statsOpen ? 'ChevronDown' : 'ChevronUp'}
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Stats"
            />
        </View>
        }
        {(this.intervalFormOpen && !this.keyboardOpen) &&
          <View style={[controlsArea, styles.caAdjust, borderTop]}>
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsCancel"
            />
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="CheckMark"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsContinue"
            />
          </View>
        }
      </View>
    )   

  }
}

export default SelectedTrek;

