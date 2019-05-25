import { PermissionsAndroid } from 'react-native';
import RNFetchBlob, { RNFetchBlobStat } from 'react-native-fetch-blob'
import { TREKLOG_SETTINGS_FILENAME, TREKLOG_FILE_FORMAT, TREKLOG_GOALS_FILENAME, 
          TREKLOG_FILE_EXT, TREKLOG_GROUPS_FILENAME, TREKLOG_GROUPS_DIRECTORY, TREKLOG_PICTURES_DIRECTORY, COLOR_THEME_DARK } from './App'
import { GoalObj } from './GoalsService';
import { SettingsObj, GroupsObj } from './GroupService';
import { TrekObj, RestoreObject, CURR_DATA_VERSION, TrekImage, TrekImageSet } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';

interface TrekData {
  _id             ?: string;   // mongoDB item id
  userId          ?: string;   // Treklog
  fileName        ?: string;   // name for file
  data            ?: any;   // file contents
}

export class StorageSvc {
    
  constructor (private utilsSvc: UtilsSvc) {
  }

  // create a directory from the given path
  // resolve whether directory already existed or not
  private makeDirectory = (path: string) : Promise<any> => {
    return new Promise((resolve) => {
      RNFetchBlob.fs.mkdir(path)
      .then(() => resolve('NEW'))
      .catch(() => resolve('EXISTS'))
    })
  }

  // Format the path to the Groups directory
  private formatGroupsPath = () => {
    return (RNFetchBlob.fs.dirs.DocumentDir + '/' + TREKLOG_GROUPS_DIRECTORY);
  }

  // Format the path for this Group
  private formatGroupPath = (group: string) => {
    return (this.formatGroupsPath() + '/' + group.toUpperCase());
  }

  // Format the path for this group's settings
  private formatGroupSettingsFilename = (group: string) => {
    return (this.formatGroupPath(group) + '/' + TREKLOG_SETTINGS_FILENAME);
  }

  // Format the storage key for this group's goals
  private formatGroupGoalsPath = (group: string) => {
    return (this.formatGroupPath(group) + '/' + TREKLOG_GOALS_FILENAME);
  }

  // return the path to the given trek
  private formatTrekPath = (trek: TrekObj) :string => {
    return this.formatGroupPath(trek.group) + '/' + trek.sortDate + TREKLOG_FILE_EXT;
  }

  // return the path to the TrekLog pictures directory
  formatTrekLogPicturesPath = () : string => {
    return RNFetchBlob.fs.dirs.PictureDir + '/' + TREKLOG_PICTURES_DIRECTORY;
  }

  // write the given picture to the TrekLog Pictures directory
  // return the new uri
  saveTrekLogPicture = (tempUri : string) : Promise<string> => {
    let picDir = this.formatTrekLogPicturesPath();

    return new Promise<any>((resolve, reject) => {
      RNFetchBlob.fs.stat(tempUri)
      .then((stats ) => {
        let uri = picDir + '/' + stats.filename;
        RNFetchBlob.fs.cp(stats.path, uri)
        .then(() => resolve(uri))
        .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
    })
  }

  checkStoragePermission = async () => {
    try {
      const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)
      if(!alreadyGranted){
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'TrekLog Storage Permission',
            message:
              'TrekLog needs access to your storage ' +
              'so you can save trek data and pictures.',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      else {
        return alreadyGranted;
      }
    } 
    catch (err) {
      return false;
    }
  }
 

  // check for the presence of the TrekLog Groups directory.
  // if not found, create it and put an empty GroupsObj in it.
  // also check for the presence of the TrekLog Pictures directory
  // and create it if necessary.
  checkGroupListFile = () : Promise<any> => {
    let allDone : Promise<any>[] = [];
    let pDir = this.formatTrekLogPicturesPath();

    return new Promise((resolve, reject) => {
      if(this.checkStoragePermission()){
        RNFetchBlob.fs.isDir(this.formatGroupsPath())       // Groups direcory?
        .then((haveDir) => {
         if(!haveDir) {
            this.makeDirectory(this.formatGroupsPath())
            .then(() =>{
              allDone.push(this.storeGroupListFile({groups: [], lastGroup: '', theme: COLOR_THEME_DARK}))  // store empty GroupsObj
            })
          }
        })
        RNFetchBlob.fs.isDir(pDir)                         // Pictures directory?
        .then((haveDir) => {
          if(!haveDir) {
            allDone.push(RNFetchBlob.fs.mkdir(pDir))
          }
        })
        Promise.all(allDone)
        .then(() => resolve('OK'))
        .catch((err) => reject('Error creating Pictures directory\n' + err))
      }
      else {
        reject('No Storage Permission');
      }
    })
  }

  // format the string to use for the path to the Groups file
  formatGroupsListFilename = () : string => {
    return this.formatGroupsPath()  + '/' + TREKLOG_GROUPS_FILENAME;
  }

  // read the list of Groups from the database
  fetchGroupListFile = () : Promise<string> => {
    return new Promise((resolve, reject) => {
      this.checkGroupListFile()
      .then(() => {
        resolve(this.fetchDataItem(this.formatGroupsListFilename()));
      })
      .catch((err) => reject(err))
    })
  }

  // Save the list of Groups to the database
  storeGroupListFile = (list: GroupsObj) : Promise<any> => {
    return this.saveDataItem(this.formatGroupsListFilename(), JSON.stringify(list));
  }

  // read the settings object for the given Group from the database
  fetchGroupSettingsFile = (group: string) : Promise<string> => {
    return this.fetchDataItem(this.formatGroupSettingsFilename(group));
  }

  // save the given list of Group's settings to the database
  // create a directory for the Group if one doesn't exist
  storeGroupSettingsFile = (group: string, settings: SettingsObj) : Promise<any> => {
    return new Promise((resolve, reject) => {
      RNFetchBlob.fs.isDir(this.formatGroupPath(group))    // Group path exist yet?
      .then((pathExists) => {
        if(pathExists){
          this.saveDataItem(this.formatGroupSettingsFilename(group), JSON.stringify(settings))
          .then(() => { resolve("OK") })
          .catch(() => { reject("ERROR: SAVING_SETTINGS") })
        } else {
          this.makeDirectory(this.formatGroupPath(group))
          .then(() => {
            this.saveDataItem(this.formatGroupSettingsFilename(group), JSON.stringify(settings))
            .then(() => { resolve("OK") })
            .catch(() => { reject("ERROR: SAVING_SETTINGS") })
          })
        }
      })
      .catch((err) => reject(err))
    })
  }

  // remove the files for the given Group (delete their directory)
  deleteGroupFiles = (group: string) : Promise<any> => {
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      // first, read all treks and delete any images therin

      this.getAllTrekPaths(group)
      .then((result : string[]) => {
        if (!result.length) { 
          resolve(this.removeDataItem(this.formatGroupPath(group)));  // delete Group directory if no treks
        } else {
          // process each path in the list
          for(let i=0; i<result.length; i++){
            allDone.push(this.readTrekAndDeleteImages(result[i]));    // process this trek
          }
          Promise.all(allDone)                // all files done?
          .then(() => {
            // then, delete the directory for the Group
            resolve(this.removeDataItem(this.formatGroupPath(group)));
          })
          .catch(() => {
            reject('ERROR: DELETING_TREKS')   // can't happen, don't want to stop on one trek
          })
        }
      })
      .catch ((err) => {
        // Error reading list of treks
        reject('ERROR: READING_PATHS\n' + err);
      })      
    })
  }

  // read the trek at the given path and delete its images (if any)
  readTrekAndDeleteImages = (path: string) => {
    return new Promise((resolve) => {
      this.fetchDataItem(path)
      .then((data) => {
        let trek = JSON.parse(data) as TrekObj;
        this.removeTrekImageFiles(trek.trekImages);
        resolve('OK');
      })
      .catch(() => resolve('ERROR: TREK_NOT_FOUND'))
    })
  }

  // read the list of goals for the given group from the database
  fetchGoalListFile = (group: string) : Promise<string> => {
    return this.fetchDataItem(this.formatGroupGoalsPath(group));
  }

  // save the given list of group's goals to the database
  storeGoalListFile = (group: string, gList: GoalObj[]) : Promise<any> => {
    return this.saveDataItem(this.formatGroupGoalsPath(group), JSON.stringify(gList));
  }

  // remove the file with the given path from the database
  removeDataItem = (path: string) : Promise<any> => {
    return RNFetchBlob.fs.unlink(path);
  }

  // save the data to a file file at given path in the database
  saveDataItem = (path: string, data: string) : Promise<any> => {
    return RNFetchBlob.fs.writeFile(path, data, TREKLOG_FILE_FORMAT);
  }

  // read the file at the given path from the database
  fetchDataItem = (path: string) : Promise<string> => {
    return RNFetchBlob.fs.readFile(path, TREKLOG_FILE_FORMAT);
  }

  // save the given trek to the database
  storeTrekData = (trek: TrekObj) : Promise<any> => {
    // let saveTrek = this.convertTrekToDB(trek);
    return  this.saveDataItem(this.formatTrekPath(trek), JSON.stringify(trek));
  }

  // remove the given trek from the database
  removeTrekData = (trek: TrekObj) : Promise<any> => {

      this.removeTrekImageFiles(trek.trekImages);
      return this.removeDataItem(this.formatTrekPath(trek));
  }

  // delete all the image files for the given trek
  removeTrekImageFiles = (imgs : TrekImageSet[]) => {
    if (imgs) {
      for(let i=0; i<imgs.length; i++) {
        let iSet = imgs[i];
        for(let j=0; j<iSet.images.length; j++) {
          this.removeDataItem(iSet.images[j].uri)
          .then(() => {})   // don't really care if it succeeds or not
          .catch(() => {})
        }
      }
    }
  }

  // add trek (not settings or goals) paths for the given group to the given list
  private addGroupPaths = (group: string, pathList: string[]) : Promise<any> => {

    return new Promise((resolve, reject) => {
      RNFetchBlob.fs.lstat(this.formatGroupPath(group))      // read directory for this group
      .then((groupDir) => {  
        for(let i=0; i<groupDir.length; i++){
          if(groupDir[i].filename !== TREKLOG_SETTINGS_FILENAME && // skip Settings and Goals
            groupDir[i].filename !== TREKLOG_GOALS_FILENAME) {
            pathList.push(groupDir[i].path);       // add path to Treks
          }
        }
        resolve('OK');
      })
      .catch(() => {
        reject('ERROR: READING_GROUP_DIRECTORY');
      })
    })
  }

  // get all the paths from storage that are for trek logs for the given group (all groups if no group given)
  getAllTrekPaths = (group?: string) : Promise<string[] | string> => {   
    let pathList : string[] = [];
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      this.fetchGroupListFile()  // groups list
      .then((result) => {
        let groups = JSON.parse(result).groups;
        for(let i=0; i<groups.length; i++){
          // process directory for group (or all)
          if((group === undefined) || groups[i] === group ) {  
            allDone.push(this.addGroupPaths(groups[i], pathList));
          }
        }
        Promise.all(allDone)
        .then(() => {
          resolve(pathList);
        })
        .catch((err) => reject(err))
      })
      .catch((err) => reject(err));
    })
  }

  // Read all the treks from the storage
  // Return a promise for an array of TrekObj or string for reject message
  // Resolve with array of TrekObj for the selected group (or all groups if group not specified)
  readAllTrekFiles = (group?: string) : Promise<{list: TrekObj[], upgraded: number}> => {   
    let allTreks : TrekObj[] = [];
    let allPaths  : string[] = [];
    let allDone   : Promise<any>[] = [];
    let retObj    : any = {list: [], upgraded: 0}

    return new Promise((resolve, reject) => {
      this.getAllTrekPaths(group)
      .then((result : string[]) => {
        allPaths = result;
        if (!allPaths.length) { 
          resolve({list: allTreks, upgraded: 0});   // return empty list if no paths to treks found
        } else {
          // process each path in the list
          for(let i=0; i<result.length; i++){
            allDone.push(this.readOneTrek(result[i], retObj));    // returns an object {t: TrekObj, upg: number}
          }
          Promise.all(allDone)                // all files done?
          .then(() => {
            resolve(retObj)
          })
          .catch(() => {
            reject('ERROR: UPGRADING_TREKS')
          })
        }
      })
      .catch ((err) => {
        // Error reading list of keys
        reject('ERROR: READING_PATHS\n' + err);
      })      
    })
  }

  // read and process the trek at the given path
  readOneTrek  = (t : string, retObj: any) : Promise<any> => {

    return new Promise<any>((resolve, reject) => {
      this.fetchDataItem(t)
      .then((data) => {
        let thisTrek = JSON.parse(data);
        this.verifyDataVersion(thisTrek)
        .then((upgraded) => {
          if(upgraded){
            this.storeTrekData(thisTrek)
            .then(() => {
              retObj.upgraded++;               // count the upgrade
              retObj.list.push(thisTrek);        // save TrekObj in allTreks list
              resolve(true)
            })
            .catch((err) => reject(err))
          } else {
            retObj.list.push(thisTrek);        // save TrekObj in allTreks list
            resolve(false);
          }
        })
        .catch((err) => reject('ERROR: VERIFY_VERSION\n' + err))
      })
      .catch((err) => {
        reject('ERROR: FILE_READ\n' + err);
      })
    })
  }

  // verify the dataVersion of the given trek.  Perform any necessary upgrades to 
  // bring trek up to date.
  private verifyDataVersion = (t: TrekObj) : Promise<any> => {
    let upgraded = false;


    return new Promise<any>((resolve) => {
      if (t.dataVersion < CURR_DATA_VERSION){
        let dv = t.dataVersion;
        t.dataVersion = CURR_DATA_VERSION;
        upgraded = true;
        switch(dv){
          case '5.1':
            if(t.pointList.length > 0) {
              for(let i=0; i<t.pointList.length; i++){
                if(t.pointList[i].s === null || t.pointList[i].s === undefined){ 
                  t.pointList[i].s = 0; 
                } else {
                  t.pointList[i].s = this.utilsSvc.fourSigDigits(t.pointList[i].s);
                }
              }
            }
            break;
          default:
        }
        resolve(upgraded);
      } else {
        resolve(upgraded);
      }
    })
  }


  // compute the space requirements for the app files (backed up)
  reportFilespaceUse = () => {
    let result : {list: string, bytes: number, files: number, dir: RNFetchBlobStat[]} = 
                  {list: '', bytes: 0, files: 0, dir: []};
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      this.fetchGroupListFile()
      .then((glf) => {
        let groups = JSON.parse(glf) as GroupsObj;
        allDone.push(this.computeDirectorySize('App', RNFetchBlob.fs.dirs.DocumentDir, result))   // read directory for this app
        for(let i=0; i<groups.groups.length; i++) {
          allDone.push(this.computeDirectorySize(groups.groups[i], this.formatGroupPath(groups.groups[i]), result));
        }
        Promise.all(allDone)
        .then(() => {
          result.list += ('\nTotal: ' + result.bytes + ' bytes in ' + result.files + ' files.')
          alert(result.list + '\n\nApp Directory:\n' + JSON.stringify(result.dir, null, 2));
          resolve("ok");
        })
      })
      .catch((err) => reject(err))
    })
  }

  private computeDirectorySize = (name: string, path : string, result) => {
    let sum = 0;

    return new Promise((resolve) => {
      RNFetchBlob.fs.lstat(path)      // read directory for this app
      .then((dir) => {
        if(name === 'App'){
          result.dir = dir;
        }
        for(let i = 0; i<dir.length; i++){
          if(dir[i].filename !== 'ReactNativeDevBundle.js'){
            sum += parseInt(dir[i].size, 10);
          }
        }
        result.list += (name + ': ' + sum + ' bytes in ' + dir.length + ' files.\n');
        result.bytes += sum;
        result.files += dir.length;
        resolve('OK');
      })
      .catch(() => {
        result.list += (name + ': Not found.\n');
        resolve('Group directory not found');
      })
    })
  }

  // ***********************************************************************************************************
  // this section is because Auto Backup would not work on my phone and I ended up getting banned from backups.
  // I will hopefully only use this once
  private apiUrl = 'https://serve-mdb.appspot.com/api/'
  private treksUrl = this.apiUrl + 'origins';

  // read the list from the given list table in the database
  // returns: promise
  // get('/api/<list>')
  private readTrekFiles(uid: string): Promise<any | TrekData[]> {
    return fetch(this.treksUrl + '?userId=' + uid)
    .then(response => response.json())
    .catch(() => {})
  }

  // write the given item to the given table in the database 
  // use /api/tableName[/:id]
  // returns: promise
  private writeTrekFile(data: TrekData): Promise<any | string | TrekData> {
    let params = {
      body: JSON.stringify(data),
      mode: <RequestMode> 'cors',
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    }
    return fetch(this.treksUrl + (data._id ? ('/' + data._id) : ''), params)
    .then(response => response.json())
    .catch(() => {});
  }

  // send all TrekLog files to mongoDB
  backupTreksToMongo = () => {
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      this.fetchGroupListFile()
      .then((ulf) => {
        let groupList : any = JSON.parse(ulf);
        groupList.groups = groupList.users;
        groupList.users = undefined;
        groupList.lastGroup = groupList.lastUser;
        groupList.lastUser = undefined;
        let tData = {
          userId: 'Groups', //TREKLOG_GROUPS_DIRECTORY,
          fileName: 'Groups.txt', //TREKLOG_GROUPS_FILENAME,
          data: groupList
        };
        allDone.push(this.writeTrekFile(tData));            // write the list of groups file
        let groups = groupList.groups;
        for(let i=0; i<groups.length; i++){
            allDone.push(this.backupGroupFiles(groups[i]));     // write all files for each group
        };
        // allDone.push(this.backupGroupFiles('Joan'));     // write all files for Joan
        Promise.all(allDone)
        .then(() => resolve('All groups saved'))
        .catch((err) => reject('Error saving groups\n' + err))
      })
      .catch((err) => reject(err))
    })
  }

  // send files for given group to mongoDB
  // store with userId = group
  private backupGroupFiles = (group: string) => {
    let allDone : Promise<any>[]= [];

    return new Promise((resolve, reject) => {
      
      this.fetchGroupSettingsFile(group)
      .then((settings) => {
        let sets = JSON.parse(settings);
        sets.group = sets.user;
        sets.user = undefined;
        let sData = {
          userId: group,
          fileName: TREKLOG_SETTINGS_FILENAME,
          data: sets
        }
        allDone.push(this.writeTrekFile(sData));              // write group's settings
        this.fetchGoalListFile(group) 
        .then((goals) => {
          let gData = {
            userId: group,
            fileName: TREKLOG_GOALS_FILENAME,
            data: JSON.parse(goals)
          }
          allDone.push(this.writeTrekFile(gData))             // write goals list
          this.readAllTrekFiles(group)
          .then((result) => {
            let list : any[] = result.list;
            for(let i=0; i<list.length; i++){    
              list[i].group = list[i].user;
              list[i].user = undefined;
              let trData = {
                userId: group,
                fileName: list[i].sortDate + TREKLOG_FILE_EXT,
                data: list[i]
              };
              allDone.push(this.writeTrekFile(trData));        // write each trek
            }
            Promise.all(allDone)
            .then(() => {
              resolve('OK');
              // this.deleteGroupFiles(group)
              // .then(() => resolve('OK'))
              // .catch((err) => reject('Error unlinking ' + group + '\n' + err))
            })
            .catch((err) => reject('Error saving ' + group + '\n' + err))
          })
          .catch((err) => reject('Reading Treks for ' + group + '\n' + err))
        })
      })
      .catch((err) => reject(group + ':\n' + err))
    })
  }

  // restore all TrekLog files from mongoDb
  restoreTreksFromMongo = () => {
    let allDone : Promise<any>[] =[];
    let error;

    return new Promise((resolve, reject) => {
      // RNFetchBlob.fs.isDir(this.formatGroupsPath())
      // .then((found) => {
      //   if(!found){
          this.readTrekFiles(TREKLOG_GROUPS_DIRECTORY)                      // read the groups list from MongoDB
          .then((uList) => {
            error = "Error makdir Groups Directory\n";
            this.makeDirectory(this.formatGroupsPath())                     // make the groups directory
            .then(() => {
              error = "Error parse uList\n";
              let groupList = uList[0].data;
              allDone.push(this.storeGroupListFile(groupList));               // save the list of groups
              error = 'Something else'
              for(let i=0; i<groupList.groups.length; i++) {
                allDone.push(this.restoreGroupFiles(groupList.groups[i]))     // restore files for each group
              }
              Promise.all(allDone)
              .then(() => resolve('Restored all groups'))
              .catch((err) => reject('Error restoring groups\n' + err))
            })
            .catch(() => resolve(error))
          })
      //   }
      //   else {resolve('Already done')}
      // })
      .catch((err) => resolve("Error Groups Directory\n" + err))
    })
  }

  // restore files for given group from mongoDB
  // files were stored with userId = group
  private restoreGroupFiles = (group: string) => {
    let allDone : Promise<any>[]= [];

    return new Promise((resolve, reject) => {
      this.makeDirectory(this.formatGroupPath(group))         // create path for group's files
      .then(() => {
        this.readTrekFiles(group)                            // read the group's data from mongoDB
        .then((uFiles) => {
          alert(group + '|' + uFiles.length)
          for(let i=0; i<uFiles.length; i++) {
            allDone.push(this.saveDataItem(this.formatGroupPath(group) + '/' + uFiles[i].fileName, 
                                           JSON.stringify(uFiles[i].data)))
          }
          Promise.all(allDone)
          .then(() => resolve('OK'))
          .catch((err) => reject('Error restoring ' + group + '\n' + err))
        })
      })
    })
  }

  //***************************** Async ***********************************************/

  private convertTrekToDB = (trek: TrekObj) => {
  // Compose and return a an object with the trek information formatted for DB storage
    let result : TrekObj = {
      dataVersion:  trek.dataVersion,
      group:        trek.group,
      date:         trek.date,
      sortDate:     trek.sortDate,
      startTime:    trek.startTime,
      endTime:      trek.endTime,
      type:         trek.type,
      weight:       trek.weight,
      packWeight:   (trek.type === 'Hike') ? trek.packWeight : 0,
      strideLength: trek.strideLength,
      conditions:   trek.conditions,
      duration:     trek.duration,
      trekDist:     trek.trekDist,
      totalGpsPoints: trek.totalGpsPoints,
      hills:        trek.hills,
      pointList:    trek.pointList,
      elevations:   trek.elevations,
      elevationGain: trek.elevationGain,
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

  // save the restore object
  storeRestoreObj = (resObj: RestoreObject) : Promise<any> => {
    let fileName = this.formatGroupsPath() + '/TrekRestoreObj.txt';
    return this.saveDataItem(fileName, JSON.stringify(resObj))
  }

  // return the restore object (if any)
  fetchRestoreObj = () : Promise<any> => {
    return new Promise((resolve, reject) => {
      let fileName = this.formatGroupsPath() + '/TrekRestoreObj.txt';
      this.fetchDataItem(fileName)
      .then((result) => resolve(JSON.parse(result)))
      .catch((err) => reject('RESTORE_OBJ_NOT_FOUND\n' + err))
    })
  }

  // delete the restore object
  removeRestoreObj = () : Promise<any> => {
    let fileName = this.formatGroupsPath() + '/TrekRestoreObj.txt';
    return this.removeDataItem(fileName);
  }

}