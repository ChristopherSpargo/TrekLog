import { LaLo, TrekPoint, TrekType, TrekTimeInterval, MeasurementSystemType, SMALL_DIST_UNITS,
         ElevationData, TREK_TYPE_WALK, TREK_TYPE_RUN, TREK_TYPE_BIKE, TREK_TYPE_HIKE, 
         NumericRange, SMALL_DIST_CUTOFF } from './TrekInfoModel'
import { LatLng } from 'react-native-maps';
import { TREK_LIMIT_TYPE_TIME } from './LoggingService';
import { ELEVATION_API_URL, GOOGLE_MAPS_API_KEY, MAX_ELEVATION_SAMPLES_PER_REQUEST } from './AppInfo'

export interface TimeFrame {
  start: string,      // start date (localTimeString)
  end: string         // end date (localTimeString)
}

const dayNames = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const dayAbbreviations = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
];

const monthNames = [
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"
]
const monthAbbreviations = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"
]

export type TerrainType = 'Level' | 'Moderate' | 'Difficult' | 'Extreme';

export const TERRAIN_DESCRIPTIONS = 
                    { Level: 'Level', Moderate: 'Moderate', Difficult: 'Difficult', Extreme: 'Extreme'};
export const MS_PER_DAY = 86400000;
export const MS_PER_WEEK = MS_PER_DAY * 7;
export const DAYS_IN_MONTHS = [31, 28, 30, 31, 31, 30, 31, 31, 30, 31, 30, 31];

export const M_PER_FOOT   = .305;
export const M_PER_MILE   = 1609.34;
export const KM_PER_MILE  = 1.61;
export const IN_PER_METER = 39.34;
export const CM_PER_INCH  = 2.542;
export const LB_PER_KG    = 2.21;

export const MPH_TO_MPS = .447;                  // meters traveled every second at 1 mph

export const STROLLING_SPEED            = 0.5 * MPH_TO_MPS;     // miles/hr as meters/second
export const VERY_SLOW_WALK_SPEED       = 2.0 * MPH_TO_MPS;
export const SLOW_WALK_SPEED            = 2.5 * MPH_TO_MPS;
export const MEDIUM_WALK_SPEED          = 3.0 * MPH_TO_MPS;
export const FAST_WALK_SPEED            = 3.5 * MPH_TO_MPS;
export const VERY_FAST_WALK_SPEED       = 4.0 * MPH_TO_MPS;
export const RACE_WALK_SPEED            = 4.5 * MPH_TO_MPS;
export const JOG_SPEED                  = 5.0 * MPH_TO_MPS; 
export const RUN_SPEED                  = 6.0 * MPH_TO_MPS;
export const FAST_RUN_SPEED             = 8.0 * MPH_TO_MPS;
export const SLOW_SPRINT_SPEED          = 10  * MPH_TO_MPS;
export const MEDIUM_SPRINT_SPEED        = 12  * MPH_TO_MPS;
export const FAST_SPRINT_SPEED          = 14  * MPH_TO_MPS;
export const LIGHT_BIKING_SPEED         = 10  * MPH_TO_MPS; 
export const MODERATE_BIKING_SPEED      = 12  * MPH_TO_MPS; 
export const VIGOROUS_BIKING_SPEED      = 14  * MPH_TO_MPS;
export const RACE_BIKING_SPEED          = 16  * MPH_TO_MPS;
export const DRIVING_A_CAR_SPEED        = 25  * MPH_TO_MPS;

export const STANDING_OR_SITTING_MET    = 1.3;     // metabolic equivalency values
export const STROLLING_MET              = 2.0;
export const WALKING_VERY_SLOW_MET      = 2.8;
export const WALKING_VERY_SLOW_MET_M    = 3.3;
export const WALKING_VERY_SLOW_MET_D    = 3.8;
export const WALKING_VERY_SLOW_MET_E    = 5.0;
export const WALKING_SLOW_MET           = 3.0;
export const WALKING_SLOW_MET_M         = 3.5;
export const WALKING_SLOW_MET_D         = 4.0;
export const WALKING_SLOW_MET_E         = 5.3;
export const WALKING_MET                = 3.5;
export const WALKING_MET_M              = 5.3;
export const WALKING_MET_D              = 5.3;
export const WALKING_MET_E              = 8.0;
export const WALKING_FAST_MET           = 4.3;
export const WALKING_FAST_MET_M         = 5.1;
export const WALKING_FAST_MET_D         = 5.5;
export const WALKING_FAST_MET_E         = 7.6;
export const WALKING_VERY_FAST_MET      = 6.0;
export const WALKING_VERY_FAST_MET_M    = 7.1;
export const WALKING_VERY_FAST_MET_D    = 7.1;
export const WALKING_VERY_FAST_MET_E    = 10.6;
export const RACE_WALKING_MET           = 7.0;
export const RACE_WALKING_MET_M         = 8.3;
export const RACE_WALKING_MET_D         = 8.3;
export const RACE_WALKING_MET_E         = 12.4;
export const JOGGING_MET                = 8.3;
export const JOGGING_MET_M              = 9.8;
export const JOGGING_MET_D              = 9.8;
export const JOGGING_MET_E              = 14.8;
export const RUNNING_MET                = 9.8;
export const RUNNING_MET_M              = 9.8;
export const RUNNING_MET_D              = 9.8;
export const RUNNING_MET_E              = 9.8;
export const FAST_RUNNING_MET           = 11.8;
export const FAST_RUNNING_MET_M         = 11.8;
export const FAST_RUNNING_MET_D         = 11.8;
export const FAST_RUNNING_MET_E         = 11.8;
export const SLOW_SPRINT_MET            = 14.5;
export const SLOW_SPRINT_MET_M          = 14.5;
export const SLOW_SPRINT_MET_D          = 14.5;
export const SLOW_SPRINT_MET_E          = 14.5;
export const MEDIUM_SPRINT_MET          = 19.0;
export const MEDIUM_SPRINT_MET_M        = 19.0;
export const MEDIUM_SPRINT_MET_D        = 19.0;
export const MEDIUM_SPRINT_MET_E        = 19.0;
export const FAST_SPRINT_MET            = 23.0;
export const FAST_SPRINT_MET_M          = 23.0;
export const FAST_SPRINT_MET_D          = 23.0;
export const FAST_SPRINT_MET_E          = 23.0;
export const LIGHT_BIKING_MET           = 5.8;
export const LIGHT_BIKING_MET_M         = 5.8;
export const LIGHT_BIKING_MET_D         = 5.8;
export const LIGHT_BIKING_MET_E         = 5.8;
export const MODERATE_BIKING_MET        = 8.0;
export const MODERATE_BIKING_MET_M      = 8.0;
export const MODERATE_BIKING_MET_D      = 8.0;
export const MODERATE_BIKING_MET_E      = 8.0;
export const VIGOROUS_BIKING_MET        = 10.0;
export const VIGOROUS_BIKING_MET_M      = 10.0;
export const VIGOROUS_BIKING_MET_D      = 10.0;
export const VIGOROUS_BIKING_MET_E      = 10.0;
export const RACE_BIKING_MET            = 12.0; 
export const RACE_BIKING_MET_M          = 12.0; 
export const RACE_BIKING_MET_D          = 12.0; 
export const RACE_BIKING_MET_E          = 12.0; 
export const HIKING_MET                 = 6.0;
export const HIKING_MET_M               = 6.0;
export const HIKING_MET_D               = 6.0;
export const HIKING_MET_E               = 6.0;
export const HIKING_WITH_PACK_MET       = 7.8;
export const HIKING_WITH_PACK_MET_E     = 7.8;
export const HIKING_WITH_PACK_MET_M     = 7.8;
export const HIKING_WITH_PACK_MET_D     = 7.8;

export const DRIVING_A_CAR_MET          = 2.5;

export const ACTIVITY_SPEEDS = [
  STROLLING_SPEED            ,
  VERY_SLOW_WALK_SPEED       ,
  SLOW_WALK_SPEED            ,
  MEDIUM_WALK_SPEED          ,
  FAST_WALK_SPEED            ,
  VERY_FAST_WALK_SPEED       ,
  RACE_WALK_SPEED            ,
  JOG_SPEED                  ,        
  RUN_SPEED                  ,
  FAST_RUN_SPEED             ,
  LIGHT_BIKING_SPEED    || SLOW_SPRINT_SPEED,
  MODERATE_BIKING_SPEED || MEDIUM_SPRINT_SPEED, 
  VIGOROUS_BIKING_SPEED || FAST_SPRINT_SPEED,
  RACE_BIKING_SPEED          ,
  DRIVING_A_CAR_SPEED        
]

export const WALKING_METS = [
  [STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET,STANDING_OR_SITTING_MET],
  [STROLLING_MET, STROLLING_MET, STROLLING_MET, STROLLING_MET],
  [WALKING_VERY_SLOW_MET, WALKING_VERY_SLOW_MET_M, WALKING_VERY_SLOW_MET_D, WALKING_VERY_SLOW_MET_E],
  [WALKING_SLOW_MET, WALKING_SLOW_MET_M, WALKING_SLOW_MET_D, WALKING_SLOW_MET_E],
  [WALKING_MET, WALKING_MET_M, WALKING_MET_D, WALKING_MET_E],
  [WALKING_FAST_MET, WALKING_FAST_MET_M, WALKING_FAST_MET_D, WALKING_FAST_MET_E],
  [WALKING_VERY_FAST_MET, WALKING_VERY_FAST_MET_M, WALKING_VERY_FAST_MET_D, WALKING_VERY_FAST_MET_E],
  [RACE_WALKING_MET, RACE_WALKING_MET_M, RACE_WALKING_MET_D, RACE_WALKING_MET_E],
  [JOGGING_MET, JOGGING_MET_M, JOGGING_MET_D, JOGGING_MET_E],
  [RUNNING_MET, RUNNING_MET_M, RUNNING_MET_D, RUNNING_MET_E],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET], 
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET]
]

export const WALKING_ACTIVITIES_BY_SPEED = [
  'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Running', 'Running', 
  'Driving', 'Driving', 'Driving', 'Driving', 'Driving', 'Driving'
]

export const RUNNING_METS = [
  [STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET,STANDING_OR_SITTING_MET],
  [STROLLING_MET, STROLLING_MET, STROLLING_MET, STROLLING_MET],
  [WALKING_VERY_SLOW_MET, WALKING_VERY_SLOW_MET_M, WALKING_VERY_SLOW_MET_D, WALKING_VERY_SLOW_MET_E],
  [WALKING_SLOW_MET, WALKING_SLOW_MET_M, WALKING_SLOW_MET_D, WALKING_SLOW_MET_E],
  [WALKING_MET, WALKING_MET_M, WALKING_MET_D, WALKING_MET_E],
  [WALKING_FAST_MET, WALKING_FAST_MET_M, WALKING_FAST_MET_D, WALKING_FAST_MET_E],
  [WALKING_VERY_FAST_MET, WALKING_VERY_FAST_MET_M, WALKING_VERY_FAST_MET_D, WALKING_VERY_FAST_MET_E],
  [RACE_WALKING_MET, RACE_WALKING_MET_M, RACE_WALKING_MET_D, RACE_WALKING_MET_E],
  [JOGGING_MET, JOGGING_MET_M, JOGGING_MET_D, JOGGING_MET_E],
  [RUNNING_MET, RUNNING_MET_M, RUNNING_MET_D, RUNNING_MET_E],
  [FAST_RUNNING_MET, FAST_RUNNING_MET_M, FAST_RUNNING_MET_D, FAST_RUNNING_MET_E],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET], 
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET] 
]

export const RUNNING_ACTIVITIES_BY_SPEED = [
  'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Walking', 'Running', 'Running', 
  'Running', 'Driving', 'Driving', 'Driving', 'Driving', 'Driving'
]

export const BIKING_METS = [
  [STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET,STANDING_OR_SITTING_MET],
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [LIGHT_BIKING_MET, LIGHT_BIKING_MET_M, LIGHT_BIKING_MET_D, LIGHT_BIKING_MET_E], 
  [MODERATE_BIKING_MET, MODERATE_BIKING_MET_M, MODERATE_BIKING_MET_D, MODERATE_BIKING_MET_E],
  [VIGOROUS_BIKING_MET, VIGOROUS_BIKING_MET_M, VIGOROUS_BIKING_MET_D, VIGOROUS_BIKING_MET_E],
  [RACE_BIKING_MET, RACE_BIKING_MET_M, RACE_BIKING_MET_D, RACE_BIKING_MET_E],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET]
]

export const BIKING_ACTIVITIES_BY_SPEED = [
  'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 
  'Biking', 'Biking', 'Biking', 'Biking', 'Biking', 'Driving'
]

export const HIKING_METS = [
  [STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET,STANDING_OR_SITTING_MET],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [HIKING_MET, HIKING_MET_M, HIKING_MET_D, HIKING_MET_E],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET]
]

export const HIKING_ACTIVITIES_BY_SPEED = [
  'Hiking', 'Hiking', 'Hiking', 'Hiking', 'Hiking', 'Hiking', 'Hiking', 'Hiking', 'Driving', 'Driving', 
  'Driving', 'Driving', 'Driving', 'Driving', 'Driving', 'Driving'
]

export const HIKING_WITH_PACK_METS = [
  [STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET, STANDING_OR_SITTING_MET,STANDING_OR_SITTING_MET],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [HIKING_WITH_PACK_MET, HIKING_WITH_PACK_MET_M, HIKING_WITH_PACK_MET_D, HIKING_WITH_PACK_MET_E],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET],
  [DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET, DRIVING_A_CAR_MET]
]


export const ACTIVITY_BY_SPEED = {
  Walk: WALKING_ACTIVITIES_BY_SPEED, 
  Run:  RUNNING_ACTIVITIES_BY_SPEED, 
  Bike: BIKING_ACTIVITIES_BY_SPEED,
  Hike: HIKING_ACTIVITIES_BY_SPEED
}

export const RESTING_CAL_PER_KG_PER_SEC = 0.000306944;


export class UtilsSvc {
  
  // convert a LaLo object to a LatLng
  cvtLaLoToLatLng = (lalo: LaLo) : LatLng => {
    return {latitude: lalo.a, longitude: lalo.o};
  }

  // convert a LatLng object to a LaLo
  cvtLatLngToLaLo = (latlng: LatLng) : LaLo => {
    return {a: latlng.latitude, o: latlng.longitude};
  }

  // calculate the distance between to LaLo points
  calcDistLaLo = (p1: LaLo, p2: LaLo) => {
    return this.calcDist(p1.a, p1.o, p2.a, p2.o);
  }

  // calculate the distance between to LatLng points
  calcDistLatLng = (p1: LatLng, p2: LatLng) => {
    return this.calcDist(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
  }

  //This function takes in latitude and longitude of two points and returns the distance between them (in m)
  calcDist(lat1 : number, lon1 : number, lat2 : number, lon2 : number) 
  {
    var R = 6371000; // m
    var dLat = this.toRad(lat2-lat1);
    var dLon = this.toRad(lon2-lon1);
    var lat1 = this.toRad(lat1);
    var lat2 = this.toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return d;
  }

  // compute the implied speed between the 2 given points
  // return meters/second
  computeImpliedSpeed = (p1: TrekPoint, p2: TrekPoint) : number => {
    return this.calcDistLaLo(p1.l, p2.l) / Math.abs(p1.t - p2.t);
  }

  // Converts numeric degrees to radians
  toRad(Value: number) 
  {
      return Value * Math.PI / 180;
  }

  // return a point 'pct' of the way between the 2 given points
  pointWithinSegment = (p1: LaLo, p2: LaLo, pct: number) : LaLo => {
    return ({a: p1.a + pct * (p2.a - p1.a), o: p1.o + pct * (p2.o - p1.o)});
  }

  // remove any leading '0' of a less than one value
  // also change N/A to 0
  zeroSuppressedValue = (val: string) => {
    let s = val.replace(/^N\/A/ig,'0 ');
    return s.replace(/^0\./g,'.');
  } 

  // Capitalize the first letter in every word of the given string
  capitalizeWords = (str: string) : string => {
    str = str.toLowerCase().replace(/^[a-z]/g,
      (x : string) : string => { return x.charAt(0).toUpperCase() + x.substr(1); } );
    str = str.replace(/[, \-\(\/][a-z]/g,
        (x : string) : string => { 
          return x.charAt(0) + x.charAt(1).toUpperCase() + x.substr(2); } );
    return str;
  }

  // Return the duration formatted as HH:MM:SS
  formatDuration = (duration: number) : string => {
    if ( (duration === undefined) || (duration === 0) ) { return '00:00'; }
    let s = Math.trunc(duration % 60);
    let m = Math.trunc(duration / 60) % 60;
    let h = Math.trunc(duration / 3600);

    return ((h !== 0  ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
  }

  // create a 12-char date-time string for sorting as yyyyMMddhhmm from the given date and time fields
  formatSortDate(d?: any, t?: string) : string {
    let dt    : Date;
    let year  : number;
    let month : number;
    let day   : number;
    let h     : number;   // hour
    let m     : number;   // minute
    let fd;

    if (d && !/^[01]?\d\/[0123]?\d\/(\d\d|\d\d\d\d)$/.test(d)) { return ''; } // invalid given date format
    if (d) {
      dt = t ? new Date(d + ' ' + t) : new Date(d);
    } else {
      dt = new Date();    // no date, use current time
    }
    year = dt.getFullYear();
    month = dt.getMonth() + 1;
    day = dt.getDate();
    h = dt.getHours();
    m = dt.getMinutes();
    fd = (year + (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day + 
            (h < 10 ? '0' : '') + h + (m < 10 ? '0' : '') + m);
    return fd;
  };

  // return only the 8-char date portion of the sortDate (not the time)
  formatShortSortDate = (d ?: any, t ?: string) => {
    return this.formatSortDate(d, t).substr(0,8);
  }
    
  // return a standard date string dd/mm/yyyy from a sort date
  dateFromSortDate = (sd : string) => {
    return (sd.substr(4,2) + '/' + sd.substr(6,2) + '/' + sd.substr(0,4))
  }

  // return a standard date string dd/mm/yy from a sort date
  dateFromSortDateYY = (sd : string) => {
    return (sd.substr(4,2) + '/' + sd.substr(6,2) + '/' + sd.substr(2,2))
  }

  // format given date to long format (eg. Saturday June 9, 2018)
  formattedLongDate = (dateStr: string) => {
    let dt = new Date(dateStr);
    return (dayNames[dt.getDay()] + ' ' + monthNames[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear());
  }

  // format given date to long format with month abbreviated (eg. Saturday Jun 9, 2018)
  formattedLongDateAbbr = (dateStr: string) => {
    let dt = new Date(dateStr);
    return (dayNames[dt.getDay()] + ' ' + monthAbbreviations[dt.getMonth()] + ' ' + 
            dt.getDate() + ', ' + dt.getFullYear());
  }

  // format given date to long format without day of week (eg. June 9, 2018)
  formattedLongDateNoDay = (dateStr: string) => {
    let dt = new Date(dateStr);
    return (monthNames[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear());
  }

  // format given date to long format without day of week and abbreviate the month (eg. Jun 9, 2018)
  formattedLongDateAbbrNoDay = (dateStr: string) => {
    let dt = new Date(dateStr);
    let dom = dt.getDate();
    let dayLT10 = dom < 10 ? '0' : '';

    return (monthAbbreviations[dt.getMonth()] + ' ' + dayLT10 + dom + ', ' + dt.getFullYear());
  }

  // format given date to long format with abbrevieated day of week and numeric date (eg. Wed 2/6/2019)
  formattedLongDateAbbrDay = (dateStr: string) => {
    let dt = new Date(dateStr);

    return (dayAbbreviations[dt.getDay()] + ', ' + dt.toLocaleDateString());
  }
  
  // Format a given date to hh:mm AM/PM. Use current time if not given.
  formatTime(t?: Date | number) : string {
    let dt    : Date    = t ? new Date(t) : new Date();
    let h     : number  = dt.getHours();
    let m     : number  = dt.getMinutes();
    let ampm  : string  = 'AM';    
    let fd    : string;

    if ( h > 11 ) {
      ampm = 'PM';
      if ( h > 12) {
        h -= 12;
      }
    }
    else {
      if (h === 0) { h = 12; }    // 12 AM
    }
    fd = ((h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm);
    return fd;
  };
  
  // convert the distance given in meters to a value rounded to the selected precision in the given units
  getRoundedDist = (dist: number, units: string, noSmall = false) : number => {
    let precision = 10;

    if (!noSmall && (dist < SMALL_DIST_CUTOFF) && (units in SMALL_DIST_UNITS)) { 
      units = SMALL_DIST_UNITS[units]; 
    }
    if (dist !== 0) {
      switch (units) {
        case 'ft':
          dist = Math.round(dist / M_PER_FOOT); // just display whole feet
          break;
        case 'miles':
        case 'mi':
          if (dist < M_PER_MILE) { precision = 100; } // show 2 decimal points if less than 1 mile
          dist = Math.round((dist / M_PER_MILE) * precision) / precision;
          // just display integer value for bigger distances when (mi, km)
          if (dist > 100) { dist = Math.round(dist); }
              break;
        case 'meters':
        case 'm':
          dist = Math.round(dist);  // just display whole meters
          break;
        case 'kilometers':
        case 'km':
          if (dist < 1000) { precision = 100; } // show 2 decimal points if less than 1 km
          dist = Math.round((dist / 1000) * precision) / precision;
          if (dist > 100) { dist = Math.round(dist); }
              break;
        default:
      }
    }
    return dist;
  }

  formatDist = (dist: number, units: string, noSmall = false) : string => {
    if (!noSmall && (dist < SMALL_DIST_CUTOFF) && (units in SMALL_DIST_UNITS)) { 
      units = SMALL_DIST_UNITS[units]; 
    }
    return (this.getRoundedDist(dist, units, noSmall) + ' ' + units);
  }

  // Return the given distance in meters as miles or kilometers depending on the measurement system
  getBigDistance = (dist: number, system: MeasurementSystemType) : number => {
    switch(system){
      case 'Metric':
        return dist / 1000;
      case 'US':
        return dist / M_PER_MILE;
      default:
        return 0;
    }
  }
    
  // Return average speed for the trek in mph or kph based on the specified units
  computeRoundedAvgSpeed = (system: MeasurementSystemType, dist: number, time: number, intOnly = false) : number =>  {

    let metersPerHour = time ? (dist / time) * 3600 : 0;  // compute meters/hr

    switch(system){
      case 'Metric':
        if (metersPerHour > 16093.4 || intOnly){
          return Math.round(metersPerHour / 1000);    // return km/hr no decimal
        }
        return Math.round(metersPerHour / 100) / 10;    // return km/hr 1 decimal
      case 'US':
        if (metersPerHour > (M_PER_MILE * 10) || intOnly){
          return Math.round(metersPerHour / M_PER_MILE);    // return mi/hr no decimal
        }
        return Math.round((metersPerHour / M_PER_MILE) * 10) / 10;    // return mi/hr 1 decimal
      default:
    }
    return 0;
  }

  // Return average speed for the trek in meters per hour
  computeGrossAvgSpeed = (dist: number, time: number) : number =>  {

    let metersPerHour = time ? (dist / time) * 3600 : 0;  // compute meters/hr
    return metersPerHour;
  }

    // Return the average speed for the trek formatted so it can be displayed
  formatAvgSpeed = (system: MeasurementSystemType, dist: number, time: number, intOnly = false) => {

    let avgSpeed = this.computeRoundedAvgSpeed(system, dist, time, intOnly);

    switch(system){
      case 'Metric':
        return avgSpeed + ' kph';    // return km/hr
      case 'US':
      return avgSpeed + ' mph';    // return km/hr
    }
    return 'N/A';
  }

  // return a time formatted as 'h:mm:ss' if colons, 'hhmmss' if 6digit or 'NN hr NN min NN sec' if hms
  // from the given time in seconds
  timeFromSeconds = (sec: number, format : "hms" | "colons" | "6digit" = 'colons') => {
    sec = Math.round(sec);
    let s = sec % 60;
    let m = Math.trunc(sec / 60) % 60;
    let h = Math.trunc(sec / 3600);
    let lzm = m < 10 ? '0' : '';
    let lzs = s < 10 ? '0' : '';
    let tsh = m || s ? ' ' : '';
    let tsm = s ? ' ' : '';
    switch(format){
      case 'hms':
        if(sec === 0){ return '_'; }
        return ((h ? (h + ' hr' + tsh) : '') + (m ? (m + ' min' + tsm) : '') + (s ? (s + ' sec') : ''));
      case 'colons':
        return ((h ? h + ':' : '') + lzm + m + ':' + lzs + s);
      case '6digit':
        if(sec === 0){ return ''; }
        let hStr = '' + (h ? h : '');
        let mStr = hStr ? (lzm + m) : (m ? m : '');
        let sStr = mStr ? (lzs + s) : (s ? s : '');
        return hStr + mStr + sStr;
      default:
        return ''; 
    }
  }

  // convert the given time to seconds from the given units
  convertToSeconds = (time: number, units: string) => {
    switch(units){
      case 'hours':
        return time * 3600;
      case 'minutes':
        return time * 60;
      case 'seconds':
      case 'time':
      default:
        return time;
    }
  }

  // convert time from seconds to given units
  convertTime = (secs: number, units: string) => {
    switch(units){
      case 'hours':
        return secs / 3600;
      case 'minutes':
        return secs / 60;
      case 'seconds':
      case 'time':
      default:
        return secs;
    }
  }

  // Return the average pace for the trek formatted so it can be displayed
  formatTimePerDist = (units: string, dist: number, time: number) => {

    let spm = dist === 0 ? 0 : time/dist;  // seconds per meter
    let tooSlow = (spm === 0) || (spm > 2.2);

    switch(units){
      case 'meters':
        return (tooSlow ? '--:--' : this.timeFromSeconds(spm)) + ' /m';    // return time/m          
      case 'km':
      case 'kilometers':
        spm *= 1000;
        return (tooSlow ? '--:--' : this.timeFromSeconds(spm)) + ' /km';    // return time/km
      case 'mi':
      case 'miles':
        spm *= M_PER_MILE;
        return (tooSlow ? '--:--' : this.timeFromSeconds(spm)) + ' /mi';    // return time/mi
      case 'none':
        return spm.toString();
      default:
        return ' ';
    }
  }
  
  // convert dist (meters) to steps given stride (cm)
  computeStepCount = (dist: number, stride: number) : number => {

    return stride > 0 ? Math.round((dist * 100) / stride) : 0;
  }
    
    // return the number of steps as a string
  computeSteps = (dist: number, stride: number) : string => {
    
    if (stride > 0) {
      return this.computeStepCount(dist, stride).toString();
    }
    return 'N/A'
  }

  // return the number of steps/min as a string, time is in seconds
  computeStepsPerMin = (steps: number,  time?: number) : number => {
      return (time ? Math.round(steps / (time / 60)) : 0 );
  }

  // return the number of steps or steps/min as a string, time is in seconds
  formatSteps = (type: TrekType, steps: number,  time?: number) : string => {
    if(type === TREK_TYPE_BIKE){
      return "N/A";
    }
    if (time !== undefined) {
      return this.computeStepsPerMin(steps, time) + ' /min';
    }
    return steps.toString();
  }

  // Convert distance (meters) to given units
  convertDist = (dist: number, units: string) => {
    if(dist === 0) { return 0; }
    switch(units){
      case 'mi':
      case 'miles':
        return (dist / M_PER_MILE);
      case 'km':
      case 'kilometers':
        return (dist / 1000);
      case 'meters':
        return dist;
      default:
        return dist;
    }
  }

  // Convert distance to meters from the given units
  convertToMeters = (dist: number, units: string) => {
    switch(units){
      case 'meters':
        return dist;
      case 'mi':
      case 'miles':
        return dist * M_PER_MILE;
      case 'km':
      case 'kilometers':
        return dist * 1000;
      default:
        return dist;
    }
  }

  // Convert speed (meters/sec) to given units
  convertSpeed = (dist: number, time: number, units: string) => {
    switch(units){
      case 'mph':
        return ((dist / M_PER_MILE) / time) * 3600;
      case 'kph':
        return ((dist / 1000) / time) * 3600;
      default:
        return 0;
    }
  }

  // convert the number of days between 2 sort dates
  // (20180529xxxx, 20180615xxxx) = abs((2018*365 + 4*30 + 29) - (2018*365 + 5*30 +15))  
  daysBetween = (d1: string, d2: string) => {
    let days1 = (parseInt(d1.substr(0,4),10) * 365) + ((parseInt(d1.substr(4,2),10) - 1) * 30) +
                parseInt(d1.substr(6,2),10);
    let days2 = (parseInt(d2.substr(0,4),10) * 365) + ((parseInt(d2.substr(4,2),10) - 1) * 30) +
                parseInt(d2.substr(6,2),10);

    return  days2 > days1 ? days2 - days1 : days1 - days2;
  }

  // Compare the two given objects, return true if equal (shallow)
  compareObjects = (obj1: any, obj2: any) : boolean => {
    let equal = true;

    if (obj1 instanceof Array){             // comparing arrays?
      if (obj1.length !== obj2.length){ 
        equal = false; 
      } 
      else {
        obj1.forEach((val, index) => {
            if (!this.compareObjects(val, obj2[index])) { equal = false; };
        })
      }
    }
    else {
      if (obj1 instanceof Object){          // comparing objects?
        for (let key in obj1){
          if (equal) {
            if (!(key in obj2) || !this.compareObjects(obj1[key], obj2[key])) { equal = false; }
          }
        }
      }
      else {
        equal = obj1 === obj2               // assume simple values
      }
    }
    return equal;
  }

  // copy the given object
  copyObj = (orig: any) => {
    let objCopy = {};

    for (let key in orig) {
      objCopy[key] = orig[key];
    }
    return objCopy;
  }

  // use the Google Elevations API to return a list of elevations that occur along the given path
  getPathElevations = (path: LatLng[], samples : number) => {
    let singlePt = path.length === 1;
    let query = singlePt ? '?locations=' : '?path=';

    path.forEach((point, indx) => {
      query += indx === 0 ? '' : '|';
      query += point.latitude + ',' + point.longitude;
    })
    if(!singlePt){
      query += '&samples=' + samples;
    }
    query += '&key=' + GOOGLE_MAPS_API_KEY;
    return fetch(ELEVATION_API_URL + query)
    .then(response => response.json())  
    .catch((err) => err)
      
  }

  // Get the elevation data as an array of elevation readings that are evenly spaced out along the trek.
  // Get 2 elevation readings per trek GPS point.
  // If there are more than 250 GPS points in the path, then the path must be segmented by distance (not GPS points).
  // Process each segment to get elevations and append that data to the final array.  
  getElevationsArray = (path: LatLng[], tDist: number) : Promise<void | ElevationData[]> => {
    let result  = [] as ElevationData[];
    let numPts = path.length;
    let nElevs = numPts * 2;        // total number of elevation readings we want
    let samples;                    // number of elevation readings in a segment
    let elevsRemaining = nElevs;    // lets us quickly know how many readinigs we need for last segment
    let elevData = [];              // array of ElevationData arrays
    let segStart = 0;               // start index of the current segment within the trek path
    let reqPath = [];               // path passed to elevation API
    let dist = 0;                   // distance accumulated for current segment
    let cSeg = 1;                   // current segment of the total path
    let nSegs = Math.trunc(nElevs / MAX_ELEVATION_SAMPLES_PER_REQUEST) + 1; // number of segments we will need for this path
    let segDist = tDist / nSegs;
    let segReady = false;           // flag that indicates a segment of the path is ready to fetch its elevation data
    let allDone = [];               // array of Promises for each segment API call

    return new Promise((resolve, reject) => {
      if (numPts < 2) { resolve(result); }    // need at least 2 GPS points to make a path
      for(let i=1; i < numPts; i++) {
        if (cSeg === nSegs) {                // skip distance processing if last (or only) segment
          samples = elevsRemaining;
          i = numPts;                       // set to read data for last segment and stop the for loop
          reqPath = path.slice(segStart, i);
          segReady = true;
        }
        else {
          dist += this.calcDist(path[i - 1].latitude, path[i - 1].longitude,
                                path[i].latitude, path[i].longitude);   // add to segment distance accumulator
          if (dist >= segDist) {
            reqPath = path.slice(segStart, i + 1);
            segStart = i;           // set starting point for next segment as end point of last segment
            samples = Math.trunc(nElevs/nSegs); // % of elevation readings = % of total trek distance
            elevsRemaining -= (samples - 1);
            dist = 0;               // reset segment distance accumulator
            cSeg++;                 // update current segment number
            segReady = true;        // indicate elevation data can now be requested
          }
        }
        if (segReady) {              // is a segment ready to fetch its elevation data?
          segReady = false;
          elevData.push([]);        // make an array to hold the elev data for this segment
          allDone.push(this.processSegment(reqPath.slice(), samples, elevData[elevData.length-1]));
        }
      }
      // now wait for all segments to be done
      Promise.all(allDone)
      .then(() => {
        elevData.forEach((seg, index) => {
          result = result.concat(seg);  // concatenate elevation data for all segments
          if (index !== elevData.length-1) {
            result.length--;  // ending value of all but last segment will be repeated by starting value of the next
          }
        })
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      })
    })
  }

  processSegment = (path: LatLng[], samples: number, data: ElevationData[]) => {
    return new Promise((resolve, reject) => {
      this.getPathElevations(path, samples)     // compose and send request to Elevation API
      .then((res : any) => {
        if (res.status !== 'OK') { 
          reject(res.status);         // some problem reported from Elevation API
        }
        res.results.forEach((point) => {
          data.push(Math.round(point.elevation * 100) / 100); // add just the elevation value to the result
        })
        resolve('OK');
      })
      .catch((err) => reject(err))
    })
}

  // compute the elevation gain for the given ElevationData array
  getElevationGain = (elData: ElevationData[]) : number => {
    let gain = 0;

    elData.forEach((elev, indx) => {
      if (indx > 0) {
        if (elev > elData[indx-1]) { 
          gain += elev - elData[indx-1]; 
        }
      }
    })
    return gain;
  }

  // analyze the given elevation data array for degree of hilliness
  // return: Unknown | Level | Moderate | Difficult | Extreme
  analyzeHills = (elData: ElevationData[], eGain: number, tDist: number) : string => {
    if (elData === undefined || eGain === 0 || tDist === 0) { return 'Level'; }
    let gPct = eGain / tDist;
    
    if (gPct < .015) { return 'Level'; }
    if (gPct < .045) { return 'Moderate'; }
    if (gPct < .065) { return 'Difficult'; }
    return 'Extreme';
  }

  // return a TimeFrame object that represents the given selection
  getTimeFrame = (sel: string) : TimeFrame => {
    let start = '';
    let end = '';
    let now = new Date().getTime();
    let dow = new Date().getDay();
    let dom = new Date().getDate();
    let mon = new Date().getMonth();
    let lmon = (mon === 0) ? 11 : mon - 1;

    switch(sel){
      case 'Today':
        start = end = new Date(now).toLocaleDateString();
        break;
      case 'Yesterday':
        start = end = new Date(now - MS_PER_DAY).toLocaleDateString();
        break;
      case 'TWeek':
        start = new Date(now - ((dow) * MS_PER_DAY)).toLocaleDateString();
        end = new Date(now).toLocaleDateString();
        break;
      case 'LWeek':
        start = new Date(now - ((dow + 7) * MS_PER_DAY)).toLocaleDateString()
        end = new Date(now - ((dow + 1) * MS_PER_DAY)).toLocaleDateString();
        break;
      case 'TMonth':
        start = new Date(now - ((dom - 1) * MS_PER_DAY)).toLocaleDateString()
        end = new Date(now).toLocaleDateString();
        break;
      case 'LMonth':
        start = new Date(now - ((dom + DAYS_IN_MONTHS[lmon] - 1) * MS_PER_DAY)).toLocaleDateString()
        end = new Date(now - ((dom)* MS_PER_DAY)).toLocaleDateString();
        break;
      case 'All':
        start = end = '';
        break;
      case 'Custom':
      default:
    } 
    return {start: start, end: end};
  }

  // retrun an object with the year, month and day values for the given date
  getYMD = (d: Date) => {
    return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate()
      }
  }

  // find the max and min of an array of numbers
  // return a NumericRange object
  getNumericRange = (list : number[]) : NumericRange => {
    let range : NumericRange = {max: 0, min: 0, range: 0};

    if (list.length){
      range.max = -5000;
      range.min = 100000;
      list.forEach((val) => {
        if (val > range.max){ range.max = val; }
        if (val < range.min){ range.min = val; }
      })
      range.range = range.max - range.min;
    }
    return range;
  }

  // given a value and a list of numbers (sorted ascending) return the index of
  // the interval of the 2 numbers the value falls between
  // return 0 if value is less than first list item
  // return list.length if value is greater or equal to the last list item
  // return -1 if invalid value (undefined)
  findRangeIndex = (val: number, list: number[]) : number => {
    if(val === undefined || val === null) {
      // alert("Invalid Speed:\n" + val)
      return -1;}
    let lLen = list.length;
    for (let i=0; i<lLen; i++) {
      if (val < list[i]) { return (i); }
    }
    return lLen;
  }

  // divide given TrekPoint list into intervals based on the given time in seconds
  // return an array of TrekTimeIntervals
  getTrekTimeIntervals = (points: TrekPoint[], iTime: number) : TrekTimeInterval[] => {
    let iData : TrekTimeInterval[] = [];
    let time = 0, dist = 0, speed;
    let newPTime;
    let tempPts = this.copyTrekPath(points); // copy path data
    const nPts = tempPts.length;
    let t : number, d : number, part : number, newP : LaLo;
    
    if (tempPts.length > 0) {
      for(let i=1; i<nPts; i++){
        t = tempPts[i].t - tempPts[i-1].t;            // duration of next segment
        d = this.calcDistLaLo(tempPts[i-1].l, tempPts[i].l);  // distance of next segment
        if (time + t >= iTime) {                  // will the time to this point complete the interval?
          part = (iTime - time) / t;              // what % of the time do we need?
          newPTime = Math.round(t * part + tempPts[i - 1].t);
          // now get a point that is 'part' % into the distance between these 2 points
          newP = this.pointWithinSegment(tempPts[i-1].l, tempPts[i].l, part);
          dist += (d * part);
          speed = dist / iTime;
          iData.push({duration: iTime, distance: dist, speed: speed});
          tempPts[i - 1].l = newP;            // make this the starting point of the next segment and reprocess
          tempPts[i - 1].t = newPTime;        // update the time for this point
          dist = 0;                           // reset interval dist accumulator
          time = 0;                           // reset interval time accumulator
          i--;                                // set to do this point over
        }
        else {
          time += t;            // increase interval time accumulator
          dist += d;            // increase distance of this interval
        }
      }

      if(time > 0){             // left over time?
        // add ending entry
        speed = dist / time;
        iData.push({duration: time, distance: dist, speed: speed});
      }
    }
    return iData;
  }

  // return a copy of the given trek path truncated to the given limit for the given property type (time, dist)
  truncateTrekPath = (points: TrekPoint[], limit: number, type: string) : TrekPoint[] => {
    let accum = 0;
    let val = 0;
    let timeLimit = type === TREK_LIMIT_TYPE_TIME;
    let tempPts = this.copyTrekPath(points); // copy path data
    const nPts = tempPts.length;
    let t : number, d : number, part : number, newP : LaLo;
    
    if (tempPts.length > 0) {
      for(let i=1; i<nPts; i++){
        t = tempPts[i].t - tempPts[i-1].t;            // duration of next segment
        d = this.calcDistLaLo(tempPts[i-1].l, tempPts[i].l);  // distance of next segment
        val = timeLimit ? t : d;
        if (accum + val >= limit) {                  // will this point complete the limit?
          part = (limit - accum) / val;              // what % of the value for this segment do we need?
          let newPTime = Math.round(t * part + tempPts[i - 1].t);
          // now get a point that is 'part' % into the distance between these 2 points
          newP = this.pointWithinSegment(tempPts[i-1].l, tempPts[i].l, part);
          tempPts[i - 1].l = newP;            // make this the starting point of the next segment and reprocess
          tempPts[i - 1].t = newPTime;        // update the time for this point
          tempPts.length = i;
          break;
        }
        else {
          accum += val;            // increase accumulator
        }
      }
    }
    return tempPts;
  }

  // make a deep copy of the trek path  (slice makes a shallow copy)
  copyTrekPath = (pointList: TrekPoint[]) : TrekPoint[] => {
    let pathCopy : TrekPoint[] = [];

    if (pointList.length) {
      pathCopy = pointList.map((pt) => {
        return {
          l: {
            a: pt.l.a,
            o: pt.l.o
          },
          t: pt.t,
          s: pt.s
        }
      })
    }
    return pathCopy;
  }

  // return a LatLng[] from the given TrekPoint[]
  cvtPointListToLatLng = (pointList: TrekPoint[]) : LatLng[] => {
    let pathCopy : LatLng[] = [];

    if (pointList.length) {
      pathCopy =  pointList.map((pt) => { return {latitude: pt.l.a, longitude: pt.l.o}} )
    }
    return pathCopy;
  }

  // divide the given pointList into small time intervals and compute calories by interval
  // choose time interval according to given overall duration of pointList
  // return: the rounded calorie sum
  // params:
  //  pointList - array of TrekPoint objects
  //  duration -  total time of the trek represented by the pointList in seconds
  //  tType -     type of trek (Walk, Run, Bike or Hike)
  //  weight -    user's weight in kg
  //  bpWeight -  weight of backpack in kg if tType is Hike, default: 0
  computeCaloriesBySegment = (pointList : TrekPoint[], duration : number, 
                              tType : TrekType, hills: string, weight : number, bpweight = 0) : number => {
    let iTime = 30;                       // seconds per interval
    if (duration < 300) { iTime = 15; }   // choose a shorter value for very short durations ( < 5 min )
    if (duration > 3600) { iTime = 60; }  // choose a longer value for very long durations ( > 60 min )
    let iList = this.getTrekTimeIntervals(pointList, iTime);
    let cals = 0;
    if (hills === 'Unknown' || hills === 'Flat') { hills = 'Level'; }
    let hIndex = ['Level', 'Moderate', 'Difficult', 'Extreme'].indexOf(hills);

    // compute sum of calories for each interval
    for(let i=0; i<iList.length; i++){
      let hours = iList[i].duration / 3600;
      let htw = hours * weight;
      let speedIndex = this.findRangeIndex(iList[i].speed, ACTIVITY_SPEEDS);
      switch(tType){
        case TREK_TYPE_WALK:
          cals += WALKING_METS[speedIndex][hIndex] * htw;
          break;
        case TREK_TYPE_RUN:
          cals += RUNNING_METS[speedIndex][hIndex] * htw;
          break;
        case TREK_TYPE_BIKE:
          cals += BIKING_METS[speedIndex][hIndex] * htw;
          break;
        case TREK_TYPE_HIKE:
          // must distinguish between hiking with pack and not (bpweight is 0 if not)
          if (bpweight && (HIKING_METS[speedIndex][0] !== DRIVING_A_CAR_MET)) { 
            htw = hours * (weight + bpweight);
            cals += HIKING_WITH_PACK_METS[speedIndex][hIndex] * htw;
          }
          else {
            cals += HIKING_METS[speedIndex][hIndex] * htw;
          }
          break;
        default:
      }
    }
    let precision = cals < 10 ? 10 : 1;           // show 1 digit after decimal for small values ( < 10 )
    return Math.round(cals * precision) / precision;
  }

  // compute the calories as if driving a car
  computeDrivingCalories = (duration: number, weight: number, ) : number =>  {
    let hours = duration / 3600;
    let cals = DRIVING_A_CAR_MET * hours * weight;
    let precision = cals < 10 ? 10 : 1;           // show 1 digit after decimal for small values ( < 10 )

    return Math.round(cals * precision) / precision;
  }

  // check the given TrekPoint array for a speed that exceeds DRIVING_A_CAR_SPEED
  checkForCarSpeed = (list: TrekPoint[]) : boolean => {
    for(let i=0; i<list.length; i++){
      if(list[i].s > DRIVING_A_CAR_SPEED) { 
        return true; 
      }
    }
    return false;
  }

  // convert the given calorie value to calories/min
  // return: net calorie value per minute
  // params:
  //  cals -        total calories
  //  time -        duration that was used to compute cals
  getCaloriesPerMin = (cals: number, time: number) : number => {
    // let net = cals - (weight * RESTING_CAL_PER_KG_PER_SEC * time);
    let net = cals * 60 / time;
    // if (net < 0) { net = 0; }
    let precision = net < 10 ? 10 : 1;
    return Math.round(net * precision) / precision;
  }

  getMETTable = (tType: TrekType, bpweight = 0) => {
      // select the appropriate MET table
      switch (tType) {
        case TREK_TYPE_WALK:
          return WALKING_METS;
          break;
        case TREK_TYPE_RUN:
          return RUNNING_METS;
          break;
        case TREK_TYPE_BIKE:
          return BIKING_METS;
          break;
        case TREK_TYPE_HIKE:
          // must distinguish between hiking with pack and not (bpweight is 0 if not)
          return (bpweight ? HIKING_WITH_PACK_METS : HIKING_METS);
          break;
        default:
          return WALKING_METS;
      }
  }

  // return the index of the hilliness array for the given hills value
  getHillsIndex = (hills: string) : number => {
    if (hills === undefined || hills === 'Unknown' || hills === 'Flat') { return 0; }
    return ['Level', 'Moderate', 'Difficult', 'Extreme'].indexOf(hills);
  }

  // examine point list and compute calories as speed changes, sum calories
  // return: the rounded calorie sum
  // params:
  //  pointList - array of TrekPoint objects
  //  tType -     type of trek (Walk, Run, Bike or Hike)
  //  weight -    user's weight in kg
  //  bpWeight -  weight of backpack in kg if tType is Hike, default: 0
  computeCalories = (pointList: TrekPoint[],
    tType: TrekType, hills: string, weight: number, bpweight = 0): number => {
    let cals = 0;
    let hIndex = this.getHillsIndex(hills);
    let currMET : number = 0, newMET : number, currDurationSum : number = 0;
    let currPt : TrekPoint, startTime : number = 0;
    let metTable : number[][];
    let speedIndex : number;
    let numPts = pointList.length;
    let tWt : number;

    if (numPts > 0){
      metTable = this.getMETTable(tType, bpweight);
      speedIndex = this.findRangeIndex(pointList[0].s, ACTIVITY_SPEEDS);
      if(speedIndex !== -1){
        currMET = metTable[speedIndex][hIndex];
      }
      startTime = pointList[0].t;
      for (let i = 1; i < numPts; i++) {
        currPt = pointList[i];
        currDurationSum = currPt.t - startTime;
        speedIndex = this.findRangeIndex(currPt.s, ACTIVITY_SPEEDS);
        if (speedIndex !== -1) {
          newMET = metTable[speedIndex][hIndex];
          if ((newMET !== currMET) && ((currMET !== DRIVING_A_CAR_MET) || (currPt.s === 0))){
            // MET has changed
            tWt = weight + (currMET === DRIVING_A_CAR_MET ? 0 : bpweight);
            cals += currMET * tWt * (currDurationSum / 3600);
            currMET = newMET;
            startTime = currPt.t;
            currDurationSum = 0;  // if this is the last point, the time has already been counted 
          }
        }
      }
      tWt = weight + (currMET === DRIVING_A_CAR_MET ? 0 : bpweight);
      cals += currMET * tWt * (currDurationSum / 3600);  // add in final MET calc
    }
    let precision = cals < 10 ? 10 : 1;           // show 1 digit after decimal for small values ( < 10 )
    return cals !== 0 ? (Math.round(cals * precision) / precision) : 0;
  }

  // round the given value to 4 significant digits
  fourSigDigits = (val: number) : number => {
    if (val === undefined || val === null) { return 0; }
    return Math.round(val * 10000) / 10000;
  }

}