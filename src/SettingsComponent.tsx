import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView, Keyboard, 
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
import { CONTROLS_HEIGHT, COLOR_THEME_LIGHT, COLOR_THEME_DARK, ThemeType,
         SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';
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
import RadioPicker from './RadioPickerComponent';
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { GroupSvc, NEW_GROUP, DEFAULT_WEIGHT, SettingsObj, WeightObj } from './GroupService';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'uiTheme', 'utilsSvc', 'modalSvc', 'storageSvc', 'groupSvc')
@observer
class Settings extends Component<{ 
  utilsSvc ?: UtilsSvc,
  storageSvc ?: StorageSvc,
  navigation ?: any
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  groupSvc ?: GroupSvc
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  @observable dataReady;
  @observable radioPickerOpen;
  @observable changingGroup;
  @observable group;
  @observable defaultType : TrekType;
  @observable system : MeasurementSystemType;
  @observable theme : ThemeType;
  @observable weightStr;
  @observable heightStr;
  @observable packWeightStr;
  @observable strideLengthStr;
  @observable newGroup;
  @observable enterGroup;
  @observable keyboardOpen;
  @observable originalSettings : SettingsObj;
  @observable openItems;
  
  uSvc = this.props.utilsSvc;
  todayShortDate = this.uSvc.formatShortSortDate();
  heightNum = 0;
  weightNum = 0;
  weightDate = '';
  weights : WeightObj[] = [];
  packWeightNum = 0;
  strideLengths : TrekTypeDataNumeric;
  activeNav = '';             // used by BottomNavigation component
  oldTheme : ThemeType;

  keyboardDidShowListener;
  keyboardDidHideListener;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentWillMount() {
    // read the Groups object from the database
    this.setOriginalSettings(undefined);
    this.setOpenItems(false);        
    this.props.groupSvc.readGroups()
    .then((groups) => {
        this.oldTheme = groups.theme;
        this.changeGroup(this.props.trekInfo.group)
      })
    .catch(() => {
      // Failed to read groups or list empty
      this.setNoGroups();
      // this.setOpenItems(true);
    })

  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
      // requestAnimationFrame(() => {
      //   this.setOpenItems(true);
      // })
    }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.dataReady = false;
    this.changingGroup = false;
    this.group = '';
    this.system = 'Metric';
    this.theme = this.props.groupSvc.getTheme();
    this.heightStr = '0';
    this.weightStr = '0';
    this.packWeightStr = '0';
    this.strideLengthStr = {Walk: '0', Run: '0', Bike: '0', Hike: '0'};
    this.newGroup = '';
    this.enterGroup = false;
    this.keyboardOpen = false;
    this.originalSettings = undefined;
    this.setOpenItems(false);
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
  
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // set the groups object to indicate no groups
  setNoGroups = () => {
    this.setDefaultSettings();
    this.updateDataReady(true);
    this.props.toastSvc.toastOpen({tType: "Error", content: "Please create a group."});
    this.changeGroup(NEW_GROUP);
  }

  // Get the settings for the current group
  getGroupSettings = () => {
    return new Promise((resolve, reject) => {
      this.props.groupSvc.readGroupSettings(this.group)
      .then((data : SettingsObj) => {
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
          this.weights = [{weight: DEFAULT_WEIGHT, date: this.todayShortDate}];
        }
        else {
          this.weights = data.weights;
        }
        this.weightDate = this.weights.length ? this.weights[this.weights.length-1].date : this.todayShortDate;
        this.weightNum = this.weights.length ? this.weights[this.weights.length-1].weight : DEFAULT_WEIGHT;
        this.switchSystem(data.measurementSystem) // this will set packWeightStr, weightStr and strideLengthStr values
        this.setDefaultType(data.type);           // having this earlier in the sequence causes error in weights array
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
    this.strideLengths = this.uSvc.copyObj(DEFAULT_STRIDE_LENGTHS) as TrekTypeDataNumeric;
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

    this.weights[this.weights.length-1].weight = this.uSvc.fourSigDigits(this.weightNum);
    this.weights[this.weights.length-1].date = this.weightDate;
    this.weights.forEach((item) => {
      newWeights.push({date: item.date, weight: this.uSvc.fourSigDigits(item.weight)});
    })

    return {
      group: this.group,
      type: this.defaultType,
      height: this.uSvc.fourSigDigits(this.heightNum),
      weights: newWeights,
      measurementSystem: this.system,
      strideLengths: this.uSvc.copyObj(this.strideLengths) as TrekTypeDataNumeric,
      packWeight: this.uSvc.fourSigDigits(this.packWeightNum),
    }
  }

  // Compare the current settings to the given settings, return true if equal
  compareSettings = (sGiven: SettingsObj) : boolean => {
    let sNow;
    
    if(sGiven === undefined) { return true; }
    if(this.theme !== this.oldTheme) { return false; }
    sNow = this.getSaveObj();
    return this.uSvc.compareObjects(sNow, sGiven);
  }

  // Update the current TrekInfoModel settings from the given object
  @action
  updateTrekInfo = (saveObj: SettingsObj) => {
    this.props.trekInfo.setTrekLogGroupProperties(this.group, saveObj);
  }

  // save the list of groups to the database
  saveGroupsList = () => {
    this.oldTheme = this.theme;
    this.props.groupSvc.setTheme(this.theme);
    return this.props.groupSvc.saveGroups(this.group);
  }

  // save the list of groups and the Settings of the current group to the database
  saveSettings = () => {
    let saveObj = this.getSaveObj();

    return new Promise((resolve, reject) => {
      this.saveGroupsList()
      .then(() => {
        this.props.groupSvc.saveGroupSettings(this.group, saveObj)
        .then(() => {
          this.updateTrekInfo(saveObj);
          this.setOriginalSettings(this.getSaveObj());
          setTimeout(() => {
            if(!this.enterGroup){
              this.props.toastSvc.toastOpen({tType: "Success", content: "Settings updated."});
            }
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
        this.props.toastSvc.toastOpen({tType: "Error", content: "Group list changes NOT saved."});
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

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  // update the status of the changingGroup property
  @action
  updateChangingGroup = (value: boolean) => {
    this.changingGroup = value;
  }

  // Update the value of the group property
  @action
  setGroup = (val: string) => {
    this.group= val;
  }

  @action
  setEnterGroup = (status: boolean) => {
    this.enterGroup = status;
  }

  // Update the value of the newGroup property
  @action
  setNewGroup = (val: string) => {
    this.newGroup = val;
  }

  @action
  setDefaultType = (value: TrekType) => {
    this.defaultType = value;
  }

  // Update the value of the theme property
  @action
  setTheme = (val: ThemeType) => {
    this.theme = val;
    this.props.trekInfo.setColorTheme(val);
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

  // Change to the settings for the given group
  changeGroup = (value: string) => {
    const {infoConfirmColor, infoConfirmTextColor} = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];

    if (value === NEW_GROUP) {
      this.setNewGroup('New Group Name');
      this.setEnterGroup(true);
    }
    else {
      if (this.group!== '' && this.group!== value){
        if (!this.compareSettings(this.originalSettings)) {
          this.props.modalSvc.simpleOpen({heading: "Save Settings", headingIcon: "Settings",  
                                          headingStartColor: infoConfirmColor, 
                                          headingTextColor: infoConfirmTextColor, 
                                          content: "Save changes to settings for "+ this.group +"?", 
                                          cancelText: 'DISCARD', okText: 'SAVE'})
          .then(() => {
            this.saveSettings()
            .then(() =>{
              this.finishSetGroup(value);
            })
            .catch(() => {}) // error saving, group will not change
          })
          .catch(() =>{
            this.finishSetGroup(value);
          })
        }
        else {
          this.finishSetGroup(value);
        }
      }
      else {
        this.finishSetGroup(value);
      }
    }
  }

  finishSetGroup = (value: string) => {
    this.updateChangingGroup(true);
    this.setGroup(value);
    if (value !== this.props.groupSvc.getLastGroup()){
      this.saveGroupsList();
    }
    this.setEnterGroup(false);
    this.getGroupSettings()
    .then(() =>{
      this.updateTrekInfo(this.originalSettings);
      this.updateDataReady(true);
      this.updateChangingGroup(false);
      requestAnimationFrame(() => {
        this.setOpenItems(true);
      })
    })
    .catch(() => {
      // Failed to read settings for new group
      this.setDefaultSettings();
      this.saveSettings();
      this.updateDataReady(true);
      this.props.toastSvc.toastOpen({tType: 'Info', content: 'Please enter initial settings.', time: 3000});
      this.updateChangingGroup(false);
      requestAnimationFrame(() => {
        this.setOpenItems(true);
      })
    })
  }

  // delete group button pressed, confirm action with user
  deleteThisGroup = () => {

    requestAnimationFrame(() => {  // pause for touch effect to show
      this.props.modalSvc.simpleOpen({heading: "Delete " + this.group, headingIcon: "Delete",     
        content: "Delete settings and treks for " + this.group+ "?", 
        cancelText: 'CANCEL', deleteText: 'DELETE'})
      .then(() => {
        this.updateChangingGroup(true);
        this.props.groupSvc.deleteGroup(this.group)
        .then((currGroup : string) => {
          this.props.toastSvc.toastOpen({tType: "Info", content: "Successfully deleted " + this.group});
          if (currGroup !== this.group){
            this.changeGroup(currGroup);
          }
        })
        .catch(() => {
          this.props.toastSvc.toastOpen({tType: "Error", content: "Error deleting treks for " + this.group});
          this.changeGroup(this.group);
        })
      })
      .catch(() => {    // delete aborted
      });
    });
  }

  // abort creating a new group
  @action
  cancelNewGroup = () => {
    requestAnimationFrame(() => {
      if( this.group!== '') { 
        this.setEnterGroup(false); 
      } else {
        this.props.toastSvc.toastOpen({tType: "Error", content: "Please create a group."});
      }
      this.setNewGroup('');
    });
  }

  // Add a new name to the list of groups
  addNewGroup = () => {
    requestAnimationFrame(() => {
      let name =  this.newGroup;
      if (name !== '' && !/[\/ ,.<>?+=\-@!#]/.test(name)){
        if (name !== 'New' && !this.props.groupSvc.isGroup(name)){
          this.props.groupSvc.addGroup(name)
          .then(() => {
            this.props.toastSvc.toastOpen({tType: "Success", content: "Successfully added " + name + "."});
            this.changeGroup(name);
          })
        }
        else {
          this.props.toastSvc.toastOpen({tType: "Error", content: "Group " + name + " already exists."});
        }
        this.setNewGroup('');
      } else {
        this.props.toastSvc.toastOpen({tType: "Error", content: "Invalid name."});
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
    this.weightDate = this.uSvc.formatShortSortDate();
    if (this.weightDate !== this.weights[this.weights.length-1].date){
      this.weights.push({weight: 0, date: this.weightDate})
    }
    this.weightNum = Math.round(parseFloat(value) * 100) / 100;;
    if( !isNaN(this.weightNum) ){
      if(this.system === 'US'){ this.weightNum /= LB_PER_KG };  // store values as kg
      this.weightNum = this.uSvc.fourSigDigits(this.weightNum);
    }
    this.setWeight(value);
  }

  // set a new value for packWeight property
  setNewPackWeight = (value: string) => {
    this.packWeightNum = Math.round(parseFloat(value) * 100) / 100;;
    if( !isNaN(this.packWeightNum) ){
      if(this.system === 'US'){ this.packWeightNum /= LB_PER_KG };  // store values as kg
      this.packWeightNum = this.uSvc.fourSigDigits(this.packWeightNum);
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
      this.heightNum = this.uSvc.fourSigDigits(this.heightNum);
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
      this.strideLengths[type] = this.uSvc.fourSigDigits(this.strideLengths[type]);
    }
    else {  // if no value given, just update from strideLengths
      this.strideLengthStr[type] = Math.round(((this.system === 'US') // strideLengths are in cm
      ? (this.strideLengths[type] / CM_PER_INCH) 
      : this.strideLengths[type]) / STRIDE_CONVERSION_FACTORS[type]).toString();
    }
  }

  getDifferentGroup = () => {
    this.props.groupSvc.getGroupSelection(this.setRadioPickerOpen, this.group,  'Select A Group', true)
    .then((newGroup) => {
      this.changeGroup(newGroup);
    })
    .catch(() =>{ 
    })
  }

  render() {

    const hideUpdate = this.changingGroup || this.compareSettings(this.originalSettings);
    const { cardLayout, navItem, navIcon, pageTitle } = this.props.uiTheme;
    const settingIconSize = 24;
    const cardHeight = 110;
    const haveGroups = this.props.groupSvc.groups.groups.length > 0;
    const { highTextColor, mediumTextColor, disabledTextColor, secondaryColor, primaryColor,
            pageBackground, dangerColor, cancelColor, dividerColor, rippleColor, navItemBorderColor,
            okChoiceColor, listIconColor, disabledHeaderTextColor } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const groupSelectIconSize = 26;
    const groupSelectButtonSize = 40;

    

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
        marginTop: 10,
        marginLeft: 30,
      },
      cardCustom: {
        borderBottomWidth: 1,
        borderColor: dividerColor,
        marginTop: 0,
        marginBottom: 0,
        minHeight: cardHeight,
      },
      labelText: {
        color: primaryColor,
        marginBottom: 5,
        fontSize: 18,
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
      saveFab: {
        backgroundColor: secondaryColor,
      },
      groupActionButton: {
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
      settingIcon: {
        width: settingIconSize,
        height: settingIconSize,
        marginRight: 10,
        backgroundColor: "transparent"
      },
      groupSelectButtonStyle: {
        height: groupSelectButtonSize,
        width: groupSelectButtonSize,
        borderRadius: groupSelectButtonSize / 2,
      },
      flexWrap: {
        flexWrap: "wrap",
        marginRight: 15,
      },
    })

    const SettingHeader = ({icon, label, description}) => {
      return (  
        <View>
          <View style={styles.rowStart}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
          <View style={[styles.rowStart,{marginRight: 15}]}>
            <SvgIcon
              style={styles.settingIcon}
              size={settingIconSize}
              paths={icon}
              fill={listIconColor}
            />
            <Text style={[styles.descText, styles.flexWrap]}>{description}</Text>
          </View>
        </View>
      )
    }

    return(
        <View style={styles.container}>
          <TrekLogHeader
            icon="*"
            titleText="Settings"
            backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
            group={this.group || "None"}
            groupTextColor={disabledHeaderTextColor}
          />
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
          {this.dataReady &&
          <View style={[styles.container, {paddingBottom: 10}]}>
            <View style={[cardLayout, { marginBottom: 0, paddingBottom: 10}]}>
              <Text style={[pageTitle, {color: highTextColor}]}>TrekLog Settings</Text>
            </View>
            <ScrollView>
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom]}>
                    <SettingHeader icon={APP_ICONS.YinYang} label="Theme" 
                                  description="Select the theme to be applied when TrekLog starts.  The theme applies to all groups."
                    />
                    <View style={styles.inputRow}>
                      <RadioGroup 
                        onChangeFn={this.setTheme}
                        selected={this.theme}
                        labels={["Light", "Dark"]}
                        values={[COLOR_THEME_LIGHT, COLOR_THEME_DARK]}
                        labelStyle={{color: highTextColor, fontSize: 18}}
                        justify='start'
                        inline
                        itemHeight={30}
                        radioFirst
                      />
                    </View>
                  </View>           
                </SlideDownView>
              </FadeInView>       
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom]}>
                    <SettingHeader icon={APP_ICONS.FolderOpenOutline} label="Groups" 
                      description="Treks are separated into groups. The rest of the settings apply only to this group:"
                    />
                    <View style={styles.inputRow}>     
                      <IconButton 
                        iconSize={groupSelectIconSize}
                        icon="FolderOpenOutline"
                        style={{...navItem, ...styles.groupSelectButtonStyle}}
                        raised
                        borderColor={navItemBorderColor}
                        iconStyle={navIcon}
                        color={secondaryColor}
                        onPressFn={this.getDifferentGroup}
                      />
                      <Text style={{color: highTextColor, fontSize: 20,marginLeft: 5, width: 150}}>
                        {this.enterGroup ? "New" : this.group}</Text>
                      {(!this.enterGroup && haveGroups) &&
                        <View style={styles.addIconArea}>
                          <TouchableNativeFeedback
                            background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                            onPress={this.deleteThisGroup}
                          >
                            <View style={[styles.groupActionButton, {marginHorizontal: 10}]}>
                              <Text style={[styles.button, {color: dangerColor}]}>DELETE</Text>
                            </View>
                          </TouchableNativeFeedback>
                        </View>
                      }
                    </View>
                    {this.enterGroup &&
                      <View style={[styles.rowLayout, {marginLeft: 30}]}>
                        <View style={{width: 175}}>
                          <TextInputField
                            style={[styles.textInputItem, styles.inputTextStyle]}
                            inputWidth={175}
                            onChangeFn={(text : string) => this.setNewGroup(text)}
                            kbType='default'
                            placeholderValue={this.newGroup}
                            autoFocus
                          /> 
                        </View>
                        <View style={styles.addIconArea}>
                          <TouchableNativeFeedback
                            background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                            onPress={this.cancelNewGroup}
                          >
                            <View style={styles.groupActionButton}>
                              <Text style={[styles.button, {color: cancelColor}]}>CANCEL</Text>
                            </View>
                          </TouchableNativeFeedback>
                          <TouchableNativeFeedback
                            background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                            onPress={this.addNewGroup}
                          >
                            <View style={styles.groupActionButton}>
                              <Text style={[styles.button, {color: okChoiceColor}]}>ADD</Text>
                            </View>
                          </TouchableNativeFeedback>
                        </View>
                      </View>
                    }
                  </View>  
                </SlideDownView>
              </FadeInView>       
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom, {minHeight: cardHeight + 15}]}>
                    <SettingHeader icon={APP_ICONS.BulletedList} label="Type" 
                                  description="Default type to use with this group"
                    />
                    <View style={[styles.inputRow, {marginTop: 0}]}>
                      <TrekTypeSelect
                        style={{justifyContent: "flex-start"}}
                        size={50}
                        selected={TREK_SELECT_BITS[this.defaultType]}
                        onChangeFn={this.setDefaultType}
                      />
                    </View>
                  </View>           
                </SlideDownView>
              </FadeInView>       
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom]}>
                    <SettingHeader icon={APP_ICONS.CompassMath} label="Measurements" 
                                  description="System to use for weights and distances in this group"
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
                </SlideDownView>
              </FadeInView>       
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom]}>
                    <SettingHeader icon={APP_ICONS.Scale} label="Weight" 
                                  description="Weight to use for this group"
                    />
                    <View style={styles.inputRow}>
                      <TextInputField
                        style={[styles.textInputItem, styles.numberInput, styles.inputTextStyle]}
                        onChangeFn={this.setNewWeight}
                        placeholderValue={this.weightStr}
                      />
                      <Text style={styles.unitsText}>{WEIGHT_UNIT_CHOICES[this.system]}</Text>
                      <Text style={styles.onText}>on:</Text>
                      <Text style={styles.dateText}>{this.uSvc.dateFromSortDate(this.weightDate)}</Text>
                    </View>
                  </View>           
                </SlideDownView>
              </FadeInView>       
              <View style={[cardLayout, styles.cardCustom]}>
                <SettingHeader icon={APP_ICONS.WomanGirl} label="Height" 
                               description="Height to use for this group"
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
                               description="Walking stride length for this group"
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
                               description="Running stride length for this group"
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
                               description="Bike tire outer diameter for this group"
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
                               description="Hiking stride length for this group"
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
                               description="Default backpack weight for this group"
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
          {(!hideUpdate && !this.keyboardOpen && haveGroups) &&
            <SpeedDial 
              selectFn={this.saveSettings}
              bottom={CONTROLS_HEIGHT}
              style={styles.saveFab}
              icon="CheckMark"
            />
          }
          {(!this.dataReady || this.changingGroup) &&
            <Waiting/>
          }
        </View>
    )
  }
  
}
export default Settings;