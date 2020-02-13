import { action } from 'mobx';
import { Alert } from 'react-native';

import { UtilsSvc,LB_PER_KG, SortDate} from './UtilsService';
import { StorageSvc } from './StorageService';
import { ImageSvc, TrekImage, TrekImageSet, IMAGE_TYPE_INFO } from './ImageService';
import { MainSvc, DIST_UNIT_CHOICES, SPEED_UNIT_CHOICES,
         SpeedStatType, 
         TrekType} from './MainSvc';
import {  MAX_TIME_SINCE } from './LoggingService';
import { TrekInfo, TrekObj, TrekPoint, ElevationData, LaLo } from './TrekInfoModel';

// Class containing service functions for a TrekInfo object

export class TrekSvc {


  constructor ( private mainSvc: MainSvc, private utilsSvc: UtilsSvc, private storageSvc: StorageSvc, 
    private imageSvc: ImageSvc ) {
  }

  @action
  // copy all properties from the given object to the given trek
  restoreTrekProperties = (trek: TrekInfo, data: any) => {
    trek.dataVersion   = data.dataVersion;
    trek.group         = data.group;
    trek.date          = data.date;
    trek.sortDate      = data.sortDate;
    trek.startTime     = data.startTime;
    trek.endTime       = data.endTime;
    trek.type          = data.type;
    trek.weight        = data.weight;
    trek.packWeight    = data.packWeight;
    trek.strideLength  = data.strideLength;
    trek.conditions    = data.conditions;
    trek.duration      = data.duration;
    trek.trekDist      = data.trekDist;
    trek.totalGpsPoints= data.totalGpsPoints;
    trek.hills         = data.hills;
    trek.elevations    = data.elevations;
    trek.elevationGain = data.elevationGain;
    trek.intervals     = data.intervals;
    trek.intervalDisplayUnits = data.intervalDisplayUnits;
    trek.trekLabel     = data.trekLabel;
    trek.trekNotes     = data.trekNotes;
    trek.trekImages    = data.trekImages;
    trek.calories      = data.calories;
    trek.drivingACar   = data.drivingACar;
    trek.course        = data.course
  }

  // set the trek properties from the given trek objeck
  @action
  setTrekProperties = (trek: TrekInfo, data: TrekObj, timerOn: boolean, forceUpdate = false) => {
    trek.dataVersion    = data.dataVersion || '1';
    trek.sortDate       = data.sortDate;
    trek.group          = data.group;
    trek.date           = data.date;
    trek.type           = data.type;
    trek.strideLength   = data.strideLength;
    trek.weight         = data.weight;
    trek.startTime      = data.startTime;
    trek.endTime        = data.endTime;
    trek.packWeight     = data.packWeight;
    trek.conditions     = data.conditions;
    trek.duration       = data.duration || 0;
    trek.trekDist       = data.trekDist;
    trek.totalGpsPoints = data.totalGpsPoints;
    trek.pointList      = data.pointList;
    trek.elevations     = data.elevations;
    trek.elevationGain  = data.elevationGain;
    trek.hills          = this.utilsSvc.analyzeHills(trek.elevations, trek.elevationGain, trek.trekDist);
    trek.intervals      = data.intervals;
    trek.intervalDisplayUnits = data.intervalDisplayUnits;
    trek.trekLabel      = data.trekLabel;
    trek.trekNotes      = data.trekNotes;
    trek.trekImages     = data.trekImages;
    trek.calories       = data.calories;
    trek.drivingACar    = data.drivingACar;
    trek.course         = data.course;
    this.updateTrekImageCount(trek);
    this.updateCalculatedValues(trek, timerOn, forceUpdate);
  }

  // Add the given value to the trek distance.
  // Set the distance property of the ending point in the trek's pointList
  updateDist = (trek: TrekInfo, dist: number) => {
    this.setTrekDist(trek, trek.trekDist + dist);
    trek.pointList[trek.pointList.length - 1].d = trek.trekDist;
  };

  // set the value of the trekDist property
  @action
  setTrekDist = (trek: TrekInfo, dist: number) => {
    trek.trekDist = this.utilsSvc.fourSigDigits(dist);
  };

  @action
  // set packWeight (assume kilos)
  updatePackWeight = (trek: TrekInfo, value: number) => {
    trek.packWeight = value;
  }

  @action
  // set packWeight (convert to kilos if necessary)
  setPackWeight = (trek: TrekInfo, value: number) => {
    trek.packWeight = this.mainSvc.measurementSystem === 'US' ? (value / LB_PER_KG) : value;
  }

  @action
  // set course 
  setCourseLink = (trek: TrekInfo, name: string) => {
    trek.course = name;
  }

  // update the value of the trekLabel property
  @action
  setTrekLabel = (trek: TrekInfo, val: string) => {
    trek.trekLabel = val;
  }

  // update the value of the intervals property
  @action
  setIntervals = (trek: TrekInfo, val: number[]) => {
    trek.intervals = val;
  }

  // return true if this trek has a label value defined
  trekHasLabel = (trek: TrekInfo) : boolean => {
    return (trek.trekLabel !== undefined) && (trek.trekLabel !== '');
  }

  // return true if this trek has a notes value defined
  trekHasNotes = (trek: TrekInfo) : boolean => {
    return (trek.trekNotes !== undefined) && (trek.trekNotes !== '');
  }

  // return a value for the trek label
  getTrekLabel = (trek: TrekInfo) => {
    return this.trekHasLabel(trek) ? trek.trekLabel : 'No Label';
  }

  // update the value of the trekNotes property
  @action
  setTrekNotes = (trek: TrekInfo, val: string) => {
    trek.trekNotes = val;
  }

  // Set the date for the trek.
  @action
  setDate = (trek: TrekInfo, value: string) => {
    trek.date = value;
  };

  // Set the date for the trek.
  @action
  setStartTime = (trek: TrekInfo, value: string) => {
    trek.startTime = value;
  };

  // set the ending trek time
  @action
  setEndTime = (trek: TrekInfo, value: string) => {
    trek.endTime = value;
  };

  // set the ending trek time
  @action
  setSortDate = (trek: TrekInfo, value: string) => {
    trek.sortDate = value;
  };

  // reset properties of the TrekObj
  @action
  clearTrek = (trek: TrekInfo, timerOn: boolean) => {
    this.setTrekProperties(trek, {
      dataVersion:  trek.dataVersion,
      group:        trek.group,
      date:         trek.date,
      type:         trek.type,
      weight:       trek.weight,
      strideLength: trek.strideLength,
      startTime:    ' ',
      pointList:    [],
      calories:     0,
      packWeight:   trek.packWeight,
      trekDist:     0,
    } as TrekObj, timerOn)
  }

  @action
  // reset properties related to the logging process
  resetTrek = (trek: TrekInfo) => {
    trek.startTime = ' ';
    trek.pointList = [];
    trek.totalGpsPoints = 0;
    trek.trekImages = undefined;
    trek.hills = "Unknown";
    trek.currentCalories = '';
    trek.speedNow = '';
    trek.averageSpeed = '';
    trek.timePerDist = '';
    trek.currentCaloriesPerMin = '';
    trek.drivingACar = false;
    this.setTrekLabel(trek, "");
    this.setTrekNotes(trek, "");
  };

  // Set the value of the elevations property
  @action
  setElevations = (trek: TrekInfo, elevs: ElevationData[]) => {
    trek.elevations = elevs;
  }

  // Set the value of the elevationGain property
  @action
  setElevationGain = (trek: TrekInfo, gain: number) => {
    trek.elevationGain = this.utilsSvc.fourSigDigits(gain);
  }

  // Set the value of the hills property
  @action
  setHills = (trek: TrekInfo, hills: string) => {
    trek.hills = hills;
  }

  // set the data properties related to elevations for given trek
  @action
  setElevationProperties = (trek: TrekInfo) : Promise<string> => {
    let path = this.utilsSvc.cvtPointListToLatLng(trek.pointList); // use the LatLng version of the path
    return new Promise((resolve, reject) => {
      this.utilsSvc.getElevationsArray(path)
      .then((data : ElevationData[]) =>{
        this.setElevations(trek, data.slice());
        this.setElevationGain(trek, this.utilsSvc.getElevationGain(trek.elevations));
        this.setHills(trek, this.utilsSvc.analyzeHills(trek.elevations, trek.elevationGain, trek.trekDist));
        if (trek.hills !== 'Level') {
          this.computeCalories(trek);
        }
        resolve('OK');
      })
      .catch((err) =>{ 
        reject(err); 
      })
    })
  }

  // add the given uri to the trek and associate it with the given location
  // associate image with last image if user hasn't moved more than 20 meters
  @action
  addTrekImage = (trek: TrekInfo, uri: string, data: any, type: number, loc: LaLo, date: SortDate,
                  label: string, note: string) => {
    if(trek.trekImages === undefined) { trek.trekImages = [{loc: loc, images: []}]; }
    let n = trek.trekImages.length;
    let d = this.utilsSvc.calcDist(trek.trekImages[n-1].loc.a, trek.trekImages[n-1].loc.o, loc.a, loc.o);
    if (d > 10){
      trek.trekImages.push({loc: loc, images: []});  // too far from last image, create new set
      n++;
    }
    let newImage: TrekImage = {uri: uri, orientation: data.deviceOrientation, 
        width: data.width, height: data.height, type: type, 
        sDate: date, label: label, note: note};
    trek.trekImages[n-1].images.push(newImage);
    this.updateTrekImageCount(trek);
  }

  // delete the given TrekImage from the given TrekImageSet
  @action
  deleteTrekImage = (trek: TrekInfo, imageSetIndex: number, imageIndex: number) : number => {
    let currSet = trek.trekImages[imageSetIndex];
    let newIndx = -1;
    let delUri = currSet.images[imageIndex].uri;
    let delSDate = currSet.images[imageIndex].sDate;

    currSet.images.splice(imageIndex, 1);
    if (currSet.images.length === 0) {
      trek.trekImages.splice(imageSetIndex, 1);
      if (trek.trekImages.length === 0) {
        trek.trekImages = undefined;
      }
    } else {
      newIndx = currSet.images.length > imageIndex ? imageIndex : imageIndex - 1;
    }
    this.updateTrekImageCount(trek);
    this.mainSvc.saveTrek(trek);
    this.storageSvc.removeDataItem(delUri)
    .then(() => {
      this.imageSvc.removeImage(delSDate, delUri)
    })
    .catch((err) => {
      Alert.alert('Picture Delete Error', 'Picture Location:\n' + delUri + '\nError:\n' + err);
    })
    return newIndx;
  }

  // apply the given update the selected image
  @action
  updateTrekImage = (trek: TrekInfo, imageSetIndex: number, imageIndex: number, update: any)  => {
    let currSet = trek.trekImages[imageSetIndex];
    currSet.images[imageIndex] = {...currSet.images[imageIndex], ...update};
  }

    // return the last trekImageSet
  endImageSet = (trek: TrekInfo) : TrekImageSet => {
    return (this.getTrekImageCount(trek) ? trek.trekImages[trek.trekImages.length - 1] : undefined);
  }

  // return the count of trekImages
  getTrekImageCount = (trek: TrekInfo) => {
    let count = 0;
    let sets = this.getTrekImageSetCount(trek);

    for(let i = 0; i < sets; i++ ){
      count += trek.trekImages[i].images.length;
    }
    return count;
  }

  // return the count of trekImageSets
  getTrekImageSetCount = (trek: TrekInfo) => {
    return trek.trekImages ? trek.trekImages.length : 0;
  }

  // return the number of images in the TrekImages list that are before the given set
  imagesToSet = (trek: TrekInfo, setIndex: number) => {
    let count = 0;
    let sets = this.getTrekImageSetCount(trek);

    if(sets && setIndex !== undefined && setIndex < sets) {
      for(let i=0; i<setIndex; i++) {
        count += trek.trekImages[i].images.length;
      }
    }
    return count;
  } 
  
  // format a title for the given image number from the given image set
  formatImageTitle = (trek: TrekInfo, set: number, iNum: number, showUri = false) : string => {
    let image = trek.trekImages[set].images[iNum];
    let imageType = IMAGE_TYPE_INFO[image.type].name;
    let title = imageType;
    if (showUri ) {
      title = image.uri + '\n' + imageType;
    }
    return title;
  }

  // format a time (date and time) for the selected image
  formatImageTime = (picDate: SortDate) => {
    let title = undefined;
    if(picDate){
      title = this.utilsSvc.formattedLongDateAbbr(this.utilsSvc.dateFromSortDate(picDate));
      title += '   ' + this.utilsSvc.timeFromSortDate(picDate); 
    }
    return title;
  }

  // set the pointList property
  setPointList = (trek: TrekInfo, list: TrekPoint[]) => {
    trek.pointList = list;
  }

  // Return TRUE if GPS pointList is empty
  pointListEmpty = (trek: TrekInfo) : boolean => {
    return (!trek.pointList || (trek.pointList.length === 0));
  }

  // Return the length of the pointList
  pointListLength = (trek: TrekInfo) => {
    return this.pointListEmpty(trek) ? 0 : trek.pointList.length;
  }

  // Return the last point in the trek or undefined if no points
  lastPoint = (trek: TrekInfo) => {
    return trek.pointList.length === 0 ? undefined : trek.pointList[trek.pointList.length - 1];
  }

  // set the value of the duration property
  @action
  setDuration = (trek: TrekInfo, dur: number) => {
    trek.duration = dur;
  }

  // compute the value for the calories property
  computeCalories = (trek: TrekInfo) => {
    trek.calories = this.utilsSvc.computeCalories(trek.pointList, trek.duration, trek.type, 
        trek.hills, trek.weight, this.getPackWeight(trek));
  }

  // Set the group to the given value
  @action
  updateGroup = (trek: TrekInfo, value: string) => {
    trek.group = value;
  }

  // update the group specific properties from the given object
  @action
  updateGroupProperties = (trek: TrekInfo, data: any) => {
    this.updateGroup(trek, data.group);
    trek.strideLength = data.strideLength;
    this.updateType(trek, data.type);
    trek.weight = data.weight;
    this.updatePackWeight(trek, data.packWeight);
  }

  // Set the group to the given value
  @action
  updateType = (trek: TrekInfo, value: TrekType) => {
    trek.type = value;
  }

  // Set the strideLength to the given value
  @action
  updateStrideLength = (trek: TrekInfo, value: number) => {
    trek.strideLength = value;
  }

  // Set the conditions to the given value
  @action
  updateConditions = (trek: TrekInfo, value: any) => {
    trek.conditions = value;
  }

  // get the weight of the pack if applicable (kg)
  getPackWeight = (trek: TrekInfo) => {
    return (trek.type === 'Hike') ? trek.packWeight : 0; 
  }
  
  // get the total weight for weight related calculations (kg)
  getTotalWeight = (trek: TrekInfo) => {
    return trek.weight + this.getPackWeight(trek); 
  }

  // return whether the data for this trek contains altitude info
  hasElevations = (trek: TrekInfo) : boolean => {
    return (trek.elevations !== undefined && trek.elevations.length !== 0);
  }

  // return true if trek has Weather data
  hasWeather = (trek: TrekInfo) : boolean => {
    return trek.conditions !== undefined;
  }

  // Return the number of steps represented by the trek distance
  formattedSteps = (trek: TrekInfo, perMin = false, dist = trek.trekDist, time = trek.duration) => {
    let steps;

    steps = this.utilsSvc.computeStepCount(dist, trek.strideLength);
    return this.utilsSvc.formatSteps(trek.type, steps, perMin ? time : undefined);
  }

  formattedAvgSpeed = (trek: TrekInfo) => {
    return this.utilsSvc.formatAvgSpeed(this.mainSvc.measurementSystem, 
                                        trek.trekDist, trek.duration);
  }

  formattedTimePerDist = (trek: TrekInfo) => {
    return this.utilsSvc.formatTimePerDist(DIST_UNIT_CHOICES[this.mainSvc.measurementSystem], 
                                            trek.trekDist, trek.duration);
  }

  // Return the speed value from the last GPS point formatted so it can be displayed
  // the raw meters/second speed will be returned if the mpsOnly parameter is true.
  formattedCurrentSpeed = (trek: TrekInfo, timerOn: boolean, system = this.mainSvc.measurementSystem, mpsOnly = false) => {
    let speed = 0;
    let point : TrekPoint;
    let pll = trek.pointList.length;
    let speedMPS = 0;

    if ((pll > 0) && timerOn) {
      point = trek.pointList[pll - 1];
      // now convert meters/sec to mph or kph
      if (trek.duration - point.t < MAX_TIME_SINCE) {
        speedMPS = point.s || 0;
        speed = this.utilsSvc.computeRoundedAvgSpeed(system, speedMPS, 1);
      }
      else {
        // been too long since last GPS point, punt
        speed = 0;
      }
    }
    return mpsOnly ? speedMPS : (speed + ' ' + SPEED_UNIT_CHOICES[system]);
  }

  // return total calories burned or burn rate depending on the "total" param
  formattedCalories = (trek: TrekInfo, totalCals, total = true, time = trek.duration) => {
    return (total 
              ? totalCals.toString() 
              : this.utilsSvc.getCaloriesPerMin(totalCals, time).toString()
           )
  }

  // set the value of the trekImageCount property
  @action
  setTrekImageCount = (trek: TrekInfo, count : number) => {
    trek.trekImageCount = count;
  }

  updateTrekImageCount = (trek: TrekInfo) => {
    this.setTrekImageCount(trek, this.getTrekImageCount(trek));
  }
  // return true if the trek has any images
  haveTrekImages = (trek: TrekInfo) => {
    return trek.trekImageCount !== 0;
  }

  // Indicate whether Avg Speed, Speed Now or Time/Dist should show in the status
  @action
  updateShowSpeedStat = (trek: TrekInfo, stat: SpeedStatType) => {
    trek.showSpeedStat = stat;
  }

  // switch the measurement system and update the calculated trek values
  switchMeasurementSystem = (trek: TrekInfo, timerOn: boolean, force = false) => {
    this.mainSvc.switchMeasurementSystem();
    this.updateCalculatedValues(trek, timerOn, force);
  }

  // compute and update various display values
  @action
  updateCalculatedValues = (trek: TrekInfo, timerOn: boolean, force = false) => {
      this.updateSpeedNow(trek, timerOn);
      this.updateAverageSpeed(trek);
      this.updateCurrentCalories(trek, timerOn, force);
      this.updateCurrentDist(trek);
    // }
  }

  // compute the current speed and uptate the currentSpeed property
  @action
  updateSpeedNow = (trek: TrekInfo, timerOn: boolean) => {
    trek.speedNow = this.formattedCurrentSpeed(trek, timerOn) as string;
  }

  // format the avgerageSpeed and timePerDist properties
  @action
  updateAverageSpeed = (trek: TrekInfo) => {
    trek.averageSpeed = this.formattedAvgSpeed(trek);
    trek.timePerDist = this.formattedTimePerDist(trek);
  }

  // format the currentDist property using the trekDist property
  @action
  updateCurrentDist = (trek: TrekInfo) => {
    trek.currentDist = this.mainSvc.formattedDist(trek.trekDist);
  }

  // update the current calories property from the calories property.
  // compute the calories property if appropriate or specified
  @action
  updateCurrentCalories = (trek: TrekInfo, timerOn = false, compute = false) => {
    if (timerOn || compute){
      this.computeCalories(trek);
    }
    trek.currentCalories = this.formattedCalories(trek, trek.calories || 0);

    trek.currentCaloriesPerMin = 
           this.utilsSvc.getCaloriesPerMin(trek.currentCalories, trek.duration);
  }

  // Indicate whether Steps or Steps/Min should show in the status
  @action
  updateShowStepsPerMin = (trek: TrekInfo, status: boolean) => {
    trek.showStepsPerMin = status;
  }

  // Indicate whether Calories or Calories/Min should show in the status
  @action
  updateShowTotalCalories = (trek: TrekInfo, status: boolean) => {
    trek.showTotalCalories = status;
  }

}