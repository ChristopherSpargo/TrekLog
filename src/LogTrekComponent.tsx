import React from 'react';
import { Component, RefObject } from 'react';
import { View, StyleSheet, Vibration, TouchableNativeFeedback, Text,
         BackHandler } from 'react-native'
import { NavigationActions } from 'react-navigation';
import { observable, action } from 'mobx'
import { observer, inject } from 'mobx-react'
import { Location } from 'react-native-mauron85-background-geolocation';

import { TrekInfo, TrekType, TREK_VERBS_OBJ, START_VIB, STOP_VIB, DIST_UNIT_LONG_NAMES,
         WEIGHT_UNIT_CHOICES, TREK_TYPE_LABELS, TREK_TYPE_BIKE, SWITCH_SPEED_AND_TIME, RestoreObject } from './TrekInfoModel';
import { ToastModel } from './ToastModel';
import { ModalModel } from './ModalModel'
import TrekLimitsForm, {LimitsObj} from './TrekLimitsComponent'
import { M_PER_MILE, LB_PER_KG, UtilsSvc, ACTIVITY_SPEEDS, ACTIVITY_BY_SPEED } from './UtilsService';
import { WeatherSvc } from './WeatherSvc';
import { GoalObj, GoalsSvc, GoalDisplayItem } from './GoalsService';
import { CONTROLS_HEIGHT} from './App';
import SpeedDial, {SpeedDialItem} from './SpeedDialComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { StorageSvc } from './StorageService';
import { LocationSvc } from './LocationService';
import { LoggingSvc } from './LoggingService';
import IconButton from './IconButtonComponent';
import Waiting from './WaitingComponent';

const gotoSettings = NavigationActions.navigate({
  routeName: 'Settings',
});

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'modalSvc', 'uiTheme', 'weatherSvc', 'goalsSvc', 'storageSvc', 'locationSvc',
        'loggingSvc', 'utilsSvc')
@observer
class LogTrek extends Component<{ 
  uiTheme ?: any,
  toastSvc ?: ToastModel,
  trekInfo ?: TrekInfo,
  modalSvc ?: ModalModel,
  weatherSvc ?: WeatherSvc,
  goalsSvc ?: GoalsSvc,
  storageSvc ?: StorageSvc,
  locationSvc ?: LocationSvc,
  loggingSvc ?: LoggingSvc,
  utilsSvc ?: UtilsSvc,
  navigation ?: any
}, {} > {

  @observable limitFormOpen       : boolean;
  @observable limitFormDone       : string;
  @observable waitingForElevData  : boolean;
  @observable showStepsPerMin     : boolean;
  @observable showTotalCalories   : boolean;

  _didFocusSubscription;
  _willBlurSubscription;
  
  trekInfo = this.props.trekInfo;
  glS = this.props.locationSvc;
  logSvc = this.props.loggingSvc;
  palette = this.props.uiTheme.palette;
  activeNav = '';
  limitProps : LimitsObj = {} as LimitsObj;
  typeSDRef : RefObject<SpeedDial>;

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};

    return {
      header: <TrekLogHeader titleText={params.title}
                                   icon={params.icon}
                                   logo
              />,
    };
  }  

  constructor(props) {
    super(props);
    this.typeSDRef = React.createRef();
    this._didFocusSubscription = props.navigation.addListener('didFocus', () => {
      BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPressAndroid);
      this.init();
    });  
  }

  componentWillMount() {
    this.initializeObservables();
    this.props.navigation.setParams({ checkBackButton: this.checkBackButton });
    this.trekInfo.setAppReady(false);
    this.trekInfo.resObj = undefined;
    this.props.storageSvc.fetchRestoreObj()
    .then((ro : RestoreObject) => {
      this.props.storageSvc.removeRestoreObj();
      this.trekInfo.resObj = ro;
      this.trekInfo.restoreLogState(ro);
      this.trekInfo.setAppReady(true);
      this.logSvc.smoothTrek();
      if(ro.timerOn){
        this.logSvc.startTrekTimer();
      }
      if (ro.timeLimit){
        this.startLimitTimer();
      }
      this.logSvc.watchGeolocationPosition(this.gotPos, false);
      // this.setHeaderParams("Logging");
      if (ro.showMapInLog){
        this.props.navigation.navigate('LogTrekMap');
      }
      if (ro.saveDialogOpen) {
        this.stopLogging();
      }
      else {
        if (ro.trekLabelFormOpen) {
          this.setPendingReview(true);
          this.setTrekLabel();
        }
        else {
          if (ro.cancelDialogOpen) {
            this.checkBackButton();
          }
        }
      }
    })
    .catch(() => {  // nothingToRestore
      this.trekInfo.setAppReady(true);
      this.trekInfo.init()
      .then(() => {
        // Get the current GPS position so the log map shows where we are
        this.props.locationSvc.getCurrentLocation((location) => {    
            this.trekInfo.initialLoc = {latitude: location.latitude, longitude: location.longitude};
            this.props.locationSvc.stopGeolocation();
          },
          { enableHighAccuracy: true, 
            maximumAge        : 0, 
            timeout           : 30000
          }
        );
      })
      .catch((err) => {
        // need to create a use or enter settings
        switch(err){
          case 'NO_USES':
          case 'NO_SETTINGS':
            this.props.toastSvc.toastOpen({tType: 'Info', content: 'Please enter your initial settings.', time: 3000});
            this.props.navigation.dispatch(gotoSettings);      
            break;
          default:
        }
      })
    })
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener('willBlur', () =>
      BackHandler.removeEventListener('hardwareBackPress', this.onBackButtonPressAndroid));
    // if(!this.trekInfo.resObj){
    //   if (this.trekInfo.settingsFound !== 'OK') {
    //     this.props.toastSvc.toastOpen({tType: 'Info', content: 'Please enter your initial settings.', time: 3000});
    //     this.props.navigation.dispatch(gotoSettings);      
    //   }
    // } 
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
    this.limitFormDone = '';
    this.waitingForElevData = false;
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
   }

  checkBackButton = () => {
    requestAnimationFrame(() =>{
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  }

  onBackButtonPressAndroid = () => {
    const {infoConfirmColor, infoConfirmTextColor} = this.props.uiTheme.palette;

    if (this.trekInfo.logging || this.trekInfo.pendingReview) {
      if(this.trekInfo.saveDialogOpen){ return true; }  // ignore back button if save dialog is open
      if(this.trekInfo.pendingReview && this.trekInfo.trekSaved) {
        this.reviewFinished();
        return true;
      }
      let labelFormOpen = this.trekInfo.trekLabelFormOpen;
      if(labelFormOpen){
        this.logSvc.closeLabelForm();
      }
      this.trekInfo.setCancelDialogOpen(true);
      this.props.modalSvc.simpleOpen({heading: 'Cancel Log', 
                  content: "CANCEL logging this " + this.trekInfo.type + "?", 
                  cancelText: 'NO', okText: 'YES', headingIcon: this.trekInfo.type,
                  headingStartColor: infoConfirmColor, headingTextColor: infoConfirmTextColor})
      .then(() => {
        this.trekInfo.setCancelDialogOpen(false);
        this.logSvc.stopTrek();
        this.finalizeTrek();
        this.abortLogging(' has been canceled.')
      })
      .catch(() =>{ 
        this.trekInfo.setCancelDialogOpen(false);
        if(labelFormOpen){
          this.logSvc.openLabelForm();
        }
      })
      return true;
    } else {
      return false;
    }
  }

  init = () => {
    if (this.trekInfo.appReady && !this.trekInfo.logging && !this.trekInfo.pendingReview) {
      this.trekInfo.init()
      .then(() => {
        this.logSvc.resetTrek();
        this.trekInfo.clearTrek();
        this.logSvc.setDate();
        this.trekInfo.setShowMapInLog(false);
        this.setHeaderParams("Ready to Log");
      })
      .catch((err) => {
        // need to create a use or enter settings
        switch(err){
          case 'NO_USES':
          case 'NO_SETTINGS':
            this.props.navigation.navigate('Settings');
            break;
          default:
        }
      })
    }
  }

  // set up the parameters for the header controls
  setHeaderParams = (msg: string) => {
    this.props.navigation.setParams({ title: msg, icon: this.trekInfo.type});
  }

  @action
  closeSpeedDials = () => {
    // alert(JSON.stringify(this.typeSDRef.current.setOpen.))
    // this.typeSDRef.current.setOpen(false);
  }

  // set the value of the limitFormOpen property to false
  @action
  closeLimitForm = () => {
    this.setLimitFormOpen(false);
  }

  // set the value of the limitFormOpen property
  @action
  setLimitFormOpen = (status: boolean) => {
    this.limitFormOpen = status;
  }

  // set the value of the limitFormDone property
  @action
  setLimitFormDone = (value: string) => {
    this.limitFormDone = value;
  }

  // set the value of the waitingForElevData property
  @action
  setWaitingForElevData = (status: boolean) => {
    this.waitingForElevData = status;
  }

  // set the value of the pendingPreview property
  @action
  setPendingReview = (status: boolean) => {
    this.trekInfo.pendingReview = status;
  }

  // // Called when GPS receives a data point
  gotPos = (location: Location) => {
    if (!(this.trekInfo.limitsActive && this.trekInfo.limitTrekDone) && this.logSvc.addPoint(location)) {
      if (this.trekInfo.distLimit && (this.trekInfo.trekDist > this.trekInfo.distLimit)) {
        this.trekInfo.limitTrekDone = true;
        this.stopLimitedTrek();
      }  
      if (this.trekInfo.trekPointCount === 1) {
        requestAnimationFrame(() => {
          this.logSvc.setLayoutOpts('Current');
        })
        if (this.trekInfo.timeLimit !== 0  || this.trekInfo.distLimit !== 0) { 
          this.giveVibrationStartSignal();
        }
      }
    }  
  }

  // Start the logging process, timer starts when 1st GPS point recieved
  startLogging = () => {
    this.logSvc.startTrek();                // this sets minPointDist
    this.trekInfo.setSpeedDialZoom(true);
    this.logSvc.watchGeolocationPosition(this.gotPos, true);
    this.setHeaderParams("Logging");
  }

  // Stop the logging process. If there is something to save, confirm intentions with the user
  stopLogging = () => {
    const {infoConfirmColor, infoConfirmTextColor} = this.props.uiTheme.palette;
    let noPts = this.trekInfo.pointListEmpty() && !this.trekInfo.resObj;
    let saveText = noPts ? 'Abort' : 'Save'
    let discardText = noPts ? ' has been aborted.' : " has been discarded.";

    // Confirm user wants to save/discard this trek then take appropriate action.
    this.trekInfo.setSaveDialogOpen(true);
    this.props.modalSvc.simpleOpen({heading: saveText + ' ' + this.trekInfo.type, 
                content: "Do you want to " +  saveText.toLowerCase() + " this " + this.trekInfo.type + "?", 
                cancelText: (!this.trekInfo.limitsActive || !this.trekInfo.limitTrekDone) ? 'CANCEL' : '', 
                deleteText: noPts ? undefined : 'DISCARD', 
                okText: saveText.toUpperCase(),
                headingIcon: this.trekInfo.type,
                headingTextColor: infoConfirmTextColor,
                headingStartColor: infoConfirmColor})
    .then((resp) => {
      this.trekInfo.setSaveDialogOpen(false);
      this.logSvc.stopTrek();
      this.finalizeTrek();
      if ((resp === 'SAVE') && (this.trekInfo.trekPointCount !== 0)) {
        this.willSaveTrek();
      }
      else {        // DISCARD or ABORT
        this.abortLogging(discardText);
      }
    })
    .catch(() =>{ // CANCEL, DO NOTHING
      this.trekInfo.setSaveDialogOpen(false);
    })
  }

  abortLogging = (discardText) => {
    this.closeStatsAndDetails();
    this.props.storageSvc.removeRestoreObj();
    this.trekInfo.resObj = undefined;
    this.trekInfo.setLimitsActive(false);
    this.discardTrek();
    this.glS.shutDownGeolocation();
    this.props.toastSvc.toastOpen({tType: 'Success', content: this.trekInfo.type + discardText})
    this.trekInfo.setShowMapInLog(false);
  }

  // logging has ended, shut down Geolocation and update UI
  finalizeTrek = () => {
    this.trekInfo.limitTrekDone = false;
    this.trekInfo.setTimeLimitInfo({value: 0, units: this.trekInfo.units});
    this.trekInfo.setDistLimitInfo({value: 0, units: this.trekInfo.units});
  }

  // Called when user chooses to save the trek log
  willSaveTrek = () => {  
    this.setPendingReview(true);
    this.trekInfo.setLimitsActive(false);
    this.setWaitingForElevData(true);
    this.trekInfo.setElevationProperties()  // call Elevation API to get elevations
    .then(() => {
      this.getWeather();
    })
    .catch(() => {
      this.props.toastSvc.toastOpen({tType: 'Error', content: 'Error retreiving elevation data.'})
      this.getWeather();
    })
  }

  // call the weather service to get the weather conditions
  getWeather = () => {
    let loc = this.trekInfo.pointList[0].l;
    
    this.props.weatherSvc.getWeatherData({ type: 'W', pos: {latitude: loc.a, longitude: loc.o} })
    .then((data) => { 
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
    })
  }

  // open the label/notes form for the user
  setTrekLabel = () => {
    this.logSvc.editTrekLabel(true)       // denote new trek
    .then(() => {
      this.finishTrekLog();
    })
    .catch(() => {
      this.finishTrekLog();
    })
  }

  // finish up saving the log
  finishTrekLog = () => {
    this.glS.shutDownGeolocation();
    this.saveTrek();
    this.props.storageSvc.removeRestoreObj();
    this.trekInfo.resObj = undefined;
    this.logSvc.setLayoutOpts('All');
    this.openGoalNotification();
    this.setHeaderParams("Log Review");
    this.updateStatsOpen(false);
    this.trekInfo.setSpeedDialZoom(false);
  }

  // user is finished with post-log review
  reviewFinished = () => {
    this.trekInfo.updateTrekSaved(false);
    this.setPendingReview(false);
    this.discardTrek();
    this.trekInfo.setShowMapInLog(false);
  }

  // Open the Trek Limits form using TIME parameters
  openTimeLimitsForm = () => {
    let units = ['minutes', 'hours'];
    this.limitProps = {heading: "Stop after a Time", headingIcon: "TimerSand", 
    onChangeFn: this.trekInfo.setTimeLimitInfo,    
    label: "Auto stop " + this.trekInfo.type + " after how long?", 
    placeholderValue: this.trekInfo.lastTime.toString(), units: units, defaultUnits: this.trekInfo.lastTimeUnits,
    closeFn: this.startTimedLogging}
    this.setLimitFormOpen(true);
  }
  
  // Open the Trek Limits form using DISTANCE parameters
  openDistLimitsForm = () => {
    let units = ['meters', DIST_UNIT_LONG_NAMES[this.trekInfo.measurementSystem]];
    this.limitProps = {heading: "Stop after a Distance", headingIcon: "CompassMath",     
        onChangeFn: this.trekInfo.setDistLimitInfo,    
        label: 'Auto stop ' + this.trekInfo.type + ' after what distance?', placeholderValue: this.trekInfo.lastDist.toString(),
        units: units, defaultUnits: this.trekInfo.lastDistUnits, closeFn: this.startDistLogging};
    this.setLimitFormOpen(true);
  }

  // Open the Trek Limits form using HIKE parameters
  openPackWeightForm = () => {
    let units = [WEIGHT_UNIT_CHOICES[this.trekInfo.measurementSystem]];
    let phVal = this.trekInfo.lastPackWeight;
    phVal =  phVal !== undefined ? phVal : this.trekInfo.convertWeight(this.trekInfo.packWeight, true);
    this.limitProps = {heading: "Backpack Weight", headingIcon: "Hike", 
    onChangeFn: this.trekInfo.setPackWeightInfo,    
    label: "Weight of your backpack:", 
    placeholderValue: phVal.toString(), units: units, defaultUnits: units[0], 
    closeFn: this.startHike}
    this.setLimitFormOpen(true);
  }
  
  // Start the logging process for a TIME limited trek.
  @action
  startTimedLogging = (start: boolean) => {
    this.setLimitFormDone('')
    this.trekInfo.lastTimeUnits = this.trekInfo.units;
    if (start){
      this.trekInfo.setLimitsActive(true);
      this.trekInfo.lastTime = this.trekInfo.timeLimit;
      this.trekInfo.timeLimit *= this.trekInfo.units === 'minutes' ? 60000 : 3600000;   // convert to miliseconds
      this.startLogging();
    } 
    this.closeLimitForm();
  }
  
  // Start the logging process for a DISTANCE limited trek.
  @action
  startDistLogging = (start: boolean) => {
    this.setLimitFormDone('')
    if (start) {
      this.trekInfo.setLimitsActive(true);
      this.trekInfo.lastDist = this.trekInfo.distLimit;
      this.trekInfo.lastDistUnits = this.trekInfo.units;
      if (this.trekInfo.units !== 'meters'){ //km or mi?
        this.trekInfo.setDistLimit(this.trekInfo.distLimit * ((this.trekInfo.measurementSystem === 'US') 
                                                                ? M_PER_MILE : 1000)); // convert to meters
      }
      this.startLogging();
    } 
    this.closeLimitForm();
  }
   
  // Start the logging process for a Hike.
  startHike = (start: boolean) => {
    this.setLimitFormDone('')
    if (start){
      this.trekInfo.lastPackWeight = this.trekInfo.measurementSystem === 'US' ? 
                         Math.round(this.trekInfo.packWeight * LB_PER_KG) : this.trekInfo.packWeight;
      this.startLogging();
    }
    this.closeLimitForm();
  }
  
  // Vibrate a start warning sequence then a longer single vibration from 2-3 seconds later to indicate START.
  giveVibrationStartSignal = () => {
      this.props.toastSvc.toastOpen({tType: "Success", content: 'Start ' + TREK_VERBS_OBJ[this.trekInfo.type]});
      Vibration.vibrate(START_VIB, false);
      if(this.trekInfo.timeLimit !== 0) { 
        this.logSvc.updateDuration(0);
        this.logSvc.setStartTime();   // Update start time to after recieve inital GPS point
        this.startLimitTimer(); 
      }
  }

  // Start a timer to watch for the timeLimit to expire on a timed Trek
  startLimitTimer = () => {
    this.trekInfo.limitTimerId = window.setInterval(() =>{
      if (!this.trekInfo.limitTrekDone && 
            ((new Date().getTime() - this.trekInfo.startMS) >= this.trekInfo.timeLimit)){
        this.trekInfo.limitTrekDone = true;
        this.stopLimitedTrek();
      }
    }, 1000)
  }

  // Time/Distance limit has been reached. Inform user it is time to stop and stop logging.
  stopLimitedTrek = () => {
    this.stopLogging();
    this.props.toastSvc.toastOpen({tType: "Error", content: 'Stop ' + TREK_VERBS_OBJ[this.trekInfo.type], time: 3000});
    Vibration.vibrate(STOP_VIB, false);
  }

  // Save to database if necessary then mark trek as saved
  saveTrek = () => {

    this.trekInfo.computeCalories();
    this.trekInfo.updateTrekSaved(true);  // denote save issue done
    this.trekInfo.saveTrek(this.trekInfo.getSaveObj())
    .then(() => {
      this.props.toastSvc.toastOpen({tType: 'Success', content: this.trekInfo.type + ' has been saved.'})
    })
    .catch (() => {
      this.props.toastSvc.toastOpen({tType: 'Error', content: 'Error saving ' + this.trekInfo.type + '.'});
    })  
  };
    
  discardTrek = () => {
    this.logSvc.resetTrek();
    this.trekInfo.clearTrek();
    this.closeStatsAndDetails();
    this.setHeaderParams("Ready to Log");
  }

  // Update the value of the statsOpen property
  @action
  updateStatsOpen = (status: boolean) => {
    this.trekInfo.setUpdateMap(true);
    this.trekInfo.setStatsOpen(status);
  }

  // Close the NumbersBar
  @action
  closeStatsAndDetails = () => {
    this.trekInfo.setUpdateMap(true);
    this.trekInfo.statsOpen = false;
  }

  openGoalNotification = () => {
    let plural;
    let msg;
    let itemList = [];

    this.props.goalsSvc.checkTrekAgainstGoals(this.trekInfo.getSaveObj())
    .then((goals: {goal: GoalObj, item: GoalDisplayItem}[]) => {
      if (goals.length) {
        plural = goals.length > 1 ? 's' : '';
        msg = 'The ' + this.trekInfo.type + ' you just completed\n achieves your goal' + plural + ' of:\n';
        goals.forEach((gli) => {
          itemList.push({goalStmt: this.props.goalsSvc.formatGoalStatement(gli.goal)});
        })
        this.props.modalSvc.goalNoticeOpen({ 
                heading: 'Goal' + plural + ' Achieved!',
                content: msg, 
                itemList: itemList,
                okText: "KEEP IT UP!"})
      }
    })
    .catch(() => {})    // no applicable goals found or met
  }
  
  selectTrekType = (value: TrekType) => {
    this.props.navigation.setParams({icon: value});
    this.trekInfo.updateType(value);
  }

  // respond to action from controls
  setActiveNav = (val) => {
    requestAnimationFrame(() =>{
      this.activeNav = val;
      switch(val){
        case 'StartU':
          this.startLogging();
          break;
        case 'StartT':
          this.closeSpeedDials();
          this.openTimeLimitsForm();
          break;
        case 'StartH':
          this.closeSpeedDials();
          this.openPackWeightForm();
          break;
        case 'StartD':
          this.closeSpeedDials();
          this.openDistLimitsForm();
          break;
        case 'Stop':
          this.stopLogging();
          break;
        case 'Summary':
        case 'Goals':
        case 'Settings':
        this.trekInfo.updateDashboard = false;
        this.props.navigation.navigate(val);
          break;
        case 'Stats':
            this.updateStatsOpen(!this.trekInfo.statsOpen);   
          break;
        case 'ReviewDone':
          this.reviewFinished();
          break;
        case 'LimitsDone':
          this.setLimitFormDone('Dismiss');
          break;
        case 'LimitsContinue':
          this.setLimitFormDone('Close');
          break;
        case 'ShowMap':
          this.trekInfo.setShowMapInLog(true);
          this.props.navigation.navigate('LogTrekMap');
          break;
        default:
      }
    });
  }

  formattedCurrentSpeed = () => {
    let sp = this.trekInfo.formattedCurrentSpeed() as string;
    let i = sp.indexOf(' ');
    return {value: sp.substr(0, i), units: sp.substr(i)};
  }

  formattedCals = () => {
    let val = this.showTotalCalories ? this.trekInfo.currentCalories : this.trekInfo.currentNetCalories;
    let prec = val < 10 ? 10 : 1;
    let finalVal = (Math.round(val * prec) / prec);

    if (isNaN(finalVal) || finalVal < 0) { finalVal = 0; }
    return {value: finalVal.toString(),
            units: (this.showTotalCalories ? ' cals' : ' net cals ')}; 
  }

  formattedSteps = () => {
    let st = this.trekInfo.formattedSteps(this.showStepsPerMin);
    if(this.showStepsPerMin){ st = st.substr(0, st.indexOf(' ')); }
    return {value: st, units: (this.showStepsPerMin ? ' steps/min' : ' steps')};
  }

  // return average speed or pace of the trek (or interval if specified)
  displaySpeedOrPace = (showSpeed: boolean) => {
    let sp = showSpeed ? this.trekInfo.formattedAvgSpeed() : this.trekInfo.formattedTimePerDist();
    let i = sp.indexOf(' ');

    return {value: sp.substr(0,i), units: sp.substr(i) + ' avg'};
  }

  // toggle between displaying time/distance and distance/time
  toggleAvgSpeedorTimeDisplay = () => {
    this.props.trekInfo.updateShowSpeedOrTime(SWITCH_SPEED_AND_TIME[this.props.trekInfo.showSpeedOrTime]);
  }

  // toggle between displaying total steps and steps/min
  @action
  toggleShowStepsPerMin = () => {
    this.showStepsPerMin = !this.showStepsPerMin;
  }

  // toggle between displaying total calories and net calories
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
  }

  // format the title for the default log screen.
  // change according to the activity and speed
  formatBigTitle = (startOk: boolean, reviewOk) : string => {
    let thisType = this.trekInfo.type;
    let label = '';
    let sr = 0;;

    if (startOk ) {
      label = 'Start ' + TREK_TYPE_LABELS[thisType];
    }
    else {
      if (reviewOk) {
        label = TREK_TYPE_LABELS[thisType] + ' Complete';
      }
      else {
        if(this.trekInfo.trekPointCount){
          let sp = this.trekInfo.formattedCurrentSpeed(this.trekInfo.measurementSystem, true) as number;
          // what is the speed range for the current speed
          sr = this.props.utilsSvc.findRangeIndex( sp, ACTIVITY_SPEEDS);
          if (sp === 0){
            label = 'Stopped';
            this.trekInfo.haveShownDriving = false;
          } else {
            if (!this.trekInfo.haveShownDriving) {
              label = ACTIVITY_BY_SPEED[thisType][sr];
              this.trekInfo.haveShownDriving = label === 'Driving';
            } else {
              label = 'Driving';
            }
          }
        }
      }
    }
    return label;
  }

  render () {

    const numPts = this.trekInfo.trekPointCount;
    const thisType = this.trekInfo.type;
    const limitsOk = this.limitFormOpen;
    const stopOk = !limitsOk && !this.waitingForElevData && 
                    (this.trekInfo.timerOn || this.trekInfo.logging || this.trekInfo.limitsActive);
    const startOk = !limitsOk && !stopOk && !this.trekInfo.pendingReview;
    const reviewOk = !limitsOk && !stopOk && this.trekInfo.pendingReview;
    // if(this.trekInfo.resObj){
    //   alert(limitsOk + '\n' + stopOk + '\n' + startOk + '\n' + reviewOk + '\n' + this.trekInfo.pendingReview)
    // }
    const { controlsArea, navItem, navIcon, roundedTop } = this.props.uiTheme;
    const { secondaryColor, navIconColor, highTextColor, trekLogBlue, pageBackground,
            disabledTextColor } = this.props.uiTheme.palette;
    const navIconSize = 24;
    const bigButtonSize = 150;
    const bigIconSize = 64;
    const bigTitle = this.formatBigTitle(startOk, reviewOk); 
    const showSpeed = this.trekInfo.showSpeedOrTime === 'speed';

    const typeActions : SpeedDialItem[] = 
            [{icon: 'Walk', label: 'Walk', value: 'Walk'},
             {icon: 'Run', label: 'Run', value: 'Run'},
             {icon: 'Bike', label: 'Bike', value: 'Bike'},
             {icon: 'Hike', label: 'Hike', value: 'Hike'}]
 

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      speedDialTrigger: {
        backgroundColor: secondaryColor,
      },
      bigStats: {
        paddingTop: 20,
        paddingBottom: 20,
        alignItems: "center",
        justifyContent: "center",
      },
      bigStatPair: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      bigStat: {
        fontSize: 52,
        fontWeight: "300",
        color: highTextColor,
      },
      bigStatUnits: {
        fontSize: 36,
        fontWeight: "300",
        color: trekLogBlue,
        marginTop: 8,
      },
      bigTitle: {
        marginTop: 20,
        fontSize: 44,
        fontWeight: "300",
        color: disabledTextColor,
      },
      bigStart: {
        minHeight: bigButtonSize,
        minWidth: bigButtonSize,
        borderRadius: bigButtonSize / 2,
        padding: (bigButtonSize / 2) / 4,
        // borderColor: trekLogBlue,
      }
    })

    const cBorder = this.trekInfo.statsOpen ? {borderTopColor: 'transparent'} : roundedTop;

    return (
      <View style={[styles.container]}>
        {(this.waitingForElevData) &&
          <Waiting 
            msg="Obtaining elevation data..."
            bgColor="rgba(255,255,255,.85)"
          />
        }
        {(numPts === 0 && this.trekInfo.logging) &&
          <Waiting 
            msg="Obtaining current position..."
            bgColor="rgba(255,255,255,.85)"
          />
        }
        <TrekLimitsForm
          bottom={CONTROLS_HEIGHT}
          open={this.limitFormOpen}
          done={this.limitFormDone}
          limits={this.limitProps}
        />
        <View style={[styles.container, 
                    {bottom: CONTROLS_HEIGHT, alignItems: "center"}]}>
          <Text style={styles.bigTitle}>
            {bigTitle}
          </Text>
          {(!this.trekInfo.logging && !reviewOk) &&
            <View style={{flex: 1, justifyContent: "center"}}>
              <IconButton 
                iconSize={bigIconSize}
                icon="Play"
                style={[navItem, styles.bigStart]}
                buttonSize={bigButtonSize}
                raised
                iconStyle={navIcon}
                color={navIconColor}
                onPressFn={this.setActiveNav}
                onPressArg="StartU"
              />
            </View>
          }
          {(numPts === 0 && !this.trekInfo.logging) &&
            <SpeedDial
              icon="CompassMath"
              bottom={135}
              selectFn={() => this.setActiveNav('StartD')}
              style={styles.speedDialTrigger}
              iconSize="Large"
            />
          }
          {(numPts === 0 && !this.trekInfo.logging) &&
            <SpeedDial
              icon="TimerSand"
              bottom={70}
              selectFn={() => this.setActiveNav('StartT')}
              style={styles.speedDialTrigger}
              iconSize="Large"
            />
          }
          {(numPts === 0 && !this.trekInfo.logging && this.trekInfo.type === 'Hike') &&
            <SpeedDial
              icon="Sack"
              bottom={200}
              selectFn={() => this.setActiveNav('StartH')}
              style={styles.speedDialTrigger}
              iconSize="Large"
            />
          }
          {(numPts === 0 && !this.trekInfo.logging) &&
            <SpeedDial
              ref={this.typeSDRef}
              icon={this.trekInfo.type}
              bottom={5}
              items={typeActions}
              selectFn={this.selectTrekType}
              style={styles.speedDialTrigger}
              horizontal={true}
              iconSize="Large"
            />
          }
          <View style={{flex: 1, justifyContent: "space-around", alignItems: "center"}}>
            {(numPts > 0) &&
              <View style={styles.bigStats}>
                <View style={styles.bigStatPair}>
                  <Text style={[styles.bigStat]}>{this.trekInfo.formattedDist()}</Text>
                </View>
                <View style={styles.bigStatPair}>
                  <Text style={[styles.bigStat]}>{this.trekInfo.formattedDuration()}</Text>
                </View>
                {stopOk && 
                  <View style={styles.bigStatPair}>
                    <Text style={[styles.bigStat]}>{this.formattedCurrentSpeed().value}</Text>
                    <TouchableNativeFeedback
                        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                        onPress={this.trekInfo.switchMeasurementSystem}>
                      <Text style={[styles.bigStatUnits]}>{this.formattedCurrentSpeed().units}</Text>
                    </TouchableNativeFeedback>
                  </View>
                }
                {reviewOk &&
                  <View style={styles.bigStatPair}>
                    <Text style={[styles.bigStat]}>{this.displaySpeedOrPace(showSpeed).value}</Text>
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                      onPress={this.toggleAvgSpeedorTimeDisplay}>
                        <Text style={[styles.bigStatUnits]}>{this.displaySpeedOrPace(showSpeed).units}</Text>
                    </TouchableNativeFeedback>
                  </View>
                }
                <View style={styles.bigStatPair}>
                  <Text style={[styles.bigStat]}>{this.formattedCals().value}</Text>
                  <TouchableNativeFeedback
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                      onPress={this.toggleShowTotalCalories}>
                    <Text style={[styles.bigStatUnits]}>{this.formattedCals().units}</Text>
                  </TouchableNativeFeedback>
                </View>
                {thisType !== TREK_TYPE_BIKE &&
                  <View style={styles.bigStatPair}>
                    <Text style={[styles.bigStat]}>{this.formattedSteps().value}</Text>
                    <TouchableNativeFeedback
                        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                        onPress={this.toggleShowStepsPerMin}>
                      <Text style={[styles.bigStatUnits]}>{this.formattedSteps().units}</Text>
                    </TouchableNativeFeedback>
                  </View>
                }
              </View>
            }
          </View>
        </View>
        {(startOk && !reviewOk) &&
          <View style={[controlsArea, cBorder]}>
            <IconButton 
              iconSize={navIconSize}
              icon="Sigma"
              style={navItem}
              raised
              iconStyle={navIcon}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="Summary"
            />
            <IconButton 
              iconSize={navIconSize}
              icon="Certificate"
              style={navItem}
              iconStyle={navIcon}
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
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Settings"
            />
          </View>
        }
        {stopOk &&
          <View style={[controlsArea, cBorder]}>
            <IconButton 
              iconSize={navIconSize}
              icon="Stop"
              style={navItem}
              raised
              iconStyle={navIcon}
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="Stop"
            />
            <IconButton 
              iconSize={navIconSize}
              icon="Map"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="ShowMap"
            />
          </View>
        }
        {reviewOk &&
          <View style={[controlsArea, cBorder]}>
              <IconButton 
                iconSize={navIconSize}
                icon="ArrowBack"
                style={navItem}
                iconStyle={navIcon}
                raised
                color={navIconColor}
                onPressFn={this.setActiveNav}
                onPressArg="ReviewDone"
              />
            <IconButton 
              iconSize={navIconSize}
              icon="Map"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="ShowMap"
            />
          </View>
        }
        {limitsOk &&
          <View style={[controlsArea, cBorder]}>
            <IconButton 
              iconSize={navIconSize}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              raised
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="LimitsDone"
            />
            <IconButton 
              iconSize={navIconSize}
              icon="Play"
              style={navItem}
              iconStyle={navIcon}
              raised
              color={navIconColor}
              onPressFn={this.setActiveNav}
              onPressArg="LimitsContinue"
            />
          </View>
        }
      </View>
    )   
  }
}

export default LogTrek;

