import React, { Component } from 'react';
import { View, StyleSheet, Text, ScrollView, Keyboard } from 'react-native';
import { NavigationActions } from 'react-navigation';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';

import { GoalsSvc, CATestUnitsToTime } from './GoalsService'
import { TrekInfo, TrekType, MSG_NO_LIST, RESP_CANCEL, FAKE_SELECTION, STEPS_APPLY } from './TrekInfoModel'
import { UtilsSvc } from './UtilsService';
import { 
  GoalObj, GoalTypesArray, DIT_GOAL_CAT, CA_GOAL_CAT, CABurnGoalMetricUnitsArray,
  DITActivityTypesArray, DITGoalMetricUnitsArray, GoalCommentsArray,
  CAActivityTypesArray, CAActivityTypesWithStepsArray, CAGoalMetricUnitsArray, CATestUnitsArray, GoalLabelsArray,
} from './GoalsService';
import { ToastModel } from './ToastModel';
import RadioGroup from './RadioGroupComponent';
import { APP_ICONS} from './SvgImages';
import SvgIcon from './SvgIconComponent';
import TextInputField from './TextInputFieldComponent';
import IconButton from './IconButtonComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { RectButton } from 'react-native-gesture-handler';
import TimeInput  from './TimeInputComponent'
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';
import RadioPicker from './RadioPickerComponent';
import { CourseSvc } from './CourseService';
import PageTitle from './PageTitleComponent';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'utilsSvc', 'uiTheme', 'goalsSvc', 'toastSvc', 'courseSvc')
@observer
class GoalEditor extends Component<{ 
  action: string,           // Action being performed 'Edit' or 'New'
  goal: GoalObj,            // the goal to edit
  kbOpen ?: boolean,
  courseSvc ?: CourseSvc,
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
  @observable openItems;
  @observable openMetricValue;
  @observable radioPickerOpen;

  tInfo = this.props.trekInfo;
  gS = this.props.goalsSvc;
  uSvc = this.props.utilsSvc;
  cS = this.props.courseSvc;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setKeyboardOpen(false);
    this.editObj = {} as GoalObj;
    this.setOpenItems(false);
    this.setOpenMetricValue(false);    
    this.setRadioPickerOpen(false);    
  }

  componentWillMount() {
    this.setOpenItems(false);        
    this.setOpenMetricValue(false);        
  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
    requestAnimationFrame(() => {
      this.setOpenItems(true);
      this.setOpenMetricValue(true);        
  })
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    this.setOpenItems(false);
    this.setOpenMetricValue(false);        
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

  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  @action
  setOpenMetricValue = (status: boolean) => {
    this.openMetricValue = status;
  }

  // update the editObj object from the individual edit fields
  @action
  updateEditObj = () => {
    this.editObj = this.gS.getGoalObj();
  }

  // Update the value of the category property
  @action
  setGoalCategory = (val: string) => {
    this.setOpenMetricValue(false);        
    this.setOpenItems(false);
    this.gS.setNewDITGoalObj(val);
    requestAnimationFrame(() => {
      this.setOpenItems(true)
      this.setOpenMetricValue(true);        
    })
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

  // Update the value of the metricValue property from a TimeInput
  @action
  setGoalMetricValueTime = (val: number) => {
    this.gS.goalMetricValue = val.toString();
  }

  // Update the value of the metricUnits property
  @action
  setGoalMetricUnits = (val: string) => {
    let changeT = (this.gS.goalMetricUnits === 'time' && val !== 'time') || 
                  (this.gS.goalMetricUnits !== 'time' && val === 'time');
    let changeC = (this.gS.goalMetricUnits === 'course' && val !== 'course') || 
                  (this.gS.goalMetricUnits !== 'course' && val === 'course');
    if (val === 'steps' && !STEPS_APPLY[this.gS.goalActivity]) {
      this.gS.goalActivity = '';
    }
    if(changeC) {
      this.setOpenMetricValue(false);        
    }
    if(changeT){
      this.setGoalMetricValue('0');
    }
    this.gS.goalMetricUnits = val === 'occurrences' ? 'times' : val;
    if(changeC) {
      requestAnimationFrame(() => {
        this.setOpenMetricValue(true);        
      })
    }
  }

  // Update the value of the testValue property
  @action
  setGoalTestValue = (val: number) => {
    this.gS.goalTestValue = val.toString();
  }

  // Update the value of the testUnits property
  @action
  setGoalTestUnits = (val: string) => {
    this.gS.goalTestUnits = val;
  }

  // Update the value of the testUnits property
  @action
  setGoalCourse = (val: string) => {
    this.gS.goalCourse = val;
  }

  // add the given goal to the list
  @action
  addGoal = (goal: GoalObj) => {
    let afterAdd = this.props.navigation.getParam('onAddFn');
    if (this.gS.goalList === null) { this.gS.goalList = []; }
    this.gS.goalList.push(this.props.utilsSvc.copyObj(goal) as GoalObj);
    this.gS.displayList.push(this.gS.processGoal(goal));
    this.gS.sortGoals();
    this.gS.saveGoalList();
    if(afterAdd !== undefined) { afterAdd(); }
}

  // update the given goal
  @action
  updateGoal = (index: number, goal: GoalObj) => {
    this.gS.goalList[index] = this.props.utilsSvc.copyObj(goal) as GoalObj;
    this.gS.displayList[index] = this.gS.processGoal(goal);
    this.gS.sortGoals();
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

// allow user to select a course for this goal
getCourse = () => {
  this.cS.getCourseSelection(this.setRadioPickerOpen, this.gS.goalCourse || FAKE_SELECTION,  'Select A Course', true)
  .then((sel) => {
      this.setGoalCourse(sel);
  })
  .catch((err) =>{
    switch(err){
      case MSG_NO_LIST:
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: err + 'No courses defined.',
        });
      case RESP_CANCEL:
      default:
    }
})
}

  render() {

    const { mediumTextColor, pageBackground, trekLogBlue, highTextColor, dividerColor, secondaryColor,
            highlightedItemColor, primaryColor, rippleColor, navItemBorderColor, disabledTextColor,
            footerButtonText,
          } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const { cardLayout, footer, footerButton,
            navItem, navIcon, fontRegular } = this.props.uiTheme;
    const validGoal = this.gS.validGoal(); 
    const editNew = this.gS.goalEditMode === 'New'
    const CAMetricUnits = this.gS.goalActivity === "Burn" ? CABurnGoalMetricUnitsArray : CAGoalMetricUnitsArray;
    const sortButtonHeight = 50;
    const goalIconSize = 24;
    const courseSelectIconSize = 30;
    const courseSelectButtonSize = 40;
    const sortIconColor = highTextColor;
    const haveCourse = this.gS.goalCourse;
    const validCat = this.gS.goalCategory !== '';
    const metricUnitsAreSteps = this.gS.goalMetricUnits === 'steps';

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
        fontFamily: fontRegular,
        fontSize: 20
      },
      goalArea: {
        marginTop: 10,
        paddingTop: 15,
        paddingBottom: 15,
        paddingLeft: 10,
        paddingRight: 10,
        marginBottom: 15,
        marginLeft: 5,
        marginRight: 5,
        elevation: 5,
        borderColor: dividerColor,
        borderStyle: "solid",
        borderWidth: 1,
        borderRadius: 3,
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
        fontFamily: fontRegular,
        fontSize: 18,
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      rgItem: {
        paddingTop: 10,
        backgroundColor: pageBackground,
        paddingRight: 0,
        paddingLeft: 0,
        marginLeft: 30,
      },
      rgLabel: {
        fontSize: 20,
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1
      },
      inputRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        marginLeft: 30,
      },
      courseSelectButtonStyle: {
        height: courseSelectButtonSize,
        width: courseSelectButtonSize,
        borderRadius: courseSelectButtonSize / 2,
      },
      courseName: {
        color: haveCourse ? highTextColor : disabledTextColor, 
        fontSize: 20,
        paddingLeft: 5, 
        fontStyle: haveCourse ? "normal" : "italic",
      },
      footer: {
        ...footer,
        ...{borderTopColor: dividerColor, backgroundColor: pageBackground}
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
        <RadioPicker pickerOpen={this.radioPickerOpen}/>
        <View style={styles.container}>
          <TrekLogHeader titleText={this.props.navigation.getParam('title','')}
                              icon="*"
                              backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
          />        
          <View style={[cardLayout, {paddingBottom: 0}]}>
            <PageTitle titleText={this.getGoalPrompt()} style={{paddingLeft: 0}}
                        colorTheme={this.tInfo.colorTheme}/>
          </View>
            {validCat &&
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                    duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                      duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                  <View style={[styles.rowCenter, styles.goalArea]}>
                    <Text style={styles.goalText}>
                      {'"' + this.gS.formatGoalStatement(this.gS.getGoalObj()) + '"'}
                    </Text>
                  </View>
                </SlideDownView>
              </FadeInView>
            }
          <ScrollView>
            <View>
              {(editNew && !validCat) &&
                <View >
                  <View style={styles.sortButtonCol}>
                    <SettingHeader icon={APP_ICONS.Target} label="Type" 
                            description="What type of goal will this be?"
                    />
                    <RadioGroup 
                      onChangeFn={this.setGoalCategory}
                      selected={this.gS.goalCategory}
                      labels={GoalLabelsArray}
                      itemStyle={styles.rgItem}
                      comments={GoalCommentsArray}
                      justify="start"
                      align="start"
                      values={GoalTypesArray}
                      itemHeight={30}
                      labelStyle={styles.rgLabel}
                      inline
                      vertical
                      radioFirst
                    />
                  </View>
                </View>
              }
              {validCat && 
                <View>
                  {!validCat && 
                    <View style={styles.divider}/>
                  }
                  <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                    <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                          duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
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
                  </SlideDownView>
                  </FadeInView>

                                            {/* DISTANCE IN TIME GOAL */}
                  {this.gS.goalCategory === DIT_GOAL_CAT && 
                    <View>
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
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
                        </SlideDownView>
                      </FadeInView>
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          <View style={styles.divider}/>
                          <View style={styles.sortButtonCol}>
                            <SettingHeader icon={APP_ICONS.CompassMath} label="Distance Units/Course" 
                                description={"Select measurement units or \'course\'"}
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
                        </SlideDownView>
                      </FadeInView>
                      {this.gS.goalMetricUnits !== 'course' &&
                        <FadeInView startValue={0.1} endValue={1} open={this.openMetricValue} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                          <SlideDownView startValue={-110} endValue={0} open={this.openMetricValue} 
                              duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
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
                          </SlideDownView>
                        </FadeInView>
                      }
                      {this.gS.goalMetricUnits === 'course' &&
                        <FadeInView startValue={0.1} endValue={1} open={this.openMetricValue} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                          <SlideDownView startValue={-110} endValue={0} open={this.openMetricValue} 
                              duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                            <View style={styles.sortButtonCol}>
                              <SettingHeader icon={APP_ICONS.Course} label="Select Course" 
                                description={"Select the course to " + this.gS.goalActivity}
                                />
                              <View style={styles.inputRow}>     
                                <IconButton 
                                  iconSize={courseSelectIconSize}
                                  icon="ListChoice"
                                  style={{...navItem, ...styles.courseSelectButtonStyle}}
                                  raised
                                  borderColor={navItemBorderColor}
                                  iconStyle={navIcon}
                                  color={secondaryColor}
                                  onPressFn={this.getCourse}
                                />
                                <RectButton
                                  rippleColor={rippleColor}
                                  onPress={this.getCourse}
                                >
                                  <Text style={styles.courseName}>
                                    {!this.gS.goalCourse ? "None" : this.gS.goalCourse}</Text>
                                </RectButton>
                              </View>
                            </View>
                          </SlideDownView>
                        </FadeInView>
                      }
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          <View style={styles.divider}/>
                          <View style={styles.sortButtonCol}>
                            <SettingHeader icon={APP_ICONS.TimerSand} label="Time Limit" 
                                description={'Finish in under what time?'}
                            />
                            <View style={{marginLeft: 30}}>
                              <TimeInput
                                  onChangeFn={this.setGoalTestValue}
                                  timeVal={!this.gS.goalTestValue ? 0 : 
                                  this.props.utilsSvc.convertToSeconds(parseInt(this.gS.goalTestValue), 
                                                                                this.gS.goalTestUnits)}
                              />
                            </View>
                          </View>
                          <View style={styles.divider}/>
                        </SlideDownView>
                      </FadeInView>
                    </View>    
                  }      

                                            {/* CONSISTENCY GOAL */}
                  {this.gS.goalCategory === CA_GOAL_CAT && 
                    <View>
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          <View style={styles.divider}/>
                          <View style={styles.sortButtonCol}>
                            <SettingHeader icon={APP_ICONS.BulletedList} label="Activity" 
                                description="This goal is for which activity"
                            />
                            <View style={styles.radioGrp}>
                              <RadioGroup 
                                onChangeFn={this.setGoalActivity}
                                selected={this.gS.goalActivity}
                                labels={metricUnitsAreSteps ? CAActivityTypesWithStepsArray : CAActivityTypesArray}
                                values={CAActivityTypesArray}
                                justify="start"
                                itemHeight={30}
                                labelStyle={{color: highTextColor, fontSize: 16}}
                                inline
                                radioFirst
                              />
                            </View>
                          </View>
                        </SlideDownView>
                      </FadeInView>
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          <View style={styles.divider}/>
                          <View style={styles.sortButtonCol}>
                            <SettingHeader icon={APP_ICONS.CompassMath} label="Activity Units/Course" 
                                description={"Select measurement units or \'course\'"}
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
                        </SlideDownView>
                      </FadeInView>
                      {this.gS.goalMetricUnits === 'course' &&
                        <FadeInView startValue={0.1} endValue={1} open={this.openMetricValue} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                          <SlideDownView startValue={-110} endValue={0} open={this.openMetricValue} 
                              duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                            <View style={styles.divider}/>
                            <View style={styles.sortButtonCol}>
                              <SettingHeader icon={APP_ICONS.Course} label="Select Course" 
                                description={"Select the course to " + this.gS.goalActivity}
                              />
                              <View style={styles.inputRow}>     
                                <IconButton 
                                  iconSize={courseSelectIconSize}
                                  icon="ListChoice"
                                  style={{...navItem, ...styles.courseSelectButtonStyle}}
                                  raised
                                  borderColor={navItemBorderColor}
                                  iconStyle={navIcon}
                                  color={secondaryColor}
                                  onPressFn={this.getCourse}
                                />
                                <RectButton
                                  rippleColor={rippleColor}
                                  onPress={this.getCourse}
                                >
                                  <Text style={styles.courseName}>
                                    {!this.gS.goalCourse ? "None" : this.gS.goalCourse}</Text>
                                </RectButton>
                              </View>
                            </View>
                          </SlideDownView>
                        </FadeInView>
                      }
                      <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                            duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
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
                        </SlideDownView>
                      </FadeInView>
                      <FadeInView startValue={0.1} endValue={1} open={this.openMetricValue} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-110} endValue={0} open={this.openMetricValue} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          {this.gS.goalMetricUnits !== 'time' &&
                            <View style={styles.sortButtonCol}>
                              <SettingHeader icon={APP_ICONS.Sigma} label="Minimum Activity" 
                                  description={this.gS.goalActivity + 
                                    (this.gS.goalMetricUnits === 'course' ? ' course' : '') +
                                    ' how many ' + 
                                  ('occurrences|course'.includes(this.gS.goalMetricUnits) ? 'times' : this.gS.goalMetricUnits) +
                                  ' per ' + CATestUnitsToTime[this.gS.goalTestUnits] + '?'}
                              />
                              <View style={[styles.textInputItem, styles.inputVal]}>
                                <TextInputField
                                  onChangeFn={this.setGoalMetricValue}
                                  placeholderValue={this.gS.goalMetricValue}
                                />
                              </View>
                            </View>
                          }
                          {this.gS.goalMetricUnits === 'time' &&
                            <View style={styles.sortButtonCol}>
                              <SettingHeader icon={APP_ICONS.TimerSand} label="Minimum Activity" 
                                  description={this.gS.goalActivity + ' how much time per ' +
                                      CATestUnitsToTime[this.gS.goalTestUnits] + '?'}
                              />
                              <View style={{marginLeft: 30}}>
                                <TimeInput
                                    onChangeFn={this.setGoalMetricValueTime}
                                    timeVal={this.gS.goalMetricValue ? parseInt(this.gS.goalMetricValue) : 0}
                                />
                              </View>
                            </View>
                          }
                        </SlideDownView>
                      </FadeInView>
                      <View style={styles.divider}/>
                    </View>   
                  }     
                </View>
              }
            </View> 
          </ScrollView>
          {!this.keyboardOpen && 
            <View style={[styles.footer]}>
              <RectButton
                rippleColor={rippleColor}
                style={{flex: 1}}
                onPress={this.cancelGoalEdit}>
                <View style={footerButton}>
                  <Text style={footerButtonText}>CANCEL</Text>
                </View>
              </RectButton>
              {validGoal &&
                <RectButton
                  rippleColor={rippleColor}
                  style={{flex: 1}}
                  onPress={validGoal ? this.saveGoalEdit : undefined}>
                  <View style={footerButton}>
                    <Text style={footerButtonText}>SAVE</Text>
                  </View>
                </RectButton>
              }
            </View>
          }
        </View>    
      </View>
    )
  }
  
}
export default GoalEditor;