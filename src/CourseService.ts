import { action } from 'mobx';

import { TrekInfo, TrekPoint, TrekObj, TrekType, RESP_CANCEL, RESP_NO_MATCH, RESP_BAD_LENGTH, 
  RESP_OK, FAKE_SELECTION, MSG_EFFORT_PATH, MSG_COURSE_READ, MSG_EFFORT_READ, MSG_COURSE_WRITE,
  MSG_NO_LIST, MSG_REMOVE_EFFORT, RESP_HAS_LINK, MSG_COURSE_LIST_READ, MSG_STARTING_LOC,
  MSG_COURSE_LIST_WRITE, MSG_NEW_EFFORT, MSG_NO_EFFORT, MSG_NEW_COURSE_RECORD } from './TrekInfoModel'
import { UtilsSvc } from './UtilsService';
import { StorageSvc } from './StorageService';
import { ModalModel, CONFIRM_WARNING } from './ModalModel';
import { TREKLOG_FILENAME_REGEX } from './App';
import { IntervalSvc } from './IntervalSvc';
import { LatLng } from 'react-native-maps';
import { CourseTrackingMethod } from './TrackingMethodComponent';
import { TrekLimitType, TREK_LIMIT_TYPE_TIME, TREK_LIMIT_TYPE_DIST } from './LoggingService';

export interface CourseEffort {
  subject: {
    group:              string,       // group where the subject trek is saved
    date:               string,       // sortDate of trek
    type:               TrekType,     // type of trek
    duration:           number,       // completion time of effort trek
    distance:           number        // completion distance of effort trek
    goalValue:          number,       // goal time, speed/rate (mps)
    method:             CourseTrackingMethod, // method of tracking used
    points?:            TrekPoint[],  // pointList of source Trek (for defining/best/last efforts)
  },
  target: {
    group:              string,       // group for target trek
    date:               string,       // sortDate for target trek
    type:               TrekType,     // type of target trek
    duration:           number,       // duration of target trek
    distance:           number,       // distance of target trek
  }
}

export interface Course {
  name:           string,           // Course name
  createDate:     string,           // date course defined
  definingEffort: CourseEffort,     // trek used to define this course
  lastEffort:     CourseEffort,     // last trek time of this course
  bestEffort:     CourseEffort,     // best trek time of this course
  efforts:        CourseEffort[]    // list of treks of this course
}

export interface CourseListItem {
  name:           string,           // Course name
  createDate:     string,           // date course created
  definingEffort: CourseEffort,     // trek used to define this course
  lastEffort:     CourseEffort,     // last trek time of this course
  bestEffort:     CourseEffort      // best trek time of this course
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
export const MAX_DIST_FROM_START = 75;
export const MIN_PATH_MATCH_PERCENT = 80;
export const MAX_DIST_DIFF_PERCENTAGE = 5;

export class CourseSvc {

  courseList          : CourseListItem[];
  courseNames         : string[];
  courseDescriptions  : string[];
  trackingSnapshot    : CourseTrackingSnapshot;

  constructor ( private utilsSvc: UtilsSvc, private trekInfo: TrekInfo, 
    private intervalSvc: IntervalSvc, private storageSvc: StorageSvc, private modalSvc: ModalModel ) {
    this.initializeObservables();
  }

  @action
  initializeObservables = () => {
  }

  updateCourseRecords = () => {
    // let allDone : Promise<any>[] = [];

    return new Promise((resolve, reject) => {
      for(let i=0; i<this.courseList.length; i++) {
        let clItem = this.courseList[i];
        this.storageSvc.deleteCourseFile(clItem.name);  // delete all courses
        // allDone.push(p);
        // p.then((file) => {
        //   let c = JSON.parse(file) as Course;
        //   clItem.createDate = c.createDate;
          // if(i===0){alert(JSON.stringify(c,null,2))}
          // let defEff = c.efforts[0];
          // let pt = this.storageSvc.fetchGroupAndDateTrek(defEff.group, defEff.date);
          // allDone.push(pt);
          // pt.then((data) => {
          //   let trek = JSON.parse(data) as TrekObj;
          //   defEff.distance = trek.trekDist;
          //   defEff.duration = trek.duration;
          //   clItem.definingEffort = defEff;
          //   c.definingEffort = defEff;
          //   clItem.distance = defEff.distance;
          //   c.distance = defEff.distance;
          //   clItem.duration = defEff.duration;
          //   c.duration = defEff.duration;
          //   clItem.type = defEff.type;
          //   c.type = defEff.type;
          //   trek.course = c.name;
            // allDone.push(this.storageSvc.storeTrekData(trek));
            // allDone.push(this.storageSvc.storeCourseFile(c));
            // alert(JSON.stringify(this.courseList,null,2))
            // allDone.push(this.saveCourseList());
          // })
          // .catch((err) => reject(MSG_EFFORT_READ + err))
        // })
        // .catch((err) => reject(MSG_COURSE_READ + err))
      }
      this.courseList = [];       // reset to empty courseList
      this.saveCourseList()     
      .then(() => {
        resolve(RESP_OK)})
      .catch((err) => reject('MISC_ERROR\m' + err))
    })
  }

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

  getNewEffort = (course: Course, trek: TrekObj, method: CourseTrackingMethod, goalVal: number) : CourseEffort => {
    let targetEffort: CourseEffort;
    
    // determine which effort is being used as target
    switch(method){
      case 'courseTime':
      default:
        targetEffort = course.definingEffort;
    }
    return {
      subject: {
        group:            trek.group,
        date:             trek.sortDate,
        type:             trek.type,
        duration:         trek.duration,
        distance:         trek.trekDist,  
        method:           method,
        goalValue:        goalVal,
      },
      target: {
        group:            targetEffort.subject.group,
        date:             targetEffort.subject.date,
        type:             targetEffort.subject.type,
        duration:         targetEffort.subject.duration,
        distance:         targetEffort.subject.distance,
      }
    }
  }

  // read the courseList file
  getCourseList = (system = this.trekInfo.measurementSystem) : Promise<any> => {
    return new Promise((resolve, reject) => {
      if (this.courseList) { 
       resolve(this.courseList);      // return local copy
      } else {
        // need to read file
        this.storageSvc.readCourseListFile()
        .then((result) => {
          this.courseList = JSON.parse(result).courses;
          // this.updateCourseRecords()
          // .then(() => {
          //   this.setCourseListDisplayItems(system);
          //   resolve(this.courseList);})
          // .catch((err) => {
          //   alert(err)
          //   reject(err)})
          this.setCourseListDisplayItems(system);
          resolve(this.courseList);
        })
        .catch((err) => reject(MSG_COURSE_LIST_READ + err))
      }
    })
  }

  // format some display items for the courseList
  setCourseListDisplayItems = (system = this.trekInfo.measurementSystem) => {
    this.courseNames = [];
    this.courseDescriptions = [];
    this.courseList.forEach((course) => {
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
      .catch((err) => reject(MSG_COURSE_WRITE + err))
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

  // open the radioPicker for the courseList 
  getCourseSelection = (pickerOpenFn : Function, currCourse: string, heading: string, 
                        trek?: TrekObj, itemTest?: RegExp) => {
    let names = [];
    let values = [];
    let comments = [];

    if (trek) {
      names.push("New");
      values.push(NEW_COURSE)
      comments.push("Use this " + trek.type + " to define a new course")
    }
    this.setCourseListDisplayItems(this.trekInfo.measurementSystem)
    let selNames = names.concat(this.courseNames);
    let selValues = values.concat(this.courseNames);
    let selComments = comments.concat(this.courseDescriptions);

    return new Promise<any>((resolve, reject) => {
      if (selNames.length === 0){
        reject(MSG_NO_LIST);
      } else {
        this.modalSvc.openRadioPicker({heading: heading, selectionNames: selNames,
        selectionValues: selValues, selection: currCourse, 
        selectionComments: selComments, itemTest: itemTest,
        openFn: pickerOpenFn})
        .then((courseSel) => resolve(courseSel))
        .catch(() => reject(RESP_CANCEL))
      }
    })
  }

  // create a new course from the given trek
  createCourse = (name: string, trek: TrekObj) : Promise<any> => {
    let newCourse : Course;
    let newEffort : CourseEffort = {
      subject: {
          group:            trek.group,
          date:             trek.sortDate,
          type:             trek.type,
          duration:         trek.duration,
          distance:         trek.trekDist,  
          method:           'courseTime',
          goalValue:        trek.duration,
          points:           this.utilsSvc.copyTrekPath(trek.pointList),
        },
        target: {
          group:            trek.group,
          date:             trek.sortDate,
          type:             trek.type,
          duration:         trek.duration,
          distance:         trek.trekDist,  
        }
      }

    return new Promise((resolve, reject) => {
      this.removeCourseLink(trek, name)
      .then((resp) => {
        if(resp !== RESP_OK){
          resolve(resp)
        } else {
          newCourse = {
            name: name,
            createDate: this.utilsSvc.formatSortDate(),
            definingEffort: newEffort,
            lastEffort: newEffort,
            bestEffort: newEffort,
            efforts: [newEffort]
          };
          this.storageSvc.storeCourseFile(newCourse)
          .then(() => {
            // update and save the trek with the new course link
            trek.course = name;
            this.trekInfo.setCourseLink(name);
            this.trekInfo.saveTrek(trek);
            this.trekInfo.setCourseLink(name);

            let newListItem : CourseListItem = {
              name: name,
              createDate: newCourse.createDate,
              definingEffort : newEffort,
              bestEffort: newEffort,
              lastEffort: newEffort,
            }
            this.updateCourseListFile(newListItem)
            .then(() => resolve(RESP_OK))
            .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
          })
          .catch((err) => reject(MSG_COURSE_WRITE + err))
      }
      })
      .catch(() => resolve(RESP_CANCEL))
    })
  }

  updateCourseListFile = (listItem: CourseListItem) : Promise<any> => {

    listItem.definingEffort.subject.points = undefined; // don't save points in courseList entries
    listItem.lastEffort.subject.points = undefined;
    listItem.bestEffort.subject.points = undefined;
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
        let newEffort = this.getNewEffort(course, trek, method, goalValue);

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
              resolve({resp: resp, info: info})
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
                this.trekInfo.setCourseLink(courseName);

                let newListItem : CourseListItem = {
                  name: courseName,
                  createDate: course.createDate,
                  definingEffort: course.definingEffort,
                  bestEffort: course.bestEffort,
                  lastEffort: course.lastEffort,
                }
                this.updateCourseListFile(newListItem)
                .then(() => resolve({resp: status, info: info}))
                .catch((err) => reject(MSG_COURSE_LIST_WRITE + err))
              })
              .catch((err) => reject(MSG_COURSE_WRITE + err))
            }
          })
          .catch((err) => reject(MSG_COURSE_READ + err))
        }
      })
      .catch(() => resolve({resp: RESP_CANCEL, info: info}))
    })
  }

  // remove the effort described by the given group and date from the named course
  removeCourseEffort = (courseName: string, group: string, date: string) => {
    return new Promise((resolve, reject) => {
      this.storageSvc.readCourseFile(courseName)
      .then((result) => {
        let course = JSON.parse(result) as Course;
        let index = -1;
        for(let i=0; i<course.efforts.length; i++){
          if(course.efforts[i].subject.group === group &&
             course.efforts[i].subject.date === date){
               index = i;
               break;
             }
        }
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
              definingEffort: course.definingEffort,
              bestEffort: course.bestEffort,
              lastEffort: course.lastEffort
            }
            this.updateCourseListFile(newListItem)
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
        trek.course || FAKE_SELECTION, 'Link ' + trek.type + ' To Course', trek, TREKLOG_FILENAME_REGEX)
      .then((sel : string) => {
        if(sel === FAKE_SELECTION) { 
          resolve({name: sel, resp: RESP_CANCEL}); 
        } else {
          let ndx = this.getCourseListIndex(sel);
          if(ndx === -1){

            // new name specified, create new course
            this.createCourse(sel, trek)
            .then(() => resolve({name: sel, resp: sel}))
            .catch((err) => reject('Error: CREATING_COURSE\n' + err))
          } else {

            // existing name chosen, attempt to add as effort .vs. bestEffort
            this.addCourseEffort(sel, trek, "courseTime", this.courseList[ndx].definingEffort.subject.duration)
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
      .catch(() => resolve({name: '', resp: RESP_CANCEL}))    // cancel in getSelection
    })
  }

  // allow user to remove existing course link (if present) to allow link to specified course
  // return CANCEL, HAS_LINK or OK if removed
  removeCourseLink = (trek: TrekObj, courseName: string) : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      if(!trek.course || trek.course === courseName){
        resolve(trek.course === courseName ? RESP_HAS_LINK : RESP_OK);
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

  // chedk the given path against the given course to see if they "match"
  // given path must have at least % of its points within 20 meters of the course
  checkPathAgainstCourse = (path: TrekPoint[], pList: TrekPoint[], maxDist = 50) : number => {
    let pointsOn = 0;
    let LLPath = this.utilsSvc.cvtPointListToLatLng(path);
    let courseLL = this.utilsSvc.cvtPointListToLatLng(pList);
    let p: LatLng;

    for(let i=0; i<LLPath.length; i++) {
      for(let j=0; j<courseLL.length - 1; j++) {
        p = this.intervalSvc.distToSegmentSquared(LLPath[i], courseLL[j], courseLL[j+1]).point;
        if (this.utilsSvc.calcDist(p.latitude, p.longitude, LLPath[i].latitude, LLPath[i].longitude) <= maxDist) { 
          pointsOn++;
          break;
        }
      }
    }
    return Math.round((pointsOn / LLPath.length) * 100);
  }
  
  // return the absolute length difference of the given trek and course as a percentage of course length
  checkLengthAgainstCourse = (trek: TrekObj, course: Course) => {
    let diff = Math.abs((trek.trekDist - course.definingEffort.subject.distance) / 
                                                            course.definingEffort.subject.distance);
    return Math.round(diff * 100);
  }

  // return the dist in meters of the given point from the start of the given pointList
  checkStartPosition = (p: LatLng, pList: TrekPoint[]) : number => {
    let c1 = this.utilsSvc.cvtLaLoToLatLng(pList[0].l);

    return this.utilsSvc.calcDist(p.latitude, p.longitude, c1.latitude, c1.longitude)
  }

  // return the pointList for the given effort
  getEffortPath = (effort: CourseEffort) : Promise<any> => {
    return new Promise<any>((resolve, reject) => {
      this.storageSvc.fetchGroupAndDateTrek(effort.subject.group, effort.subject.date)
      .then((result) => {
        let trek = JSON.parse(result) as TrekObj;
        resolve(trek.pointList);
      })
      .catch((err) => reject(MSG_EFFORT_PATH + err))
    })
  }

  // get the appropriate pointlist for the chosen tracking method
  // best and last effort methods require the actual path from those treks
  // other methods can use the default path stored with the course when created
  getTrackingPath = (course: Course, method: CourseTrackingMethod) : TrekPoint[] => {
    switch(method){
      case 'courseTime':
      case 'bestTime':
      case 'timeLimit':
      case 'avgSpeed':      // trackingValue is mph or kph
      case 'avgRate':       // trackingValue is sec/mi or sec/km
      default:
        return (course.definingEffort.subject.points);
    }
  } 

  // create a CourseDetailObject[] for the given Course
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
  getTrackingParams = (course: Course, trackingMethod: CourseTrackingMethod, trackingValue: number) => {
    let dur: number, maxV: number, inc: number, tDist: number;
    let type : TrekLimitType= TREK_LIMIT_TYPE_DIST;
    
    switch (trackingMethod) {
      case 'courseTime':
        dur = maxV = trackingValue;
        tDist = course.definingEffort.subject.distance;
        inc = 1;
        type = TREK_LIMIT_TYPE_TIME;
        break;
      case 'bestTime':
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
  initCourseTrackingSnapshot = (course: Course, effort: CourseEffort, trek: TrekObj) => {
    let pList = this.getTrackingPath(course, effort.subject.method);
    let params = this.getTrackingParams(course, effort.subject.method, effort.subject.goalValue);
    // alert(JSON.stringify(params,null,2))
    
    // init to show ending positions for both markers
    let cPos = (params.dur < trek.duration) ? params.maxV : (trek.duration * params.inc);
    let tPos = (params.dur < trek.duration) ? params.dur : trek.duration;
    this.trackingSnapshot = {
      header: this.formatTrackingHeader(effort.subject.method, effort.subject.goalValue),
      goalValue: effort.subject.goalValue,
      method: effort.subject.method,
      coursePath: pList,
      courseDist: params.tDist,
      courseDuration: params.dur,             // time taken for courseMarker to travel the coursePath
      coursePos: cPos,                         // maximum value of the courseMarker
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

    switch(method){
      case 'bestTime':
      case 'timeLimit':
        header += this.utilsSvc.timeFromSeconds(goalValue);
        break;
      case 'avgRate':
        header += this.utilsSvc.formatTimePerDist(this.trekInfo.distUnits(), 1, goalValue);
        break;
      case 'avgSpeed':
        header += this.utilsSvc.formatAvgSpeed(this.trekInfo.measurementSystem, 1, goalValue);
        break;
      case 'courseTime':
        header = '.vs Course';
        break;
      defalut: 
        header = method;
    }
    return header;
  }

}

