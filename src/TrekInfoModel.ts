import { observable, action } from 'mobx';

import { WeatherData } from './WeatherSvc';
import { TrekImageSet } from './ImageService';
import { TrekType, SpeedStatType } from './MainSvc';

// Class containing information about and service functions for a Trek

export const CURR_DATA_VERSION = '5.6';   
  // version 2 added weather conditions data
  // version 3 added hiking data (packWeight)
  // version 4 converted to storing with smaller key names
  // version 4.2 store calories computation
  // version 4.3 store drivingACar status
  // version 4.4 change calorie calculation
  // version 5.0 start using files instead of AsyncData
  // version 5.1 start storing images in Pictures/TrekLog directory
  // version 5.2 truncate speed values to 4 significant digits
  // version 5.3 set start point time to 0 and duration to end point time
  // version 5.4 store cumulative distance with each point in trek pointList
  // version 5.5 add sDate property to TrekImage
  // version 5.6 remove time property from TrekImage

export interface LaLo {
  a: number,      // latitude value
  o: number       // longitude value
}

// Define an object for the data kept for each GPS point in the Trek
export interface TrekPoint {
  l: LaLo,        // location
  t: number,      // time (seconds) point recieved
  s: number,      // speed reported at pt
  d ?: number,    // distance to point along path
}

export type ElevationData = number;

export interface NumericRange {
  max: number,
  min: number,
  range: number
}

// Define the object stored in the database for a Trek
export interface TrekObj {
    dataVersion:    string,
    group:          string,
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
    pointList?:     TrekPoint[],
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
    course ?:       string,             // course association
}

// fields saved for restore operation
export interface TrekState  {
  dataVersion:    string,
  group:          string,
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
  totalGpsPoints?:number,             // count of GPS points without smoothing
  pointList?:     TrekPoint[],
  hills:          string,             // hilliness of the path (flat, light, heavy)
  elevations:     ElevationData[],    // array of elevations along the trek
  elevationGain:  number,
  trekLabel ?:    string,             // descriptive label for this trek
  trekNotes ?:    string,             // free-form notes on this trek
  trekImages ?:   TrekImageSet[],     // pictures/videos taken while logging
  calories ?:     number,             // calories burned
  drivingACar ?:  boolean,            // true if user was driving a car for the trek
  course ?:       string,             // course association
  showSpeedStat ?:      SpeedStatType,
}

export interface TrekTypeDataNumeric  {
  Walk?: number,
  Run?:  number,
  Bike?: number,
  Hike?: number,
  Board?: number,
  Drive?: number
}

export interface TrekTimeInterval {
  duration:       number,
  distance:       number,
  speed:          number,
}

export class TrekInfo {

  // properties in the TrekObj (saved to database)
              dataVersion = CURR_DATA_VERSION;
  @observable group;
  @observable date;
              sortDate = '';
  @observable startTime;
              endTime = '';
  @observable type : TrekType;
              weight = 0;
  @observable packWeight : number;
              strideLength = 0;
  @observable conditions : WeatherData;
  @observable duration : number;
  @observable trekDist : number;
              totalGpsPoints = 0;
              pointList : TrekPoint[] = [];
              hills: string;
              elevations: ElevationData[];
              elevationGain: number;
  @observable intervals;
              intervalDisplayUnits;
  @observable trekLabel: string;
  @observable trekNotes;
  @observable trekImages : TrekImageSet[];
              calories = 0;
              drivingACar = false;
  @observable course : string;

  // transient operating properties
  @observable averageSpeed: string;
  @observable timePerDist: string;
  @observable speedNow: string;
  @observable showSpeedStat: SpeedStatType;     // Determines showing Speed Now, Avg Speed and Time/Dist
  @observable currentDist;
  @observable currentCalories;
  @observable currentCaloriesPerMin;
  @observable showStepsPerMin;                    // Flag to switch between showing Total Steps and Steps/Min
  @observable showTotalCalories;                  // Flag to switch between showing Calories and Calories/Min
  @observable trekImageCount;                     // Number of images/videos in this trek 

  constructor () {
    this.initializeObservables();
  }

    // initialize all the observable properties in an action for mobx strict mode
    @action
    initializeObservables? = () => {
      this.date = '';
      this.startTime = ' ';
      this.type = 'Walk';
      this.group = '';
      this.packWeight = 0;
      this.duration = 0;
      this.trekDist = 0;
      this.conditions = undefined;
      this.intervals = undefined;
      this.trekLabel = '';
      this.trekNotes = '';
      this.course = undefined;

      this.averageSpeed = 'N/A';
      this.timePerDist = 'N/A';
      this.speedNow = 'N/A';
      this.currentDist = 'N/A';
      this.currentCalories = 'N/A';
      this.currentCaloriesPerMin = 'N/A';
      this.showSpeedStat = 'speedAvg';
      this.showStepsPerMin = false;
      this.showTotalCalories = true;
      this.trekImageCount = 0;
      }

    // Compose and return an object containing all trek properties that are saved to storage
    getSaveObj = (noPointList = false) :TrekObj => {
      let savObj : TrekObj = {
        dataVersion:  this.dataVersion,
        group:        this.group,
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
        course:       this.course,
      }
      if (!noPointList){
        savObj.pointList =    this.pointList;
      }
      return savObj;
    }
    
  
  
}