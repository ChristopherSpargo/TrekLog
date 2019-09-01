import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';

import { TrekInfo, TrekTimeInterval, TrekPoint, NumericRange, TrekType,
          } from './TrekInfoModel'
import { BarData, BarGraphInfo } from './BarDisplayComponent';
import { UtilsSvc, DRIVING_A_CAR_MET, ACTIVITY_SPEEDS } from './UtilsService';

export interface DistAndPoint {
  dist: number,
  point: LatLng
}
export interface SegmentAndPoint {
  segIndex: number,
  point: LatLng
}

export const RANGE_COLORS = ['#4d4dff', '#00cc00', '#ffff00', '#ff9900', '#ff3300'];
export interface RateRangeLine {
  lineSegment: LatLng[], 
  fillColor: string, 
  duration: number
}

export interface RateRangePathsObj {
  lines: RateRangeLine[],
  legend: {title: string, ranges: { start: string, end: string, color: string }[]}
}

export interface TrekValueRangesObj {
  items: {value: number, duration: number}[], 
  ranges: number[], 
  dataRange: NumericRange
}

export type RangeDataType = "speed" | "calories";

export interface RateRangeInfoObj {
  rangeType:  RangeDataType,  // type of rate ranges to create
  pointList:  TrekPoint[],    // points to use for paths
  weight:     number,         // weight to use for calorie calculations
  packWeight: number,         // packWeight to use for calories
  hills:      string,         // hills category for calories
  type:       TrekType        // activity type for calories
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

  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo ) {
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

// return the squared distance between 2 points
  dist2 = (v: LatLng, w: LatLng) : number => { 
    return ((v.latitude - w.latitude) * (v.latitude - w.latitude)) + 
    ((v.longitude - w.longitude) * (v.longitude - w.longitude)) }

  // return the distance squared between a point (p) and a line segment(v,w)
  // and the point on the segment nearest to the given point
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
    this.moveIntervalMarker(index, segAndPt, this.trekInfo.pointList);
    this.buildGraphData(this.intervalData);
    this.setIntervalChange(true);
  } 

  intervalLabel = (index: number) : string => {
    let lUnits = this.intervalData.displayUnits;
    return this.utilsSvc.formatDist(this.intervalData.endDists[index], lUnits);
  }
  
  // The interval marker at 'index' has moved to 'newLoc'.
  // The final marker cannot be moved
  //  - Recompute the values of given interval and interval after that.
  @action
  moveIntervalMarker = (index: number, newLoc: SegmentAndPoint, tPath: TrekPoint[]) => {
    let tInfo = this.trekInfo;
    let uSvc = this.utilsSvc;
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

    if (nElevs) {
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
    }

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
  intervalDistOK = (val = this.intervalDist) => {
    if (this.intervalValue === -1) { return true; }
    if (this.intervalValue === 0) { return false; }
    if (this.units === 'minutes'){
      return (this.trekInfo.duration / val ) < 100;
    }
    return (this.trekInfo.trekDist / val) < 100;
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
      case 'minutes':
      case INTERVALS_UNITS:
        val = this.trekInfo.distUnits();
        break;
      case SAVED_UNITS:
        val = this.trekInfo.intervalDisplayUnits || this.trekInfo.distUnits();
        break;
      default:
    }
    return val;
  }

  // Given the interval distance, compute marker locations and values of several data categories for each interval.
  getIntervalData = (iDist: number, tPath: TrekPoint[]) => {
    let uSvc = this.utilsSvc;
    let iData : IntervalData;
    let dist = 0, eDist = 0, testDist, halfDist;
    let intervalStartTime, intervalTime, newTime;
    let intIndex = 0;
    const nElevs = this.trekInfo.hasElevations() ? this.trekInfo.elevations.length-1 : 0;
    let tempPts = uSvc.copyTrekPath(tPath); // copy path data
    const nPts = tempPts.length;
    let endTrekPt = tempPts[nPts - 1];
    let finalPt = 0;
    let d : number, part : number;
    let timeInts : TrekTimeInterval[] = []; 
    
    this.intervalData = { markers: [], segIndicies: [], iDists: [], segPaths: [], segPoints: [], 
                          startTimes: [], endDists: [], elevs: [], times: [], speeds: [], cals: [] };
    iData = this.intervalData;
    if(this.units === 'minutes'){
      timeInts = this.utilsSvc.getTrekTimeIntervals(tempPts, iDist );
    }
    iData.displayUnits = this.getIntervalDisplayUnits(this.units);
    if (tempPts.length > 0) {
      intervalStartTime = tempPts[0].t || 0;
      for(let i=1; i<nPts; i++){
        if(i === (nPts - 1)) { 
          finalPt = .01; 
        };
        if (dist === 0) {                                // new interval?
          if (this.units === 'minutes'){
            // use distance from timeIntervals array
            testDist = timeInts[intIndex].distance;
          } else {
            // if trek has saved intervals and we're not replacing them, use saved interval distances
            testDist = (this.trekInfo.intervals && iDist === -1) ? this.trekInfo.intervals[intIndex] : iDist;
          }
          intervalStartTime = tempPts[i - 1].t || 0;  // update start time for new interval
          iData.segPaths.push([]);                    // add new array to hold segment path LatLngs
          iData.segPoints.push([]);                    // add new array to hold segment path TrekPoints
          iData.startTimes.push(intervalStartTime);
          if (nElevs) {                               // set the elevation value for this interval
            halfDist = (testDist > this.trekInfo.trekDist - eDist) ? this.trekInfo.trekDist - eDist : testDist;
            iData.elevs.push(this.trekInfo.elevations[
                Math.round( ((eDist + (halfDist / 2)) / this.trekInfo.trekDist) * nElevs)]);
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
          iData.speeds.push(this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, testDist, intervalTime));
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
                            this.trekInfo.type, this.trekInfo.hills, this.trekInfo.weight, this.trekInfo.getPackWeight()));
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
        iData.endDists.push(this.trekInfo.trekDist);
        iData.markers.push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        intervalTime = endTrekPt.t - intervalStartTime;
        iData.segIndicies.push(nPts-1);  // save which trek segment has end of interval (marker)
        iData.segPaths[intIndex].push(uSvc.cvtLaLoToLatLng(endTrekPt.l));
        iData.segPoints[intIndex].push(endTrekPt);
        iData.iDists.push(dist);
        iData.times.push(intervalTime);
        iData.speeds.push(this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, dist, intervalTime));
        iData.cals.push(uSvc.computeCalories(iData.segPoints[intIndex], 
                          this.trekInfo.type, this.trekInfo.hills, this.trekInfo.weight, this.trekInfo.getPackWeight()));
}
      this.getDataRanges();
    }
  }

  // get the data ranges for the elevs, times, dists, cals and speeds arrays if the intervalData obj
  getDataRanges = () => {
    let iData = this.intervalData;

    if (iData.elevs.length) {
      // set range information for elevations
      iData.elevRange = this.utilsSvc.getNumericRange(iData.elevs);
    }

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
          barItem.label1 = intData.speeds[i].toString() + ' ' + this.trekInfo.speedUnits();
          break;
        case "Elevation":
          let e = Math.round(this.trekInfo.convertDist(intData.elevs[i]));
          barItem.value = intData.elevs[i];
          barItem.label1 = e.toString() + ' ' + this.trekInfo.smallDistUnits();
          break;
        case "Distance":
          barItem.value = intData.iDists[i];
          barItem.label1 = this.utilsSvc.formatDist(intData.iDists[i], intData.displayUnits);
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
  buildRateRangePaths = (rrInfo: RateRangeInfoObj) : RateRangePathsObj => {
    let result : RateRangePathsObj = {lines: [], legend:{title: '', ranges: []}};
    let rangeInfo : TrekValueRangesObj = this.defineTrekValueRanges(rrInfo);
    let numRanges = rangeInfo.ranges.length + 1;

    if (rangeInfo === undefined) {return undefined;}

    // first, lets build the legend
    result.legend.title = rrInfo.rangeType === 'speed' ? ('Speed (' + this.trekInfo.speedUnits() + ')') : 
                                                          'Calories/Min';
    for(let i=0; i<=rangeInfo.ranges.length; i++) {
      let start = i === 0 ? rangeInfo.dataRange.min : rangeInfo.ranges[i-1];
      let end = i === rangeInfo.ranges.length ? rangeInfo.dataRange.max : rangeInfo.ranges[i];
      result.legend.ranges.push({start: this.getDisplayValue(start, rrInfo.rangeType, false), 
                                 end: this.getDisplayValue(end, rrInfo.rangeType, false), 
                                 color: RANGE_COLORS[i + 5 - numRanges]})
    }

    // now, process the point data into line segments per data ranges
    let minDur = 5; // minDuration || Math.max(trek.duration/50, 20);
    let items = rangeInfo.items;
    let ranges = rangeInfo.ranges;
    let currRangeIndex = this.utilsSvc.findRangeIndex(items[0].value, ranges);
    let thisItemIndex;
    let currRangeDuration = 0;
    let points = rrInfo.pointList;
    let currLine = 0;
    result.lines.push({lineSegment: [], fillColor: RANGE_COLORS[currRangeIndex + 5 - numRanges], duration: 0})
    for(let i=0; i<rangeInfo.items.length; i++) {
      thisItemIndex = this.utilsSvc.findRangeIndex(items[i].value, ranges);
      if (thisItemIndex === currRangeIndex || thisItemIndex === -1){  // watch out for bad data
        currRangeDuration += items[i].duration;
        result.lines[currLine].lineSegment.push({latitude: points[i].l.a, longitude: points[i].l.o});
      } else {
        currRangeIndex = thisItemIndex;
        result.lines[currLine].lineSegment.push({latitude: points[i].l.a, longitude: points[i].l.o});
        if (currRangeDuration >= minDur) {    

          // time in this range was long enough, finish line and start next
          result.lines[currLine].duration = currRangeDuration;
          result.lines.push({lineSegment: [], fillColor: RANGE_COLORS[currRangeIndex + 5 - numRanges], duration: 0});
          currLine++;
          result.lines[currLine].lineSegment.push({latitude: points[i].l.a, longitude: points[i].l.o});
          currRangeDuration = items[i].duration;
        } else {
          
          // time in this range was NOT long enough, switch current segment to new range
          result.lines[currLine].fillColor = RANGE_COLORS[currRangeIndex + 5 - numRanges];
          currRangeDuration += items[i].duration;
        }
      }
    }
    result.lines[currLine].duration = currRangeDuration;

    return result;
  }

  // return the given value formatted for display with units optional
  getDisplayValue = (val: number, type: RangeDataType, showUnits: boolean ) : string => {
    switch(type){
      case 'speed':
        if (showUnits){
          return this.utilsSvc.formatAvgSpeed(this.trekInfo.measurementSystem, val, 1);
        }
        return this.utilsSvc.computeRoundedAvgSpeed(this.trekInfo.measurementSystem, val, 1).toString();
      case 'calories':
        let precision = val < 10 ? 10 : 1;
        let newVal = Math.round(val * precision) / precision;
        if (showUnits){
          return newVal.toString() + ' /min';
        }
        return newVal.toString();
      defalut:
        return '';
    }
  }

  // given a TrekObj, define an array of item values at each point in the trek and
  // an array of ranges for the items
  defineTrekValueRanges = (rrInfo: RateRangeInfoObj) : TrekValueRangesObj => {
    let itemRanges = [];
    let itemList : {value: number, duration: number}[] = [];
    let valueRange : NumericRange = {max: -5000, min: 100000, range: 0};
    let points = rrInfo.pointList;
    let lastPtIndex = points.length - 1;

    if (points.length === 0) { return undefined; }
    switch (rrInfo.rangeType) {
      case 'speed':
        // get speeds at every point
        for(let i=0; i<=lastPtIndex; i++) {
          let val = points[i].s;
          if (val > valueRange.max){ valueRange.max = val; }
          if (val < valueRange.min){ valueRange.min = val; }
          itemList.push({value: val,
                          duration: i === lastPtIndex ? 0 : (points[i + 1].t - points[i].t)});
          };
        break;
      case 'calories':
        // get calories burned/minute at every point
        let metTable = this.utilsSvc.getMETTable(rrInfo.type, rrInfo.packWeight)
        let hIndex = this.utilsSvc.getHillsIndex(rrInfo.hills);
        let speedIndex, currMET, calRate;
        let weight = rrInfo.weight;
        let pWt = rrInfo.packWeight || 0;
        for(let i=0; i<rrInfo.pointList.length; i++) {
          calRate = 0;
          speedIndex = this.utilsSvc.findRangeIndex(points[i].s, ACTIVITY_SPEEDS);
          if (speedIndex !== -1) {
            currMET = metTable[speedIndex][hIndex];
            calRate = currMET * (weight + (currMET === DRIVING_A_CAR_MET ? 0 : pWt)) / 60;
          }
          if (calRate > valueRange.max){ valueRange.max = calRate; }
          if (calRate < valueRange.min){ valueRange.min = calRate; }
          itemList.push({value: calRate, 
                         duration: i === lastPtIndex ? 0 : (points[i + 1].t - points[i].t)});
        };
        break;
      default:
        return {items: [], ranges: [], dataRange: {max: 0, min: 0, range: 0}};
    }
    
    // now determine some ranges for the data in the itemList
    valueRange.range = valueRange.max - valueRange.min;
    let nRanges = valueRange.range >= 15 ? 5 : 3;
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

