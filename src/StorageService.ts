import { AsyncStorage } from 'react-native'
import { TREKLOG_GOALS_KEY, TREKLOG_SETTINGS_KEY, TREKLOG_USERS_KEY, TREKLOG_LOG_KEY } from './App'
import { GoalObj } from './GoalsService';
import { SettingsObj, UsersObj } from './SettingsComponent';
import { TrekObj, RestoreObject, CURR_DATA_VERSION } from './TrekInfoModel';
import { UtilsSvc, MPH_TO_MPS, DRIVING_A_CAR_SPEED } from './UtilsService';

export class StorageSvc {
    
  constructor (private utilsSvc: UtilsSvc) {
  }

  // read the list of users from the database
  fetchUserList = () : Promise<string> => {
    return AsyncStorage.getItem(TREKLOG_USERS_KEY);
  }

  // Save the list of users to the database
  storeUserList = (list: UsersObj) : Promise<any> => {
    return AsyncStorage.setItem(TREKLOG_USERS_KEY, JSON.stringify(list))
  }

  // Format the storage key for this user's goals
  formatUserGoalsKey = (user: string) => {
    return (TREKLOG_GOALS_KEY + user + '#');
  }

  fetchGoalList = (user: string) : Promise<string> => {
    return AsyncStorage.getItem(this.formatUserGoalsKey(user));
  }

  // save the given list of user's goals to the database
  storeGoalList = (user: string, gList: GoalObj[]) : Promise<any> => {
    return AsyncStorage.setItem(this.formatUserGoalsKey(user), JSON.stringify(gList));
  }

  // Format the storage key for this user's settingss
  formatUserSettingsKey = (user: string) => {
    return (TREKLOG_SETTINGS_KEY + user + '#');
  }

  // read the settings object for the given user from the database
  fetchUserSettings = (user: string) : Promise<string> => {
    return AsyncStorage.getItem(this.formatUserSettingsKey(user));
  }

  // save the given list of user's goals to the database
  storeUserSettings = (user: string, settings: SettingsObj) : Promise<any> => {
    return AsyncStorage.setItem(this.formatUserSettingsKey(user), JSON.stringify(settings));
  }

  // remove the settings for the given user from the database
  deleteUserSettings = (user: string) : Promise<any> => {
    return AsyncStorage.removeItem(this.formatUserSettingsKey(user));    
  }

  // remove the item with the given key from the database
  removeItem = (key: string) : Promise<any> => {
    return AsyncStorage.removeItem(key);
  }

  // return a string to be used as the storage key for the given trek
  getTrekKey = (trek: TrekObj) :string => {
    return TREKLOG_LOG_KEY + trek.user + '_' + trek.sortDate;
  }


  // get all the keys from storage that are for trek logs for the given user (all if no user given)
  getAllTrekKeys = (user?: string) : Promise<string[] | string> => {   
    let keyList : string[] = [];

    return new Promise((resolve, reject) => {
      
      AsyncStorage.getAllKeys((error, result) => {
        if (error) { 
          reject("NO_KEYS"); 
        } 
        else {
          for(let i=0; i<result.length; i++){
            // make sure to skip settings objects and only select Treks for the given user (if given)
            if( result[i].includes(TREKLOG_LOG_KEY) &&
                ((user === undefined) || result[i].includes(user + '_')) ) {
              keyList.push(result[i]);     // include this Trek
            }
          }
          resolve(keyList);
        }
      })
    })
  }

  // Read all the treks from the storage
  // Return a promise for an array of TrekObj or string for reject message
  // Resolve with array of TrekObj for the selected user (or all users if user not specified)
  fetchAllTreks = (user?: string) : Promise<{list: TrekObj[], upgraded: number}> => {   
    let allTreks : TrekObj[] = [];
    let allKeys  : string[] = [];

    return new Promise((resolve, reject) => {
      this.getAllTrekKeys(user)
      .then((result : string[]) => {
        allKeys = result;
        if (!allKeys.length) { 
          resolve({list: allTreks, upgraded: 0});   // return empty list if no keys found
        } else {
          AsyncStorage.multiGet(allKeys, (_errors, result) => {
            if (!result) { 
              reject("ERROR_TREKS"); 
            } 
            else {
              let saves = [];
              let upgraded = 0;
              result.forEach((element) => {
                let thisTrek = JSON.parse(element[1]);
                if (this.verifyDataVersion(thisTrek)) {
                  // trek data was upgraded, delete old version and save new one
                  upgraded++;
                  saves.push(this.removeTrek(thisTrek))
                  saves.push(this.storeTrek(thisTrek));
                }
                allTreks.push(thisTrek); // save TrekObj in allTreks list
              });
              // now wait for any upgrades to finish
              Promise.all(saves).then(() => {resolve({list: allTreks, upgraded: upgraded})});
            }
          })
        }
      })
      .catch (() => {
        // Error reading list of keys
        reject('ERROR_KEYS');
      })      
    })
  }

  // verify the dataVersion of the given trek.  Perform any necessary upgrades to 
  // bring trek up to date.
  verifyDataVersion = (t: TrekObj) : boolean => {
    let upgraded = false;
    // for(let i=0; i<t.pointList.length; i++){
    //   if(t.pointList[i].s === undefined){
    //     upgraded = true;
    //     if( i > 0){
    //       t.pointList[i].s = t.pointList[i-1].s;
    //     }
    //     else t.pointList[i].s = 0;
    //   }
    // }

    if(t.calories === undefined){ t.dataVersion = '4'; }
    if (t.dataVersion !== CURR_DATA_VERSION){
      let dv = t.dataVersion;
      t.dataVersion = CURR_DATA_VERSION;
      upgraded = true;
      switch(dv){
        case '3':
          this.upgradeFrom3();
        case '4.1':
        case '4':
          this.upgradeFrom4(t);
        case '4.2':
          this.upgradeFrom4_2(t);
        case '4.3':
          this.upgradeFrom4_3(t);
          break;
        default:
      }
    }
    return upgraded;
  }

  // convert version 3 trek to version 4
  upgradeFrom3 = () => {
  }

  // convert version 4 trek to version 4.2
  upgradeFrom4 = (t: TrekObj) => {
    t.packWeight = (t.type === 'Hike') ? t.packWeight : 0;
    // t.calories = this.utilsSvc.computeCalories(t.pointList, t.type, t.hills, t.weight, t.packWeight);
  }
  
  // convert version 4.2 trek to version 4.3
  // set the driving a car property
  upgradeFrom4_2 = (t: TrekObj) => {
    t.drivingACar = false;
    for(let i = 1; i < t.pointList.length; i++){
      if((t.pointList[i].s / MPH_TO_MPS) > DRIVING_A_CAR_SPEED){
        t.drivingACar = true;
        return;
      }
    }
  }

  // convert version 4.3 trek to version 4.4
  upgradeFrom4_3 = (t: TrekObj) => {
    t.calories = this.utilsSvc.computeCalories(t.pointList, t.type, t.hills, t.weight, t.packWeight);
  }

  convertTrekToDB = (trek: TrekObj) => {
  // Compose and return a an object with the trek information formatted for DB storage
    let result = {
      dataVersion:  trek.dataVersion,
      user:         trek.user,
      date:         trek.date,
      sortDate:     trek.sortDate,
      startTime:    trek.startTime,
      endTime:      trek.endTime,
      type:         trek.type,
      weight:       Math.round(trek.weight * 10000) / 10000,
      packWeight:   (trek.type === 'Hike') ? (Math.round(trek.packWeight * 10000) / 10000) : 0,
      strideLength: Math.round(trek.strideLength * 10000) / 10000,
      conditions:   trek.conditions,
      duration:     trek.duration,
      trekDist:     Math.round(trek.trekDist * 10000) / 10000,
      totalGpsPoints: trek.totalGpsPoints,
      hills:        trek.hills,
      pointList:    trek.pointList,
      elevations:   trek.elevations,
      elevationGain: Math.round(trek.elevationGain * 10000) / 10000,
      intervals:    trek.intervals,
      intervalDisplayUnits: trek.intervalDisplayUnits,
      trekLabel:    trek.trekLabel,
      trekNotes:    trek.trekNotes,
      trekImages:   trek.trekImages,
      calories:     trek.calories,
      drivingACar:  trek.drivingACar,
    }
    return result;
  }

  storeTrek = (trek: TrekObj) : Promise<any> => {
    let saveTrek = this.convertTrekToDB(trek);
    return  AsyncStorage.setItem(this.getTrekKey(trek), JSON.stringify(saveTrek));
  }

  removeTrek = (trek: TrekObj) : Promise<any> => {
    return  AsyncStorage.removeItem(this.getTrekKey(trek));
  }

  // save the restore object
  storeRestoreObj = (resObj: RestoreObject) : Promise<any> => {
    return AsyncStorage.setItem("TrekRestoreObj", JSON.stringify(resObj));
  }

  // return the restore object (if any)
  fetchRestoreObj = () : Promise<any> => {
    return new Promise((resolve, reject) => {
      AsyncStorage.getItem("TrekRestoreObj", (_error, result) => {
        if (!result) { 
          reject("NOT_FOUND"); 
        } 
        else {
          resolve(JSON.parse(result));
        }
      });
    })
  }

  // delete the restore object
  removeRestoreObj = () : Promise<any> => {
    return AsyncStorage.removeItem("TrekRestoreObj");
  }

}