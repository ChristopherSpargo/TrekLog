import { action } from 'mobx'

import {  TrekTypeDataNumeric } from './TrekInfoModel'
import { LB_PER_KG } from './UtilsService';
import { ThemeType, COLOR_THEME_DARK, _3D_CAMERA_PITCH, MapViewPitchType, _3D_CAMERA_PITCH_STR } from './App';
import { ModalModel } from './ModalModel';
import { StorageSvc } from './StorageService';
import { TrekType, MeasurementSystemType } from './MainSvc';

export interface WeightObj {
  date: string,       // a short (8-char) sortDate
  weight: number
}

export interface SettingsObj {
  group:         string,         // group these settings are for
  type:          TrekType,
  height:        number,
  strideLengths: TrekTypeDataNumeric,
  weights:       WeightObj[],
  packWeight:    number,
}


export interface GroupsObj {
  groups:     string[],             // array of group names
  lastGroup:  string,               // name of last group used
  measurementSystem: MeasurementSystemType, // Imperial or Metric
  theme:      ThemeType,            // Light or Dark
  imageStorageMode: string          // Compress images taken with TrekLog or not
  mapViewPitch?: MapViewPitchType;  // default pitch for map viewing (3D or 2D)
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
    // this.readGroups();
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
    if(this.groups){
      this.groups.theme = theme;
    }
  }

  // get the theme property of the GroupsObj
  getTheme = () => {
    return this.groups ? this.groups.theme : COLOR_THEME_DARK;
  }

  // set the mapViewPitch property of the GroupsObj
  setMapViewPitch = (pitch: MapViewPitchType) => {
    if(this.groups){
      this.groups.mapViewPitch = pitch;
    }
  }

  // get the mapViewPitch property of the GroupsObj
  getMapViewPitch = () => {
    return this.groups ? this.groups.mapViewPitch : _3D_CAMERA_PITCH_STR;
  }

  // set the measurementSystem property of the GroupsObj
  setMeasurementSystem = (system: MeasurementSystemType) => {
    this.groups.measurementSystem = system;
  }

  // get the measurementSystem property of the GroupsObj
  getMeasurementSystem = () => {
    return this.groups.measurementSystem;
  }

  // set the imageStorageMode property of the GroupsObj
  setImageStorageMode = (mode: string) => {
    this.groups.imageStorageMode = mode;
  }

  // get the imageStorageMode property of the GroupsObj
  getImageStorageMode = () => {
    return this.groups.imageStorageMode;
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
    if(this.groups){
      this.groups.lastGroup = group;
    }
  }

  // set the value of the lastGroup property of the GroupsObj
  getLastGroup = () => {
    return this.groups ? this.groups.lastGroup : '';
  }

  // open a RadioPicker with selections for each group.
  // resolve with the name of the new group or reject if user cancels.
  getGroupSelection = (pickerOpenFn : Function, currGroup: string, heading: string, 
                       allowNew = false, nameTest: RegExp) => {
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
      selectionValues: selValues, selection: currGroup || NEW_GROUP, itemTest: nameTest,
      openFn: pickerOpenFn})
      .then((newGroup) => {
        resolve(newGroup);
      })
      .catch(() => {
        reject('NO_SELECTION') 
      })
    })
  }

  // open a CheckboxPicker with selections for each group.
  // resolve with an array of group names or reject if user cancels.
  getGroupSelections = (pickerOpenFn : Function, currGroups: string[], heading: string) => {
    let selNames = [...this.groups.groups];
    let selections = [];

    selections.length = selNames.length;
    selections.fill(false);
    currGroups.forEach((group) => selections[selNames.indexOf(group)] = true);
    return new Promise<any>((resolve, reject) => {
      this.modalSvc.openCheckboxPicker({heading: heading, selectionNames: selNames,
      selections: selections,
      openFn: pickerOpenFn})
      .then((newSelections) => {
        let newGroups = [];
        newSelections.forEach((value,i) => {
          if(value) { 
            newGroups.push(selNames[i]);
          }
        })
        resolve(newGroups);
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

  // return true if there are groups in the groupList
  haveGroups = () => {
    return this.groups && this.groups.groups.length > 0;
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
