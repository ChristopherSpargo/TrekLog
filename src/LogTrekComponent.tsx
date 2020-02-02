import React from "react";
import { Component } from "react";
import {
  View,
  StyleSheet,
  Vibration,
  Text,
  BackHandler,
  StatusBar
} from "react-native";
import { NavigationActions, StackActions } from "react-navigation";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { Location } from "@mauron85/react-native-background-geolocation";

import {
  TrekType,
  TREK_VERBS_OBJ,
  START_VIB,
  STOP_VIB,
  DIST_UNIT_LONG_NAMES,
  WEIGHT_UNIT_CHOICES,
  TREK_TYPE_LABELS,
  TREK_TYPE_HIKE,
  MSG_NO_LIST,
  MSG_LINK_ADDED,
  MSG_LINK_NOT_ADDED,
  RESP_NO_MATCH,
  RESP_BAD_LENGTH,
  RESP_CANCEL,
  MSG_NEW_COURSE_RECORD,
  RESP_OK,
  MSG_NONE_NEARBY,
} from "./MainSvc";
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
         TREKLOG_FILENAME_REGEX, TRACKING_STATUS_BAR_HEIGHT, 
         TREK_TYPE_COLORS_OBJ, 
         TREK_TYPE_DIM_COLORS_OBJ,
         BLACKISH} from "./App";
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
import { HelpSvc, HELP_LOG_STAT_VIEW } from "./HelpService";
import NavMenu from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import TrackingStatusBar from './TrackingStatusBar';
import { MainSvc } from "./MainSvc";
import { TrekSvc } from "./TrekSvc";

const pageTitleFormat = {marginBottom: 0, marginTop: 15};
const goBack = NavigationActions.back();

@inject(
  "mainSvc",
  "trekSvc",
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
  "helpSvc",
  "uiTheme"
)
@observer
class LogTrek extends Component<
  {
    toastSvc?: ToastModel;
    trekSvc?: TrekSvc;
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
    helpSvc?: HelpSvc;
    uiTheme?: any;
    mainSvc?: MainSvc;
    navigation?: any;
  },
  {}
> {
  @observable limitFormOpen: boolean;
  @observable trackingMethodFormOpen: boolean;
  @observable trackingMethodFormDone: string;
  @observable checkboxPickerOpen;
  @observable radioPickerOpen;
  @observable coursePickerOpen;
  @observable courseToTrack: Course;
  @observable openNavMenu : boolean;
  @observable lockNavMenu;

  _didFocusSubscription;
  _willBlurSubscription;

  mS = this.props.mainSvc;
  tS = this.props.trekSvc;
  glS = this.props.locationSvc;
  fS = this.props.filterSvc;
  cS = this.props.courseSvc;
  logSvc = this.props.loggingSvc;
  uiTheme = this.props.uiTheme;
  logState = this.logSvc.logState;
  newTrek = this.logState.trek;
  activeNav = "";
  limitProps: LimitsObj = {} as LimitsObj;
  optionsTimerID : number;
  oldTrekType : TrekType;
  headerActions = [];
      
  constructor(props) {
    super(props);
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
    this.initializeObservables();
    this.logSvc.updateGroupProperties();
    this.props.navigation.setParams({ checkBackButton: this.checkBackButton });
    let ro = this.mS.resObj;
    if (ro !== undefined){
      this.logState.restoreTrekLogState(ro)
      .then(() => {
        this.mS.setAppReady(true);
        this.mS.setDataReady(true);
        this.logSvc.smoothTrek();
        if (ro.logState.timerOn) {
          this.logSvc.startTrekTimer();
        }
        if (ro.logState.timeLimit) {
          this.startLimitTimer();
        }
        if (ro.logState.trackingObj){
          this.logSvc.restartTrackingMarker(ro.logState.trackingObj)
        }
        this.logSvc.watchGeolocationPosition(this.gotPos, false);
        if (ro.logState.showMapInLog) {
          this.props.navigation.navigate("LogTrekMap");
        }
        if (ro.logState.saveDialogOpen) {
          this.stopLogging();
        } else {
          if (ro.mainState.trekLabelFormOpen) {
            this.setPendingReview(true);
            this.setTrekLabel();
          } else {
            if (ro.logState.cancelDialogOpen) {
              this.checkBackButton();
            }
          }
        }
      })
      .catch((err) => alert(err))
    }
    else {
      // nothingToRestore
      this.logSvc.setLoggingState('Not Logging');
      this.logSvc.clearTrackingItems();
      this.props.helpSvc.pushHelp(HELP_LOG_STAT_VIEW, true);
    };
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
    this.logSvc.updateTrekSaved(false);
    this.discardTrek();
    this.logSvc.stopTrekTimer();
    this.logSvc.stopLimitTimer();
    this.closeLimitForm();
    this.logSvc.setLoggingState('Not Logging');
    this.mS.setAppReady(true);
    this.props.helpSvc.popHelp(true);
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.limitFormOpen = false;
    this.trackingMethodFormOpen = false;
    this.trackingMethodFormDone = "";
    this.mS.setWaitingForSomething();
    this.setCoursePickerOpen(false);
    this.setCheckboxPickerOpen(false);
    this.setRadioPickerOpen(false);
    this.setCourseToTrack(undefined);
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
    if (this.trackingMethodFormOpen || this.mS.trekLabelFormOpen) { return true; }
    if (!this.logState.showMapInLog && (this.logState.logging || this.logState.pendingReview)) {
      if (this.logState.saveDialogOpen) {
        return true;
      } // ignore back button if save dialog is open
      if (this.logState.pendingReview && this.logState.trekSaved) {
        this.reviewFinished();
        return true;
      }
      this.logSvc.setCancelDialogOpen(true);
      this.props.modalSvc
        .simpleOpen({
          heading: "Cancel Log",
          content: "CANCEL logging this " + this.newTrek.type + "?",
          cancelText: "NO",
          okText: "YES",
          headingIcon: this.newTrek.type,
          dType: CONFIRM_INFO
        })
        .then(() => {
          this.logSvc.setLoggingState('Aborting');
          this.logSvc.setCancelDialogOpen(false);
          this.logSvc.stopTrek();
          this.finalizeTrek();
          this.setPendingReview(false);
          this.abortLogging(" has been canceled.");
        })
        .catch(() => {
          this.logSvc.setCancelDialogOpen(false);
        });
      return true;
    } else {
      return false;
    }
  };

  init = () => {
    StatusBar.setHidden(true, "none");
    if (this.logState.loggingState === 'Request Stop'){
      this.stopLogging();
    } else {
      if (
        this.mS.appReady &&
        !this.mS.pendingInit &&
        !this.logState.logging &&
        !this.logState.pendingReview) {
          this.logSvc.resetTrek();
          this.tS.clearTrek(this.newTrek, false);
          this.logSvc.clearTrackingItems();
          this.logSvc.setDate();
          this.logSvc.setShowMapInLog(false);
      }
    }
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

  // set the open status of the coursePickerOpen component
  @action
  setCoursePickerOpen = (status: boolean) => {
    this.coursePickerOpen = status;
  };

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.mS.swapColorTheme();
  }

  setHeaderActions = () => {
    this.headerActions.push(
      { icon: 'YinYang', 
        style: {marginTop: 0}, actionFn: this.swapColorTheme});
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

  // set the value of the pendingPreview property
  @action
  setPendingReview = (status: boolean) => {
    this.logState.pendingReview = status;
  };

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  // change the current group
  getDifferentGroup = () => {
    this.props.groupSvc.getGroupSelection(this.setRadioPickerOpen, this.newTrek.group, 'Select A Group',
                                        false, TREKLOG_FILENAME_REGEX)
    .then((newGroup) => {
      this.mS.setTrekLogGroupProperties(newGroup, null, false)
      .then((result) => {
        this.logSvc.updateGroupProperties();
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
    if (!(this.logState.limitsActive && this.logState.limitTrekDone) &&
          this.logSvc.addPoint(location)) {
      if (this.logState.distLimit && this.newTrek.trekDist > this.logState.distLimit) {
        this.logState.limitTrekDone = true;
        this.stopLimitedTrek();
      }
      if (this.newTrek.pointList.length === 1) {
        requestAnimationFrame(() => {
          this.logSvc.setLayoutOpts("Current");
        });
        if (this.logState.timeLimit !== 0 || this.logState.distLimit !== 0) {
          alert(this.logState.timeLimit + '\n' + this.logState.distLimit)
          this.giveVibrationStartSignal();
        }
      }
    }
  };

  // Start the logging process, timer starts when 1st GPS point recieved
  startLogging = () => {
    this.logSvc.startTrek();
    this.logSvc.setLoggingState('Logging');
    this.mS.setSpeedDialZoomedIn(true);
    this.tS.updateShowSpeedStat(this.newTrek, 'speedNow');
    this.logSvc.startPositionTracking(this.gotPos); // this sets minPointDist and starts geolocation
  };

  // Stop the logging process. If there is something to save, confirm intentions with the user
  stopLogging = () => {
    let noPts = this.tS.pointListEmpty(this.newTrek) && !this.mS.resObj;
    let saveText = noPts ? "Abort" : "Save";
    let discardText = noPts ? " has been aborted." : " has been discarded.";

    // Confirm user wants to save/discard this trek then take appropriate action.
    this.logSvc.setLoggingState('Request Stop');
    this.logSvc.setSaveDialogOpen(true);
    this.props.modalSvc
      .simpleOpen({
        heading: saveText + " " + this.newTrek.type,
        content:
          "Do you want to " +
          saveText.toLowerCase() +
          " this " +
          this.newTrek.type +
          "?",
        cancelText:
          !this.logState.limitsActive || !this.logState.limitTrekDone
            ? "CANCEL"
            : "",
        deleteText: noPts ? undefined : "DISCARD",
        okText: saveText.toUpperCase(),
        headingIcon: this.newTrek.type,
        dType: CONFIRM_INFO,
      })
      .then(resp => {
        this.logSvc.setSaveDialogOpen(false);
        this.logSvc.setLoggingState('Stopping')
        this.logSvc.stopTrek();
        this.tS.updateShowSpeedStat(this.newTrek, 'speedAvg');
        this.finalizeTrek();
        if (resp === "SAVE" && this.newTrek.pointList.length !== 0) {
          this.willSaveTrek();
          this.logSvc.setLoggingState('Review');
          this.glS.shutDownGeolocation();
        } else {
          // DISCARD or ABORT
          this.logSvc.setLoggingState('Aborting');
          this.abortLogging(discardText);
        }
      })
      .catch(() => {
        // CANCEL, DO NOTHING
        this.logSvc.setLoggingState('Logging');
        this.logSvc.setSaveDialogOpen(false);
      });
  };

  abortLogging = (discardText: string) => {
    this.glS.shutDownGeolocation();
    this.props.storageSvc.removeRestoreObj();
    this.mS.resObj = undefined;
    this.logSvc.setLimitsActive(false);
    this.discardTrek();
    this.props.toastSvc.toastOpen({
      tType: "Success",
      content: this.newTrek.type + discardText
    });
    this.logSvc.setShowMapInLog(false);
  };

  // logging has ended, shut down Geolocation and update UI
  finalizeTrek = () => {
    this.logState.limitTrekDone = false;
    this.logSvc.setTimeLimitInfo({ value: 0, units: this.logState.units });
    this.logSvc.setDistLimitInfo({ value: 0, units: this.logState.units });
  };

  // Called when user chooses to save the trek log
  willSaveTrek = () => {
    this.setPendingReview(true);
    this.logSvc.setLimitsActive(false);
    if(this.newTrek.type === TREK_TYPE_HIKE){
      this.mS.setWaitingForSomething("ElevationData");
      this.tS
        .setElevationProperties(this.newTrek) // call Elevation API to get elevations
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
    let loc = this.newTrek.pointList[0].l;

    this.mS.setWaitingForSomething("Conditions");
    this.props.weatherSvc
      .getWeatherData({ type: "W", pos: { latitude: loc.a, longitude: loc.o } })
      .then(data => {
        this.tS.updateConditions(this.newTrek, data);
        this.mS.setWaitingForSomething();
        // get the trek label
        this.setTrekLabel();
      })
      .catch(() => {
        this.tS.updateConditions(this.newTrek, undefined);
        this.mS.setWaitingForSomething();
        // get the trek label
        this.setTrekLabel();
      });
  };

  // open the label/notes form for the user
  setTrekLabel = () => {
    this.logSvc
      .editTrekLabel(this.newTrek, true) // denote new trek
      .then(() => {
        this.checkCourseAffiliation();
      })
      .catch(() => {
        this.checkCourseAffiliation();
      });
  };

  // check for an affiliation with a course
  checkCourseAffiliation = () => {
    let tObj = this.logState.trackingObj;
    if (tObj) {
      // add an effort entry to the course
      this.addToCourseEfforts(tObj.courseName,tObj.method, tObj.goalValue);
    } else {
      let courseName = this.cS.checkForCourseMatch(this.newTrek);
      // match found, prompt user to add effort to course
      if(courseName !== ''){
        this.props.modalSvc
          .simpleOpen({
            heading: "Add Course Effort",
            content: "Add this " + this.newTrek.type + " to course:\n" + courseName + " ?",
            cancelText: "NO",
            okText: "YES",
            headingIcon: "Course",
            dType: CONFIRM_INFO
          })
          .then(() => {
            this.addToCourseEfforts(courseName, 'courseTime', 0);
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

  addToCourseEfforts = (courseName: string, method: CourseTrackingMethod, goalValue: number) => {
    this.cS.addCourseEffort(courseName, this.newTrek, method, goalValue)
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
            content: MSG_LINK_ADDED + this.newTrek.type + 
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
    this.mS.resObj = undefined;
    this.logSvc.setLayoutOpts("All");
    this.openGoalNotification();
    this.mS.setSpeedDialZoomedIn(false);
  }

  // user is finished with post-log review
  reviewFinished = () => {
    this.logSvc.updateTrekSaved(false);
    this.setPendingReview(false);
    this.discardTrek();
    this.logSvc.setShowMapInLog(false);
  };

  // Open the Trek Limits form using TIME parameters
  openTimeLimitsForm = () => {
    this.limitProps = {
      heading: "Stop after a Time",
      headingIcon: "TimerSand",
      onChangeFn: this.logSvc.setTimeLimitInfo,
      label: "Auto stop " + this.newTrek.type + " after how long?",
      placeholderValue: this.logState.lastTime.toString(),
      units: ['time'], defaultUnits: 'time',
      limitType: 'Time'
    };
    this.mS.limitsCloseFn = this.startTimedLogging;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using DISTANCE parameters
  openDistLimitsForm = () => {
    let units = [
      "meters",
      DIST_UNIT_LONG_NAMES[this.mS.measurementSystem]
    ];
    this.limitProps = {
      heading: "Stop after a Distance",
      headingIcon: "CompassMath",
      onChangeFn: this.logSvc.setDistLimitInfo,
      label: "Auto stop " + this.newTrek.type + " after what distance?",
      placeholderValue: this.logState.lastDist.toString(),
      units: units,
      defaultUnits: this.logState.lastDistUnits,
      limitType: 'Dist'
    };
    this.mS.limitsCloseFn = this.startDistLogging;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using HIKE parameters
  openPackWeightForm = () => {
    let units = [WEIGHT_UNIT_CHOICES[this.mS.measurementSystem]];
    let phVal = this.logState.lastPackWeight;
    phVal =
      phVal !== undefined
        ? phVal
        : this.mS.convertWeight(this.newTrek.packWeight, true);
    this.limitProps = {
      heading: "Backpack Weight",
      headingIcon: "Hike",
      onChangeFn: this.logSvc.setPackWeightInfo,
      label: "Weight of your backpack:",
      placeholderValue: phVal.toString(),
      units: units,
      defaultUnits: units[0],
      limitType: "PackWeight"
    };
    this.mS.limitsCloseFn = this.startHike;
    this.setLimitFormOpen(true);
  };

  // Open the Trek Limits form using TYPE SELECT parameters
  openTypeSelectForm = () => {
    this.oldTrekType = this.newTrek.type;
    this.limitProps = {
      heading: "Trek Type",
      headingIcon: "BulletedList",
      onChangeFn: this.mS.updateDefaultType,
      okText: "Auto",
      label: "Select trek type for new log:",
      limitType: 'TrekType'
    };
    this.mS.limitsCloseFn = this.selectTrekType;
    this.setLimitFormOpen(true);
  };

  // Start the logging process for a TIME limited trek.
  @action
  startTimedLogging = (start: boolean) => {
    if (start) {
      this.logSvc.setLimitsActive(true);
      this.logState.lastTime = this.logState.timeLimit;
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Start the logging process for a DISTANCE limited trek.
  @action
  startDistLogging = (start: boolean) => {
   if (start) {
      this.logSvc.setLimitsActive(true);
      this.logState.lastDist = this.logState.distLimit;
      this.logState.lastDistUnits = this.logState.units;
      if (this.logState.units !== "meters") {
        //km or mi?
        this.logSvc.setDistLimit(
          this.logState.distLimit *
            (this.mS.measurementSystem === "US" ? M_PER_MILE : 1000)
        ); // convert to meters
      }
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Start the logging process for a Hike.
  startHike = (start: boolean) => {
    if (start) {
      this.logState.lastPackWeight =
        this.mS.measurementSystem === "US"
          ? Math.round(this.newTrek.packWeight * LB_PER_KG)
          : this.newTrek.packWeight;
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Open the Tracking method form
  openTrackingMethodForm = () => {
    this.mS.limitsCloseFn = this.startTrekWithTracking;
    this.setTrackingMethodFormOpen(true);
  };

  // Start the logging process tracking a prior effort.
  startTrekWithTracking = (start: boolean) => {
    this.setLockNavMenu(false);
    if (start) {
      this.logState.trackingCourse = this.courseToTrack;
      this.startLogging()
      this.setTrackingMethodFormOpen(false);
      this.logSvc.setLayoutOpts("All");
      this.mS.setSpeedDialZoomedIn(false);
      // this.showMap();
    } else {
      this.setTrackingMethodFormOpen(false);
      setTimeout(() => {
        this.setCourseToTrack(undefined);
      }, 500);
    }
  }

  // Vibrate a device to indicate START.
  giveVibrationStartSignal = () => {
    this.props.toastSvc.toastOpen({
      tType: "Success",
      content: "Start " + TREK_VERBS_OBJ[this.newTrek.type]
    });
    Vibration.vibrate(START_VIB, false);
    if (this.logState.timeLimit !== 0) {
      this.startLimitTimer();
    }
  };

  // Start a timer to watch for the timeLimit to expire on a timed Trek
  startLimitTimer = () => {
    this.logState.limitTimerId = window.setInterval(() => {
      // check for time of last point being after the time limit (seconds)
      let lastPt = this.tS.lastPoint(this.newTrek);
      if (
        !this.logState.limitTrekDone &&
        lastPt && lastPt.t >= this.logState.timeLimit
      ) {
        this.logState.limitTrekDone = true;
        this.stopLimitedTrek();
      }
    }, 1000);
  };

  // Time/Distance limit has been reached. Inform user it is time to stop and stop logging.
  stopLimitedTrek = () => {
    this.stopLogging();
    this.props.toastSvc.toastOpen({
      tType: "Error",
      content: "Stop " + TREK_VERBS_OBJ[this.newTrek.type],
    });
    Vibration.vibrate(STOP_VIB, false);
  };

  // Save to database if necessary then mark trek as saved
  saveTrek = () => {
    this.tS.computeCalories(this.newTrek);
    this.logSvc.updateTrekSaved(true); // denote save issue done
    this.mS
      .saveTrek(this.newTrek,'none')
      .then(() => {
        if(this.fS.isInGroupList(this.newTrek.group)){
          this.fS.updateTimeframe('TWeek');
        }
        this.props.toastSvc.toastOpen({
          tType: "Success",
          content: this.newTrek.type + " has been saved."
        });
      })
      .catch(() => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: "Error saving " + this.newTrek.type + "."
        });
      });
  };

  discardTrek = () => {
    if(this.logState.loggingState === 'Aborting') {
      this.props.storageSvc.removeTrekImageFiles(this.newTrek.trekImages)
    }
    this.logSvc.resetTrek();
    this.tS.clearTrek(this.newTrek, false);
    this.logSvc.clearTrackingItems();
    this.logSvc.setLoggingState('Not Logging');
  };

  openGoalNotification = () => {
    let plural;
    let msg;
    let itemList = [];

    this.props.goalsSvc
      .checkTrekAgainstGoals(this.newTrek, false)
      .then((goals: { goal: GoalObj; item: GoalDisplayItem }[]) => {
        if (goals.length) {
          plural = goals.length > 1 ? "s" : "";
          msg =
            "The " +
            this.newTrek.type +
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
    this.logSvc.setShowMapInLog(true);
    this.props.navigation.navigate({routeName: 'LogTrekMap', key: 'Key-LogTrekMap'});
  }

  selectTrekType = (status: boolean) => {
    this.closeLimitForm();
    if(status){
      this.tS.updateType(this.newTrek, this.mS.defaultTrekType);
      this.props.navigation.setParams({ icon: this.newTrek.type });
    } else {
      this.mS.updateDefaultType(this.oldTrekType);
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
        case MSG_NONE_NEARBY:
        case MSG_NO_LIST:
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: 'No nearby courses found.',
          });
        case RESP_CANCEL:
        default:
      }
    })    
  }

  switchMeasurementSystem = () => {
    this.mS.switchMeasurementSystem();
    this.tS.updateCalculatedValues(this.newTrek, this.logState.timerOn, true);
  }
  // respond to action from controls
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "StartU":
          this.startLogging();
          break;
        case "StartT":
          this.openTimeLimitsForm();
          break;
        case "Hike":
        case "StartH":
          this.openPackWeightForm();
          break;
        case "StartD":
          this.openDistLimitsForm();
          break;
        case "StartC":
          this.setToTrackCourse();
          break;
        case "TType":
          this.openTypeSelectForm();
          break;
        case "Stop":
          this.stopLogging();
          break;
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case 'Help':
        this.props.navigation.navigate({routeName: 'ShowHelp', key: 'Key-ShowHelp'});
        break;
        case "ReviewDone":
          if(this.logState.trekSaved){
            this.reviewFinished();
          }
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
          this.props.navigation.navigate({
            routeName: 'Conditions', 
            key: 'Key-Conditions'
          });
          break;
        case "UseCamera":
          this.props.navigation.navigate({
            routeName: 'Images', 
            params:  {cmd: 'camera', 
                      trek: this.newTrek},
            key: 'Key-Images'
          });
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
        this.mS.readAllTreks(this.newTrek.group)
        .then(() => {
          this.props.toastSvc.toastOpen({
            tType: "Success",
            content: msg,
          })
        })
        .catch((err) => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: 'Error reading trek list for ' + this.newTrek.group + '\n' + err,
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
      label = "Start " + TREK_TYPE_LABELS[this.newTrek.type];
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


  render() {
    const lS = this.logState;
    const numPts = lS.trekPointCount;
    const formOpen = this.limitFormOpen || this.trackingMethodFormOpen || this.coursePickerOpen ||
                      this.radioPickerOpen;
    const stopOk =
      !this.mS.waitingForSomething &&
      (lS.timerOn ||
        lS.logging ||
        lS.limitsActive);
    const startOk =
      !stopOk && !lS.pendingReview;
    const reviewOk =
      !stopOk && lS.pendingReview;
    const { controlsArea, navItem, navIcon, bigNavItemWithLabel, navItemWithLabel, navItemLabel,
            fontLight } = this.uiTheme;
    const {
      navIconColor,
      mediumTextColor,
      trekLogRed,
      navItemBorderColor,
      pageBackground,
      disabledTextColor,
    } = this.uiTheme.palette[this.mS.colorTheme];
    const navIconSize = NAV_ICON_SIZE;
    const bigButtonSize = 150;
    const bigIconSize = 80;
    const bigTitle = this.formatBigTitle(startOk, reviewOk);
    const bgColor = pageBackground;
    const nlColor = navIconColor
    const noMenu = formOpen || this.lockNavMenu;
    const trackingMarker = lS.trackingMarkerLocation;
    const currType = this.mS.resObj ? this.mS.resObj.trek.type : this.newTrek.type;
    const headerTitle = this.logState.loggingState === 'Not Logging' ? 'Log a Trek' : 'Trek Stats';

    let navMenuItems;
    if (stopOk){    
      navMenuItems =   
      [ {label: 'Logging Options', 
        submenu: [{icon: 'CheckeredFlag', color: BLACKISH, label: 'Finish', value: 'Stop'},
                  {icon: 'Camera', label: 'Use Camera', value: 'UseCamera'},
                  {icon: 'Map', label: 'Map View', value: 'ShowMap'}]},
        {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'} 
      ];
    } else {
      if (reviewOk){    
        navMenuItems =   
        [ {icon: 'ArrowBack', label: 'Done', value: 'ReviewDone'},
        {icon: 'Map', label: 'Map View', value: 'ShowMap'},
        {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'}
      ];
      } else {
        navMenuItems = 
        [ {label: 'Logging Options', 
          submenu: [{icon: currType, label: 'Change Type', value: 'TType'},
                    {icon: 'Course', label: 'Challenge Course', value: 'StartC'},
                    {icon: 'TimerSand', label: 'Limit Time', value: 'StartT'},
                    {icon: 'CompassMath', label: 'Limit Distance', value: 'StartD'}
                  ]},
          {icon: 'Home', label: 'Home', value: 'Home'},
          {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'},  
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
        backgroundColor: pageBackground,
        borderWidth: 0,
      },
      bigTitle: {
        marginTop: stopOk ? -15 : 0,
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
        backgroundColor: "transparent",
      },
      bigNavButton: {
        ...bigNavItemWithLabel,
        backgroundColor: "transparent",
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
            icon="*"
            titleText={headerTitle}
            actionButtons={this.headerActions}
            position="absolute"
            backButtonFn={this.checkBackButton}
            openMenuFn={this.openMenu}
            disableMenu={noMenu}
          />
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
          <RadioPicker pickerOpen={this.coursePickerOpen}/>
          <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
          {this.mS.waitingForSomething && (
            <Waiting msg={this.mS.waitingMsg} />
          )}
          {this.courseToTrack && 
            <TrackingMethodForm
              open={this.trackingMethodFormOpen}
              header="Course Challenge Method"
              title={'Challenge ' + this.courseToTrack.name + ' Using:'}
              inMethod={lS.trackingMethod || 'courseTime'}
              icon="Course"
              onChangeFn={this.logSvc.setTrackingValueInfo}
              course={this.courseToTrack}
            />
          }
          <TrekLimitsForm
            open={this.limitFormOpen}
            limits={this.limitProps}
          />
            <View
              style={[
                styles.container, (stopOk || reviewOk) ?
                { top: HEADER_HEIGHT, bottom: BIG_CONTROLS_HEIGHT, alignItems: "center" } : 
                {top: HEADER_HEIGHT, alignItems: "center"}
              ]}
            >
              <PageTitle 
                colorTheme={this.mS.colorTheme}
                icon={currType}
                iconColor={!startOk ? TREK_TYPE_DIM_COLORS_OBJ[currType] : TREK_TYPE_COLORS_OBJ[currType]}
                iconFn={this.setActiveNav}
                iconFnArg={'TType'}
                titleText={currType}
                iconFnDisabled={!startOk}
                style={pageTitleFormat}
                groupName={this.mS.group || "None"}
                setGroupFn={startOk ? this.getDifferentGroup : undefined}
              />
              {(startOk) && !trackingMarker &&
                <Text style={styles.bigTitle}>{bigTitle}</Text>
              }
              {(numPts > 0 && trackingMarker) &&
                <TrackingStatusBar
                  colorTheme={this.mS.colorTheme}
                  trackingDiffDist={lS.trackingDiffDist}
                  trackingDiffDistStr={lS.trackingDiffDistStr}
                  trackingDiffTime={lS.trackingDiffTime}
                  trackingDiffTimeStr={lS.trackingDiffTimeStr}
                  trackingHeader={lS.trackingObj ? lS.trackingObj.challengeTitle : undefined}
                  trackingTime={lS.trackingObj ? lS.trackingObj.goalTime : undefined}
                  barTop={45}
                  logOn={true}
                />
              }
              {!lS.logging && !reviewOk && (
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <IconButton
                    iconSize={bigIconSize}
                    icon={currType}
                    disabled={formOpen}
                    style={{...navItem, ...styles.bigStart}}
                    borderColor={mediumTextColor}
                    iconStyle={navIcon}
                    color={TREK_TYPE_COLORS_OBJ[currType]}
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
                    trek={this.newTrek}
                    logging={stopOk} 
                    trekType={currType} 
                    sysChangeFn={this.switchMeasurementSystem}
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
                icon="CheckeredFlag"
                style={styles.bigNavButton}
                borderColor={trekLogRed}
                iconStyle={navIcon}
                color={BLACKISH}
                onPressFn={this.setActiveNav}
                onPressArg="Stop"
                label="Finish"
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
