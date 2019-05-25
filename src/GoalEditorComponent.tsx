import React, { Component } from 'react';
import { View, StyleSheet, Text, ScrollView, Keyboard } from 'react-native';
import { NavigationActions } from 'react-navigation';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';

import { GoalsSvc, CATestUnitsToTime } from './GoalsService'
import { TrekInfo, TrekType } from './TrekInfoModel'
import { UtilsSvc } from './UtilsService';
import { 
  GoalObj, GoalTypesArray, DIT_GOAL_CAT, CA_GOAL_CAT, CABurnGoalMetricUnitsArray,
  DITActivityTypesArray, DITGoalMetricUnitsArray, DITTestUnitsArray,
  CAActivityTypesArray, CAGoalMetricUnitsArray, CATestUnitsArray, GoalLabelsArray,
} from './GoalsService';
import { ToastModel } from './ToastModel';
import RadioGroup from './RadioGroupComponent';
import { CONTROLS_HEIGHT, NAV_ICON_SIZE } from './App';
import { APP_ICONS} from './SvgImages';
import SvgIcon from './SvgIconComponent';
import TextInputField from './TextInputFieldComponent';
import IconButton from './IconButtonComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { RectButton } from 'react-native-gesture-handler';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'utilsSvc', 'uiTheme', 'goalsSvc', 'toastSvc')
@observer
class GoalEditor extends Component<{ 
  action: string,           // Action being performed 'Edit' or 'New'
  goal: GoalObj,            // the goal to edit
  kbOpen ?: boolean,
  goalsSvc ?: GoalsSvc,
  utilsSvc ?: UtilsSvc,
  uiTheme ?: any,
  toastSvc ?: ToastModel,
  trekInfo ?: TrekInfo,        // object with all non-gps information about the Trek
  navigation ?: any
}, {} > {

  keyboardDidShowListener;
  keyboardDidHideListener;

  @observable keyboardOpen;
  @observable editObj: GoalObj;

  tInfo = this.props.trekInfo;
  gS = this.props.goalsSvc;
  uSvc = this.props.utilsSvc;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.keyboardOpen = false;
    this.editObj = {} as GoalObj;
  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
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

  // update the editObj object from the individual edit fields
  @action
  updateEditObj = () => {
    this.editObj = this.gS.getGoalObj();
  }

  // Update the value of the category property
  @action
  setGoalCategory = (val: string) => {
    // this.gS.goalCategory = val;
    this.gS.setNewDITGoalObj(val);
  }

  // call the getDateMin function after pausing for feedback on touch
  callGetGoalDate = () => {
    requestAnimationFrame(() => {
      this.gS.getGoalDate();
    })
  }

  // Update the value of the activity property
  @action
  setGoalActivity = (val: TrekType) => {
    this.gS.goalActivity = val;
    if (this.gS.goalActivity === 'Burn'){
      this.gS.goalMetricUnits = CABurnGoalMetricUnitsArray[0];
    }
  }

  // Update the value of the metric property
  @action
  setGoalMetric = (val: string) => {
    this.gS.goalMetric = val;
  }

  // Update the value of the metricValue property
  @action
  setGoalMetricValue = (val: string) => {
    let v = parseFloat(val);

    this.gS.goalMetricValue = (v <= 0 || isNaN(v)) ? '' : v.toString();
  }

  // Update the value of the metricUnits property
  @action
  setGoalMetricUnits = (val: string) => {
    this.gS.goalMetricUnits = val;
  }

  // Update the value of the testValue property
  @action
  setGoalTestValue = (val: string) => {
    let v = parseFloat(val);

    this.gS.goalTestValue = (v <= 0 || isNaN(v)) ? '' : v.toString();
  }

  // Update the value of the testUnits property
  @action
  setGoalTestUnits = (val: string) => {
    this.gS.goalTestUnits = val;
  }

  // add the given goal to the list
  @action
  addGoal = (goal: GoalObj) => {
    let afterAdd = this.props.navigation.getParam('onAddFn');
    if (this.gS.goalList === null) { this.gS.goalList = []; }
    this.gS.goalList.push(this.props.utilsSvc.copyObj(goal) as GoalObj);
    this.gS.displayList.push(this.gS.processGoal(goal));
    this.gS.saveGoalList();
    if(afterAdd !== undefined) { afterAdd(); }
}

  // update the given goal
  @action
  updateGoal = (index: number, goal: GoalObj) => {
    this.gS.goalList[index] = this.props.utilsSvc.copyObj(goal) as GoalObj;
    this.gS.displayList[index] = this.gS.processGoal(goal);
    this.gS.saveGoalList();
}

  getGoalPrompt = () => {
    let gType = ' Goal';

    if (this.gS.goalCategory === DIT_GOAL_CAT) { gType = " Performance Goal"; }
    if (this.gS.goalCategory === CA_GOAL_CAT) { gType = " Consistency Goal"; }
    return (this.gS.goalEditMode + gType);
  }

  saveGoalEdit = () => {
    requestAnimationFrame(() => {
      this.updateEditObj();
      if(this.gS.editGoalIndex === -1){
        this.addGoal(this.editObj);
      }
      else {
        this.updateGoal(this.gS.editGoalIndex, this.editObj);
        this.gS.editGoalIndex = -1;
      }
      this.props.navigation.dispatch(goBack);      
    })
  }

  cancelGoalEdit = () => {
    requestAnimationFrame(() => {
      this.props.navigation.dispatch(goBack);      
    })
}

  render() {

    const { mediumTextColor, pageBackground, trekLogBlue, highTextColor, dividerColor,
            navIconColor, highlightedItemColor, primaryColor, rippleColor, navItemBorderColor
          } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const { cardLayout, controlsArea, navItem, navIcon, pageTitle } = this.props.uiTheme;
    const validGoal = this.gS.validGoal(); 
    const editNew = this.gS.goalEditMode === 'New'
    const CAMetricUnits = this.gS.goalActivity === "Burn" ? CABurnGoalMetricUnitsArray : CAGoalMetricUnitsArray;
    const sortButtonHeight = 50;
    const goalIconSize = 24;
    const sortIconColor = highTextColor;
    const validCat = this.gS.goalCategory !== '';

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      rowCenter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      labelText: {
        color: primaryColor,
        marginBottom: 5,
        fontSize: 18
      },
      goalArea: {
        height: 60,
        marginTop: 10,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: highlightedItemColor,
      },
      goalText: {
        color: highTextColor,
        marginTop: 5,
        fontSize: 20,
      },
      textInputItem: {
        height: 45,
        width: 80,
        marginRight: 5,
      },      
      pickField: {
        height: 45,
        width: 145,
        borderWidth: 0,
        marginRight: 5,
        color: trekLogBlue,
      },
      inputTextStyle: {
        fontWeight: "300",
        fontSize: 24,
      },
      dateInputArea: {
        height: 40,
      },
      dateInputText: {
        color: trekLogBlue,
        fontWeight: "300",
        fontSize: 24,
      },
      sortButtonCol: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        minHeight: sortButtonHeight,
        backgroundColor: pageBackground,
      },
      sortButtonIcon: {
        width: goalIconSize,
        height: goalIconSize,
        marginRight: 10,
        backgroundColor: "transparent"
      },
      radioGrp: {
        marginLeft: 30,
      },
      inputVal: {
        marginLeft: 30,
      },
      descText: {
        color: mediumTextColor,
        fontSize: 16,
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
    })

    const SettingHeader = ({icon, label, description}) => {
      return (  
        <View>
          <View style={styles.rowStart}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
          <View style={styles.rowStart}>
            <SvgIcon
              style={styles.sortButtonIcon}
              size={goalIconSize}
              paths={icon}
              fill={sortIconColor}
            />
            <Text style={styles.descText}>{description}</Text>
          </View>
        </View>
      )
    }

    return(
      <View style={styles.container}>
        <TrekLogHeader titleText={this.props.navigation.getParam('title','')}
                             icon="*"
                             backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
        />        
        <View style={[styles.container, {bottom: CONTROLS_HEIGHT}]}>
          <View style={[cardLayout, {paddingBottom: 0}]}>
            <Text style={[pageTitle, {color: highTextColor}]}>{this.getGoalPrompt()}</Text>
          </View>
            {validCat &&
              <View style={[styles.rowCenter, styles.goalArea]}>
                <Text style={styles.goalText}>
                  {'"' + this.gS.formatGoalStatement(this.gS.getGoalObj()) + '"'}
                </Text>
              </View>
            }
          <ScrollView>
            <View style={[{paddingBottom: 20}]}>
              {(editNew && !validCat) &&
                <View >
                  <View style={[styles.sortButtonCol, !validCat ? {marginTop: 60} : {}]}>
                    <SettingHeader icon={APP_ICONS.Certificate} label="Type" 
                            description="What type of goal will this be?"
                    />
                    <View style={styles.radioGrp}>
                      <RadioGroup 
                        onChangeFn={this.setGoalCategory}
                        selected={this.gS.goalCategory}
                        labels={GoalLabelsArray}
                        justify="start"
                        values={GoalTypesArray}
                        itemHeight={30}
                        labelStyle={{color: highTextColor, fontSize: 16}}
                        inline
                        radioFirst
                      />
                    </View>
                  </View>
                </View>
              }
              {validCat && 
                <View>
                  {!validCat && 
                    <View style={styles.divider}/>
                  }
                  <View style={styles.sortButtonCol}>
                    <SettingHeader icon={APP_ICONS.CalendarCheck} label="Effective Date" 
                            description="Begin checking this goal as of"
                    />
                    <RectButton
                      rippleColor={rippleColor}
                      onPress={this.callGetGoalDate}
                    >
                      <View style={[styles.rowStart, styles.inputVal, styles.dateInputArea]}>
                        <Text style={styles.dateInputText}>{this.uSvc.dateFromSortDateYY(this.gS.goalDateSet)}</Text>
                      </View>
                    </RectButton>
                  </View>
                  {this.gS.goalCategory === DIT_GOAL_CAT && 
                    <View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.BulletedList} label="Activity" 
                            description="This goal is for which activity"
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalActivity}
                            selected={this.gS.goalActivity}
                            labels={DITActivityTypesArray}
                            values={DITActivityTypesArray}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.CompassMath} label="Distance Units" 
                            description="Measure distance in"
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalMetricUnits}
                            selected={this.gS.goalMetricUnits}
                            labels={DITGoalMetricUnitsArray}
                            values={DITGoalMetricUnitsArray}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.Distance} 
                                        label="Distance" 
                            description={this.gS.goalActivity + ' at least how many ' + this.gS.goalMetricUnits + '?'}
                        />
                        <View style={[styles.textInputItem, styles.inputVal]}>
                          <TextInputField
                            onChangeFn={this.setGoalMetricValue}
                            placeholderValue={this.gS.goalMetricValue}
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.Metronome} label="Time Units" 
                            description="Measure time in"
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalTestUnits}
                            selected={this.gS.goalTestUnits}
                            labels={DITTestUnitsArray}
                            values={DITTestUnitsArray}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.TimerSand} label="Time Limit" 
                            description={'Finish in at most how many ' + this.gS.goalTestUnits + '?'}
                        />
                        <View style={[styles.textInputItem, styles.inputVal]}>
                          <TextInputField
                            onChangeFn={this.setGoalTestValue}
                            placeholderValue={this.gS.goalTestValue}
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                    </View>    
                  }      
                  {this.gS.goalCategory === CA_GOAL_CAT && 
                    <View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.BulletedList} label="Activity" 
                            description="This goal is for which activity"
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalActivity}
                            selected={this.gS.goalActivity}
                            labels={CAActivityTypesArray}
                            values={CAActivityTypesArray}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.CompassMath} label="Activity Units" 
                            description={'Measure ' + this.gS.goalActivity.toLowerCase() + ' activity in:'}
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalMetricUnits}
                            selected={this.gS.goalMetricUnits}
                            labels={CAMetricUnits}
                            values={CAMetricUnits}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.CalendarRange} label="Frequency" 
                            description="How often should you acheive this goal?"
                        />
                        <View style={styles.radioGrp}>
                          <RadioGroup 
                            onChangeFn={this.setGoalTestUnits}
                            selected={this.gS.goalTestUnits}
                            labels={CATestUnitsArray}
                            values={CATestUnitsArray}
                            justify="start"
                            itemHeight={30}
                            labelStyle={{color: highTextColor, fontSize: 16}}
                            inline
                            radioFirst
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                      <View style={styles.sortButtonCol}>
                        <SettingHeader icon={APP_ICONS.Sigma} label="Minimum Activity" 
                            description={this.gS.goalActivity + ' how many ' + this.gS.goalMetricUnits +
                            ' per ' + CATestUnitsToTime[this.gS.goalTestUnits] + '?'}
                        />
                        <View style={[styles.textInputItem, styles.inputVal]}>
                          <TextInputField
                            onChangeFn={this.setGoalMetricValue}
                            placeholderValue={this.gS.goalMetricValue}
                          />
                        </View>
                      </View>
                      <View style={styles.divider}/>
                    </View>   
                  }     
                </View>
              }
            </View> 
          </ScrollView>
        </View>    
        {!this.keyboardOpen && 
          <View style={controlsArea}>
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="ArrowBack"
              style={navItem}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.cancelGoalEdit}
            />
            {validGoal &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="CheckMark"
                style={navItem}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.saveGoalEdit}
              />
            }
          </View>
        }
      </View>
    )
  }
  
}
export default GoalEditor;