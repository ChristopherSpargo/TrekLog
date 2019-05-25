import { action } from 'mobx'

import { TrekType,MeasurementSystemType, TrekTypeDataNumeric } from './TrekInfoModel'
import { LB_PER_KG } from './UtilsService';
import { ThemeType } from './App';
import { ModalModel } from './ModalModel';
import { StorageSvc } from './StorageService';

export interface WeightObj {
  date: string,       // a short (8-char) sortDate
  weight: number
}

export interface SettingsObj {
  group:         string,         // group these settings are for
  type:         TrekType,
  measurementSystem: MeasurementSystemType,
  height:       number,
  strideLengths: TrekTypeDataNumeric,
  weights:       WeightObj[],
  packWeight:   number,
  theme?:        ThemeType,
}


export interface GroupsObj {
  groups:     string[],
  lastGroup:  string,
  theme:      ThemeType
}

export const NEW_GROUP = '#new#';
export const DEFAULT_WEIGHT = 150 / LB_PER_KG;


export class GroupSvc {

  groups : GroupsObj;
  lastGroup : string;
  lastGroupSettings: SettingsObj;
  
  constructor ( private modalSvc: ModalModel, private storageSvc: StorageSvc ) {
    this.init();
  }

  init = () => {
    this.readGroups();
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
  }

  // read the list of Groups
  // resolve whith a GroupsObj
  readGroups = () : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      if(this.groups !== undefined) {
        resolve(this.groups)
      } else {
        this.storageSvc.fetchGroupListFile()
        .then((result : any) => {
          this.groups = JSON.parse(result) as GroupsObj;
          if (this.groups.groups.length){
            resolve(this.groups)
          }
          else {
            reject('LIST_EMPTY');
          }
        })
        .catch(() => {
          // Failed to read groups
          reject('NO_LIST');
        })
      }
    })
  }

  // write the GroupsObj to the database
  saveGroups = (name?: string) : Promise<any> => {
    return new Promise((resolve, reject) => {
      if(name !== undefined && this.isGroup(name)) {
        this.setLastGroup(name);
      }
      this.storageSvc.storeGroupListFile(this.groups)
      .then(() => {
        resolve("OK");
      })
      .catch(() => {
        reject("GROUPS_NOT_SAVED");
      })
    })
  }

  // set the theme property of the GroupsObj
  setTheme = (theme: ThemeType) => {
    this.groups.theme = theme;
  }

  // get the theme property of the GroupsObj
  getTheme = () => {
    return this.groups.theme;
  }

  // read the settings file for the given group
  readGroupSettings = (group: string) => {
    return new Promise((resolve, reject) => {
      if (group === this.lastGroup) { 
        resolve(this.lastGroupSettings);
      }
      else {
        this.storageSvc.fetchGroupSettingsFile(group)
        .then((result) => {
          this.lastGroup = group;
          this.lastGroupSettings = JSON.parse(result) as SettingsObj;
          resolve(this.lastGroupSettings)
        })
        .catch((err) => reject(err))
      }
    })
  }

  // save the settings file for the given group
  saveGroupSettings = (group: string, settingsObj: SettingsObj) => {
    return new Promise((resolve, reject) => {
      this.lastGroup = group;
      this.lastGroupSettings = settingsObj;
      this.storageSvc.storeGroupSettingsFile(group, settingsObj)
      .then(() => resolve('OK'))
      .catch((err) => reject(err))
    })
  }

  // set the value of the lastGroup property of the GroupsObj
  setLastGroup = (group: string) => {
    this.groups.lastGroup = group;
  }

  // set the value of the lastGroup property of the GroupsObj
  getLastGroup = () => {
    return this.groups.lastGroup;
  }

  getGroupSelection = (pickerOpenFn : Function, currGroup: string, heading: string, allowNew = false) => {
    let names = [];
    let values = [];

    if (allowNew) {
      names.push("New");
      values.push(NEW_GROUP)
    }
    let selNames = names.concat(this.groups.groups);
    let selValues = values.concat(this.groups.groups);

    return new Promise<any>((resolve, reject) => {
      this.modalSvc.openRadioPicker({heading: heading, selectionNames: selNames,
      selectionValues: selValues, selection: currGroup,
      openFn: pickerOpenFn})
      .then((newGroup) => {
        resolve(newGroup);
      })
      .catch(() => {
        reject('NO_SELECTION') 
      })
    })
  }

  // add the given name to the list of Groups
  addGroup = (name: string) : Promise<any> => {
    this.groups.groups.push(name);
    return this.saveGroups();
  }

  // return true if the given name is in the list of groups
  isGroup = (name: string) : boolean => {
    return this.groups.groups.indexOf(name) !== -1;
  }

  // remove the given group from the list of groups and delete all their data
  // resolve with the name of the new current group
  deleteGroup = (name: string) => {
    let i = this.groups.groups.indexOf(name);
    let currGroup = this.groups.lastGroup;

    return new Promise((resolve, reject) => {
      if (i !== -1){
        // remove the directory and images for the group
        this.storageSvc.deleteGroupFiles(name)
        .then(() => {
          this.groups.groups.splice(i,1);
          if (this.groups.groups.length > 0){
            if(this.groups.groups.indexOf(currGroup) === -1){
              currGroup = this.groups.groups[0];              // deleted current group, update this.group
            }
          } else {
            currGroup = NEW_GROUP;
          }

          // save groups list (set the last group)
          this.saveGroups(currGroup);
          resolve(currGroup);
        })
        .catch(() => {
          reject("ERROR_DELETING_TREKS");
        })

      }
      else {
        reject("NO_SUCH_GROUP");
      }
    })
  }


}
