import { action } from 'mobx';
import { Location } from "@mauron85/react-native-background-geolocation";

import {  TrekInfo, TrekPoint, TrekObj, TrekType, RESP_CANCEL, RESP_NO_MATCH, RESP_BAD_LENGTH, 
          RESP_OK, FAKE_SELECTION, MSG_EFFORT_PATH, MSG_COURSE_READ, MSG_EFFORT_READ, MSG_COURSE_WRITE,
          MSG_NO_LIST, MSG_REMOVE_EFFORT, RESP_HAS_LINK, MSG_STARTING_LOC, MSG_COURSE_LIST_READ,
          MSG_COURSE_LIST_WRITE, MSG_NEW_EFFORT, MSG_NO_EFFORT, MSG_NEW_COURSE_RECORD, MSG_NEW_COURSE 
       } from './TrekInfoModel'
import { UtilsSvc } from './UtilsService';
import { StorageSvc } from './StorageService';
import { ModalModel, CONFIRM_WARNING } from './ModalModel';
import { TREKLOG_FILENAME_REGEX, BLACKISH, 
        //  TREKLOG_COURSES_FILENAME 
       } from './App';
import { IntervalSvc } from './IntervalSvc';
import { LatLng } from 'react-native-maps';
import { CourseTrackingMethod } from './TrackingMethodComponent';
import { TrekLimitType, TREK_LIMIT_TYPE_TIME, TREK_LIMIT_TYPE_DIST } from './LoggingService';
import { LocationSvc } from './LocationService';
import { ToastModel } from './ToastModel'

export interface CourseEffort {
  subject: {
    group:              string,       // group where the subject trek is saved
    date:               string,       // sortDate of trek
    type:               TrekType,     // type of trek
    duration:           number,       // completion time of effort trek
    distance:           number        // completion distance of effort trek
    goalValue:          number,       // goal time, speed/rate (mps)
    method:             CourseTrackingMethod, // method of tracking used
    targetGroup?:       string,       // group with target trek
    targetDate?:        string,       // sortDate of target trek
    points?:            TrekPoint[],  // pointList of source Trek (for defining effort)
  }
}

export interface Course {
  name:             string,           // Course name
  createDate:       string,           // date course defined
  courseImageUri?:  string,           // image of the defining course map
  definingEffort:   CourseEffort,     // trek used to define this course
  lastEffort:       CourseEffort,     // last trek time of this course
  bestEffort:       CourseEffort,     // best trek time of this course
  efforts:          CourseEffort[]    // list of treks of this course
}

export interface CourseListItem {
  name:             string,           // Course name
  createDate:       string,           // date course created
  courseImageUri?:  string,           // image of the defining course map
  definingEffort:   CourseEffort,     // trek used to define this course
  lastEffort:       CourseEffort,     // last trek time of this course
  bestEffort:       CourseEffort,     // best trek time of this course
  effortCount:      number,           // current number of efforts associated with this course
}

export interface CourseList {
  courses:        CourseListItem[]
}

export interface CourseDetailObject {
  effort: CourseEffort,
  trek:   TrekObj
}

export interface CourseTrackingSnapshot {
  header?:           string;               // header for tracking status display
  method?:           CourseTrackingMethod, // tracking method used
  goalValue?:        number;               // goal time, speed/rate (mps)
  coursePath?:       TrekPoint[],          // points in course path
  courseDist?:       number,               // length of course path
  courseDuration?:   number,               // duration to use for course 
  coursePos?:        number,               // dist/time of courseMarker
  coursePosIndex?:   number,               // index into course path of current courseMarker position
  courseInc?:        number,               // increment value(seconds or meters) for coursePos (per second)
  coursePosMax?:     number,               // maximum value for coursePos
  coursePosType?:    TrekLimitType,        // how to interpret coursePos(Time = seconds, Dist = meters)
  courseMarker?:     TrekPoint,            // point to show courseMarker
  trekPath?:         TrekPoint[],          // points in trek path
  trekDist?:         number,               // length of trek path
  trekDuration?:     number,               // duration of trek
  trekPos?:          number,               // dist/time of trekMarker
  trekInc?:          number,               // increment value(seconds or meters) for trekPos (per second)
  trekPosMax?:       number,               // maximum value for trekPos
  trekPosType?:      TrekLimitType,        // how to interpret trekPos(Time = seconds, Dist = meters)
  trekMarker?:       TrekPoint,            // point to show trekMarker
  lastUpdateTime?:   number,               // ms of last display update
}

export const NEW_COURSE = '#new#';
export const MAX_DIST_FROM_START = 300;      // max meters from start to qualify as start for course
export const MIN_PATH_MATCH_PERCENT = 85;
export const MAX_DIST_FROM_PATH = 100;       // max meters a point can be from the path to qualify
export const MAX_DIST_DIFF_PERCENTAGE = 20;

export class CourseSvc {

  courseList          : CourseListItem[];
  courseNames         : string[];
  courseDescriptions  : string[];
  trackingSnapshot    : CourseTrackingSnapshot;
  changedDefiningEffort : boolean = false;    // flag used to indicate that the defining effort for a course was reset

  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo, private locationSvc: LocationSvc,
    private intervalSvc: IntervalSvc, private storageSvc: StorageSvc, private modalSvc: ModalModel,
    private toastSvc: ToastModel ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
  }

  // create the courseListFile by reading all entries in the Courses directory
  // private createCourseListFile = () : Promise<any> => {
  //   let allDone : Promise<any>[] = [];
  //   let newListItem : CourseListItem;

  //   return new Promise((resolve, reject) => {
  //     this.storageSvc.readCoursesDirectory()      // read directory for the courses
  //     .then((cDir) => {  
  //       this.courseList = [];
  //       for(let i=0; i<cDir.length; i++){
  //         if(cDir[i].filename !== TREKLOG_COURSES_FILENAME){
  //           let p = this.storageSvc.fetchDataItem(cDir[i].path)
  //           allDone.push(p);
  //           p.then((file) => {
  //             let course : Course = JSON.parse(file);
  //             // update pointList for defining effort to contain distance data
  //             this.utilsSvc.setPointDistances(course.definingEffort.subject.points)
  //             allDone.push(this.storageSvc.storeCourseFile(course));    // write updated course file
  //             newListItem = {
  //               name: course.name,
  //               createDate: course.createDate,
  //               courseImageUri: course.courseImageUri,
  //               definingEffort : course.definingEffort,
  //               bestEffort:  course.bestEffort,
  //               lastEffort: course.lastEffort,
  //               effortCount: course.efforts.length,
  //             }
  //             this.courseList.push(newListItem);
  //           })
  //         }
  //       }
  //       Promise.all(allDone)
  //       .then(() => {
  //           this.saveCourseList()
  //           .then(() => resolve(RESP_OK))
  //           .catch((err) => reject(err))         
  //       })
  //         .catch((err) => reject(err))
  //       })
  //     .catch(() => {
  //       reject('ERROR: READING_COURSES_DIRECTORY');
  //     })
  //   })
  // }

  // return true if courseList is non-empty
  haveCourses = () => {
    return this.courseList && this.courseList.length > 0;
  }

  // return true if there is a course with the given name
  isCourse = (name: string) => {
    return this.getCourseListIndex(name) !== -1;
  }

  // see if the given name is a course and return its index if so, -1 if not
  getCourseListIndex = (name: string) => {
    let index = -1;
  
    for(let i=0; i<this.courseList.length; i++) {
      if(this.courseList[i].name === name){
        index = i;
        break;
      }
    }
    return index;
  }

  // remove the item with the given name from the courseList and save the updated list
  removeCourseListItem = (name: string) => {
    let i = this.getCourseListIndex(name);

    return new Promise((resolve, reject) => {
      if (i !== -1){
        this.courseList.splice(i,1);
        this.saveCourseList()
        .then(() => resolve(RESP_OK))
        .then((err) => reject(MSG_COURSE_LIST_WRITE + err))
      }
    })
  }

  // create a new CourseEffort object from the given information
  getNewEffort = (trek: TrekObj, method: CourseTrackingMethod, 
                                 course: Course, goalVal: number) : CourseEffort => {
    let effort : CourseEffort = {
      subject: {
        group:            trek.group,
        date:             trek.sortDate,
        type:             trek.type,
        duration:         trek.duration,
        distance:         trek.trekDist,  
        method:           method,
        targetDate:       trek.sortDate,
        targetGroup:      trek.group,
        goalValue:        goalVal,
      }
    }
    if (course !== undefined){
      switch(method){
        case 'bestTime':
          effort.subject.targetGroup = course.bestEffort.subject.group;
          effort.subject.targetDate  = course.bestEffort.subject.date;
          break;
        case 'lastTime':
          effort.subject.targetGroup = course.lastEffort.subject.group;
          effort.subject.targetDate  = course.lastEffort.subject.date;
          break;
        default:
          effort.subject.targetGroup = course.definingEffort.subject.group;
          effort.subject.targetDate  = course.definingEffort.subject.date;
          break;
      }
    }
    return effort;
  }

  // read the courseList file
  getCourseList = (system = this.trekInfo.measurementSystem) : Promise<any> => {
    return new Promise((resolve, reject) => {
      // this.createCourseListFile()
      // .then(() => {
        if (this.courseList) { 
          resolve(this.courseList);      // return local copy
        } else {
          // need to read file
          this.storageSvc.readCourseListFile()
          .then((result) => {
            this.courseList = JSON.parse(result).courses;
            this.setCourseListDisplayItems(system);
            resolve(this.courseList)
          })
          .catch((err) => reject(MSG_COURSE_LIST_READ + err))
        }
      // })
      // .catch((err) => reject(err))
    })
  }

  // format some display items for the given courseList or the instance courseList
  setCourseListDisplayItems = (system = this.trekInfo.measurementSystem, list?: CourseListItem[]) => {
    let cList = list || this.courseList;

    this.courseNames = [];
    this.courseDescriptions = [];
    cList.forEach((course) => {
      this.courseNames.push(course.name);
      let desc = 'Distance: ' +
                 this.trekInfo.formattedDist(course.definingEffort.subject.distance, system) + '\n' +
                 'Last: ' + this.utilsSvc.timeFromSeconds(course.lastEffort.subject.duration) + ' ' +
                            this.utilsSvc.dateFromSortDateYY(course.lastEffort.subject.date) + '\n' +
                 'Best: ' + this.utilsSvc.timeFromSeconds(course.bestEffort.subject.duration) + ' ' +
                            this.utilsSvc.dateFromSortDateYY(course.bestEffort.subject.date);
      this.courseDescriptions.push(desc);                
    })
  }

  // write the courseList file
  saveCourseList = () : Promise<any> => {
    return new Promise((resolve, reject) => {
      this.storageSvc.storeCourseListFile({courses: this.courseList})
      .then(() => resolve(RESP_OK))
      .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
    })
  }

  // return the Course object for the given courseName
  getCourse = (courseName: string) : Promise<any> => {
    return new Promise((resolve, reject) => {
      this.storageSvc.readCourseFile(courseName)
      .then((result) => resolve(JSON.parse(result)))
      .catch((err) => reject(MSG_COURSE_READ + err))
    })
  }

  // return an array of CourseListItems for courses that start near the given location
  // if a TrekObj is given, fully compare trek to course
  nearbyCourses = (loc: LatLng, trek?: TrekObj) => {
    let result = {best: '', list: []};
    let p;
    let best = trek ? 0 : 100;

    for(let i=0; i<this.courseList.length; i++) {
      let course = this.courseList[i];
      if (trek){
        p = this.compareTrekWithCourse(trek, course)
        if (p >= MIN_PATH_MATCH_PERCENT) {
          result.list.push(course);
          if(p > best) { result.best = course.name; }
        }
      } else {       
        p = this.checkStartPosition(loc, course.definingEffort.subject.points);
        if (p < MAX_DIST_FROM_START){
          result.list.push(course);        
        }
      }
    }
    return result;
  }

  // return a list of treks close to the current location or the start of the given trek
  findNearbyCourses = (trek?: TrekObj, allCourses = false) => {
    return new Promise<any>((resolve) => {
      if (allCourses) {
        resolve({best: "", list: this.courseList});
      } else {
        if (trek){
          resolve(this.nearbyCourses(undefined, trek));
        } else {
          this.trekInfo.setWaitingForSomething("NearbyCourses");
          this.locationSvc.getCurrentLocation(
            (location: Location) => {
              this.trekInfo.setWaitingForSomething();
              resolve(this.nearbyCourses({latitude: location.latitude, longitude: location.longitude}));
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
          );
        }
      }
    })
  }

  // open the radioPicker for the courseList 
  getCourseSelection = (pickerOpenFn : Function, currCourse: string, heading: string, allCourses: boolean,
                        trek?: TrekObj, itemTest?: RegExp) => {
    let names = [];
    let values = [];
    let comments = [];
    let sel = currCourse;

    return new Promise<any>((resolve, reject) => {
      this.findNearbyCourses(trek, allCourses)
      .then((result) => {
        let list : CourseListItem[] = result.list;
        list.sort((a,b) => {
          return parseInt(b.lastEffort.subject.date) - parseInt(a.lastEffort.subject.date);
        })
        if(list.length !== 0 || trek){
          if (trek) {
            names.push("New");
            values.push(NEW_COURSE)
            comments.push("Use this " + trek.type + " to define a new course")
          }
          this.setCourseListDisplayItems(this.trekInfo.measurementSystem, list)
          let selNames = names.concat(this.courseNames);
          let selValues = values.concat(this.courseNames);
          let selComments = comments.concat(this.courseDescriptions);

          if (selNames.length === 0){
            reject(MSG_NO_LIST);
          } else {
            if (result.best !== "") { 
              sel = result.best;
            } else {
              if (list.length === 0){
                sel = NEW_COURSE;
              } else {
                sel = list[0].name;
              }
            }
            if (this.courseNames.length === 1 && trek && trek.course === sel) {
              reject(RESP_HAS_LINK); 
            } else {              
              this.modalSvc.openRadioPicker({heading: heading, selectionNames: selNames,
              selectionValues: selValues, selection: sel, 
              selectionComments: selComments, itemTest: itemTest,
              openFn: pickerOpenFn})
              .then((courseSel) => resolve(courseSel))
              .catch(() => reject(RESP_CANCEL))
            }
          }
        } else {
           reject(MSG_NO_LIST);
        }
      })
    })
  }

  // create a new course from the given trek
  createCourse = (name: string, trek: TrekObj, mapImageUri?: string) : Promise<any> => {
    let newCourse : Course;
    let newEffort : CourseEffort = this.getNewEffort(trek, "courseTime", undefined, trek.duration);

    return new Promise((resolve, reject) => {
      this.removeCourseLink(trek, name)
      .then((resp) => {
        if(resp !== RESP_OK){
          resolve(resp)
        } else {
          newCourse = {
            name: name,
            createDate: this.utilsSvc.formatSortDate(),
            courseImageUri: mapImageUri,
            definingEffort: JSON.parse(JSON.stringify(newEffort)),  // deep copy newEffort
            lastEffort: newEffort,
            bestEffort: newEffort,
            efforts: [newEffort]
          };
          // save the pointList with definingEffort
          newCourse.definingEffort.subject.points = this.utilsSvc.copyTrekPath(trek.pointList);
          this.storageSvc.storeCourseFile(newCourse)
          .then(() => {
            // update and save the trek with the new course link
            trek.course = name;
            this.trekInfo.setCourseLink(name);
            this.trekInfo.saveTrek(trek);

            let newListItem : CourseListItem = {
              name: name,
              createDate: newCourse.createDate,
              courseImageUri: newCourse.courseImageUri,
              definingEffort : newCourse.definingEffort,
              bestEffort: newEffort,
              lastEffort: newEffort,
              effortCount: newCourse.efforts.length,
            }
            this.updateCourseList(newListItem)
            .then(() => resolve(RESP_OK))
            .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
          })
          .catch((err) => reject(MSG_COURSE_WRITE + err))
        }
      })
      .catch(() => resolve(RESP_CANCEL))
    })
  }

  // find and update the courseList item corresponding to the given item and save the courseList file
  // add a new item if course not found in the current courseList
  updateCourseList = (listItem: CourseListItem) : Promise<any> => {

    let found = -1;
    for(let i=0; i<this.courseList.length; i++) {
      if(this.courseList[i].name === listItem.name){
        found = i;
        break;
      };
    }
    if (found !== -1){
      this.courseList[found] = {...this.courseList[found], ...listItem};    // merge in update
    } else {
      this.courseList.push(listItem);         // add new course item
    }
    this.setCourseListDisplayItems();
    return this.saveCourseList();
  }

  // delete the given course from the database
  deleteCourse = (course: string) => {
    let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      // remove item from course list
      this.removeCourseListItem(course);

      // remove links from effort treks
      this.storageSvc.readCourseFile(course)
      .then((file) => {
        let c = JSON.parse(file) as Course;
        for(let i=0; i<c.efforts.length; i++) {
          let e = c.efforts[i];
          this.storageSvc.fetchGroupAndDateTrek(e.subject.group, e.subject.date)
          .then((file) => {
            let trek = JSON.parse(file) as TrekObj;
            trek.course = undefined;
            allDone.push(this.trekInfo.saveTrek(trek));
          })
        }
        Promise.all(allDone)
        .then(() => {

          // delete course map image file
          if (c.courseImageUri) {
            this.storageSvc.removeDataItem(c.courseImageUri);
          }

          // now delete the course
          this.storageSvc.deleteCourseFile(course)
          .then(() => resolve(RESP_OK))
          .catch((err) => reject(MSG_COURSE_WRITE + err))
        })
      })
      .catch((err) => reject(MSG_COURSE_READ + err))
    })
  }
  
  // add a new effort to the given course using the given trek
  addCourseEffort = (courseName: string, trek: TrekObj, method: CourseTrackingMethod, goalValue: number) 
        : Promise<any> => {
    let status = RESP_OK;
    let info;

    return new Promise((resolve, reject) => {
      this.storageSvc.readCourseFile(courseName)
      .then((result) => {
        let course = JSON.parse(result) as Course;
        let newEffort = this.getNewEffort(trek, method, course,
                                          goalValue || course.definingEffort.subject.duration);

        // first, check if paths match (ish)
        if (this.checkLengthAgainstCourse(trek, course) > MAX_DIST_DIFF_PERCENTAGE) {
          status = RESP_BAD_LENGTH;
        }
        if (status === RESP_OK ){
          let d = this.checkStartPosition(this.utilsSvc.cvtLaLoToLatLng(trek.pointList[0].l), 
                    course.definingEffort.subject.points);
          if (d > MAX_DIST_FROM_START){
            info = d;
            status = MSG_STARTING_LOC;
          }
        }
        if (status === RESP_OK) {
          let p = this.checkPathAgainstCourse(trek.pointList, course.definingEffort.subject.points);
          if (p < MIN_PATH_MATCH_PERCENT) {
            info = p;
            status = RESP_NO_MATCH;
          }

        }
        if (status !== RESP_OK) {
          resolve({resp: status, info: info});
        } else {
          this.removeCourseLink(trek, courseName)
          .then((resp) => {
            if(resp !== RESP_OK){
              resolve({resp: resp, info: info})   // must already have link to this course
            } else {
                  // path OK, add to course efforts list and update lastEffort and bestEffort if necessary
              course.efforts.push(newEffort);
              if (course.lastEffort === undefined || newEffort.subject.date > course.lastEffort.subject.date){
                course.lastEffort = newEffort;        // new effort is more recent
              }
              if(course.bestEffort === undefined || 
                                          newEffort.subject.duration < course.bestEffort.subject.duration){ 
                course.bestEffort = newEffort; 
                status = MSG_NEW_COURSE_RECORD;
                info = trek.duration;
              }

              // save updated Course and update the corresponding entry in the CourseList
              this.storageSvc.storeCourseFile(course)
              .then(() => {
                // update and save the trek with the new course link
                trek.course = courseName;
                this.trekInfo.setCourseLink(courseName);
                this.trekInfo.saveTrek(trek);

                let newListItem : CourseListItem = {
                  name: courseName,
                  createDate: course.createDate,
                  definingEffort: {...course.definingEffort},
                  bestEffort: {...course.bestEffort},
                  lastEffort: {...course.lastEffort},
                  effortCount: course.efforts.length,
                }
                this.updateCourseList(newListItem)
                .then(() => resolve({resp: status, info: info}))
                .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
              })
              .catch((err) => reject(MSG_COURSE_WRITE + err))
            }
          })
          .catch((err) => reject(MSG_COURSE_READ + err))
        }
      })
      .catch((err) => reject(err))
    })
  }

  // return true if the given trek is the defining effort for the given course
  isDefiningEffort = (course: Course, t: TrekObj) => {
    return (course.definingEffort.subject.date === t.sortDate && 
            course.definingEffort.subject.group === t.group);
  }

  // return the index of the effort of the given course that contains the given group and sortDate
  // return -1 if not found
  getEffortIndex = (course: Course, group: string, date: string) => {
    let index = -1;
    for(let i=0; i<course.efforts.length; i++){
      if(course.efforts[i].subject.group === group &&
         course.efforts[i].subject.date === date){
           index = i;
           break;
         }
    }
    return index;
}

  // return the effort associated with the given course and trek
  getTrekEffort = (course: Course, trek: TrekObj) : CourseEffort => {
    return course.efforts[this.getEffortIndex(course, trek.group, trek.sortDate)];
  }

  // remove the effort described by the given group and date from the named course
  removeCourseEffort = (courseName: string, group: string, date: string) => {
    return new Promise((resolve, reject) => {
      this.storageSvc.readCourseFile(courseName)
      .then((result) => {
        let course = JSON.parse(result) as Course;
        let index = this.getEffortIndex(course, group, date);
        if (index !== -1){

          // effort found, remove from efforts list and update lastEffort and bestEffort if necessary
          course.efforts.splice(index,1); 
          if(course.efforts.length){
            course.lastEffort = course.efforts[0];
            course.bestEffort = course.efforts[0];
            for(let i=0; i<course.efforts.length; i++){
              if (course.efforts[i].subject.duration < course.bestEffort.subject.duration){
                course.bestEffort = course.efforts[i];
              }
              if (course.efforts[i].subject.date > course.lastEffort.subject.date){
                course.lastEffort = course.efforts[i];
              }
            }
          } else {
            // only effort was just deleted
            course.lastEffort = course.bestEffort = undefined;
          }

          // save updated Course and update the corresponding entry in the CourseList
          this.storageSvc.storeCourseFile(course)
          .then(() => {
            let newListItem : CourseListItem = {
              name: courseName,
              createDate: course.createDate,
              definingEffort: {...course.definingEffort},
              bestEffort: {...course.bestEffort},
              lastEffort: {...course.lastEffort},
              effortCount: course.efforts.length,
            }
            this.updateCourseList(newListItem)
            .then(() => resolve(RESP_OK))
            .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
          })
          .catch((err) => reject(MSG_COURSE_WRITE + err))
        } else {
          reject(MSG_NO_EFFORT);
        }
      })
      .catch((err) => reject(MSG_COURSE_READ + err))
    })
  }

  // use the given trek to create a new Course or new Effort for an existing course
  newCourseOrEffort = (trek: TrekObj, pickerOpenFn: Function) => {
    return new Promise<any>((resolve, reject) => {
      this.getCourseSelection(pickerOpenFn, 
        trek.course || FAKE_SELECTION, 'Link ' + trek.type + ' To Course', false, trek, TREKLOG_FILENAME_REGEX)
      .then((sel : string) => {
        if(sel === FAKE_SELECTION) { 
          resolve({name: sel, resp: RESP_CANCEL}); 
        } else {
          let ndx = this.getCourseListIndex(sel);
          if(ndx === -1){

            // new name specified, return new course name
            resolve({name: sel, resp: MSG_NEW_COURSE})
          } else {

            // existing name chosen, attempt to add as effort .vs. courseTime
            this.addCourseEffort(sel, trek, "courseTime", 
                                 this.courseList[ndx].definingEffort.subject.duration)
            .then((added) => {
              switch(added.resp){
                case RESP_NO_MATCH:
                case MSG_STARTING_LOC:
                case MSG_NEW_COURSE_RECORD:
                case RESP_BAD_LENGTH:
                case RESP_HAS_LINK:
                case RESP_OK:
                  resolve({name: sel, resp: added.resp, info: added.info});
                  break;
                default:
              }
            })
            .catch((err) => reject(MSG_NEW_EFFORT + err))
          }
        }
      })
      .catch((resp) => {
        resolve({name: '', resp: resp})})    // cancel in getSelection
    })
  }

  // allow user to remove existing course link (if present) to allow link to specified course
  // return CANCEL, HAS_LINK or OK if removed
  removeCourseLink = (trek: TrekObj, courseName: string) : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      if(!this.isCourse(trek.course) || trek.course === courseName){
        resolve(this.isCourse(trek.course) ? RESP_HAS_LINK : RESP_OK);
      } else {
        this.modalSvc
        .simpleOpen({
          heading: "Remove Course Link",
          content: "Remove existing link to course\n" + trek.course + "?",
          cancelText: "CANCEL",
          okText: "REMOVE",
          headingIcon: 'Course',
          dType: CONFIRM_WARNING,
        })
        .then(() => {
          this.removeCourseEffort(trek.course, trek.group, trek.sortDate)
          .then(() => {
            // update and save trek with no course link
            trek.course = undefined;
            this.trekInfo.setCourseLink(undefined)
            this.trekInfo.saveTrek(trek)
            resolve(RESP_OK);
          })
          .catch((err) => reject(MSG_REMOVE_EFFORT + err))
        })
        .catch(() => resolve(RESP_CANCEL))
      }
    })
  }

  // check the given path against the given course to see if they "match"
  // return the percentage of points that both paths have within maxDist meters of the other path
  checkPathAgainstCourse = (path: TrekPoint[], pList: TrekPoint[], maxDist = MAX_DIST_FROM_PATH) : number => {
    let pointsOnCourse = 0, pointsOnCoursePct = 0;
    let pointsOnPath = 0, pointsOnPathPct = 0;
    let LLPath = this.utilsSvc.cvtPointListToLatLng(path);
    let courseLL = this.utilsSvc.cvtPointListToLatLng(pList);
    let p: LatLng;

    for(let i=0; i<LLPath.length; i++) {
      for(let j=0; j<courseLL.length - 1; j++) {
        // p will be the point on the course nearest to the point from the path
        p = this.intervalSvc.distToSegmentSquared(LLPath[i], courseLL[j], courseLL[j+1]).point;
        if (this.utilsSvc.calcDist(p.latitude, p.longitude, LLPath[i].latitude, LLPath[i].longitude) <= maxDist) { 
          pointsOnCourse++;
          break;
        }
      }
    }
    for(let i=0; i<courseLL.length; i++) {
      for(let j=0; j<LLPath.length - 1; j++) {
        // p will be the point on the path nearest to the point from the course
        p = this.intervalSvc.distToSegmentSquared(courseLL[i], LLPath[j], LLPath[j+1]).point;
        if (this.utilsSvc.calcDist(p.latitude, p.longitude, courseLL[i].latitude, courseLL[i].longitude) <= maxDist) { 
          pointsOnPath++;
          break;
        }
      }
    }
    pointsOnCoursePct = Math.round((pointsOnCourse / LLPath.length) * 100);
    pointsOnPathPct = Math.round((pointsOnPath / courseLL.length) * 100);
    return Math.min(pointsOnCoursePct, pointsOnPathPct);
  }
  
  // return the absolute length difference of the given trek and course as a percentage of course length
  checkLengthAgainstCourse = (trek: TrekObj, course: Course | CourseListItem) => {
    let diff = Math.abs((trek.trekDist - course.definingEffort.subject.distance) / 
                                                            course.definingEffort.subject.distance);
    return Math.round(diff * 100);
  }

  // return the dist in meters of the given point from the start of the given pointList
  checkStartPosition = (p: LatLng, pList: TrekPoint[]) : number => {
    let c1 = this.utilsSvc.cvtLaLoToLatLng(pList[0].l);
    let dFrom = this.utilsSvc.calcDist(p.latitude, p.longitude, c1.latitude, c1.longitude)

    return dFrom;
  }

  getEffortTrek = (group: string, date: string) => {
    return new Promise<any>((resolve, reject) => {
      this.storageSvc.fetchGroupAndDateTrek(group, date)
      .then((result) => {
        let trek = JSON.parse(result) as TrekObj;
        resolve(trek);
      })
      .catch((err) => reject(MSG_EFFORT_PATH + err))
    })
  }

  getDefiningTrek = (index: number) => {
    return this.getEffortTrek(this.courseList[index].definingEffort.subject.group,
                              this.courseList[index].definingEffort.subject.date );
  }

  // set the given trek as the defining effort for the given course
  setDefiningEffort = (courseName: string, trek: TrekObj, mapUri: string) => {
    return new Promise<any>((resolve, reject) => {
      let newEffort : CourseEffort = this.getNewEffort(trek, "courseTime", undefined, trek.duration);
      this.getCourse(courseName)
      .then((course : Course) =>{
        course.definingEffort = newEffort;
        course.courseImageUri = mapUri;
        course.definingEffort.subject.points = this.utilsSvc.copyTrekPath(trek.pointList);
        for(let i=0; i<course.efforts.length; i++){
          if(course.efforts[i].subject.method === 'courseTime'){
            course.efforts[i].subject.goalValue = trek.duration;  // update goalValue of any 'courseTime' efforts
          }
        }
        this.storageSvc.storeCourseFile(course)
        .then(() => {
          let newListItem : CourseListItem = {
            name: courseName,
            courseImageUri: mapUri,
            createDate: course.createDate,
            definingEffort: {...course.definingEffort},
            bestEffort: {...course.bestEffort},
            lastEffort: {...course.lastEffort},
            effortCount: course.efforts.length,
          }
          this.updateCourseList(newListItem)
          .then(() => {
              this.toastSvc.toastOpen({
                tType: "Success",
                content: "Default effort has been changed."
              })
              resolve(RESP_OK)
          })
          .catch((err) => {
            this.toastSvc.toastOpen({
              tType: "Error",
              content: "Default effort not changed\n" + err,
            });
            reject(err)
          })
        })
        .catch((err) => reject(MSG_COURSE_WRITE + err))
      })
      .catch((err) => reject(err))
    })
  }

  // return the pointList for the given effort
  getEffortPath = (group: string, date: string) : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      this.getEffortTrek(group, date)
      .then((trek) => {
        resolve(trek.pointList);
      })
      .catch((err) => reject(err))
    })
  }

  // get the appropriate pointlist for the chosen tracking method
  // best and last effort methods require the actual path from those treks.
  // If effort is supplied, use the targetGroup and targetDate properties to get the path
  // otherwise, use group and date properties from the bestEffort or lastEffort.
  // effort is supplied when replaying the trek, not when logging a trek with course challenge.
  // other tracking methods must use the default path stored with the course
  getTrackingPath = (course: Course, method: CourseTrackingMethod, 
                     effort?: CourseEffort, targetTrek?: TrekObj)  => {

    return new Promise<any>((resolve, reject) => {
      switch(method){
        case 'bestTime':
          if (effort !== undefined){
            this.getEffortTrek(effort.subject.targetGroup, effort.subject.targetDate)
            .then((t: TrekInfo) => resolve({trek: t, list: t.pointList}))
            .catch((err) => reject(err))
          } else {
            this.getEffortTrek(course.bestEffort.subject.group, course.bestEffort.subject.date)
            .then((t: TrekInfo) => resolve({trek: t, list: t.pointList}))
            .catch((err) => reject(err))
          }
          break;
        case 'lastTime':
          if (effort !== undefined){
            this.getEffortTrek(effort.subject.targetGroup, effort.subject.targetDate)
            .then((t: TrekInfo) => resolve({trek: t, list: t.pointList}))
            .catch((err) => reject(err))
          } else {
            this.getEffortTrek(course.lastEffort.subject.group, course.lastEffort.subject.date)
            .then((t: TrekInfo) => resolve({trek: t, list: t.pointList}))
            .catch((err) => reject(err))
          }
          break;
        case 'otherEffort':
          resolve({trek: targetTrek, list: targetTrek.pointList});
          break;
        case 'courseTime':
        case 'timeLimit':     // trackingValue is seconds
        case 'avgSpeed':      // trackingValue is mph or kph
        case 'avgRate':       // trackingValue is sec/mi or sec/km
        default:
          resolve({t: undefined, list: course.definingEffort.subject.points});
      }
    })
  } 

  // create a CourseDetailObject for each effort of the given Course
  readEffortTreks = (course: Course) : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      let allDone : Promise<any>[] = [];
      let dList : CourseDetailObject[] = [];

      for (let i=0; i<course.efforts.length; i++) {
        let p = this.storageSvc.fetchGroupAndDateTrek(course.efforts[i].subject.group, 
                                                      course.efforts[i].subject.date);
        allDone.push(p);
        p.then((result) => {
          let trek = JSON.parse(result) as TrekObj;
          dList.push({effort: course.efforts[i], trek: trek});
        })
        .catch((err) => reject(MSG_EFFORT_READ + err))
      }
      Promise.all(allDone)
      .then(() => resolve(dList))
      .catch((err) => reject(err))
    })
  }

  // compute the appropriate tracking parameters for the course marker given the method and trackingaValue
  getTrackingParams = (course: Course, trackingMethod: CourseTrackingMethod, 
                        trackingValue: number, targetTrek?: TrekObj) => {
    let dur: number, maxV: number, inc: number, tDist: number;
    let type : TrekLimitType = TREK_LIMIT_TYPE_DIST;
    
    switch (trackingMethod) {
      case 'courseTime':
        dur = maxV = trackingValue;
        tDist = course.definingEffort.subject.distance;
        inc = 1;
        type = TREK_LIMIT_TYPE_TIME;
        break;
      case 'lastTime':
      case 'bestTime':
      case 'otherEffort':
        dur = maxV = trackingValue;
        tDist = targetTrek.trekDist;
        inc = 1;
        type = TREK_LIMIT_TYPE_TIME;
        break;
      case 'timeLimit':
        // set for courseDistance/seconds of course distance for each timer tic
        dur = trackingValue;
        tDist = course.definingEffort.subject.distance;
        inc = tDist / trackingValue;
        maxV = tDist;
        break;
      case 'avgSpeed':      // trackingValue is mph or kph
        // set for courseDistance/avgMetersPerSec of course distance for each timer tic
        let metersPerHour = this.utilsSvc.convertToMeters(trackingValue, this.trekInfo.distUnits());
        inc = metersPerHour / 3600;
        dur = course.definingEffort.subject.distance / inc;
        tDist = course.definingEffort.subject.distance;
        maxV = tDist;
        break;
      case 'avgRate':       // trackingValue is sec/mi or sec/km
        // set for courseDistance/avgMetersPerSec of course distance for each timer tic
        inc = this.utilsSvc.convertToMeters(1, this.trekInfo.distUnits()) / trackingValue;
        tDist = course.definingEffort.subject.distance;
        dur = tDist / inc;
        maxV = tDist;
        break;
      default:
    }
    return {inc: inc, dur: dur, tDist: tDist, maxV: maxV, type: type}
  }

  // initialize a CourseTrackingSnapshot object from the given Course, effort and trek
  initCourseTrackingSnapshot = (course: Course, trek: TrekObj, effort : CourseEffort, targetTrek?: TrekObj) => {
    return new Promise<any>((resolve, reject) => {
      let pList : TrekPoint[];

      this.getTrackingPath(course, this.trekInfo.trackingMethod, effort, targetTrek)
      .then((result) => {
        pList = result.list;
        // this.utilsSvc.setPointDistances(pList);
        let params = this.getTrackingParams(course, 
          this.trekInfo.trackingMethod, this.trekInfo.trackingValue, result.trek);
        
        // init to show ending positions for both markers
        let cPos = (params.dur < trek.duration) ? params.maxV : (trek.duration * params.inc);
        let tPos = (params.dur < trek.duration) ? params.dur : trek.duration;
        this.trackingSnapshot = {
          header: this.formatTrackingHeader(this.trekInfo.trackingMethod, this.trekInfo.trackingValue),
          goalValue: this.trekInfo.trackingValue,
          method: this.trekInfo.trackingMethod,
          coursePath: pList,
          courseDist: params.tDist,
          courseDuration: params.dur,             // time taken for courseMarker to travel the coursePath
          coursePos: cPos,                        // maximum value of the courseMarker
          courseInc: params.inc,                  // seconds or meters to increment coursePos per second
          coursePosMax: params.maxV,
          coursePosType: params.type,
          courseMarker: undefined,
          trekPath: trek.pointList,
          trekDist: trek.trekDist,
          trekDuration: trek.duration,            // time taken for trekMarker to travel the trekPath
          trekPos: tPos,     
          trekInc: 1,                             // seconds to increment trekPos per second
          trekPosMax: trek.duration,
          trekPosType: TREK_LIMIT_TYPE_TIME,
          trekMarker: undefined,
        }
        resolve(RESP_OK)
      })
      .catch((err) => reject(err))
    })
  }

  // update the given CourseTrackingSnapshot object with the given updates object
  updateCourseTrackingSnapshot = (updates: any) => {
    this.trackingSnapshot = {...this.trackingSnapshot, ...updates};
    return this.trackingSnapshot;
  }

  // clear the trackingSnapshot property
  clearTrackingSnapshot = () => {
    this.trackingSnapshot = undefined;
  }

  // format a string to use as the header for the tracking stats display
  formatTrackingHeader = (method: CourseTrackingMethod, goalValue: number) => {
    let header = '.vs ';
    let metersPerHour : number;

    switch(method){
      case 'bestTime':
        header = '.vs Best';
        break;
      case 'lastTime':
        header = '.vs Last';
        break;
      case 'otherEffort':
        header = '.vs Other';
        break;
      case 'timeLimit':
        header += this.utilsSvc.timeFromSeconds(goalValue);
        break;
      case 'avgRate':
        metersPerHour = this.utilsSvc.convertToMeters(1, this.trekInfo.distUnits());
        header += this.utilsSvc.formatTimePerDist(this.trekInfo.distUnits(), metersPerHour, goalValue);
        break;
      case 'avgSpeed':
        metersPerHour = this.utilsSvc.convertToMeters(goalValue, this.trekInfo.distUnits());
        header += this.utilsSvc.formatAvgSpeed(this.trekInfo.measurementSystem, metersPerHour, 3600);
        break;
      case 'courseTime':
        header = '.vs Course';
        break;
      defalut: 
        header = method;
    }
    return header;
  }

  // compare the given trek to the given course to see if there is a match
  // return the percentage match with course path or 0 if wrong starting point or length
  compareTrekWithCourse = (trek: TrekObj, course: CourseListItem) : number => {
    let p = 0;
    let sub = course.definingEffort.subject;

    if((this.checkLengthAgainstCourse(trek, course) <= MAX_DIST_DIFF_PERCENTAGE) &&
      (this.checkStartPosition(this.utilsSvc.cvtLaLoToLatLng(trek.pointList[0].l), 
                                              sub.points) < MAX_DIST_FROM_START)){
      p = this.checkPathAgainstCourse(trek.pointList, course.definingEffort.subject.points);
    }
    return p;
  }

  // see if the given trek looks like any course
  // return course name of best match if found, retun '' if no match
  checkForCourseMatch = (trek: TrekObj) : string => {
    let bestMatch = '';
    let bmPct = 0;

    for(let i=0; i<this.courseList.length; i++) {
      let course = this.courseList[i];
      let p = this.compareTrekWithCourse(trek, course);
      if(p >= MIN_PATH_MATCH_PERCENT && p > bmPct) {
        bestMatch = course.name;
        bmPct = p;
      }
    }
    return bestMatch;
  }

  // display a message indicating a new record time for the given course
  celebrateNewCourseRecord = (msg: string, course: string, time: number) => {
    this.toastSvc.toastOpen({
      tType: "Success",
      icon: 'CheckeredFlag',
      iColor: BLACKISH,
      content: msg + 'for: ' + course + 
              ' (' + this.utilsSvc.timeFromSeconds(time) + ')',
      time: 5000
    });
  }

  // save the given uri (if any) as the image for the given course
  saveCourseSnapshot = (name: string, uri: string, trek: TrekObj, mode: string) => {
    return new Promise<any>((resolve, reject) => {
      if (uri) {
        this.storageSvc.saveCourseMapImage(name, uri)
        .then((newUri: string) => {
          switch(mode){
            case 'Update':          
              this.changedDefiningEffort = false;
              this.setDefiningEffort(name, trek, newUri)
              .then(() => {
                this.changedDefiningEffort = true;
                resolve(RESP_OK)
              })
              .catch((err) => reject(err))
              break;
            case 'New':          
              this.createCourse(name, trek, newUri)
              .then(() => {
                this.toastSvc.toastOpen({
                  tType: "Success",
                  content: "New course created:\n" + name,
                });
                resolve(RESP_OK);
              })
              .catch((err) => reject(err))
              break;
            default:
              reject('Unknown Snapshot Mode')
          }
        })
        .catch((err) => reject(err))
      } else {
        resolve('No Snapshot URI')
      }
    })
  }
}

