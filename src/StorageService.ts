import { PermissionsAndroid } from 'react-native';
import RNFetchBlob, { RNFetchBlobStat } from 'react-native-fetch-blob'
import { TREKLOG_SETTINGS_FILENAME, TREKLOG_FILE_FORMAT, TREKLOG_GOALS_FILENAME, 
          TREKLOG_FILE_EXT, TREKLOG_GROUPS_FILENAME, TREKLOG_GROUPS_DIRECTORY, 
          TREKLOG_PICTURES_DIRECTORY, COLOR_THEME_DARK, TREKLOG_COURSES_DIRECTORY, 
          TREKLOG_COURSES_FILENAME } from './App'
import { GoalObj } from './GoalsService';
import { SettingsObj, GroupsObj } from './GroupService';
import { TrekObj, RestoreObject, CURR_DATA_VERSION, TrekImageSet } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import { CourseList, Course } from './CourseService';
interface TrekData {
  _id             ?: string;   // mongoDB item id
  userId          ?: string;   // group name
  fileName        ?: string;   // name for file
  data            ?: any;      // file contents
}

export class StorageSvc {
    
  constructor (private utilsSvc: UtilsSvc) {
  }

  directoriesPresent = false;

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

  // Format the storage key for this group's goals (Groups/GROUPNAME/Goals.txt)
  private formatGroupGoalsPath = (group: string) => {
    return (this.formatGroupPath(group) + '/' + TREKLOG_GOALS_FILENAME);
  }

  // return the path to the given trek (Groups/GROUPNAME/SORTDATE.txt)
  private formatTrekPath = (trek: TrekObj) :string => {
    return this.formatGroupPath(trek.group) + '/' + trek.sortDate + TREKLOG_FILE_EXT;
  }

  // return the path to the given trek (Groups/GROUPNAME/SORTDATE.txt)
  private formatGroupAndDateTrekPath = (group: string, sortDate: string) :string => {
    return this.formatGroupPath(group) + '/' + sortDate + TREKLOG_FILE_EXT;
  }

  // Format the path to the Courses directoruy (Groups/Courses)
  formatCoursesPath = () => {
    return (this.formatGroupsPath() + '/' + TREKLOG_COURSES_DIRECTORY);
  }

  // Format the path for CourseList file  (Groups/Courses/CourseList.txt)
  private formatCourseListFilename = () => {
    return (this.formatCoursesPath() + '/' + TREKLOG_COURSES_FILENAME);
  }

  // Format the path for given Course  (Groups/Courses/COURSENAME.txt)
  private formatCoursePath = (courseName: string) => {
    return (this.formatCoursesPath() + '/' + courseName.toUpperCase()) + TREKLOG_FILE_EXT;
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
      .then((stats) => {
        let uri = picDir + '/' + stats.filename;
        RNFetchBlob.fs.cp(stats.path, uri)
        .then(() => resolve(uri))
        .catch((err) => reject(err))
      })
      .catch((err) => reject(err))
    })
  }

  // write the given picture to the TrekLog Pictures directory
  // return the new uri
  saveCourseMapImage = (courseName: string, tempUri : string) : Promise<string> => {
    let picDir = this.formatTrekLogPicturesPath();

    return new Promise<any>((resolve, reject) => {
      RNFetchBlob.fs.stat(tempUri)
      .then((stats) => {
        let uri = picDir + '/' + courseName + '.jpg';
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
  checkDirectoriesPresent = () : Promise<any> => {
    let allDone : Promise<any>[] = [];
    let pDir = this.formatTrekLogPicturesPath();
    let cDir = this.formatCoursesPath();

    return new Promise((resolve, reject) => {
      if(this.directoriesPresent) {resolve('OK')}
      this.checkStoragePermission()
      .then((perm) => {
        if(perm){
          let p1 = RNFetchBlob.fs.isDir(this.formatGroupsPath());       // Groups direcory?
          allDone.push(p1);
          p1.then((haveDir) => {
          if(!haveDir) {
              let p1a = this.makeDirectory(this.formatGroupsPath());
              allDone.push(p1a);
              p1a.then(() =>{
                allDone.push(this.storeGroupListFile({groups: [], lastGroup: '', 
                        measurementSystem: 'US', theme: COLOR_THEME_DARK}))  // store empty GroupsObj
              })
            }
          })
          let p2 = RNFetchBlob.fs.isDir(pDir);
          allDone.push(p2);                         // Pictures directory?
          p2.then((haveDir) => {
            if(!haveDir) {
              allDone.push(RNFetchBlob.fs.mkdir(pDir))
            }
          })
          let p3 = RNFetchBlob.fs.isDir(cDir);                         // Courses directory?
          allDone.push(p3);
          p3.then((haveDir) => {
            if(!haveDir) {
              let p3a = this.makeDirectory(cDir);
              allDone.push(p3a);
              p3a.then(() =>{
                allDone.push(this.storeCourseListFile({courses: []}))  // store empty CourseList
              })
            }
          })
          Promise.all(allDone)
          .then(() => {
            this.directoriesPresent = true;
            resolve('OK');
          })
          .catch((err) => reject('Error creating directories\n' + err))
        }
        else {
          reject('No Storage Permission');
        }
      })
    })
  }

  // format the string to use for the path to the Groups file
  formatGroupsListFilename = () : string => {
    return this.formatGroupsPath()  + '/' + TREKLOG_GROUPS_FILENAME;
  }

  // read the list of Groups from the database
  fetchGroupListFile = () : Promise<string> => {
    return new Promise((resolve, reject) => {
      this.checkDirectoriesPresent()
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

  // remove the files for the given Group (delete its directory)
  deleteGroupFiles = (group: string) : Promise<any> => {
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      // first, read all treks and delete any images therin

      this.getAllTrekPaths([group])
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

  // Save the list of Courses to the database
  storeCourseListFile = (list: CourseList) : Promise<any> => {
    return this.saveDataItem(this.formatCourseListFilename(), JSON.stringify(list));
  }

  // Read the list of Courses from the database
  readCourseListFile = () : Promise<any> => {
    return this.fetchDataItem(this.formatCourseListFilename());
  }

  // Save the given course to the database
  storeCourseFile = (course: Course) : Promise<any> => {
    return this.saveDataItem(this.formatCoursePath(course.name), JSON.stringify(course));
  }

  // Read the given course from the database
  readCourseFile = (courseName: string) : Promise<any> => {
    return this.fetchDataItem(this.formatCoursePath(courseName));
  }

  // Delete the given course from the database
  deleteCourseFile = (course: string) : Promise<any> => {
    return this.removeDataItem(this.formatCoursePath(course));
  }

  // Read the Courses directory. Return an RNFetchBlobStat[]
  readCoursesDirectory = () : Promise<RNFetchBlobStat[]> => {
    return new Promise((resolve, reject) => {
      RNFetchBlob.fs.lstat(this.formatCoursesPath())      // read directory for the courses
      .then((coursesDir : RNFetchBlobStat[]) => resolve(coursesDir))
      .catch(() => reject('ERROR: READING_GROUP_DIRECTORY'))
    })
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

  // read a trek file using the given group name and sortDate
  fetchGroupAndDateTrek = (group: string, sortDate: string) : Promise<any> => {
    return this.fetchDataItem(this.formatGroupAndDateTrekPath(group, sortDate));
  }

  // save the given trek to the database
  storeTrekData = (trek: TrekObj) : Promise<any> => {
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

  // get all the paths from storage that are for trek logs for the given groups (all groups if no groups given)
  getAllTrekPaths = (groupsToGet?: string[]) : Promise<string[] | string> => {   
    let pathList : string[] = [];
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      this.fetchGroupListFile()  // groups list
      .then((result) => {
        let groupList = JSON.parse(result).groups;
        for(let i=0; i<groupList.length; i++){
          // process directory for group (or all)
          if((groupsToGet.length === 0) || groupsToGet.indexOf(groupList[i]) !== -1 ) {  
            allDone.push(this.addGroupPaths(groupList[i], pathList));
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
  readAllTrekFiles = (groups?: string[]) : Promise<{list: TrekObj[], upgraded: number}> => {   
    let allTreks : TrekObj[] = [];
    let allPaths  : string[] = [];
    let allDone   : Promise<any>[] = [];
    let retObj    : any = {list: [], upgraded: 0}

    return new Promise((resolve, reject) => {
      this.getAllTrekPaths(groups)
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
        // Error reading list of paths
        reject('ERROR: READING_PATHS\n' + err);
      })      
    })
  }

  // read and process the trek at the given path
  readOneTrek  = (t: string, retObj: any) : Promise<any> => {

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
  verifyDataVersion = (t: TrekObj, version = CURR_DATA_VERSION) : Promise<any> => {
    let upgraded = false;

    return new Promise<any>((resolve) => {
      if (t.dataVersion < version){
        let dv = t.dataVersion;
        t.dataVersion = version;
        upgraded = true;
        switch(dv){
          // change to storing only 4 significant digits for speed property of GPS points
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
          // change to starting point time is 0 and trek duration is lastPoint time
          case '5.2':
            let l = t.pointList;
            if(l.length > 1) {
              let startOffset = l[0].t;
              for(let i=0; i<l.length; i++){
                l[i].t -= startOffset;        // subtract old 1st point time from all point times
              }
              t.duration = l[l.length-1].t;   // set duration to time of last point
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
        allDone.push(this.computeDirectorySize('Groups', this.formatGroupsPath(), result))   // read Groups directory
        allDone.push(this.computeDirectorySize('Courses', this.formatCoursesPath(), result))   // read Groups directory
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

  // ***************************************  MongoDB routines ****************************************
  // I use this stuff to move treks from one device to another


  private apiUrl = 'https://serve-mdb.appspot.com/api/'
  private treksUrl = this.apiUrl + 'origins';

  // read all the treks stored in the MongoDB for the given group (uid)
  // returns: promise
  // get('/api/<list>')
  private readTrekFiles(uid: string): Promise<any | TrekData[]> {
    return fetch(this.treksUrl + '?userId=' + uid)
    .then(response => response.json())
    .catch(() => {})
  }

  // write the given TrekData the MongoDB database 
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

  // write all treks from the given groups to the MongoDB
  writeTreksToMongoDB = (groups: string[]) : Promise<any> => {
    let allDone : Promise<any>[]= [];
    let count = 0;

    return new Promise((resolve, reject) => {
      if(groups.length){
        let p = this.readAllTrekFiles(groups)                 // read the treks from the device
        allDone.push(p);
        p.then((result) => {
          let treks = result.list;
          count = treks.length;
          for(let j=0; j<treks.length; j++) {
            allDone.push(this.writeTrekToMongoDb(treks[j]))
          }
        })
        .catch((err) => reject('Error reading treks.\n' + err))
        Promise.all(allDone)
        .then(() => resolve(count + ' treks uploaded.'))
        .catch((err) => reject('Error uploading files.\n' + err))
      } else {
        resolve("Nothing to do.");
      }
    })
  }

  // write the given trek to the MongoDb
  public writeTrekToMongoDb = (trek: TrekObj) => {
    let trData = {
      userId: trek.group,
      fileName: trek.sortDate + TREKLOG_FILE_EXT,
      data: trek
    };
    return this.writeTrekFile(trData);        // write trek
  }

  // read and store all the treks from the MongoDB with the given group as their userId field
  // this will overwrite if trek already exists on device
  public readTreksFromMongoDB = (groups: string[]) => {
    let allDone : Promise<any>[]= [];
    let count = 0;

    return new Promise((resolve, reject) => {
      if(groups.length){
        for(let i=0; i<groups.length; i++) {
          let p = this.readTrekFiles(groups[i]);                 // read the treks from mongoDB
          allDone.push(p);
          p.then((files) => {
            let uFiles = files;
            count += uFiles.length;
            for(let j=0; j<uFiles.length; j++) {
              allDone.push(this.saveDataItem(this.formatGroupPath(groups[i]) + '/' + uFiles[j].fileName, 
                                              JSON.stringify(uFiles[j].data)))
            }
          })
          .catch((err) => reject('Error reading files.\n' + err))
        }
        Promise.all(allDone)
        .then(() => resolve(count + ' treks downloaded.'))
        .catch((err) => reject('Error saving files.\n' + err))
      } else {
        resolve("Nothing to do.");
      }
    })
  }

//***************************************** end of MongoDB routines **************************/
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