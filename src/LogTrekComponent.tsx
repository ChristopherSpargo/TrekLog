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
  TREK_TYPE_CHOICES
} from "./TrekInfoModel";
import { ToastModel } from "./ToastModel";
import { ModalModel } from "./ModalModel";
import TrekLimitsForm, { LimitsObj } from "./TrekLimitsComponent";
import {
  M_PER_MILE,
  LB_PER_KG,
  UtilsSvc,
  ACTIVITY_SPEEDS,
  ACTIVITY_BY_SPEED
} from "./UtilsService";
import { WeatherSvc } from "./WeatherSvc";
import { GoalObj, GoalsSvc, GoalDisplayItem } from "./GoalsService";
import { CONTROLS_HEIGHT, NAV_ICON_SIZE, HEADER_HEIGHT } from "./App";
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
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';


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
    uiTheme?: any;
    navigation?: any;
  },
  {}
> {
  @observable limitFormOpen: boolean;
  @observable limitFormDone: string;
  @observable waitingForElevData: boolean;
  @observable radioPickerOpen;

  _didFocusSubscription;
  _willBlurSubscription;

  trekInfo = this.props.trekInfo;
  glS = this.props.locationSvc;
  logSvc = this.props.loggingSvc;
  uiTheme = this.props.uiTheme;
  activeNav = "";
  limitProps: LimitsObj = {} as LimitsObj;
  typeSDRef: RefObject<SpeedDial>;

  // static navigationOptions = () => {
  //   return {
  //         header: null,
  //   };
  // };

  constructor(props) {
    super(props);
    this.typeSDRef = React.createRef();
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
        this.trekInfo.restoreLogState(ro);
        this.trekInfo.setAppReady(true);
        this.logSvc.smoothTrek();
        if (ro.timerOn) {
          this.logSvc.startTrekTimer();
        }
        if (ro.timeLimit) {
          this.startLimitTimer();
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
      .catch(() => {
        // nothingToRestore
        this.trekInfo
          .init()
          .then(() => {
            this.trekInfo.setAppReady(true);
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
          })
          .catch(err => {
            this.trekInfo.setAppReady(true);
            // need to create a use or enter settings
            alert(err)
            switch (err) {
              case "NO_GROUPS":
                // this.props.navigation.dispatch(gotoSettings);
                break;
              case "NO_SETTINGS":
                // this.props.navigation.dispatch(gotoSettings);
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
    this.limitFormDone = "";
    this.waitingForElevData = false;
    this.setRadioPickerOpen(false);
  };

  checkBackButton = () => {
    requestAnimationFrame(() => {
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  };

  onBackButtonPressAndroid = () => {
    const { infoConfirmColor, infoConfirmTextColor } = this.uiTheme.palette[
      this.props.trekInfo.colorTheme
    ];

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
          headingStartColor: infoConfirmColor,
          headingTextColor: infoConfirmTextColor
        })
        .then(() => {
          this.trekInfo.setCancelDialogOpen(false);
          this.logSvc.stopTrek();
          this.finalizeTrek();
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
          this.logSvc.setDate();
          this.trekInfo.setShowMapInLog(false);
        })
        .catch(err => {
          // need to create a use or enter settings
          switch (err) {
            case "NO_USES":
            case "NO_SETTINGS":
              this.props.navigation.navigate("Settings");
              break;
            default:
          }
        });
    }
  };

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.trekInfo.swapColorTheme();
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

  // set the value of the limitFormDone property
  @action
  setLimitFormDone = (value: string) => {
    this.limitFormDone = value;
  };

  // set the value of the waitingForElevData property
  @action
  setWaitingForElevData = (status: boolean) => {
    this.waitingForElevData = status;
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
    this.props.groupSvc.getGroupSelection(this.setRadioPickerOpen, this.trekInfo.group, 'Select A Group')
    .then((newGroup) => {
      this.trekInfo.setTrekLogGroupProperties(newGroup)
      .then((result) => {
        if(result === 'OK'){
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
      if (this.trekInfo.trekPointCount === 1) {
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
    this.trekInfo.setSpeedDialZoom(true);
    this.logSvc.startPositionTracking(this.gotPos); // this sets minPointDist and starts geolocation
  };

  // Stop the logging process. If there is something to save, confirm intentions with the user
  stopLogging = () => {
    const { infoConfirmColor, infoConfirmTextColor } = this.uiTheme.palette[
      this.props.trekInfo.colorTheme
    ];
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
        headingTextColor: infoConfirmTextColor,
        headingStartColor: infoConfirmColor
      })
      .then(resp => {
        this.trekInfo.setSaveDialogOpen(false);
        this.logSvc.stopTrek();
        this.finalizeTrek();
        if (resp === "SAVE" && this.trekInfo.trekPointCount !== 0) {
          this.willSaveTrek();
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
    this.closeStatsAndDetails();
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
    this.setWaitingForElevData(true);
    this.trekInfo
      .setElevationProperties() // call Elevation API to get elevations
      .then(() => {
        this.getWeather();
      })
      .catch((err) => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: "Error retreiving elevation data.\n" + err
        });
        this.getWeather();
      });
  };

  // call the weather service to get the weather conditions
  getWeather = () => {
    let loc = this.trekInfo.pointList[0].l;

    this.props.weatherSvc
      .getWeatherData({ type: "W", pos: { latitude: loc.a, longitude: loc.o } })
      .then(data => {
        this.trekInfo.updateConditions(data);
        this.setWaitingForElevData(false);
        // get the trek label
        this.setTrekLabel();
      })
      .catch(() => {
        this.trekInfo.updateConditions(undefined);
        this.setWaitingForElevData(false);
        // get the trek label
        this.setTrekLabel();
      });
  };

  // open the label/notes form for the user
  setTrekLabel = () => {
    this.logSvc
      .editTrekLabel(true) // denote new trek
      .then(() => {
        this.finishTrekLog();
      })
      .catch(() => {
        this.finishTrekLog();
      });
  };

  // finish up saving the log
  finishTrekLog = () => {
    this.glS.shutDownGeolocation();
    this.saveTrek();
    this.props.storageSvc.removeRestoreObj();
    this.trekInfo.resObj = undefined;
    this.logSvc.setLayoutOpts("All");
    this.openGoalNotification();
    this.updateStatsOpen(false);
    this.trekInfo.setSpeedDialZoom(false);
  };

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
      closeFn: this.startTimedLogging
    };
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
      closeFn: this.startDistLogging
    };
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
      closeFn: this.startHike
    };
    this.setLimitFormOpen(true);
  };

  // Start the logging process for a TIME limited trek.
  @action
  startTimedLogging = (start: boolean) => {
    this.setLimitFormDone("");
    this.trekInfo.lastTimeUnits = this.trekInfo.units;
    if (start) {
      this.trekInfo.setLimitsActive(true);
      this.trekInfo.lastTime = this.trekInfo.timeLimit;
      this.trekInfo.timeLimit *=
        this.trekInfo.units === "minutes" ? 60000 : 3600000; // convert to miliseconds
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Start the logging process for a DISTANCE limited trek.
  @action
  startDistLogging = (start: boolean) => {
    this.setLimitFormDone("");
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
    this.setLimitFormDone("");
    if (start) {
      this.trekInfo.lastPackWeight =
        this.trekInfo.measurementSystem === "US"
          ? Math.round(this.trekInfo.packWeight * LB_PER_KG)
          : this.trekInfo.packWeight;
      this.startLogging();
    }
    this.closeLimitForm();
  };

  // Vibrate a start warning sequence then a longer single vibration from 2-3 seconds later to indicate START.
  giveVibrationStartSignal = () => {
    this.props.toastSvc.toastOpen({
      tType: "Success",
      content: "Start " + TREK_VERBS_OBJ[this.trekInfo.type]
    });
    Vibration.vibrate(START_VIB, false);
    if (this.trekInfo.timeLimit !== 0) {
      this.logSvc.updateDuration(0);
      this.logSvc.setStartTime(); // Update start time to after recieve inital GPS point
      this.startLimitTimer();
    }
  };

  // Start a timer to watch for the timeLimit to expire on a timed Trek
  startLimitTimer = () => {
    this.trekInfo.limitTimerId = window.setInterval(() => {
      if (
        !this.trekInfo.limitTrekDone &&
        new Date().getTime() - this.trekInfo.startMS >= this.trekInfo.timeLimit
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
      time: 3000
    });
    Vibration.vibrate(STOP_VIB, false);
  };

  // Save to database if necessary then mark trek as saved
  saveTrek = () => {
    this.trekInfo.computeCalories();
    this.trekInfo.updateTrekSaved(true); // denote save issue done
    this.trekInfo
      .saveTrek(this.trekInfo.getSaveObj())
      .then(() => {
        this.trekInfo.updateTimeframe('TWeek');
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
    this.closeStatsAndDetails();
  };

  // Update the value of the statsOpen property
  @action
  updateStatsOpen = (status: boolean) => {
    this.trekInfo.setUpdateMap(true);
    this.trekInfo.setStatsOpen(status);
  };

  // Close the NumbersBar
  @action
  closeStatsAndDetails = () => {
    this.trekInfo.setUpdateMap(true);
    this.trekInfo.statsOpen = false;
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
            okText: "KEEP IT UP!"
          });
        }
      })
      .catch(() => {}); // no applicable goals found or met
  };

  // process selection from speed dial item
  sdSelected = (sel: string) => {
    if (TREK_TYPE_CHOICES.indexOf(sel) !== -1) {
      this.selectTrekType(sel as TrekType);
    } else {
      this.setActiveNav(sel);
    }
  };

  selectTrekType = (value: TrekType) => {
    this.props.navigation.setParams({ icon: value });
    this.trekInfo.updateType(value);
  };

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
        case "StartH":
          this.openPackWeightForm();
          break;
        case "StartD":
          this.openDistLimitsForm();
          break;
        case "Stop":
          this.stopLogging();
          break;
        case "Summary":
        case "Goals":
        case "Settings":
          this.trekInfo.updateDashboard = false;
          this.props.navigation.navigate(val);
          break;
        case "Stats":
          this.updateStatsOpen(!this.trekInfo.statsOpen);
          break;
        case "ReviewDone":
          this.reviewFinished();
          break;
        case "LimitsDone":
          this.setLimitFormDone("Dismiss");
          break;
        case "LimitsContinue":
          this.setLimitFormDone("Close");
          break;
        case "ShowMap":
          this.trekInfo.setShowMapInLog(true);
          this.props.navigation.navigate("LogTrekMap");
          break;
        case "Conditions":
          this.props.navigation.navigate("Conditions");
          break;
        case "UseCamera":
          this.props.navigation.navigate('Images', {cmd: 'camera'});
          break;
        default:
      }
    });
  };

  // format the title for the default log screen.
  // change according to the activity and speed
  formatBigTitle = (startOk: boolean, reviewOk): string => {
    let thisType = this.trekInfo.type;
    let label = "";
    let sr = 0;

    if (startOk) {
      label = "Start " + TREK_TYPE_LABELS[thisType];
    } else {
      if (reviewOk) {
        label = "Finished";
      } else {
        if (this.trekInfo.trekPointCount) {
          let sp = this.trekInfo.formattedCurrentSpeed(
            this.trekInfo.measurementSystem,
            true
          ) as number;
          // what is the speed range for the current speed
          sr = this.props.utilsSvc.findRangeIndex(sp, ACTIVITY_SPEEDS);
          if (sp === 0 || sr === -1) {
            label = "Stopped";
            if( sp === 0 ) { 
              this.trekInfo.haveShownDriving = false; 
            }
          } else {
            if (!this.trekInfo.haveShownDriving) {
              label = ACTIVITY_BY_SPEED[thisType][sr];
              this.trekInfo.haveShownDriving = label === "Driving";
            } else {
              label = "Driving";
            }
          }
        }
      }
    }
    return label;
  };

  // set up the items for the pre-trek actions speedDial
  // allow user to change trek type and set a time or distance limit
  getSdActions = (): SpeedDialItem[] => {
    let type = this.trekInfo.type;
    let actions: SpeedDialItem[] = [];
    const altColor = this.uiTheme.palette[this.props.trekInfo.colorTheme]
      .trekLogBlue;

    actions.push({
      icon: "CompassMath",
      label: "Dist",
      value: "StartD",
      bColor: altColor
    });
    actions.push({
      icon: "TimerSand",
      label: "Time",
      value: "StartT",
      bColor: altColor
    });
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

    return actions;
  };

  render() {
    const numPts = this.trekInfo.trekPointCount;
    const appOk = true; //this.trekInfo.appReady || !this.trekInfo.resObj;
    const bgImage = this.trekInfo.haveBackgroundImage();
    const limitsOk = appOk && this.limitFormOpen;
    const stopOk =
      appOk &&
      !limitsOk &&
      !this.waitingForElevData &&
      (this.trekInfo.timerOn ||
        this.trekInfo.logging ||
        this.trekInfo.limitsActive);
    const startOk =
      appOk && !limitsOk && !stopOk && !this.trekInfo.pendingReview;
    const reviewOk =
      appOk && !limitsOk && !stopOk && this.trekInfo.pendingReview;
    const { controlsArea, navItem, navIcon } = this.uiTheme;
    const {
      secondaryColorTrans,
      secondaryColor,
      mediumTextColor,
      headerBackgroundColor,
      dividerColor,
      headerTextColor,
      navIconColor,
      trekLogGreen,
      trekLogRed,
      navItemBorderColor,
      pageBackground,
      pageBackgroundFilm,
      disabledTextColor,
      disabledHeaderTextColor
    } = this.uiTheme.palette[this.props.trekInfo.colorTheme];
    const navIconSize = NAV_ICON_SIZE;
    const bigButtonSize = 150;
    const bigIconSize = 64;
    const bigTitle = this.formatBigTitle(startOk, reviewOk);
    const iWidth = Dimensions.get('window').width;
    const iHeight = Dimensions.get('window').height;
    const bgColor = bgImage ? pageBackgroundFilm : pageBackground;
    const hbgColor = bgImage ? pageBackgroundFilm : headerBackgroundColor;
    const tColor = bgImage ? mediumTextColor : headerTextColor;
    const disabledGroupTextColor = bgImage ? disabledTextColor : disabledHeaderTextColor; 

    const sdActions: SpeedDialItem[] = this.getSdActions();

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: bgColor,
      },
      caAdjust: {
        backgroundColor: bgColor,
      },
      speedDialTrigger: {
        backgroundColor: bgImage ? secondaryColorTrans : secondaryColor,
      },
      bigTitle: {
        marginTop: 15,
        fontSize: 60,
        fontWeight: "300",
        color: disabledTextColor
      },
      bigStart: {
        height: bigButtonSize,
        width: bigButtonSize,
        backgroundColor: bgColor,
        borderRadius: bigButtonSize / 2,
      }
    });

    const cBorder = this.trekInfo.statsOpen
      ? { borderTopColor: "transparent" }
      : {};

    return (
      <View style={[styles.container]}>
        <TrekLogHeader
          logo
          icon={this.trekInfo.type || "Walk"}
          headerRightIcon="YinYang"
          headerRightIconColor={tColor}
          headerRightFn={this.swapColorTheme}
          headerRightButtonStyle={{marginTop: 10}}
          group={this.trekInfo.group || "None"}
          setGroupFn={startOk ? this.getDifferentGroup : undefined}
          groupTextColor={startOk ? tColor : disabledGroupTextColor}
          backgroundColor={hbgColor}
          textColor={tColor}
          position="absolute"
          borderBottomColor={bgImage ? dividerColor : "transparent"}
        />
        <RadioPicker pickerOpen={this.radioPickerOpen}/>
        {this.waitingForElevData && (
          <Waiting msg="Obtaining elevation data..." />
        )}
        {numPts === 0 && this.trekInfo.logging && (
          <Waiting msg="Obtaining current position..." />
        )}
        <TrekLimitsForm
          open={this.limitFormOpen}
          done={this.limitFormDone}
          limits={this.limitProps}
        />
        {bgImage && this.trekInfo.currentBackground === 0 &&
          <Image source={require('../src/assets/desert1a.jpg')} 
            style={{width: iWidth, height: iHeight}}
          />
        }
        {bgImage && this.trekInfo.currentBackground === 1 &&
          <Image source={require('../src/assets/desert2a.jpg')} 
            style={{width: iWidth, height: iHeight}}
          />
        }
        {appOk && (
          <View
            style={[
              styles.container,
              { top: HEADER_HEIGHT, bottom: CONTROLS_HEIGHT, alignItems: "center" }
            ]}
          >
          <View style={{position: "absolute", top: 8, left: 5}}>
            <SvgButton
              onPressFn={this.trekInfo.toggleCurrentBackground}
              borderWidth={0}
              areaOffset={0}
              size={30}
              fill={navIconColor}
              path={APP_ICONS.Image}
            />
          </View>
            <Text style={styles.bigTitle}>{bigTitle}</Text>
            {!this.trekInfo.logging && !reviewOk && (
              <View style={{ flex: 1, justifyContent: "center" }}>
                <IconButton
                  iconSize={bigIconSize}
                  icon="Play"
                  disabled={limitsOk}
                  style={{...navItem, ...styles.bigStart}}
                  borderColor={trekLogGreen}
                  raised={bgImage ? undefined : true}
                  iconStyle={navIcon}
                  color={navIconColor}
                  onPressFn={this.setActiveNav}
                  onPressArg="StartU"
                />
              </View>
            )}
            {numPts === 0 &&
              !this.trekInfo.logging &&
              this.trekInfo.type === "Hike" && (
                <SpeedDial
                  icon="Sack"
                  bottom={80}
                  selectFn={() => this.setActiveNav("StartH")}
                  style={styles.speedDialTrigger}
                  iconSize="Large"
                />
              )}
            {numPts === 0 && !this.trekInfo.logging && (
              <SpeedDial
                ref={this.typeSDRef}
                icon={this.trekInfo.type}
                raised={bgImage ? undefined : true}
                bottom={15}
                items={sdActions}
                selectFn={this.sdSelected}
                itemIconsStyle={{ backgroundColor: pageBackground }}
                style={styles.speedDialTrigger}
                menuColor="transparent"
                horizontal={true}
                autoClose={5000}
                iconSize="Large"
              />
            )}
            <View
              style={{
                flex: 1,
                justifyContent: "space-around",
                alignItems: "center"
              }}
            >
              {numPts > 0 && (
                <TrekStats logging={stopOk} trekType={this.trekInfo.type} />
              )}
            </View>
          </View>
        )}
        {startOk && !reviewOk && (
          <View style={[controlsArea, cBorder, styles.caAdjust]}>
            <IconButton
              iconSize={navIconSize}
              icon="PartCloudyDay"
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              disabled={false}
              onPressFn={this.setActiveNav}
              onPressArg="Conditions"
            />
            <IconButton
              iconSize={navIconSize}
              icon="ChartDonut"
              style={navItem}
              raised
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="Summary"
            />
            <IconButton
              iconSize={navIconSize}
              icon="Trophy"
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Goals"
            />
            <IconButton
              iconSize={navIconSize}
              icon="Settings"
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Settings"
            />
          </View>
        )}
        {stopOk && (
          <View style={[controlsArea,styles.caAdjust, cBorder]}>
            <IconButton
              iconSize={navIconSize}
              icon="Stop"
              style={navItem}
              borderColor={trekLogRed}
              raised
              iconStyle={navIcon}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="Stop"
            />
            {numPts > 0 && (
              <IconButton
                iconSize={navIconSize}
                icon="Camera"
                style={navItem}
                iconStyle={navIcon}
                borderColor={navItemBorderColor}
                color={navIconColor}
                raised
                onPressFn={this.props.locationSvc.getGeolocationConfig}
                // onPressFn={this.setActiveNav}
                // onPressArg="UseCamera"
              />
            )}
            {numPts > 0 && (
              <IconButton
                iconSize={navIconSize}
                icon="Map"
                style={navItem}
                iconStyle={navIcon}
                borderColor={navItemBorderColor}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="ShowMap"
              />
            )}
          </View>
        )}
        {reviewOk && (
          <View style={[controlsArea, styles.caAdjust, cBorder]}>
            <IconButton
              iconSize={navIconSize}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              raised
              borderColor={navItemBorderColor}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="ReviewDone"
            />
            <IconButton
              iconSize={navIconSize}
              icon="Map"
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="ShowMap"
            />
          </View>
        )}
        {limitsOk && (
          <View style={[controlsArea, styles.caAdjust, cBorder]}>
            <IconButton
              iconSize={navIconSize}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              raised
              borderColor={navItemBorderColor}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="LimitsDone"
            />
            <IconButton
              iconSize={navIconSize}
              icon="Play"
              style={navItem}
              borderColor={trekLogGreen}
              iconStyle={navIcon}
              raised
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="LimitsContinue"
            />
          </View>
        )}
      </View>
    );
  }
}

export default LogTrek;
