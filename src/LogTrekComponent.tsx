import React from "react";
import { Component, RefObject } from "react";
import {
  View,
  StyleSheet,
  Vibration,
  Text,
  Image,
  Dimensions,
  BackHandler,
  StatusBar
} from "react-native";
import { NavigationActions } from "react-navigation";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { Location } from "@mauron85/react-native-background-geolocation";

import {
  TrekInfo,
  TrekType,
  TREK_VERBS_OBJ,
  START_VIB,
  STOP_VIB,
  DIST_UNIT_LONG_NAMES,
  WEIGHT_UNIT_CHOICES,
  TREK_TYPE_LABELS,
  TREK_TYPE_BIKE,
  RestoreObject,
  TREK_TYPE_WALK,
  TREK_TYPE_RUN,
  TREK_TYPE_HIKE,
  MSG_NO_LIST,
  MSG_LINK_ADDED,
  MSG_LINK_NOT_ADDED,
  RESP_NO_MATCH,
  RESP_BAD_LENGTH,
  RESP_CANCEL,
  MSG_NEW_COURSE_RECORD,
  RESP_OK,
  TrekObj,
  TREK_TYPE_BOARD,
  TREK_TYPE_DRIVE,
} from "./TrekInfoModel";
import { ToastModel } from "./ToastModel";
import { ModalModel, CONFIRM_INFO } from "./ModalModel";
import TrekLimitsForm, { LimitsObj } from "./TrekLimitsComponent";
import TrackingMethodForm, { CourseTrackingMethod } from './TrackingMethodComponent';
import {
  M_PER_MILE,
  LB_PER_KG,
  UtilsSvc,
} from "./UtilsService";
import { WeatherSvc } from "./WeatherSvc";
import { GoalObj, GoalsSvc, GoalDisplayItem } from "./GoalsService";
import { BIG_CONTROLS_HEIGHT, NAV_ICON_SIZE, BIG_NAV_ICON_SIZE, HEADER_HEIGHT, 
         TREKLOG_FILENAME_REGEX, COLOR_THEME_LIGHT, TRACKING_STATUS_BAR_HEIGHT, 
         TREK_TYPE_COLORS_OBJ } from "./App";
import SpeedDial, { SpeedDialItem } from "./SpeedDialComponent";
import TrekLogHeader from "./TreklogHeaderComponent";
import { StorageSvc } from "./StorageService";
import { LocationSvc } from "./LocationService";
import { LoggingSvc } from "./LoggingService";
import IconButton from "./IconButtonComponent";
import Waiting from "./WaitingComponent";
import TrekStats from "./TrekStatsComponent";
import { GroupSvc } from "./GroupService";
import RadioPicker from './RadioPickerComponent';
import CheckboxPicker from "./CheckboxPickerComponent";
import { FilterSvc } from "./FilterService";
import { CourseSvc, Course } from "./CourseService";
import NavMenu from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import TrackingStatusBar from './TrackingStatusBar';

const pageTitleFormat = {marginBottom: 0, marginTop: 15};
const goBack = NavigationActions.back();

@inject(
  "trekInfo",
  "toastSvc",
  "modalSvc",
  "weatherSvc",
  "goalsSvc",
  "storageSvc",
  "locationSvc",
  "loggingSvc",
  "utilsSvc",
  "groupSvc",
  "filterSvc",
  "courseSvc",
  "uiTheme"
)
@observer
class LogTrek extends Component<
  {
    toastSvc?: ToastModel;
    trekInfo?: TrekInfo;
    modalSvc?: ModalModel;
    weatherSvc?: WeatherSvc;
    goalsSvc?: GoalsSvc;
    storageSvc?: StorageSvc;
    locationSvc?: LocationSvc;
    loggingSvc?: LoggingSvc;
    utilsSvc?: UtilsSvc;
    groupSvc?: GroupSvc;
    filterSvc?: FilterSvc;
    courseSvc?: CourseSvc;
    uiTheme?: any;
    navigation?: any;
  },
  {}
> {
  @observable limitFormOpen: boolean;
  @observable trackingMethodFormOpen: boolean;
  @observable trackingMethodFormDone: string;
  @observable waitingForSomething: string;
  @observable checkboxPickerOpen;
  @observable radioPickerOpen;
  @observable coursePickerOpen;
  @observable courseToTrack: Course;
  @observable showOptions : boolean;
  @observable openNavMenu : boolean;
  @observable lockNavMenu;

  _didFocusSubscription;
  _willBlurSubscription;

  trekInfo = this.props.trekInfo;
  glS = this.props.locationSvc;
  fS = this.props.filterSvc;
  cS = this.props.courseSvc;
  logSvc = this.props.loggingSvc;
  uiTheme = this.props.uiTheme;
  activeNav = "";
  limitProps: LimitsObj = {} as LimitsObj;
  typeSDRef: RefObject<SpeedDial>;
  optionsTimerID : number;
  oldTrekType : TrekType;
  headerActions = [];
      
  constructor(props) {
    super(props);
    this.typeSDRef = React.createRef();
    this.setHeaderActions();
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        );
        this.init();
      }
    );
  }

  componentWillMount() {
    StatusBar.setHidden(true, "none");
    this.initializeObservables();
    this.props.navigation.setParams({ checkBackButton: this.checkBackButton });
    this.trekInfo.setAppReady(false);
    this.trekInfo.resObj = undefined;
    this.props.storageSvc
      .fetchRestoreObj()
      .then((ro: RestoreObject) => {
        this.props.storageSvc.removeRestoreObj();
        this.trekInfo.resObj = ro;
        this.trekInfo.restoreLogState(ro)
        .then(() => {
          this.cS.getCourseList(ro.measurementSystem);
          this.trekInfo.setMeasurementSystem(ro.measurementSystem);
          this.trekInfo.setAppReady(true);
          this.logSvc.smoothTrek();
          if (ro.timerOn) {
            this.logSvc.startTrekTimer();
          }
          if (ro.timeLimit) {
            this.startLimitTimer();
          }
          if (ro.trackingObj){
            this.logSvc.restartTrackingMarker(ro.trackingObj)
          }
          this.logSvc.watchGeolocationPosition(this.gotPos, false);
          if (ro.showMapInLog) {
            this.props.navigation.navigate("LogTrekMap");
          }
          if (ro.saveDialogOpen) {
            this.stopLogging();
          } else {
            if (ro.trekLabelFormOpen) {
              this.setPendingReview(true);
              this.setTrekLabel();
            } else {
              if (ro.cancelDialogOpen) {
                this.checkBackButton();
              }
            }
          }
        })
        .catch((err) => alert(err))
      })
      .catch(() => {
        // nothingToRestore
        this.trekInfo
          .init()
          .then(() => {
            // Get the current GPS position so the log map shows where we are
            this.glS.getCurrentLocation(
              location => {
                this.trekInfo.initialLoc = {
                  latitude: location.latitude,
                  longitude: location.longitude
                };
                this.glS.stopGeolocation();
              },
              { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
            );
            this.trekInfo.setAppReady(true);
            this.trekInfo.clearTrackingItems();
            this.cS.getCourseList();
            // .then(() => {})
            // .catch(() => {})
          })
          .catch((err) => {
            this.cS.getCourseList()
            .then(() => {})
            .catch(() => {})
            this.trekInfo.setAppReady(true);
            // need to create a group or enter settings
            switch (err) {
              case "NO_GROUPS":
              case "NO_SETTINGS":
                this.props.navigation.navigate({routeName: 'Settings', key: 'Key-Settings'});
                break;
              case "NO_COURSES":
                break;
              default:
            }
          });
      });
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.trekInfo.updateTrekSaved(false);
    this.discardTrek();
    this.logSvc.stopTrekTimer();
    this.logSvc.stopLimitTimer();
    this.closeLimitForm();
    this.trekInfo.setLogging(false);
    this.trekInfo.setAppReady(true);
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.limitFormOpen = false;
    this.trackingMethodFormOpen = false;
    this.trackingMethodFormDone = "";
    this.setWaitingForSomething('');
    this.setCoursePickerOpen(false);
    this.setCheckboxPickerOpen(false);
    this.setRadioPickerOpen(false);
    this.setCourseToTrack(undefined);
    this.setShowOptions(false);
    this.setOpenNavMenu(false);
    this.setLockNavMenu(false);
  };

  checkBackButton = () => {
    requestAnimationFrame(() => {
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  };

  onBackButtonPressAndroid = () => {
    if (this.trackingMethodFormOpen) { return true; }
    if (this.trekInfo.logging || this.trekInfo.pendingReview) {
      if (this.trekInfo.saveDialogOpen) {
        return true;
      } // ignore back button if save dialog is open
      if (this.trekInfo.pendingReview && this.trekInfo.trekSaved) {
        this.reviewFinished();
        return true;
      }
      let labelFormOpen = this.trekInfo.trekLabelFormOpen;
      if (labelFormOpen) {
        this.logSvc.closeLabelForm();
      }
      this.trekInfo.setCancelDialogOpen(true);
      this.props.modalSvc
        .simpleOpen({
          heading: "Cancel Log",
          content: "CANCEL logging this " + this.trekInfo.type + "?",
          cancelText: "NO",
          okText: "YES",
          headingIcon: this.trekInfo.type,
          dType: CONFIRM_INFO
        })
        .then(() => {
          this.trekInfo.setCancelDialogOpen(false);
          this.logSvc.stopTrek();
          this.finalizeTrek();
          this.setPendingReview(false);
          this.abortLogging(" has been canceled.");
        })
        .catch(() => {
          this.trekInfo.setCancelDialogOpen(false);
          if (labelFormOpen) {
            this.logSvc.openLabelForm();
          }
        });
      return true;
    } else {
      return false;
    }
  };

  init = () => {
    StatusBar.setHidden(true, "none");
    if (
      this.trekInfo.appReady &&
      !this.trekInfo.pendingInit &&
      !this.trekInfo.logging &&
      !this.trekInfo.pendingReview
    ) {
      this.trekInfo
        .init()
        .then(() => {
          this.logSvc.resetTrek();
          this.trekInfo.clearTrek();
          this.trekInfo.clearTrackingItems();
          this.logSvc.setDate();
          this.trekInfo.setShowMapInLog(false);
        })
        .catch((err) => {
          // need to create a use or enter settings
          switch (err) {
            case "NO_GROUPS":
            case "NO_SETTINGS":
              this.props.navigation.navigate("Settings");
              break;
            default:
          }
        });
    }
  };

  // set the status of the showOptions component
  @action
  setShowOptions = (status: boolean) => {
    this.showOptions = status;
    // if(status === true){
    //   this.optionsTimerID = window.setTimeout(() => {
    //     this.setShowOptions(false);
    //   }, 5400); // automatically close after a while if not closed
    // }
    // else {
    //   if(this.optionsTimerID !== undefined){
    //     window.clearTimeout(this.optionsTimerID);
    //     this.optionsTimerID = undefined;
    //   }
    // }
  };

  // set the open status of the checkboxPickerOpen component
  @action
  setCheckboxPickerOpen = (status: boolean) => {
    this.checkboxPickerOpen = status;
  };

  @action
  setLockNavMenu = (status: boolean) => {
    this.lockNavMenu = status;
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  // toggle the status of the showOptions component
  toggleShowOptions = () => {
    this.setShowOptions(!this.showOptions);
  };

  // set the open status of the coursePickerOpen component
  @action
  setCoursePickerOpen = (status: boolean) => {
    this.coursePickerOpen = status;
  };

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.trekInfo.swapColorTheme();
  }

  setHeaderActions = () => {
    const { mediumTextColor, headerTextColor } = this.uiTheme.palette[this.props.trekInfo.colorTheme];
    this.headerActions.push(
      { icon: 'YinYang', 
        iconColor: this.trekInfo.haveBackgroundImage() ? mediumTextColor : headerTextColor, 
        style: {marginTop: 0}, actionFn: this.swapColorTheme});
    // {icon: 'Image', iconColor: tColor, style: {marginTop: 10}, actionFn: this.trekInfo.toggleCurrentBackground},
  }

  // set the value of the limitFormOpen property to false
  @action
  closeLimitForm = () => {
    this.setLimitFormOpen(false);
  };

  // set the value of the limitFormOpen property
  @action
  setLimitFormOpen = (status: boolean) => {
    this.limitFormOpen = status;
  };

  // set the value of the courseToTrack property
  @action
  setCourseToTrack = (course: Course) => {
    this.courseToTrack = course;
  }

  // set the value of the trackingMethodFormOpen property
  @action
  setTrackingMethodFormOpen = (status: boolean) => {
    this.trackingMethodFormOpen = status;
  };

  // set the value of the trackingMethodFormDone property
  @action
  setTrackingMethodFormDone = (value: string) => {
    this.trackingMethodFormDone = value;
  };

  // set the value of the waitingForSomething property
  @action
  setWaitingForSomething = (msg: string) => {
    this.waitingForSomething = msg;
  };

  // set the value of the pendingPreview property
  @action
  setPendingReview = (status: boolean) => {
    this.trekInfo.pendingReview = status;
  };

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  // change the current group
  getDifferentGroup = () => {
    this.props.groupSvc.getGroupSelection(this.setRadioPickerOpen, this.trekInfo.group, 'Select A Group',
                                        false, TREKLOG_FILENAME_REGEX)
    .then((newGroup) => {
      this.trekInfo.setTrekLogGroupProperties(newGroup)
      .then((result) => {
        if(result === RESP_OK){
          this.fS.clearGroupList();
        }
      })
    })
    .catch(() =>{ 
    })
  }

  // // Called when GPS receives a data point
  gotPos = (location: Location) => {
    if (
      !(this.trekInfo.limitsActive && this.trekInfo.limitTrekDone) &&
      this.logSvc.addPoint(location)
    ) {
      if (
        this.trekInfo.distLimit &&
        this.trekInfo.trekDist > this.trekInfo.distLimit
      ) {
        this.trekInfo.limitTrekDone = true;
        this.stopLimitedTrek();
      }
      if (this.trekInfo.pointList.length === 1) {
        requestAnimationFrame(() => {
          this.logSvc.setLayoutOpts("Current");
        });
        if (this.trekInfo.timeLimit !== 0 || this.trekInfo.distLimit !== 0) {
          this.giveVibrationStartSignal();
        }
      }
    }
  };

  // Start the logging process, timer starts when 1st GPS point recieved
  startLogging = () => {
    this.logSvc.startTrek();
    this.trekInfo.setSpeedDialZoomedIn(true);
    this.trekInfo.updateShowSpeedStat('speedNow');
    this.logSvc.startPositionTracking(this.gotPos); // this sets minPointDist and starts geolocation
  };

  // Stop the logging process. If there is something to save, confirm intentions with the user
  stopLogging = () => {
    let noPts = this.trekInfo.pointListEmpty() && !this.trekInfo.resObj;
    let saveText = noPts ? "Abort" : "Save";
    let discardText = noPts ? " has been aborted." : " has been discarded.";

    // Confirm user wants to save/discard this trek then take appropriate action.
    this.trekInfo.setSaveDialogOpen(true);
    this.props.modalSvc
      .simpleOpen({
        heading: saveText + " " + this.trekInfo.type,
        content:
          "Do you want to " +
          saveText.toLowerCase() +
          " this " +
          this.trekInfo.type +
          "?",
        cancelText:
          !this.trekInfo.limitsActive || !this.trekInfo.limitTrekDone
            ? "CANCEL"
            : "",
        deleteText: noPts ? undefined : "DISCARD",
        okText: saveText.toUpperCase(),
        headingIcon: this.trekInfo.type,
        dType: CONFIRM_INFO,
      })
      .then(resp => {
        this.trekInfo.setSaveDialogOpen(false);
        this.logSvc.stopTrek();
        this.finalizeTrek();
        if (resp === "SAVE" && this.trekInfo.pointList.length !== 0) {
          this.willSaveTrek();
          this.glS.shutDownGeolocation();
        } else {
          // DISCARD or ABORT
          this.abortLogging(discardText);
        }
      })
      .catch(() => {
        // CANCEL, DO NOTHING
        this.trekInfo.setSaveDialogOpen(false);
      });
  };

  abortLogging = discardText => {
    this.glS.shutDownGeolocation();
    this.props.storageSvc.removeRestoreObj();
    this.trekInfo.resObj = undefined;
    this.trekInfo.setLimitsActive(false);
    this.discardTrek(true);
    this.props.toastSvc.toastOpen({
      tType: "Success",
      content: this.trekInfo.type + discardText
    });
    this.trekInfo.setShowMapInLog(false);
  };

  // logging has ended, shut down Geolocation and update UI
  finalizeTrek = () => {
    this.trekInfo.limitTrekDone = false;
    this.trekInfo.setTimeLimitInfo({ value: 0, units: this.trekInfo.units });
    this.trekInfo.setDistLimitInfo({ value: 0, units: this.trekInfo.units });
  };

  // Called when user chooses to save the trek log
  willSaveTrek = () => {
    this.setPendingReview(true);
    this.trekInfo.setLimitsActive(false);
    if(this.trekInfo.type === TREK_TYPE_HIKE){
      this.setWaitingForSomething('Retrieving Elevation Data...');
      this.trekInfo
        .setElevationProperties() // call Elevation API to get elevations
        .then(() => {
          this.getWeather();
        })
        .catch((err) => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: "Error retrieving elevation data.\n" + err
          });
          this.getWeather();
        });
    } else {
      this.getWeather();
    }
  };

  // call the weather service to get the weather conditions
  getWeather = () => {
    let loc = this.trekInfo.pointList[0].l;

    this.setWaitingForSomething('Retrieving Weather Data');
    this.props.weatherSvc
      .getWeatherData({ type: "W", pos: { latitude: loc.a, longitude: loc.o } })
      .then(data => {
        this.trekInfo.updateConditions(data);
        this.setWaitingForSomething('');
        // get the trek label
        this.setTrekLabel();
      })
      .catch(() => {
        this.trekInfo.updateConditions(undefined);
        this.setWaitingForSomething('');
        // get the trek label
        this.setTrekLabel();
      });
  };

  // open the label/notes form for the user
  setTrekLabel = () => {
    this.logSvc
      .editTrekLabel(true) // denote new trek
      .then(() => {
        this.checkCourseAffiliation();
      })
      .catch(() => {
        this.checkCourseAffiliation();
      });
  };

  // check for an affiliation with a course
  checkCourseAffiliation = () => {
    let tObj = this.trekInfo.trackingObj;
    let sObj = this.trekInfo.getSaveObj();
    if (tObj) {
      // add an effort entry to the course
      this.addToCourseEfforts(tObj.courseName, sObj, tObj.method, tObj.goalValue);
    } else {
      let courseName = this.cS.checkForCourseMatch(sObj);
      // match found, prompt user to add effort to course
      if(courseName !!== ''){
        this.props.modalSvc
          .simpleOpen({
            heading: "Add Course Effort",
            content: "Add this " + this.trekInfo.type + " to course:\n" + courseName + " ?",
            cancelText: "NO",
            okText: "YES",
            headingIcon: "Course",
            dType: CONFIRM_INFO
          })
          .then(() => {
            this.addToCourseEfforts(courseName, sObj, 'courseTime', 0);
          })
          // user selected NO
          .catch(() => {
            this.saveAndNotify();
          });
      } else {
       // does not match any course
       this.saveAndNotify()
      }
    }
  }

  addToCourseEfforts = (courseName: string, trek: TrekObj, method: CourseTrackingMethod, goalValue: number) => {
    this.cS.addCourseEffort(courseName, trek, method, goalValue)
    .then((result) => {
      switch(result.resp){
        case MSG_NEW_COURSE_RECORD:
          this.cS.celebrateNewCourseRecord(result.resp, courseName, result.info);
          break;
        case RESP_BAD_LENGTH:
        case RESP_NO_MATCH:
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: MSG_LINK_NOT_ADDED + result.resp + 'for course: ' + courseName
          });
          break;
        case RESP_OK:
        default:
          this.props.toastSvc.toastOpen({
            tType: "Success",
            content: MSG_LINK_ADDED + this.trekInfo.type + 
                     ' added as effort for:\n' + 'course: ' + courseName,
            time: 5000
          });
      }
      this.saveAndNotify();
    })
    .catch((err) => alert(err))
  }

  saveAndNotify = () => {
    this.saveTrek();
    this.props.storageSvc.removeRestoreObj();
    this.trekInfo.resObj = undefined;
    this.logSvc.setLayoutOpts("All");
    this.openGoalNotification();
    this.trekInfo.setSpeedDialZoomedIn(false);
  }

  // user is finished with post-log review
  reviewFinished = () => {
    this.trekInfo.updateTrekSaved(false);
    this.setPendingReview(false);
    this.discardTrek();
    this.trekInfo.setShowMapInLog(false);
  };

  // Open the Trek Limits form using TIME parameters
  openTimeLimitsForm = () => {
    let units = ["minutes", "hours"];
    this.limitProps = {
      heading: "Stop after a Time",
      headingIcon: "TimerSand",
      onChangeFn: this.trekInfo.setTimeLimitInfo,
      label: "Auto stop " + this.trekInfo.type + " after how long?",
      placeholderValue: this.trekInfo.lastTime.toString(),
      units: units,
      defaultUnits: this.trekInfo.lastTimeUnits,
    };
    this.trekInfo.limitsCloseFn = this.startTimedLogging;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using DISTANCE parameters
  openDistLimitsForm = () => {
    let units = [
      "meters",
      DIST_UNIT_LONG_NAMES[this.trekInfo.measurementSystem]
    ];
    this.limitProps = {
      heading: "Stop after a Distance",
      headingIcon: "CompassMath",
      onChangeFn: this.trekInfo.setDistLimitInfo,
      label: "Auto stop " + this.trekInfo.type + " after what distance?",
      placeholderValue: this.trekInfo.lastDist.toString(),
      units: units,
      defaultUnits: this.trekInfo.lastDistUnits,
    };
    this.trekInfo.limitsCloseFn = this.startDistLogging;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using HIKE parameters
  openPackWeightForm = () => {
    let units = [WEIGHT_UNIT_CHOICES[this.trekInfo.measurementSystem]];
    let phVal = this.trekInfo.lastPackWeight;
    phVal =
      phVal !== undefined
        ? phVal
        : this.trekInfo.convertWeight(this.trekInfo.packWeight, true);
    this.limitProps = {
      heading: "Backpack Weight",
      headingIcon: "Hike",
      onChangeFn: this.trekInfo.setPackWeightInfo,
      label: "Weight of your backpack:",
      placeholderValue: phVal.toString(),
      units: units,
      defaultUnits: units[0],
    };
    this.trekInfo.limitsCloseFn = this.startHike;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using TYPE SELECT parameters
  openTypeSelectForm = () => {
    this.oldTrekType = this.trekInfo.type;
    this.limitProps = {
      heading: "Trek Type",
      headingIcon: "BulletedList",
      onChangeFn: this.trekInfo.updateType,
      okText: "Auto",
      label: "Select trek type for new log:",
      typeSelect: true
    };
    this.trekInfo.limitsCloseFn = this.selectTrekType;
    this.setLimitFormOpen(true);
  };

  // Start the logging process for a TIME limited trek.
  @action
  startTimedLogging = (start: boolean) => {
    this.trekInfo.lastTimeUnits = this.trekInfo.units;
    if (start) {
      this.trekInfo.setLimitsActive(true);
      this.trekInfo.lastTime = this.trekInfo.timeLimit;
      this.trekInfo.timeLimit *=
        this.trekInfo.units === "minutes" ? 60000 : 3600000; // convert to miliseconds
      alert(this.trekInfo.timeLimit)
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Start the logging process for a DISTANCE limited trek.
  @action
  startDistLogging = (start: boolean) => {
   if (start) {
      this.trekInfo.setLimitsActive(true);
      this.trekInfo.lastDist = this.trekInfo.distLimit;
      this.trekInfo.lastDistUnits = this.trekInfo.units;
      if (this.trekInfo.units !== "meters") {
        //km or mi?
        this.trekInfo.setDistLimit(
          this.trekInfo.distLimit *
            (this.trekInfo.measurementSystem === "US" ? M_PER_MILE : 1000)
        ); // convert to meters
      }
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Start the logging process for a Hike.
  startHike = (start: boolean) => {
    if (start) {
      this.trekInfo.lastPackWeight =
        this.trekInfo.measurementSystem === "US"
          ? Math.round(this.trekInfo.packWeight * LB_PER_KG)
          : this.trekInfo.packWeight;
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Open the Tracking method form
  openTrackingMethodForm = () => {
    this.trekInfo.limitsCloseFn = this.startTrekWithTracking;
    this.setTrackingMethodFormOpen(true);
  };

  // Start the logging process tracking a prior effort.
  startTrekWithTracking = (start: boolean) => {
    this.setLockNavMenu(false);
    if (start) {
      this.trekInfo.trackingCourse = this.courseToTrack;
      this.startLogging()
      this.setTrackingMethodFormOpen(false);
      this.logSvc.setLayoutOpts("All");
      this.trekInfo.setSpeedDialZoomedIn(false);
      this.showMap();
    } else {
      this.setTrackingMethodFormOpen(false);
      setTimeout(() => {
        this.setCourseToTrack(undefined);
      }, 500);
    }
  }

  // Vibrate a start warning sequence then a longer single vibration from 2-3 seconds later to indicate START.
  giveVibrationStartSignal = () => {
    this.props.toastSvc.toastOpen({
      tType: "Success",
      content: "Start " + TREK_VERBS_OBJ[this.trekInfo.type]
    });
    Vibration.vibrate(START_VIB, false);
    if (this.trekInfo.timeLimit !== 0) {
      this.startLimitTimer();
    }
  };

  // Start a timer to watch for the timeLimit to expire on a timed Trek
  startLimitTimer = () => {
    this.trekInfo.limitTimerId = window.setInterval(() => {
      // check for time of last point being after the time limit (seconds)
      let lastPt = this.trekInfo.lastPoint();
      if (
        !this.trekInfo.limitTrekDone &&
        lastPt && lastPt.t >= this.trekInfo.timeLimit
      ) {
        this.trekInfo.limitTrekDone = true;
        this.stopLimitedTrek();
      }
    }, 1000);
  };

  // Time/Distance limit has been reached. Inform user it is time to stop and stop logging.
  stopLimitedTrek = () => {
    this.stopLogging();
    this.props.toastSvc.toastOpen({
      tType: "Error",
      content: "Stop " + TREK_VERBS_OBJ[this.trekInfo.type],
    });
    Vibration.vibrate(STOP_VIB, false);
  };

  // Save to database if necessary then mark trek as saved
  saveTrek = () => {
    this.trekInfo.computeCalories();
    this.trekInfo.updateTrekSaved(true); // denote save issue done
    this.trekInfo
      .saveTrek(this.trekInfo.getSaveObj(),'add')
      .then(() => {
        if(this.fS.isInGroupList(this.trekInfo.group)){
          this.trekInfo.updateTimeframe('TWeek');
        }
        this.props.toastSvc.toastOpen({
          tType: "Success",
          content: this.trekInfo.type + " has been saved."
        });
      })
      .catch(() => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: "Error saving " + this.trekInfo.type + "."
        });
      });
  };

  discardTrek = (aborting = false) => {
    if(aborting) {
      this.props.storageSvc.removeTrekImageFiles(this.trekInfo.trekImages)
    }
    this.logSvc.resetTrek();
    this.trekInfo.clearTrek();
    this.trekInfo.clearTrackingItems();
  };

  openGoalNotification = () => {
    let plural;
    let msg;
    let itemList = [];

    this.props.goalsSvc
      .checkTrekAgainstGoals(this.trekInfo.getSaveObj(), false)
      .then((goals: { goal: GoalObj; item: GoalDisplayItem }[]) => {
        if (goals.length) {
          plural = goals.length > 1 ? "s" : "";
          msg =
            "The " +
            this.trekInfo.type +
            " you just completed\n achieves your goal" +
            plural +
            " of:\n";
          goals.forEach(gli => {
            itemList.push({
              goalStmt: this.props.goalsSvc.formatGoalStatement(gli.goal)
            });
          });
          this.props.modalSvc.goalNoticeOpen({
            heading: "Goal" + plural + " Achieved!",
            content: msg,
            itemList: itemList,
            allowOutsideCancel: true,
            okText: "OK"
          })
          .then(() => {})
          .catch(() => {})
        }
      })
      .catch(() => {}); // no applicable goals found or met
  };

  // display the map view of the trek.  Call SelectedTrek if logging finished
  showMap = () => {
    // if (this.trekInfo.trekSaved){     
    //   this.props.navigation.navigate("SelectedTrek", {
    //     title:
    //       this.props.utilsSvc.formattedLocaleDateAbbrDay(this.trekInfo.date) +
    //       "  " +
    //       this.trekInfo.startTime,
    //     icon: this.trekInfo.type,
    //     switchSysFn: this.trekInfo.switchMeasurementSystem,
    //   });
    // } else {
      this.trekInfo.setShowMapInLog(true);
      this.props.navigation.navigate("LogTrekMap");
    // }
  }

  selectTrekType = (status: boolean) => {
    this.closeLimitForm();
    if(status){
      this.props.navigation.setParams({ icon: this.trekInfo.type });
    } else {
      this.trekInfo.updateType(this.oldTrekType);
    }
  };

  // prepare to track performance against prior effort on this course
  setToTrackCourse = () => {
    this.setLockNavMenu(true);
    this.cS.getCourseSelection(this.setCoursePickerOpen, '#none', 'Select Course To Challenge', false)
    .then((sel) => {
      if(sel && sel !== '#none'){            // will return given item if user hits OK with no valid selection
        this.cS.getCourse(sel)
        .then((course : Course) => {
          this.setCourseToTrack(course);
          this.openTrackingMethodForm();
        })
        .catch((err) => {
          this.setLockNavMenu(false);
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: 'Error reading course: ' + err 
          });
        })
      } else {
        this.setLockNavMenu(false);
      }
    })
    // cancel or no list
    .catch((resp) => {
      this.setLockNavMenu(false);
      switch(resp){
        case MSG_NO_LIST:
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: resp + 'No nearby courses found.',
          });
        case RESP_CANCEL:
        default:
      }
    })    
  }

  // respond to action from controls
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "StartU":
          this.setShowOptions(false);
          this.startLogging();
          break;
        case "StartT":
          this.setShowOptions(false);
          this.openTimeLimitsForm();
          break;
        case "Hike":
        case "StartH":
          this.setShowOptions(false);
          this.openPackWeightForm();
          break;
        case "StartD":
          this.setShowOptions(false);
          this.openDistLimitsForm();
          break;
        case "StartC":
          this.setShowOptions(false);
          this.setToTrackCourse();
          break;
        case "TType":
          this.setShowOptions(false);
          this.openTypeSelectForm();
          break;
        case "Stop":
          this.stopLogging();
          break;
        case "Courses":
        case "Summary":
        case "Goals":
        case "Settings":
          this.props.navigation.navigate({routeName: val, key: 'Key-' + val});
          break;
        case "ReviewDone":
          this.reviewFinished();
          break;
        case "TrackingDone":
          this.setTrackingMethodFormDone("Dismiss");
          break;
        case "TrackingContinue":
          this.setTrackingMethodFormDone("Close");
          break;
        case "ShowMap":
          this.showMap();
          break;
        case "Conditions":
          this.props.navigation.navigate("Conditions");
          break;
        case "UseCamera":
          this.props.navigation.navigate('Images', {cmd: 'camera'});
          break;
        case "Options":
          this.toggleShowOptions();
          break;
        case 'Download':
          this.downloadTreks();
          break;
        case 'Upload':
          this.uploadTreks();
          break;
        default:
      }
    });
  };

  // let the user (me) specify some groups to download treks to from MongoDb
  downloadTreks = () => {
    this.getGroupSelections()
    .then((groups) => {
      this.props.storageSvc.readTreksFromMongoDB(groups)
      .then((msg : string) => {
        this.trekInfo.readAllTreks(this.trekInfo.group)
        .then(() => {
          this.props.toastSvc.toastOpen({
            tType: "Success",
            content: msg,
          })
        })
        .catch((err) => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: 'Error reading trek list for ' + this.trekInfo.group + '\n' + err,
          });
        })
      })
      .catch(() => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: 'Trek download error',
        });
      })
    })
    .catch(() => {})          // no selection
  }

  // let the user (me) specify some groups to upload treks from to MongoDb
  uploadTreks = () => {
    this.getGroupSelections()
    .then((groups) => {
      this.props.storageSvc.writeTreksToMongoDB(groups)
      .then((msg : string) => {
        this.props.toastSvc.toastOpen({
          tType: "Success",
          content: msg,
        })
      })
      .catch(() => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: 'Trek upload error',
        });
      })
    })
    .catch(() => {})          // no selection
  }


  // format the title for the default log screen.
  // change according to the activity and speed
  formatBigTitle = (startOk: boolean, reviewOk): string => {
    let label = "";

    if (startOk) {
      label = "Start " + TREK_TYPE_LABELS[this.trekInfo.type];
    } else {
      if (reviewOk) {
        label = "Finished";
      }
    }
    return label;
  };

  // get group selections for Upload/Download
  getGroupSelections = () : Promise<any> => {
    let groupList = []

    return new Promise((resolve, reject) => {
      this.props.groupSvc.getGroupSelections(
        this.setCheckboxPickerOpen,
        groupList,
        "Select Groups for Download"
      )
      .then((selections) => resolve(selections))
      .catch(() => reject("NO_SELECTION"))
    })
  };

  // set up the items for the pre-trek actions speedDial
  // allow user to change trek type and set a time or distance limit
  getSdTypeActions = (): SpeedDialItem[] => {
    let type = this.trekInfo.type;
    let actions: SpeedDialItem[] = [];

    if (type !== TREK_TYPE_WALK) {
      actions.push({ icon: "Walk", label: "Walk", value: "Walk" });
    }
    if (type !== TREK_TYPE_RUN) {
      actions.push({ icon: "Run", label: "Run", value: "Run" });
    }
    if (type !== TREK_TYPE_BIKE) {
      actions.push({ icon: "Bike", label: "Bike", value: "Bike" });
    }
    if (type !== TREK_TYPE_HIKE) {
      actions.push({ icon: "Hike", label: "Hike", value: "Hike" });
    }
    if (type !== TREK_TYPE_BOARD) {
      actions.push({ icon: "Board", label: "Board", value: "Board" });
    }
    if (type !== TREK_TYPE_DRIVE) {
      actions.push({ icon: "Drive", label: "Drive", value: "Drive" });
    }

    return actions;
  };

  render() {
    const tI = this.trekInfo;
    const numPts = tI.trekPointCount;
    const bgImage = tI.haveBackgroundImage();
    const formOpen = this.limitFormOpen || this.trackingMethodFormOpen || this.coursePickerOpen ||
                      this.radioPickerOpen;
    const stopOk =
      !this.waitingForSomething &&
      (tI.timerOn ||
        tI.logging ||
        tI.limitsActive);
    const startOk =
      !stopOk && !tI.pendingReview;
    const reviewOk =
      !stopOk && tI.pendingReview;
    const { controlsArea, navItem, navIcon, bigNavItemWithLabel, navItemWithLabel, navItemLabel,
            fontLight } = this.uiTheme;
    const {
      highTextColor,
      navIconColor,
      trekLogGreen,
      trekLogRed,
      navItemBorderColor,
      pageBackground,
      pageBackgroundFilm,
      disabledTextColor,
      almostTransparent,
    } = this.uiTheme.palette[this.props.trekInfo.colorTheme];
    const lightTheme = this.props.trekInfo.colorTheme === COLOR_THEME_LIGHT;
    const navIconSize = NAV_ICON_SIZE;
    const bigButtonSize = 150;
    const bigIconSize = 64;
    const bigTitle = this.formatBigTitle(startOk, reviewOk);
    const iWidth = Dimensions.get('window').width;
    const iHeight = Dimensions.get('window').height;
    const bgColor = bgImage ? pageBackgroundFilm : pageBackground;
    const nlColor = (bgImage && lightTheme) ? highTextColor : navIconColor
    const noMenu = formOpen || this.lockNavMenu;
    const trackingMarker = tI.trackingMarkerLocation;

    let navMenuItems;
    if (stopOk){    
      navMenuItems =   
      [ {icon: 'Stop', color: trekLogRed, label: 'Stop', value: 'Stop'},
      {icon: 'Camera', label: 'Use Camera', value: 'UseCamera'},
      {icon: 'Map', label: 'View Map', value: 'ShowMap'}];
    } else {
      if (reviewOk){    
        navMenuItems =   
        [ {icon: 'ArrowBack', label: 'Done', value: 'ReviewDone'},
        {icon: 'Map', label: 'View Map', value: 'ShowMap'}];
      } else {
        navMenuItems = 
        [ {label: 'Logging Options', 
          submenu: [{icon: tI.type, label: 'Change Type', value: 'TType'},
                    {icon: 'Course', label: 'Challenge Course', value: 'StartC'},
                    {icon: 'TimerSand', label: 'Limit Time', value: 'StartT'},
                    {icon: 'CompassMath', label: 'Limit Distance', value: 'StartD'}
                  ]},
          {icon: 'Pie', label: 'Activity', value: 'Summary'},
          {icon: 'Course', label: 'Courses', value: 'Courses'},
          {icon: 'Target', label: 'Goals', value: 'Goals'},
          {icon: 'Settings', label: 'Settings', value: 'Settings'},
          {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'},  
          // {icon: 'Download', label: 'Download Treks', value: 'Download'},
          // {icon: 'Upload', label: 'Upload Treks', value: 'Upload'}
        ]
      }
    }

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: bgColor,
      },
      caAdjust: {
        height: BIG_CONTROLS_HEIGHT,
        backgroundColor: bgColor,
        alignItems: "flex-end",
        paddingBottom: 5,
      },
      speedDialTrigger: {
        backgroundColor: bgImage ? almostTransparent : pageBackground,
        borderWidth: 0,
      },
      bigTitle: {
        marginTop: stopOk ? -15 : 25,
        fontSize: startOk ? 60 : 50,
        fontFamily: fontLight,
        color: disabledTextColor
      },
      bigStart: {
        height: bigButtonSize,
        width: bigButtonSize,
        backgroundColor: bgColor,
        borderWidth: 2,
        borderRadius: bigButtonSize / 2,
      },
      navButton: {
        ...navItemWithLabel,
        backgroundColor: bgImage ? almostTransparent : "transparent",
      },
      bigNavButton: {
        ...bigNavItemWithLabel,
        backgroundColor: bgImage ? almostTransparent : "transparent",
      },
      navLabelColor: {
        color: nlColor,
      },
      trekStats: {
        flex: 1,
        marginTop: trackingMarker ? TRACKING_STATUS_BAR_HEIGHT + 15 : 0,
        justifyContent: "space-around",
        alignItems: "center",
      },
      trackingStatusDivider: {
        flex: 1,
        marginHorizontal: 20,
        marginBottom: 25,
        borderTopWidth: 2,
        borderColor: disabledTextColor,
        borderStyle: "solid",
      },
      pageTitleArea: {
        marginBottom: 0, 
        marginTop: 15,
      }
    });

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        locked={noMenu}
        open={this.openNavMenu}> 
        <View style={[styles.container]}>
          <TrekLogHeader
            logo
            icon="*"
            actionButtons={this.headerActions}
            // backgroundColor={bgImage ? pageBackgroundFilm : headerBackgroundColor}
            // textColor={bgImage ? mediumTextColor : headerTextColor}
            position="absolute"
            // borderBottomColor={bgImage ? dividerColor : headerBorderColor}
            openMenuFn={this.openMenu}
            disableMenu={noMenu}
          />
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
          <RadioPicker pickerOpen={this.coursePickerOpen}/>
          <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
          {tI.waitingForSomething && (
            <Waiting msg={tI.waitingMsg} />
          )}
          {this.courseToTrack && 
            <TrackingMethodForm
              open={this.trackingMethodFormOpen}
              header="Course Challenge Method"
              title={'Challenge ' + this.courseToTrack.name + ' Using:'}
              inMethod={tI.trackingMethod || 'courseTime'}
              icon="Course"
              onChangeFn={tI.setTrackingValueInfo}
              course={this.courseToTrack}
            />
          }
          <TrekLimitsForm
            open={this.limitFormOpen}
            limits={this.limitProps}
          />
          {bgImage && tI.currentBackground === 0 &&
            <Image source={require('../src/assets/desert1a.jpg')} 
              style={{width: iWidth, height: iHeight}}
            />
          }
            <View
              style={[
                styles.container, (stopOk || reviewOk) ?
                { top: HEADER_HEIGHT, bottom: BIG_CONTROLS_HEIGHT, alignItems: "center" } : 
                {top: HEADER_HEIGHT, alignItems: "center"}
              ]}
            >
              <PageTitle 
                colorTheme={this.trekInfo.colorTheme}
                icon={tI.type}
                iconColor={TREK_TYPE_COLORS_OBJ[tI.type]}
                iconFn={this.setActiveNav}
                iconFnArg={'TType'}
                titleText={tI.type}
                iconFnDisabled={!startOk}
                style={pageTitleFormat}
                groupName={tI.group || "None"}
                setGroupFn={startOk ? this.getDifferentGroup : undefined}
              />
              {(startOk || reviewOk) && !trackingMarker &&
                <Text style={styles.bigTitle}>{bigTitle}</Text>
              }
              {(numPts > 0 && trackingMarker) &&
                <TrackingStatusBar
                  trackingDiffDist={tI.trackingDiffDist}
                  trackingDiffDistStr={tI.trackingDiffDistStr}
                  trackingDiffTime={tI.trackingDiffTime}
                  trackingDiffTimeStr={tI.trackingDiffTimeStr}
                  trackingHeader={tI.trackingObj ? tI.trackingObj.challengeTitle : undefined}
                  trackingTime={tI.trackingObj ? tI.trackingObj.goalTime : undefined}
                  barTop={45}
                  logOn={true}
                />
              }
              {!tI.logging && !reviewOk && (
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <IconButton
                    iconSize={bigIconSize}
                    icon="Play"
                    disabled={formOpen}
                    style={{...navItem, ...styles.bigStart}}
                    borderColor={trekLogGreen}
                    iconStyle={navIcon}
                    color={navIconColor}
                    onPressFn={this.setActiveNav}
                    onPressArg="StartU"
                  />
                </View>
              )}
              <View style={styles.trekStats}>
                {(numPts > 0 && trackingMarker) &&
                  <View style={{flexDirection: 'row'}}>
                    <View style={styles.trackingStatusDivider}/>
                  </View>
                }
                {(stopOk || reviewOk) && numPts > 0 && (
                  <TrekStats 
                    logging={stopOk} 
                    trekType={tI.type} 
                    bgImage={bgImage} 
                    format='big'
                  />
                )}
              </View>
            </View>
          {stopOk && (
            <View style={[controlsArea,styles.caAdjust]}>
              {numPts > 0 && (
                <IconButton
                  iconSize={navIconSize}
                  icon="Camera"
                  style={styles.navButton}
                  iconStyle={navIcon}
                  borderColor={navItemBorderColor}
                  color={navIconColor}
                  onPressFn={this.setActiveNav}
                  onPressArg="UseCamera"
                  label="Camera"
                  labelStyle={[navItemLabel, styles.navLabelColor]}
                  />
              )}
              <IconButton
                iconSize={BIG_NAV_ICON_SIZE}
                icon="Stop"
                style={styles.bigNavButton}
                borderColor={trekLogRed}
                iconStyle={navIcon}
                color={trekLogRed}
                onPressFn={this.setActiveNav}
                onPressArg="Stop"
                label="Stop"
                labelStyle={[navItemLabel, styles.navLabelColor]}
              />
              {numPts > 0 && (
                <IconButton
                  iconSize={navIconSize}
                  icon="Map"
                  style={styles.navButton}
                  iconStyle={navIcon}
                  borderColor={navItemBorderColor}
                  color={navIconColor}
                  onPressFn={this.setActiveNav}
                  onPressArg="ShowMap"
                  label="Map"
                  labelStyle={[navItemLabel, styles.navLabelColor]}
                  />
              )}
            </View>
          )}
          {reviewOk && (
            <View style={[controlsArea, styles.caAdjust]}>
              <IconButton
                iconSize={navIconSize}
                icon="ArrowBack"
                style={styles.navButton}
                iconStyle={navIcon}
                borderColor={navItemBorderColor}
                color={navIconColor}
                onPressFn={this.setActiveNav}
                onPressArg="ReviewDone"
                label="Done"
                labelStyle={[navItemLabel, styles.navLabelColor]}
              />
              <IconButton
                iconSize={navIconSize}
                icon="Map"
                style={styles.navButton}
                iconStyle={navIcon}
                borderColor={navItemBorderColor}
                color={navIconColor}
                onPressFn={this.setActiveNav}
                onPressArg="ShowMap"
                label="Map"
                labelStyle={[navItemLabel, styles.navLabelColor]}
              />
            </View>
          )}
        </View>
      </NavMenu>
    );
  }
}

export default LogTrek;
