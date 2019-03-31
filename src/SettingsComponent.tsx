import React, { Component } from 'react'
import { View, StyleSheet, Text, TextInput, ScrollView, Keyboard, 
          TouchableNativeFeedback } from 'react-native'
import { observable, action } from 'mobx'
import { observer, inject } from 'mobx-react'
import { NavigationActions } from 'react-navigation';

import { TrekInfo, TrekType, MeasurementSystemType, DEFAULT_STRIDE_LENGTHS, STRIDE_CONVERSION_FACTORS,
         WEIGHT_UNIT_CHOICES, STRIDE_UNIT_CHOICES, TREK_TYPE_CHOICES, TrekTypeDataNumeric,
         TREK_SELECT_BITS} from './TrekInfoModel'
import RadioGroup from './RadioGroupComponent';
import TrekTypeSelect from './TrekTypeSelectComponent';
import { ToastModel } from './ToastModel';
import { CONTROLS_HEIGHT } from './App';
import { UtilsSvc, LB_PER_KG, CM_PER_INCH } from './UtilsService';
import { ModalModel } from './ModalModel';
import Waiting from './WaitingComponent';
import { StorageSvc } from './StorageService';
import SpeedDial from './SpeedDialComponent';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import TextInputField from './TextInputFieldComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import IconButton from './IconButtonComponent';

export interface WeightObj {
  date: string,       // a short (8-char) sortDate
  weight: number
}

export interface SettingsObj {
  user:         string,
  type:         TrekType,
  measurementSystem: MeasurementSystemType,
  height:       number,
  strideLengths: TrekTypeDataNumeric,
  weights:       WeightObj[],
  packWeight:   number,
}

export interface UsersObj {
  users: string[],
  lastUser: string,
}

export const NO_USER = '#no#';
export const NEW_USER = '#new#';
const DEFAULT_WEIGHT = 150 / LB_PER_KG;

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'uiTheme', 'utilsSvc', 'modalSvc', 'storageSvc')
@observer
class Settings extends Component<{ 
  utilsSvc ?: UtilsSvc,
  storageSvc ?: StorageSvc,
  navigation ?: any
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  static navigationOptions = ({ navigation }) => {
    return {
      header: <TrekLogHeader titleText="Settings"
                             icon="*"
                             backButtonFn={() =>  navigation.dispatch(goBack)}
              />
    };
};  

  @observable dataReady;
  @observable changingUser;
  @observable user;
  @observable defaultType : TrekType;
  @observable system : MeasurementSystemType;
  @observable weightStr;
  @observable heightStr;
  @observable packWeightStr;
  @observable strideLengthStr;
  @observable newUser;
  @observable enterUser;
  @observable keyboardOpen;
  @observable originalSettings : SettingsObj;
  
  users: UsersObj = {users: [], lastUser: ''};
  todayShortDate = this.props.utilsSvc.formatShortSortDate();
  heightNum = 0;
  weightNum = 0;
  weightDate = '';
  weights : WeightObj[] = [];
  packWeightNum = 0;
  strideLengths : TrekTypeDataNumeric;

  activeNav = '';             // used by BottomNavigation component

  keyboardDidShowListener;
  keyboardDidHideListener;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentWillMount() {
    // read the Users object from the database
    this.props.storageSvc.fetchUserList()
    .then((result : any) => {
      this.users = JSON.parse(result) as UsersObj;
      if (this.users.users.length){
        this.changeUser(this.props.trekInfo.user)
      }
      else {
        this.users = {users: [], lastUser: ''};
        this.setDefaultSettings();
        this.updateDataReady(true);
        this.props.toastSvc.toastOpen({tType: "Error", content: "Please create a user."});
        this.changeUser(NEW_USER);
      }
    })
    .catch(() => {
      // Failed to read users
      this.users = {users: [], lastUser: ''};
      this.setDefaultSettings();
      this.updateDataReady(true);
      this.props.toastSvc.toastOpen({tType: "Error", content: "Please create a user."});
      this.changeUser(NEW_USER);
    })

  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.dataReady = false;
    this.changingUser = false;
    this.user = '';
    this.system = 'Metric';
    this.heightStr = '0';
    this.weightStr = '0';
    this.packWeightStr = '0';
    this.strideLengthStr = {Walk: '0', Run: '0', Bike: '0', Hike: '0'};
    this.newUser = '';
    this.enterUser = false;
    this.keyboardOpen = false;
    this.originalSettings = undefined;
  }

  @action
  setKeyboardOpen = (status: boolean) => {
    this.keyboardOpen = status;

  }
  keyboardDidShow = () => {
    this.setKeyboardOpen(true);
  }

  keyboardDidHide = () => {
    this.setKeyboardOpen(false);
  }
  
  // Get the settings for the current user
  getUsersSettings = () => {
    return new Promise((resolve, reject) => {
      this.props.storageSvc.fetchUserSettings(this.user)
      .then((result) => {
        let data = JSON.parse(result);
        this.setSystem(data.measurementSystem === 'US' ? 'Metric' : 'US');  // set to opposite of specified system
        this.heightNum = data.height !== undefined ? data.height : 0;
        this.setHeight(Math.round(data.measurementSystem === 'US' ? (this.heightNum / CM_PER_INCH) : this.heightNum).toString()); 
        this.packWeightNum = data.packWeight !== undefined ? data.packWeight : 0;
        this.setPackWeight(Math.round(data.measurementSystem === 'US' 
                ? (this.packWeightNum / CM_PER_INCH) 
                : this.packWeightNum).toString()); 
        this.strideLengths = data.strideLengths || DEFAULT_STRIDE_LENGTHS;
        if(this.strideLengths.Walk === undefined){ this.strideLengths.Walk = DEFAULT_STRIDE_LENGTHS.Walk;}
        if(this.strideLengths.Run === undefined){ this.strideLengths.Run = DEFAULT_STRIDE_LENGTHS.Run;}
        if(this.strideLengths.Bike === undefined){ this.strideLengths.Bike = DEFAULT_STRIDE_LENGTHS.Bike;}
        if(this.strideLengths.Hike === undefined){ this.strideLengths.Hike = DEFAULT_STRIDE_LENGTHS.Hike;}
        if (data.weights === undefined) {
          if (data.weight) {
            this.weights = [{weight: data.weight, date: this.todayShortDate}];
          }
          else {
            this.weights = [{weight: DEFAULT_WEIGHT, date: this.todayShortDate}];
          }
        }
        else {
          this.weights = data.weights;
        }
        this.weightDate = this.weights.length ? this.weights[this.weights.length-1].date : this.todayShortDate;
        this.weightNum = this.weights.length ? this.weights[this.weights.length-1].weight : DEFAULT_WEIGHT;
        this.switchSystem(data.measurementSystem) // this will set packWeightStr, weightStr and strideLengthStr values
        this.setDefaultType(data.type);         // having this earlier in the sequence causes error in weights array
        this.setOriginalSettings(this.getSaveObj());     // save original settings
        resolve("ok");
      })
      .catch(() => {
        // Failed to read settings
        reject('error')
      })
    })
  }

  // set the settings fields to their default values
  @action
  setDefaultSettings = () => {
    this.setDefaultType('Walk');
    this.setSystem('Metric');
    this.heightNum = 0;
    this.setHeight("0");
    this.weightDate = this.todayShortDate;
    this.weightNum = DEFAULT_WEIGHT;  // kg
    this.weights = [{weight: this.weightNum, date: this.weightDate}];
    this.packWeightNum = 0;
    this.setPackWeight("0");
    this.strideLengths = this.props.utilsSvc.copyObj(DEFAULT_STRIDE_LENGTHS) as TrekTypeDataNumeric;
    this.switchSystem('US');
    this.setOriginalSettings({} as SettingsObj);  // default to everything has changed
  }

  @action
  setOriginalSettings = (value : SettingsObj) => {
    this.originalSettings = value;
  }

  // compile the Settings object
  getSaveObj = () : SettingsObj => {
    let newWeights = [];

    this.weights[this.weights.length-1].weight = this.weightNum;
    this.weights[this.weights.length-1].date = this.weightDate;
    this.weights.forEach((item) => {
      newWeights.push({date: item.date, weight: item.weight});
    })

    return {
      user: this.user,
      type: this.defaultType,
      height: this.heightNum,
      weights: newWeights,
      measurementSystem: this.system,
      strideLengths: this.props.utilsSvc.copyObj(this.strideLengths) as TrekTypeDataNumeric,
      packWeight: this.packWeightNum,
    }
  }

  // Compare the current settings to the given settings, return true if equal
  compareSettings = (sGiven: SettingsObj) : boolean => {
    let sNow;
    
    if(sGiven === undefined) { return true; }
    sNow = this.getSaveObj();
    return this.props.utilsSvc.compareObjects(sNow, sGiven);
  }

  // Update the current TrekInfoModel settings from the given object
  @action
  updateTrekInfo = (saveObj: SettingsObj) => {
    let tI = this.props.trekInfo;

    if (this.user !== tI.user) {
      tI.setDataReady(false);    // indicate need to re-read Treks
    }
    tI.defaultTrekType = saveObj.type;
    tI.type = saveObj.type;
    tI.updateUser(saveObj.user);
    tI.updateMeasurementSystem(saveObj.measurementSystem)
    tI.updateStrideLengths(saveObj.strideLengths);
    tI.strideLength = saveObj.strideLengths[saveObj.type];
    tI.weight = saveObj.weights[saveObj.weights.length-1].weight;
    tI.packWeight = saveObj.packWeight;
  }

  // save the list of users to the database
  saveUsersList = () => {

    return new Promise((resolve, reject) => {
      this.users.lastUser = this.user;  // note last user for use on restart
      this.props.storageSvc.storeUserList(this.users)
      .then(() => {
        resolve("OK");
      })
      .catch(() => {
        reject("USERS_NOT_SAVED");
      })
    })
  }

  // save the list of users and the Settings of the current user to the database
  saveSettings = () => {
    let saveObj = this.getSaveObj();

    return new Promise((resolve, reject) => {
      this.saveUsersList()
      .then(() => {
        this.props.storageSvc.storeUserSettings(this.user, saveObj)
        .then(() => {
          this.updateTrekInfo(saveObj);
          this.setOriginalSettings(this.getSaveObj());
          setTimeout(() => {
            this.props.toastSvc.toastOpen({tType: "Success", content: "Settings updated."});
            resolve('OK');      
          }, 400);
        })
        .catch (() => {
          this.props.toastSvc.toastOpen({tType: "Error", content: "Settings changes NOT saved."});
          // Error saving data
          reject('SETTINGS_NOT_SAVED');
        })          
      })
      .catch ((error) => {
        this.props.toastSvc.toastOpen({tType: "Error", content: "User list changes NOT saved."});
        // Error saving data
        reject(error);
      })          
    })
  }

  // update the status of the dataReady property
  @action
  updateDataReady = (value: boolean) => {
    this.dataReady = value;
  }

  // update the status of the changingUser property
  @action
  updateChangingUser = (value: boolean) => {
    this.changingUser = value;
  }

  // Update the value of the user property
  @action
  setUser = (val: string) => {
    this.user = val;
  }

  @action
  setEnterUser = (status: boolean) => {
    this.enterUser = status;
  }

  // Update the value of the newUser property
  @action
  setNewUser = (val: string) => {
    this.newUser = val;
  }

  @action
  setDefaultType = (value: TrekType) => {
    this.defaultType = value;
  }

  // set the value of the system property
  @action
  setSystem = (value: MeasurementSystemType) => {
    this.system = value;
  }

  // set weight property 
  @action
  setWeight = (value: string) => {
    this.weightStr = value;
  }

  // set height property 
  @action
  setHeight = (value: string) => {
    this.heightStr = value;
  }

  // set weight property 
  @action
  setPackWeight = (value: string) => {
    this.packWeightStr = value;
  }

  // Change to the settings for the given user
  changeUser = (value: string) => {
    const {infoConfirmColor, infoConfirmTextColor} = this.props.uiTheme.palette;

    if (value === NEW_USER) {
      this.setEnterUser(true);
    }
    else {
      if (this.user !== '' && this.user !== value){
        if (!this.compareSettings(this.originalSettings)) {
          this.props.modalSvc.simpleOpen({heading: "Save Settings", headingIcon: "Settings",  
                                          headingStartColor: infoConfirmColor, 
                                          headingTextColor: infoConfirmTextColor, 
                                          content: "Save changes to settings for "+this.user+"?", 
                                          cancelText: 'DISCARD', okText: 'SAVE'})
          .then(() => {
            this.saveSettings()
            .then(() =>{
              this.finishSetUser(value);
            })
            .catch(() => {}) // error saving, user will not change
          })
          .catch(() =>{
            this.finishSetUser(value);
          })
        }
        else {
          this.finishSetUser(value);
        }
      }
      else {
        this.finishSetUser(value);
      }
    }
  }

  @action
  finishSetUser = (value: string) => {
    this.updateChangingUser(true);
    this.setUser(value);
    this.saveUsersList();
    this.getUsersSettings()
    .then(() =>{
      this.updateTrekInfo(this.originalSettings);
      this.updateDataReady(true);
      this.updateChangingUser(false);
    })
    .catch(() => {
      // Failed to read settings for new user
      this.setDefaultSettings();
      this.saveSettings();
      this.updateDataReady(true);
      this.updateChangingUser(false);
    })
  }

  deleteUser = (name: string) => {
    let pending : Promise<any>[] = [];
    let i = this.users.users.indexOf(name);

    return new Promise((resolve, reject) => {
      if (i !== -1){
        this.users.users.splice(i,1);
        if (this.users.users.length > 0){
          this.setUser(this.users.users[0]);
        }
        else {
          // they deleted the only user

          this.setUser('');
        }

        // save users list (ignore the result)
        this.saveUsersList();

        // remove the settings data for the user (ignore the result)
        this.props.storageSvc.deleteUserSettings(name);

        // now delete all their treks
        this.props.storageSvc.getAllTrekKeys(name)
        .then((list : string[]) => {
          if (list.length){                 // anything to delete?
            list.forEach((key) => {
              pending.push(this.props.storageSvc.removeItem(key));
            });
            Promise.all(pending)
            .then(() => {
              this.props.toastSvc.toastOpen({tType: "Info", content: "Successfully deleted " + name});
              resolve("OK");
            })
            .catch(() => {
              this.props.toastSvc.toastOpen({tType: "Error", content: "Error deleting treks for " + name});
              reject("ERROR_DELETING_TREKS");
            })
          }
          else {          // nothing to delete
            this.props.toastSvc.toastOpen({tType: "Info", content: "Successfully deleted " + name});
            resolve("OK");
          }
        })
        .catch(() => {
          this.props.toastSvc.toastOpen({tType: "Error", content: "Error reading treks for " + name});
          reject("ERROR_READING_TREKS");
        })
      }
      else {
        reject("NO_SUCH_USER");
      }
    })
  }

  deleteThisUser = () => {

    requestAnimationFrame(() => {  // pause for touch effect to show
      this.props.modalSvc.simpleOpen({heading: "Delete User", headingIcon: "Delete",     
        content: "Delete settings and treks for " + this.user + "?", 
        cancelText: 'CANCEL', deleteText: 'DELETE'})
      .then(() => {
        this.deleteUser(this.user)
        .then(() => {
          this.changeUser(this.user !== '' ? this.user : NEW_USER);
        })
        .catch(() => {
          this.changeUser(this.user);
        })
      })
      .catch(() => {
      });
    });
  }

  // abort creating a new user
  @action
  cancelNewUser = () => {
    requestAnimationFrame(() => {
      if( this.user !== '') { 
        this.setEnterUser(false); 
      } else {
        this.props.toastSvc.toastOpen({tType: "Error", content: "Please create a user."});
      }
      this.setNewUser('');
    });
  }

  // Add a new name to the list of users 
  addNewUser = () => {
    requestAnimationFrame(() => {
      //remove leading and trailing blanks
      let name =  this.newUser.replace(/^ */g, "")
      name =  name.replace(/ *$/g, "")
      if (name !== ''){
        if (this.users.users.indexOf(name) === -1){
          this.setEnterUser(false);
          this.users.users.push(name);
          this.saveUsersList();
          this.changeUser(name);
        }
        else {
          this.props.toastSvc.toastOpen({tType: "Error", content: "User " + name + " already exists."});
        }
        this.setNewUser('');
      }
    });
}

  // change the values displayed on the form to the selected measurement system and then set the system property
  @action
  switchSystem = (value: MeasurementSystemType) => {
    switch (this.system){
      case 'Metric':
        if (value === 'US'){
          this.setWeight(Math.round(this.weightNum * LB_PER_KG).toString());
          this.setHeight(Math.round(this.heightNum / CM_PER_INCH).toString());
          this.setPackWeight(Math.round(this.packWeightNum * LB_PER_KG).toString());
          TREK_TYPE_CHOICES.forEach((type) => {
            this.strideLengthStr[type] = 
              Math.round((this.strideLengths[type] / CM_PER_INCH) / STRIDE_CONVERSION_FACTORS[type]).toString();
          })
        }
        break;
      case 'US':
        if (value === 'Metric'){
          this.setWeight(Math.round(this.weightNum).toString());
          this.setHeight(Math.round(this.heightNum).toString());
          this.setPackWeight(Math.round(this.packWeightNum).toString());
          TREK_TYPE_CHOICES.forEach((type) => {
            this.strideLengthStr[type] = 
              Math.round(this.strideLengths[type] / STRIDE_CONVERSION_FACTORS[type]).toString();
          })
        }
        break;
      default:
    }
    this.setSystem(value);
  }

  // set a new value for the weight property
  setNewWeight = (value: string) => {
    this.weightDate = this.props.utilsSvc.formatShortSortDate();
    if (this.weightDate !== this.weights[this.weights.length-1].date){
      this.weights.push({weight: 0, date: this.weightDate})
    }
    this.weightNum = Math.round(parseFloat(value) * 100) / 100;;
    if( !isNaN(this.weightNum) ){
      if(this.system === 'US'){ this.weightNum /= LB_PER_KG };  // store values as kg
      this.weightNum = Math.round(this.weightNum * 10000) / 10000;
    }
    this.setWeight(value);
  }

  // set a new value for packWeight property
  setNewPackWeight = (value: string) => {
    this.packWeightNum = Math.round(parseFloat(value) * 100) / 100;;
    if( !isNaN(this.packWeightNum) ){
      if(this.system === 'US'){ this.packWeightNum /= LB_PER_KG };  // store values as kg
      this.packWeightNum = Math.round(this.packWeightNum * 10000) / 10000;
    }
    this.setPackWeight(value);
  }

  // Use the given height to set the various stride values if necessary
  useHeightForStrides = (value: string) => {
    let ht = Math.round(parseFloat(value) * 100) / 100;

    if (!this.strideLengths.Walk) {
      this.setStrideLength("Walk", Math.round(ht * .414).toString());
    }
    if (!this.strideLengths.Hike) {
      this.setStrideLength("Hike", Math.round(ht * .414).toString());
    }
    if (!this.strideLengths.Run) {
      this.setStrideLength("Run", Math.round(ht * .95).toString());
    }
    this.setNewHeight(value);
  }

  // Set Height property (convert value to cm if necessary)
  setNewHeight = (value: string) => {
    this.heightNum = Math.round(parseFloat(value) * 100) / 100;
    if( !isNaN(this.heightNum) ) {
      if(this.system === 'US'){ this.heightNum *= CM_PER_INCH };  // store values as kg
      this.heightNum = Math.round(this.heightNum * 10000) / 10000;
    }
    this.setHeight(value);
  }

  // set strideLength property (convert value to cm if necessary for lengths array)
  @action
  setStrideLength = (type: string, value?: string) => {
    if (value !== undefined){
      this.strideLengthStr[type] = value;
      this.strideLengths[type] = ((this.system === 'US') // keep strideLengths in cm
            ? (parseInt(value,10) * CM_PER_INCH) 
            : parseInt(value, 10)) * STRIDE_CONVERSION_FACTORS[type];
      this.strideLengths[type] = Math.round(this.strideLengths[type] * 10000) / 10000;
    }
    else {  // if no value given, just update from strideLengths
      this.strideLengthStr[type] = Math.round(((this.system === 'US') // strideLengths are in cm
      ? (this.strideLengths[type] / CM_PER_INCH) 
      : this.strideLengths[type]) / STRIDE_CONVERSION_FACTORS[type]).toString();
    }
  }

  // open the RadioPicker to change user (use)
  openRadioPicker = () => {
    let names = ['New Use'];
    let values = [NEW_USER];

    let selNames = names.concat(this.users.users);
    let selValues = values.concat(this.users.users);

    this.props.modalSvc.openRadioPicker({heading: 'Select A Use', selectionNames: selNames,
                              selectionValues: selValues, selection: this.user})
    .then((newUser) => {
      this.changeUser(newUser);
    })
    .catch(() =>{ 
    })
  }

  render() {

    const hideUpdate = this.changingUser || this.compareSettings(this.originalSettings);
    const { cardLayout, navItem, navIcon } = this.props.uiTheme;
    const settingIconSize = 24;
    const cardHeight = 100;
    const haveUsers = this.users.users.length > 0;
    const { highTextColor, mediumTextColor, disabledTextColor, secondaryColor, primaryColor,
            pageBackground, dangerColor, cancelColor, okChoiceColor, listIconColor } = this.props.uiTheme.palette;
    const userSelectIconSize = 22;
    const userSelectButtonSize = 34;

    

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      inputRow: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 30,
      },
      cardCustom: {
        borderBottomWidth: 1,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        minHeight: cardHeight,
      },
      labelText: {
        color: primaryColor,
        fontSize: 16,
      },
      descText: {
        color: mediumTextColor,
        fontSize: 16,
      },
      unitsText: {
        color: mediumTextColor,
        marginLeft: 5,
        marginTop: -5,
        fontSize: 16
      },
      onText: {
        color: highTextColor,
        marginLeft: 25,
        marginTop: -5,
        fontSize: 16
      },
      dateText: {
        color: disabledTextColor,
        marginLeft: 10,
        marginTop: -5,
        fontSize: 18
      },
      pickerInput: {
        height: 40,
        width: 175,
        borderWidth: 0,
      },      
      textInputItem: {
        height: 40,
        width: 175,
        borderWidth: 0,
      },      
      inputTextStyle: {
        fontWeight: "300",
        fontSize: 18,
      },
      numberInput: {
        width: 55,
        marginRight: 5
      },
      addIconArea: {
        flex: 1,
        marginLeft: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end"
      },
      addIcon: {
        marginRight: 15,
        width: 36,
        height: 36,
      },
      saveFab: {
        backgroundColor: secondaryColor,
      },
      userActionButton: {
        flex: 1,
        height: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
      },
      button: {
        color: "white",
        fontSize: 14
      },
      pageTitle: {
        fontSize: 20,
        color: highTextColor,
        fontWeight: "bold",
      },
      settingIcon: {
        width: settingIconSize,
        height: settingIconSize,
        marginRight: 10,
        backgroundColor: "transparent"
      },
      userSelectButtonStyle: {
        minHeight: userSelectButtonSize,
        minWidth: userSelectButtonSize,
        borderRadius: userSelectButtonSize / 2,
        padding: 5,
      }
    })

    const SettingHeader = ({icon, label, description}) => {
      return (  
        <View>
          <View style={styles.rowStart}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
          <View style={styles.rowStart}>
            <SvgIcon
              style={styles.settingIcon}
              size={settingIconSize}
              paths={icon}
              fill={listIconColor}
            />
            <Text style={styles.descText}>{description}</Text>
          </View>
        </View>
      )
    }

    return(
        <View style={styles.container}>
          {this.dataReady &&
          <View style={[styles.container, {paddingBottom: 10}]}>
            <View style={[cardLayout, { marginBottom: 0, paddingBottom: 15}]}>
              <Text style={styles.pageTitle}>TrekLog Settings</Text>
            </View>
            <ScrollView>
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.AccountCircle} label="Use" 
                               description="Specify a user or use for the treks"
                />
                <View style={styles.inputRow}>     
                  <Text style={{color: highTextColor, fontSize: 18, width: 150}}>{this.user}</Text>
                  <IconButton 
                    iconSize={userSelectIconSize}
                    icon="AccountCheckOutline"
                    style={[navItem, styles.userSelectButtonStyle]}
                    buttonSize={userSelectButtonSize}
                    raised
                    iconStyle={navIcon}
                    color={secondaryColor}
                    onPressFn={this.openRadioPicker}
                  />
                  {(!this.enterUser && haveUsers) &&
                    <View style={styles.addIconArea}>
                      <TouchableNativeFeedback
                        // background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                        onPress={this.deleteThisUser}
                      >
                        <View style={[styles.userActionButton, {marginHorizontal: 10}]}>
                          <Text style={[styles.button, {color: dangerColor}]}>DELETE</Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  }
                </View>
                {this.enterUser &&
                  <View style={styles.rowLayout}>
                    <TextInput
                      style={[styles.textInputItem, styles.inputTextStyle]}
                      onChangeText={(text) => this.setNewUser(text)}
                      underlineColorAndroid={mediumTextColor}
                      autoFocus={true}
                      value={this.newUser}
                    /> 
                    <View style={styles.addIconArea}>
                      <TouchableNativeFeedback
                          // background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                          onPress={this.cancelNewUser}
                        >
                          <View style={styles.userActionButton}>
                            <Text style={[styles.button, {color: cancelColor}]}>CANCEL</Text>
                          </View>
                      </TouchableNativeFeedback>
                      <TouchableNativeFeedback
                          // background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                          onPress={this.addNewUser}
                        >
                          <View style={styles.userActionButton}>
                            <Text style={[styles.button, {color: okChoiceColor}]}>ADD</Text>
                          </View>
                      </TouchableNativeFeedback>
                    </View>
                  </View>
                }
              </View>  
              <View style={[cardLayout, styles.cardCustom, {minHeight: cardHeight + 15}]}>
                <SettingHeader icon={APP_ICONS.BulletedList} label="Type" 
                               description="Active type when TrekLog starts"
                />
                <View style={styles.inputRow}>
                  <TrekTypeSelect
                    style={{marginTop: 10, justifyContent: "flex-start"}}
                    size={40}
                    selected={TREK_SELECT_BITS[this.defaultType]}
                    onChangeFn={this.setDefaultType}
                  />
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.CompassMath} label="Measurements" 
                               description="System to use for weights and distances"
                />
                <View style={styles.inputRow}>
                  <RadioGroup 
                    onChangeFn={this.switchSystem}
                    selected={this.system}
                    labels={["Imperial", "Metric"]}
                    values={["US", "Metric"]}
                    labelStyle={{color: highTextColor, fontSize: 18}}
                    justify='start'
                    inline
                    itemHeight={30}
                    radioFirst
                  />
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Scale} label="Weight" 
                               description="Weight for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={this.setNewWeight}
                    placeholderValue={this.weightStr}
                  />
                  <Text style={styles.unitsText}>{WEIGHT_UNIT_CHOICES[this.system]}</Text>
                  <Text style={styles.onText}>on:</Text>
                  <Text style={styles.dateText}>{this.props.utilsSvc.dateFromSortDate(this.weightDate)}</Text>
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.WomanGirl} label="Height" 
                               description="Height for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={this.useHeightForStrides}
                    placeholderValue={this.heightStr}
                  />
                  <Text style={styles.unitsText}>{STRIDE_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Walk} label="Walking" 
                               description="Walking stride length for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={(text) => this.setStrideLength('Walk', text)}
                    placeholderValue={this.strideLengthStr['Walk']}
                  />
                  <Text style={styles.unitsText}>{STRIDE_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Run} label="Running" 
                               description="Running stride length for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={(text) => this.setStrideLength('Run', text)}
                    placeholderValue={this.strideLengthStr['Run']}
                  />
                  <Text style={styles.unitsText}>{STRIDE_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Bike} label="Biking" 
                               description="Bike tire outer diameter for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={(text) => this.setStrideLength('Bike', text)}
                    placeholderValue={this.strideLengthStr['Bike']}
                  />
                  <Text style={styles.unitsText}>{STRIDE_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>           
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Hike} label="Hiking" 
                               description="Hiking stride length for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={(text) => this.setStrideLength('Hike', text)}
                    placeholderValue={this.strideLengthStr['Hike']}
                  />
                  <Text style={styles.unitsText}>{STRIDE_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.Sack} label="Backpack" 
                               description="Default backpack weight for this user"
                />
                <View style={styles.inputRow}>
                  <TextInputField
                    style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                    onChangeFn={(text) => this.setNewPackWeight(text)}
                    placeholderValue={this.packWeightStr}
                  />
                  <Text style={styles.unitsText}>{WEIGHT_UNIT_CHOICES[this.system]}</Text>
                </View>
              </View>           
            </ScrollView>
          </View>
          }
          {(!hideUpdate && !this.keyboardOpen && haveUsers) &&
            <SpeedDial 
              selectFn={this.saveSettings}
              bottom={CONTROLS_HEIGHT}
              style={styles.saveFab}
              icon="CheckMark"
            />
          }
          {(!this.dataReady || this.changingUser) &&
            <Waiting/>
          }
        </View>
    )
  }
  
}
export default Settings;