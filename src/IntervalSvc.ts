import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';

import { TrekInfo, TrekTimeInterval, TrekPoint, NumericRange, ElevationData
          } from './TrekInfoModel'
import { BarData, BarGraphInfo } from './BarDisplayComponent';
import { UtilsSvc, DRIVING_A_CAR_MET, ACTIVITY_SPEEDS, DistAndPoint } from './UtilsService';
import { LoggingSvc, TREK_LIMIT_TYPE_DIST } from './LoggingService';
import { MainSvc, TrekType, SMALL_DIST_UNITS_SYS } from './MainSvc';
import { TrekSvc } from './TrekSvc';

export interface SegmentAndPoint {
  segIndex: number,
  point: LatLng
}

export const RANGE_COLORS = { 
  speed: ['#4d4dff', '#00cc00', '#ffff00', '#ff9900', '#ff3300'],
  calories: ['#4d4dff', '#ff9900', '#00cc00', '#ffff00', '#ff3300'],
  elevation: ['#ff3300', '#ff9900', '#ffff00', '#00cc00', '#4d4dff'],
};
export interface RateRangeLine {
  lineSegment: LatLng[], 
  fillColor: string, 
  duration: number
}

export interface RangeDataPathsObj {
  lines: RateRangeLine[],
  legend: {title: string, ranges: { start: string, end: string, color: string }[]}
}

export interface TrekValueRangesObj {
  items: {value: number, size: number}[], 
  ranges: number[], 
  dataRange: NumericRange
}

export type RangeDataType = "speed" | "calories" | "elevation";
export const RANGE_TYPE_SWITCH = {speed: 'calories', calories: 'elevation', elevation: 'speed'};

export interface RangeDataInfoObj {
  rangeType:  RangeDataType,  // type of rate ranges to create
  pointList:  TrekPoint[],    // points to use for paths
  dist:       number,         // distance of trek
  weight:     number,         // weight to use for calorie calculations
  packWeight: number,         // packWeight to use for calories
  hills:      string,         // hills category for calories
  type:       TrekType,       // activity type for calories
  elevs?:     ElevationData[] // array of elevation values
}

export interface ElevSegmentIndices {
  first: number,
  last: number
}

export const SAVED_UNITS = "saved";
export const INTERVALS_UNITS = "intervals";

export interface IntervalData {
  markers     ?: LatLng[],        // location on map for marker
  distUnits   ?: string,          // units used to display interval distances
  labelUnits  ?: string,          // units used to display interval labels (callouts)
  segIndicies ?: number[],        // trek path segment that contains each marker
  segPaths    ?: LatLng[][],      // path (as LatLng) from this marker to the next
  segPoints   ?: TrekPoint[][],   // segPath as full TrekPoints
  endDists    ?: number[],        // ending distances for each interval
  startTimes  ?: number[],        // starting times for intervals
  iDists      ?: number[],        // distance for each interval
  distRange   ?: NumericRange,    // range for interval distances
  times       ?: number[],        // duration values for each segment
  timeRange   ?: NumericRange,    // range for interval durations
  elevData    ?: ElevSegmentIndices[], // part of elevations array that applies to each segment
  avgElevs    ?: number[],        // elevation average for each segment
  elevRange   ?: NumericRange,    // range for interval elevations
  speeds      ?: number[]         // average speed for each segment
  speedRange  ?: NumericRange,    // range for interval speeds
  cals        ?: number[]         // calories for each segment
  calsRange   ?: NumericRange,    // range for interval calories
}

export interface IntervalAdjustInfo {
  min: number,
  max: number,
  curr: number,
  iNum: number
}

export const INTERVAL_AREA_HEIGHT = 120;
export const INTERVAL_GRAPH_HEIGHT = 95;


export class IntervalSvc {

  @observable intervalChange;
  @observable show;

  intervalData : IntervalData;
  units = '';
  intervalDist = 0;
  intervalValue = 0;
  lastIntervalValue = 0;
  lastUnits = '';
  lastIntervalTrek = '';
  graphBarWidth = 50;
  intervalGraphData: BarGraphInfo = {items: [], range: {max: 0, min: 0, range: 0}};

  constructor ( private mainSvc: MainSvc, private utilsSvc: UtilsSvc, 
                private trekSvc: TrekSvc, private loggingSvc: LoggingSvc ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
    this.setIntervalChange(false);
    this.show = 'Speed';
  }
  
  @action
  setIntervalChange = (status: boolean) => {
    this.intervalChange = status;
  }

  // select which data value to show on graph
  @action
  setShow = (val: string) => {
    this.show = val;
    this.buildGraphData(this.intervalData);
  }

  setIntervalValue = (vals: any) => {
    this.intervalValue = vals.value;
    this.units = vals.units;
  }

  // return an IntervalAdjustInfo object for the given interval.
  // the first interval is interval 0.
  getIntervalAdjustInfo = (iNum: number, units: string) : IntervalAdjustInfo => {
    let info : IntervalAdjustInfo = {} as IntervalAdjustInfo;
    let maxInt = this.intervalData.markers.length - 1;
    let iData = this.intervalData;

    if (iNum >= 0 && iNum < maxInt) {
      info.iNum = iNum;
      switch(units) {
        case 'time':
          info.min = iNum === 0 ? 0 : iData.startTimes[iNum - 1] + iData.times[iNum - 1];
          info.curr = iData.startTimes[iNum] + iData.times[iNum];
          info.max = iData.startTimes[iNum + 1] + iData.times[iNum + 1];
          break;
        default:        
          info.min = iNum === 0 ? 0 : this.intervalData.endDists[iNum - 1];
          info.curr = this.intervalData.endDists[iNum];
          info.max = this.intervalData.endDists[iNum + 1];
      }
    } else {
      if (iNum < 0) {
        info.iNum = -1;
        info.min = info.max = info.curr = 0;
      } else {
        info.iNum = maxInt;
        switch(units) {
          case 'time':
            info.min = info.max = info.curr = iData.startTimes[maxInt] + iData.times[maxInt];
            break;
          default:
            info.min = info.max = info.curr = this.intervalData.endDists[maxInt];
        }
      }
    }
    return info;
  }

  // return the distance from start of trek for the given interval
  getIntervalAdjustLoc = (iNum: number, units: string) : number => {
    let iData = this.intervalData;

    if(iNum >= 0) {
      switch(units) {
        case 'time':
          return iData.startTimes[iNum] + iData.times[iNum];
        default:
          return iData.endDists[iNum];
      }
    }
    return 0;
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
        distAndPt = this.utilsSvc.distToSegmentSquared(point, segStart, segEnd);
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
  markerToPath = (trek: TrekInfo, index: number, pt: LatLng, path: LatLng[], pointList: TrekPoint[]) => {
    let segAndPt: SegmentAndPoint;
    let iData = this.intervalData;
    let validPath : LatLng[];

    validPath = iData.segPaths[index].concat(iData.segPaths[index+1]);
    segAndPt = this.findNearestPoint(pt, validPath);    // restrict search to validPath
    segAndPt = this.findNearestPoint(segAndPt.point, path); // get segAndPt.segIndex relative to full path
    this.finishMarkerToPath(trek, index, segAndPt, pointList);
  }

  // call moveIntervalMarker for given marker index and point information
  finishMarkerToPath = (trek: TrekInfo, index: number, segAndPt: SegmentAndPoint, pointList: TrekPoint[]) => {  
    this.moveIntervalMarker(trek, index, segAndPt, pointList);
    this.buildGraphData(this.intervalData);
    this.setIntervalChange(true);
  } 

  // format text for a label to display as marker callout
  intervalLabel = (index: number) : string => {
    let lUnits = this.intervalData.labelUnits;
    switch(lUnits){
      case 'time':
        return this.utilsSvc.timeFromSeconds(this.intervalData.startTimes[index] + 
                                      this.intervalData.times[index])
      default:
        return this.utilsSvc.formatDist(this.intervalData.endDists[index], lUnits);
    }
  }
  
  // The interval marker at 'index' has moved to 'newLoc'.
  // The final marker cannot be moved
  //  - Recompute the values of given interval and interval after that.
  @action
  moveIntervalMarker = (trek: TrekInfo, index: number, newLoc: SegmentAndPoint, tPath: TrekPoint[]) => {
    let tS = this.trekSvc;
    let uSvc = this.utilsSvc;
    let mS = this.mainSvc;
    let iData = this.intervalData;
    let lastMarkerIndex = iData.markers.length - 1;
    let segD, partD;
    const nElevs = tS.hasElevations(trek) ? trek.elevations.length - 1 : 0;
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
    iData.times[index + 1] = ((index + 1) === lastMarkerIndex ? trek.duration : iData.startTimes[index + 2])
                               - iData.startTimes[index + 1];

    // update the length of time for this interval
    iData.times[index] = iData.startTimes[index + 1] - iData.startTimes[index];

    if (nElevs) {
      // update the elevation value for this interval (use average)
      let eStartIndex = index > 0 ?
            this.utilsSvc.getElevationsIndex(trek.elevations, trek.trekDist, iData.endDists[index - 1]) :
            0;
      let eEndIndex = this.utilsSvc.getElevationsIndex(trek.elevations, trek.trekDist, iData.endDists[index]);
      iData.elevData[index].first = eStartIndex;
      iData.elevData[index].last = eEndIndex;
      iData.avgElevs[index] = 
                  this.utilsSvc.getArraySegmentAverage(trek.elevations, eStartIndex, eEndIndex);

      // update the elevation value for the next interval (use average)
      let eNextIndex = 
            this.utilsSvc.getElevationsIndex(trek.elevations, trek.trekDist, iData.endDists[index + 1]);
      iData.elevData[index + 1].first = eEndIndex;
      iData.elevData[index + 1].last = eNextIndex;
      iData.avgElevs[index + 1] = 
                  this.utilsSvc.getArraySegmentAverage(trek.elevations, eEndIndex, eNextIndex);
    }

    // update the average speed for the interval
    iData.speeds[index] = 
      uSvc.computeRoundedAvgSpeed(mS.measurementSystem, iData.iDists[index], iData.times[index]);

    // update the average speed for the next interval
    iData.speeds[index + 1] = 
      uSvc.computeRoundedAvgSpeed(mS.measurementSystem, iData.iDists[index + 1], iData.times[index + 1]);

    // update the calories for the interval
    iData.cals[index] =  uSvc.computeCalories(iData.segPoints[index], 0,
                          trek.type, trek.hills, trek.weight, tS.getPackWeight(trek));

    // update the calories for the next interval
    iData.cals[index + 1] = uSvc.computeCalories(iData.segPoints[index + 1], 0,
                          trek.type, trek.hills, trek.weight, tS.getPackWeight(trek));

    // recompute the interval data ranges
    this.getDataRanges();
}

  // Return a LatLng[] for the path for the interval 'index'
  getIntervalPath = (index: number, tPath: TrekPoint[]) : {path: LatLng[], points: TrekPoint[]} => {
    let path: LatLng[] = [];
    let points: TrekPoint[] = [];
    let iData = this.intervalData;
    let iSeg = 0;
    let uSvc = this.utilsSvc;

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
      dist += this.utilsSvc.calcDistLatLng(list[i+1], list[i]);
    }
    return dist;
  }

  // check that we have a reasonable value for number of intervals
  intervalDistOK = (trek: TrekInfo, val = this.intervalDist) => {
    if (this.intervalValue === -1) { return true; }
    if (this.intervalValue === 0) { return false; }
    if (this.units === 'time'){
      return (trek.duration / val ) < 100;
    }
    return (trek.trekDist / val) < 100;
  }

  // return the units selector for labels or bars for the given units
  getIntervalDisplayUnits = (trek: TrekInfo, units: string, forLabels: boolean) => {
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
      case 'time':
        val = forLabels ? 'time' : this.mainSvc.distUnits();
        break;
      case INTERVALS_UNITS:
        val = this.mainSvc.distUnits();
        break;
      case SAVED_UNITS:
        val = trek.intervalDisplayUnits || this.mainSvc.distUnits();
        if(val === 'time' && !forLabels) {
          val = this.mainSvc.distUnits();
        }
        break;
      default:
        val = this.mainSvc.distUnits();
        break;
    }
    return val;
  }

  // Given the interval distance, compute marker locations and values of several data categories for each interval.
  getIntervalData = (trek: TrekInfo, iDist: number, tPath: TrekPoint[]) => {
    let uSvc = this.utilsSvc;
    let iData : IntervalData;
    let dist = 0, eDist = 0, testDist;
    let intervalStartTime, intervalTime, newTime;
    let intIndex = 0;
    const nElevs = this.trekSvc.hasElevations(trek) ? trek.elevations.length-1 : 0;
    let tempPts = uSvc.copyTrekPath(tPath); // copy path data
    const nPts = tempPts.length;
    let endTrekPt = tempPts[nPts - 1];
    let finalPt = false;
    let d : number, part : number;
    let timeInts : TrekTimeInterval[] = []; 
    let eStartIndex = 0, eEndIndex = 0;
    
    this.intervalData = { markers: [], segIndicies: [], iDists: [], segPaths: [], segPoints: [], 
                          startTimes: [], endDists: [], elevData: [], avgElevs: [], times: [], 
                          speeds: [], cals: [] };
    iData = this.intervalData;
    if(this.units === 'time'){
      timeInts = this.utilsSvc.getTrekTimeIntervals(tempPts, iDist );
    }
    iData.distUnits = this.getIntervalDisplayUnits(trek, this.units, false);
    iData.labelUnits = this.getIntervalDisplayUnits(trek, this.units, true);
    if (tempPts.length > 0) {
      intervalStartTime = tempPts[0].t || 0;
      for(let i=1; i<nPts; i++){
        if(i === (nPts - 1)) { 
          finalPt = true; 
        };
        if (dist === 0) {                                // new interval?
          if (this.units === 'time'){
            // use distance from timeIntervals array
            testDist = timeInts[intIndex].distance;
          } else {
            // if trek has saved intervals and we're not replacing them, use saved interval distances
            testDist = (trek.intervals && iDist === -1) ? trek.intervals[intIndex] : iDist;
          }
          intervalStartTime = tempPts[i - 1].t || 0;  // update start time for new interval
          iData.segPaths.push([]);                    // add new array to hold segment path LatLngs
          iData.segPoints.push([]);                    // add new array to hold segment path TrekPoints
          iData.startTimes.push(intervalStartTime);
        }
        // add last point to current segment path
        iData.segPaths[intIndex].push({latitude: tempPts[i-1].l.a, longitude: tempPts[i-1].l.o});
        iData.segPoints[intIndex].push(tempPts[i-1]);
        d = uSvc.calcDistLaLo(tempPts[i-1].l, tempPts[i].l);
        if (finalPt || (dist + d >= testDist)) {      // will the distance to this point complete the interval?
          part = finalPt ? 1 : ((testDist - dist) / d);    // yes, what % of the distance do we need?
          // compute the point time for the replacement point
          newTime = Math.round((tempPts[i].t - tempPts[i - 1].t) * part + tempPts[i - 1].t);
          intervalTime = newTime - intervalStartTime; // compute the duration for this interval
          iData.times.push(intervalTime);
          iData.segIndicies.push(i-1);               // save which trek segment has end of interval (marker)
          iData.speeds.push(
              this.utilsSvc.computeRoundedAvgSpeed(this.mainSvc.measurementSystem, testDist, intervalTime));
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
          iData.cals.push(uSvc.computeCalories(iData.segPoints[intIndex], 0,
                        trek.type, trek.hills, trek.weight, this.trekSvc.getPackWeight(trek)));
          iData.iDists.push(testDist);        // save length of this interval
          if (nElevs) {                               // set the elevation value for this interval
            eEndIndex = 
              this.utilsSvc.getElevationsIndex(trek.elevations, trek.trekDist, iData.endDists[intIndex]);
            iData.elevData.push({first: eStartIndex, last: eEndIndex});
            iData.avgElevs.push(
                    this.utilsSvc.getArraySegmentAverage(trek.elevations, eStartIndex, eEndIndex));
            eStartIndex = eEndIndex;                 
          }
          if(!finalPt) { i--; }               // set to do this point over
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
        if (nElevs) {                               // set the elevation value for last interval
          eEndIndex = trek.elevations.length - 1;
          iData.elevData.push({first: eStartIndex, last: eEndIndex});
          iData.avgElevs.push(
                    this.utilsSvc.getArraySegmentAverage(trek.elevations, eStartIndex, eEndIndex));
        }
        iData.endDists.push(trek.trekDist);
        iData.markers.push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        intervalTime = endTrekPt.t - intervalStartTime;
        iData.segIndicies.push(nPts-1);  // save which trek segment has end of interval (marker)
        iData.segPaths[intIndex].push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        iData.segPoints[intIndex].push(endTrekPt);
        iData.iDists.push(dist);
        iData.times.push(intervalTime);
        iData.speeds.push(
              this.utilsSvc.computeRoundedAvgSpeed(this.mainSvc.measurementSystem, dist, intervalTime));
        iData.cals.push(uSvc.computeCalories(iData.segPoints[intIndex], 0,
                          trek.type, trek.hills, trek.weight, this.trekSvc.getPackWeight(trek)));
      }
      this.getDataRanges();
    }
  }

  // get the data ranges for the elevs, times, dists, cals and speeds arrays if the intervalData obj
  getDataRanges = () => {
    let iData = this.intervalData;

    // set range information for elevations
    iData.elevRange = this.utilsSvc.getNumericRange(iData.avgElevs);

    // set range information for times
    iData.timeRange = this.utilsSvc.getNumericRange(iData.times);

    // set range information for speeds
    iData.speedRange = this.utilsSvc.getNumericRange(iData.speeds);

    // set range information for calories
    iData.calsRange = this.utilsSvc.getNumericRange(iData.cals);

    // set range information for distances
    iData.distRange = this.utilsSvc.getNumericRange(iData.iDists);
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
          barItem.label1 = this.utilsSvc.timeFromSeconds(intData.times[i]);
          break;
        case "Speed":
          barItem.value = intData.speeds[i];
          barItem.label1 = intData.speeds[i].toString() + ' ' + this.mainSvc.speedUnits();
          break;
        case "Elevation":
          let e = Math.round(this.mainSvc.convertDist(intData.avgElevs[i]));
          barItem.value = intData.avgElevs[i];
          barItem.label1 = e.toString() + ' ' + this.mainSvc.smallDistUnits();
          break;
        case "Distance":
          barItem.value = intData.iDists[i];
          barItem.label1 = this.utilsSvc.formatDist(intData.iDists[i], intData.distUnits);
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

  // for the given trek, build polyLine segments showing the selected data (speed or calories/min) 
  // displayed as different colors for different ranges of the data values.
  // first analyze the trek points and determine reasonable ranges for the selected data.
  // next create groupings of points as they change value ranges.
  // make sure to impose a resonable minimum on duration in a new range.
  // return an array of {lineSegment: LatLng[], fillColor: string} and a 
  // Legend object with {title: string, ranges: {start: string, end: string, color: string}[]}
  buildRateRangePaths = (rdInfo: RangeDataInfoObj) : RangeDataPathsObj => {
    let result : RangeDataPathsObj = {lines: [], legend:{title: '', ranges: []}};
    let rangeInfo : TrekValueRangesObj = this.defineTrekValueRanges(rdInfo);
    let numRanges = rangeInfo.ranges.length + 1;

    if (rangeInfo === undefined) {return undefined;}

    // first, lets build the legend
    switch(rdInfo.rangeType){
      case 'speed':
        result.legend.title = 'Speed (' + this.mainSvc.speedUnits() + ')';
        break;
      case 'calories':
        result.legend.title = 'Calories/Min';
        break;
      case 'elevation':
        result.legend.title = 'Elevation (' + SMALL_DIST_UNITS_SYS[this.mainSvc.measurementSystem] + ')';
        break;
      default:
    }
    for(let i=0; i<=rangeInfo.ranges.length; i++) {
      let start = i === 0 ? rangeInfo.dataRange.min : rangeInfo.ranges[i-1];
      let end = i === rangeInfo.ranges.length ? rangeInfo.dataRange.max : rangeInfo.ranges[i];
      result.legend.ranges.push({start: this.getDisplayValue(start, rdInfo.rangeType, false), 
                                 end: this.getDisplayValue(end, rdInfo.rangeType, false), 
                                 color: RANGE_COLORS[rdInfo.rangeType][i + 5 - numRanges]})
    }

    // now, process the point data into line segments per data ranges
    let items = rangeInfo.items;
    let ranges = rangeInfo.ranges;
    let currRangeIndex = this.utilsSvc.findRangeIndex(items[0].value, ranges);
    let thisItemIndex;
    let points: TrekPoint[] = rdInfo.pointList;
    let elevPts = rdInfo.rangeType === 'elevation' && 
                  rdInfo.elevs && 
                  rdInfo.elevs.length ? Math.min(512, points.length) : 0;
    let minRangeSize = rdInfo.rangeType === 'elevation' ? 1 : 5; 
    let currRangeSize = 0;
    let currLine = 0;
    let itemRangeStart = 0;
    let i;

    result.lines.push({lineSegment: [], 
            fillColor: RANGE_COLORS[rdInfo.rangeType][currRangeIndex + 5 - numRanges], duration: 0})
    for(i=0; i<rangeInfo.items.length; i++) {
      thisItemIndex = this.utilsSvc.findRangeIndex(items[i].value, ranges);
      if (thisItemIndex === currRangeIndex || thisItemIndex === -1){  // watch out for bad data
        currRangeSize += items[i].size;
      } else {
        currRangeIndex = thisItemIndex;
        if (currRangeSize >= minRangeSize) {    

          // size of range is large enough, finish line and start next
          result.lines[currLine].duration = currRangeSize;
          result.lines[currLine].lineSegment = 
          this.getRangeDataLocations(points, itemRangeStart, i, rdInfo.dist, rdInfo.rangeType, elevPts);
          result.lines.push({lineSegment: [], 
              fillColor: RANGE_COLORS[rdInfo.rangeType][currRangeIndex + 5 - numRanges], duration: 0});
          currLine++;
          itemRangeStart = i;
          currRangeSize = items[i].size;
        } else {
          
          // size of this range is NOT large enough, switch current segment to new range
          result.lines[currLine].fillColor = RANGE_COLORS[rdInfo.rangeType][currRangeIndex + 5 - numRanges];
          currRangeSize += items[i].size;
        }
      }
    }
    result.lines[currLine].lineSegment = 
      this.getRangeDataLocations(points, itemRangeStart, 
              rdInfo.rangeType === 'elevation' ? i : i-1, rdInfo.dist, rdInfo.rangeType, elevPts);
    result.lines[currLine].duration = currRangeSize;

    return result;
  }


  // return a LatLng[] of points from the given TrekPoing[] that contains either the points
  // between and including the given first/last indices or points that are between the distances
  // represented by the first/last values times the distance between elevation readings.
  getRangeDataLocations = (ptList: TrekPoint[], first: number, 
                last: number, tDist: number, rangeType: RangeDataType, nElevs: number) : LatLng[]=> {
    let result: LatLng[] = [];
    if (rangeType !== 'elevation'){
      for (let i = first; i <= last; i++){
        result.push({latitude: ptList[i].l.a, longitude: ptList[i].l.o});
      }
    } else{
      if (nElevs){
        let eDist = tDist / nElevs;         // compute distance between elevation readings
        let startDist = first * eDist;
        let endDist = last * eDist;
        //  now include all path points between startDist and endDist
        for (let i = 0; i < ptList.length; i++) {
          if (ptList[i].d >= startDist ){
            if ((result.length === 0) && (i > 0)){     
              // first, get exact starting location if not absolute beginning of path
              let pt = this.loggingSvc.getPointAtLimit(ptList, startDist, tDist, TREK_LIMIT_TYPE_DIST).pt;
              result.push({latitude: pt.l.a, longitude: pt.l.o});
            }
            if (ptList[i].d <= endDist){
              result.push({latitude: ptList[i].l.a, longitude: ptList[i].l.o});
            } else {    
              // finally, get exact ending location and return
              let pt = this.loggingSvc.getPointAtLimit(ptList, endDist, tDist, TREK_LIMIT_TYPE_DIST).pt;
              result.push({latitude: pt.l.a, longitude: pt.l.o});
              return result;
            }
          }
        } 
      }
    }
    return result;
  }

  // return the given value formatted for display with units optional
  getDisplayValue = (val: number, type: RangeDataType, showUnits: boolean ) : string => {
    let precision: number;
    let newVal: number;
    let absVal = Math.abs(val);

    switch(type){
      case 'speed':
        if (showUnits){
          return this.utilsSvc.formatAvgSpeed(this.mainSvc.measurementSystem, val, 1);
        }
        return this.utilsSvc.computeRoundedAvgSpeed(this.mainSvc.measurementSystem, val, 1).toString();
      case 'calories':
        precision = absVal < 10 ? 10 : 1;
        newVal = Math.round(val * precision) / precision;
        if (showUnits){
          return newVal.toString() + ' /min';
        }
        return newVal.toString();
      case 'elevation':
        val = this.utilsSvc.convertDist(val, SMALL_DIST_UNITS_SYS[this.mainSvc.measurementSystem]);
        precision = absVal < 10 ? 10 : 1;
        newVal = Math.round(val * precision) / precision;
        if (showUnits){
          return newVal.toString() + ' ' + SMALL_DIST_UNITS_SYS[this.mainSvc.measurementSystem];
        }
        return newVal.toString();
      defalut:
        return '';
    }
  }

  // given a TrekObj, define an array of item values at each point in the trek and
  // an array of ranges for the items
  defineTrekValueRanges = (rdInfo: RangeDataInfoObj) : TrekValueRangesObj => {
    let itemRanges = [];
    let itemList : {value: number, size: number}[] = [];
    let valueRange : NumericRange = {max: -5000, min: 100000, range: 0};
    let list = rdInfo.pointList;
    let lastPtIndex = list.length - 1;
    let elevs = rdInfo.elevs;
    let spList: number[];
    let szList: number[];
    let val: number;

    if (list.length === 0) { return undefined; }
    if (rdInfo.rangeType !== 'elevation'){
      if(lastPtIndex > 80){
        spList = list.map((pt) => pt.s);  //extract speeds
      }
      szList = list.map((pt, i, list) => 
                          i === lastPtIndex ? 0 : list[i + 1].t - pt.t); // extract durations
    }
    switch (rdInfo.rangeType) {
      case 'speed':
        if(list.length > 80){ 
          // attempt to smooth speeds by computing a running average
          for(let i=0, j=4; i<=lastPtIndex; i++, j++) {
            if(spList[i] === 0){
              val = 0;
            } else {
              if(j<=lastPtIndex){
                val = this.utilsSvc.getArraySegmentAverage(spList, i, j, szList);
              } else {
                val = this.utilsSvc.getArraySegmentAverage(spList, i - 3, i, szList);
              }
            }
            if (val > valueRange.max){ valueRange.max = val; }
            if (val < valueRange.min){ valueRange.min = val; }
            itemList.push({value: val, size: szList[i]});
          } 
        } else{
          // get speeds at every point
          for(let i=0; i<=lastPtIndex; i++) {
            val = list[i].s;
            if (val > valueRange.max){ valueRange.max = val; }
            if (val < valueRange.min){ valueRange.min = val; }
            itemList.push({value: val, size: szList[i]});
          };
        }
        break;
      case 'calories':
        // get calories burned/minute at every point
        let metTable = this.utilsSvc.getMETTable(rdInfo.type, rdInfo.packWeight)
        let hIndex = this.utilsSvc.getHillsIndex(rdInfo.hills);
        let speedIndex, currMET, calRate;
        let weight = rdInfo.weight;
        let pWt = rdInfo.packWeight || 0;
        if(list.length > 80){ 
          // attempt to smooth speeds by computing a running average
          for(let i=0, j=5; i<=lastPtIndex; i++, j++) {
            if(j<=lastPtIndex){
              val = this.utilsSvc.getArraySegmentAverage(spList, i, j, szList);
            } else {
              val = this.utilsSvc.getArraySegmentAverage(spList, i - 4, i, szList);
            }
            speedIndex = this.utilsSvc.findRangeIndex(val, ACTIVITY_SPEEDS);
            if (speedIndex !== -1) {
              currMET = metTable[speedIndex][hIndex];
              calRate = currMET * (weight + (currMET === DRIVING_A_CAR_MET ? 0 : pWt)) / 60;
            } else {
              calRate = 0;
            }
            if (calRate > valueRange.max){ valueRange.max = calRate; }
            if (calRate < valueRange.min){ valueRange.min = calRate; }
            itemList.push({value: calRate, size: szList[i]});
          };
        } else {
          for(let i=0; i<=lastPtIndex; i++) {
            calRate = 0;
            // get speeds at every point
            speedIndex = this.utilsSvc.findRangeIndex(list[i].s, ACTIVITY_SPEEDS);
            if (speedIndex !== -1) {
              currMET = metTable[speedIndex][hIndex];
              calRate = currMET * (weight + (currMET === DRIVING_A_CAR_MET ? 0 : pWt)) / 60;
            }
            if (calRate > valueRange.max){ valueRange.max = calRate; }
            if (calRate < valueRange.min){ valueRange.min = calRate; }
            itemList.push({value: calRate, size: szList[i]});
          };
        }
        break;
      case 'elevation':
        // get elevations at every point
        lastPtIndex = elevs.length - 1;
        
        for(let i=0; i<=lastPtIndex; i++) {
          let val = elevs[i];
          if (val > valueRange.max){ valueRange.max = val; }
          if (val < valueRange.min){ valueRange.min = val; }
          itemList.push({value: val, size: 1});
          };
        break;
      default:
        return {items: [], ranges: [], dataRange: {max: 0, min: 0, range: 0}};
    }
    
    // now determine some ranges for the data in the itemList
    valueRange.range = valueRange.max - valueRange.min;
    let nRanges = valueRange.range >= 10 ? 5 : 3;
    let rSize = valueRange.range / nRanges;
    let precision = valueRange.range < 1 ? 100 : (valueRange.range > 10 ? 1 : 10);
    let rTop = Math.round((valueRange.min + rSize) * precision) / precision;
    for(let i=1; i<nRanges; i++) {
      itemRanges.push(rTop);
      rTop = Math.round((valueRange.min + (rSize * (i+1))) * precision) / precision;
    }

    return {items: itemList, ranges: itemRanges, dataRange: valueRange};
  } 

}

