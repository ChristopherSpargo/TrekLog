import { WEATHER_APP_ID } from './AppInfo';
import { ToastModel } from "./ToastModel";
import { LatLng } from 'react-native-maps';

// the WeatherData object is used to pass weather data to other components

export const HALF_HOUR_EPOC = 1800;

export interface WindInfo {
  windSpeed : number,          // wind speed in m/sec
  windDir   : string           // Cardinal wind direction
}

export interface WeatherData {    
  main        : string,         // main word for conditions 
  id          : number,         // conditions code 
  desc        : string,         // description of conditions
  icon        : string,         // icon id
  sunrise     : number,         // EPOCH for sunrise
  sunset      : number,         // EPOC for sunset
  temp        : number,         // temperature in Kelvin
  humidity    : number,         // humidity %
  wind        : WindInfo,       // info about the wind
  clouds      : number,         // cloudiness %
  city        : string,         // name of closest corresponding city/town
  time        : number,         // EPOC of reading
  condIconId  ?: string,        // id of the conditions display icon
  tempIconId  ?: string,        // id of the temperature display icon
  windIconId  ?: string,        // id of the wind display icon
}

export interface WeatherRequest {
  type : string,                 // request type ('W' = weather, 'F' = forcast)
  pos : LatLng,
}

export const OpenWeatherMapURL = 'https://api.openweathermap.org/data/2.5/weather';

export const TEMPERATURE_UNITS = { US: 'F', Metric: 'C' }
export const CARDINAL_DIRECTIONS = [
  'N','NNE', 'NE', 'ENE', 
  'E', 'ESE','SE', 'SSE', 
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW']


export class WeatherSvc {
  constructor ( private toastSvc: ToastModel ) {
  }

// call the weather service
callWeatherSvc(params: WeatherRequest, tryCount?: number): Promise<void | WeatherData> {
  let url = OpenWeatherMapURL; // + ((params.type === 'F') ? 'forcast' : 'weather');
  let queryStr = '?APPID=' + WEATHER_APP_ID;
  tryCount = tryCount || 0;

  for (let item in params) {
    if (params.hasOwnProperty(item)) {
      switch (item) {
        case 'pos':
          queryStr += '&lat=' + params.pos.latitude + '&lon=' + params.pos.longitude;
          break;
        case 'type':
          break;
      default:
      }
    }
  }

  return fetch(url + queryStr)
  .then(response => response.json())  
  .catch((err) => {
    if (tryCount < 2){
      this.toastSvc.toastOpen({tType: 'Info', content: 'Retrying Weather Service. ' + (tryCount+1)});
        this.callWeatherSvc(params, tryCount+1);
    }
    else {
      this.toastSvc.toastOpen({tType: 'Error', content: 'Error retreiving weather data.\n' + err});
      return err;
    }
  })
}

getWeatherData = (params: WeatherRequest) : Promise<void | WeatherData> => {
  return new Promise((resolve, reject) => {
    this.callWeatherSvc(params)
    .then((r : any) => {
      let data : WeatherData = {
        main:       r.weather[0].main,
        id:         r.weather[0].id,
        desc:       r.weather[0].description,
        icon:       r.weather[0].icon,
        sunrise:    r.sys.sunrise,
        sunset:     r.sys.sunset,
        temp:       r.main.temp,
        humidity:   r.main.humidity,
        wind:       {windSpeed: r.wind.speed, windDir: this.getCardinalDirection(r.wind.deg)},
        clouds:     r.clouds.all,
        city:       r.name,
        time:       r.dt,
      };
      data.condIconId = this.getCondIcon(data);
      data.tempIconId = this.getTempIcon(data);
      data.windIconId = 'Wind';
      resolve(data);
    })
    .catch((error) => {
      reject(error)
    })
  })
}

// return true if the given EPOC timestamps are within 1/2 hour of each other
isNearTime = (t1: number, t2: number) => {
  return Math.abs(t1 - t2) <= HALF_HOUR_EPOC;
}

// Determine what icon to use to represent the current conditions
getCondIcon = (data: WeatherData) : string => {
  let sunUpDown = this.isNearTime(data.time, data.sunrise) || this.isNearTime(data.time, data.sunset);
  switch(data.icon){
    case '01d':
      return sunUpDown ? 'HorizonSun' : 'ClearDay';
    case '01n':
      return sunUpDown ? 'HorizonSun' : 'ClearNight';
    case '02d':
    case '03d':
      return (data.id === 800) ? 'ClearDay' : 'PartCloudyDay';
    case '02n':
    case '03n':
      return (data.id === 800) ? 'ClearNight' : 'PartCloudyNight';
    case '04d':
    case '04n':
      return 'Cloudy';
    case '50n':
    case '50d':
      return (data.id === 731 || data.id === 751 || data.id === 761) ? 'Whirlwind' : 'Fog';
    case '09d':
    case '09n':
      return 'LightRain';
    case '10d':
    case '10n':
      return 'HeavyRain';
    case '13n':
    case '13d':
      return (data.id === 511) ? 'FreezingRain' : 'Snow';
    case '11d':
    case '11n':
    return (data.id < 210 || data.id > 221) ? 'ThunderstormRain' : 'Thunderstorm';
  }
  return 'Sunglasses'
  // return 'PartCloudyDay';
}

// Determine what icon to use to represent the current conditions
getTempIcon = (data: WeatherData) : string => {
  let tIndx = this.getRangeIndex(-40, 130, 17, data.temp * 1.8 - 459.67)
  switch(tIndx){
    case 5:   // 20-30 deg F
    case 6:
    case 7:   
      return 'TempCool';
    case 8:   // 40-50 deg F
    case 9:
    case 10:  // 60-70
    case 11:
    case 12: 
      return 'TempWarm';
    case 13:  // 90-100
    case 14:
    case 15:
    case 16: 
      return 'TempHot';
    default:  // below 10
      return 'TempCold';
  }
}

// given a range of values and a number of divisions to create within the range,
// determine which division the given value falls into
// return the division (0 = first) or -1 if not in range or invalid range/divs (low === high || divs <= 0)
getRangeIndex = (low: number, high: number, divs: number, val: number) : number => {
  if (val < low || val > high || divs <= 0) { return -1 };
  let div = high > low ? (high-low)/divs : (low-high)/divs;
  for(let i=0, v=low; i < divs-1; i++){
    if (val >= v && val < v+div ) {
      return i;
    }
    v += div;
  }
  return divs-1;
}

// given a direction in degrees, return a string that represents the direction (N, NE, etc)
getCardinalDirection = (deg: number) : string => {
  let indx = this.getRangeIndex(0, 360, 16, (deg + 11.25) % 360);
  if (indx === -1) { return ''; }
  return CARDINAL_DIRECTIONS[indx];
}


// format given Kelvin temperature for given measurement system
formatTemperature = (k: number, system: string) => {
  switch(TEMPERATURE_UNITS[system]){
    case 'F':
      return Math.round(k * 1.8 - 459.67) + String.fromCharCode(176) + ' F';
    case 'C':
      return Math.round(k - 273.15) + String.fromCharCode(176) + ' C';
    default:
      return Math.round(k) + String.fromCharCode(176) + ' K';
  }
}

}


