import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { action, observable } from 'mobx'
import { observer, inject } from 'mobx-react'
import { NavigationActions, StackActions } from 'react-navigation';
import { ProgressCircle } from 'react-native-svg-charts';

import { TrekInfo, RESP_OK } from './TrekInfoModel'
import { ToastModel } from './ToastModel';
import { TREKLOG_GOALS_KEY, PROGRESS_COLORS, SPEED_DIAL_Z_INDEX,
         TREKLOG_FILENAME_REGEX
       } from './App';
import { UtilsSvc } from './UtilsService';
import { ModalModel, CONFIRM_INFO } from './ModalModel';
import Waiting from './WaitingComponent';
import { GoalsSvc, GoalDisplayObj, PROGRESS_RANGES } from './GoalsService';
import SpeedDial, { SpeedDialItem } from './SpeedDialComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';
import NavMenu, { NavMenuItem } from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import { FilterSvc } from './FilterService';
import { GroupSvc } from './GroupService';
import RadioPicker from './RadioPickerComponent';

const pageTitleFormat = {marginBottom: 10};
const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'uiTheme', 'utilsSvc', 'modalSvc',
        'goalsSvc', 'filterSvc', 'groupSvc')
@observer
class Goals extends Component<{   
  utilsSvc ?: UtilsSvc,
  goalsSvc ?: GoalsSvc,
  navigation ?: any
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  filterSvc ?: FilterSvc,
  groupSvc ?: GroupSvc,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  @observable openGoals;
  @observable headerTitle;
  @observable openNavMenu : boolean;
  @observable radioPickerOpen : boolean;

  selectedGoal = -1;             // index of currently selected goal list item (-1 if none)
  
  tI = this.props.trekInfo;
  gS = this.props.goalsSvc;
  fS = this.props.filterSvc;
  uSvc = this.props.utilsSvc;
  APGIndex = -1;
  renders = 0;

  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props);
    this.initializeObservables();
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        this.setOpenGoals(true)
      }
    );
  }

  componentDidMount() {
    requestAnimationFrame(() => {
      this.setOpenGoals(true);
    })
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        this.setOpenGoals(false)
    );
  }

  componentWillMount() {
    // read the User's GoalsList from the database
    this.APGIndex = this.gS.setAfterProcessGoalsFn(this.setTitleParam);
    this.getGoals();
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.gS.removeAfterProcessGoalsFn(this.APGIndex - 1);
    this.gS.clearDisplayList();
    this.gS.updateDataReady(false);
  }

  // give initial values to all observable properties
  @action
  initializeObservables = () => {
    this.setHeaderTitle("Scanning...");
    this.setRadioPickerOpen(false);
  }

  // get the list of goals for the current group
  getGoals = () => {
    return new Promise<any>((resolve, reject) => {
      this.setSelectedGoal(-1);
      this.gS.getGoalList()
      .then(() => {
        if (this.gS.goalList.length){
          this.gS.clearDisplayList();
          this.gS.updateDataReady(false);
          let gl = this.gS.processGoalList(this.gS.goalList);
          this.gS.afterProcessGoals();
          this.gS.setDisplayList(gl);
          this.gS.sortGoals();
          this.setSelectedGoal(0);
          this.gS.updateDataReady(true);  
          this.setOpenGoals(false);        
        }
        else {
          // Goals List is there but empty
          this.props.toastSvc.toastOpen({tType: "Error", content: "Goal list is empty."});
          this.gS.updateDataReady(true);
          this.setTitleParam();
        }
        resolve(RESP_OK);
      })
      .catch((err) => {
        // Failed to read Goals List
        this.props.toastSvc.toastOpen({tType: "Error", content: "No goal list found."});
        this.gS.updateDataReady(true);
        this.setTitleParam();
        reject(err)
      })
    })
  }

  // set the openNavMenu property
  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  // Set the title in the header
  setTitleParam = (titleMsg?: string) => {
    if(this.gS.goalList && (this.gS.goalList.length > 0)) {
      this.setHeaderTitle(titleMsg || ( 'Goals (' + this.gS.goalList.length + ')'));
    }
    else {
      this.setHeaderTitle("No Goals");
    }
  }

  // Set the title in the header
  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  };

  @action
  setOpenGoals = (status: boolean) => {
    this.openGoals = status;
  }

  // Format the storage key for this user's goals
  formatUserGoalsKey = (user: string) => {
    return (TREKLOG_GOALS_KEY + user + '#');
  }

  @action
  removeGoalListEntry = (index: number) => {
    this.gS.goalList.splice(index,1);
    this.gS.displayList.splice(index,1);
  }

  @action
  resetGoalListEntryDate = (index: number) => {
    this.gS.goalList[index].dateSet = this.uSvc.formatShortSortDate() + "0000";
    this.gS.displayList[index] = this.gS.processGoal(this.gS.goalList[index]);
  }

  // delete the selected goal from the list
  @action
  deleteGoal = (index: number) => {
    let g = this.gS.goalList[index];

    this.props.modalSvc.simpleOpen({heading: "Delete Goal", headingIcon: "Delete",     
      content: "Delete goal of:", bigContent: '"' + this.gS.formatGoalStatement(g) + '"', 
      cancelText: 'CANCEL', deleteText: 'DELETE'})
    .then(() => {
      this.setOpenGoals(false);
      this.removeGoalListEntry(index);
      this.gS.saveGoalList();
      this.setTitleParam();
      requestAnimationFrame(() => {
        this.setOpenGoals(true);
      })
    })
    .catch(() => {
    });
  }

  // delete the selected goal from the list
  @action
  resetGoal = (index: number) => {
    let g = this.gS.goalList[index];

    this.props.modalSvc.simpleOpen({heading: "Reset Goal", headingIcon: "History",
      dType: CONFIRM_INFO,
      content: "Reset effective date to TODAY for:", bigContent: '"' + this.gS.formatGoalStatement(g) + '"', 
      cancelText: 'CANCEL', okText: 'RESET'})
    .then(() => {
      this.resetGoalListEntryDate(index);
      this.gS.saveGoalList();
    })
    .catch(() => {
    });
  }

  // edit the selected goal from the goalList
  editGoal = (index: number) => {
    this.gS.setEditObjFields(this.gS.goalList[index]);
    this.gS.editGoalIndex = index;
    this.gS.setGoalEditMode('Edit');
    this.props.navigation.navigate('GoalEditor', {title: 'Edit Goal'});
  }

  // Show the details of the given GoalDisplayObj
  showGoalDetails = (gdo: GoalDisplayObj) => {
    this.props.navigation.navigate('GoalDetail', {title: this.gS.formatGoalStatement(gdo.goal), detailObj: gdo});
  }

  // add a new goal to the user's goal list
  addNewGoal = () => {
    this.gS.setNewDITGoalObj('');
    this.gS.editGoalIndex = -1;
    this.gS.setGoalEditMode('New');
    this.props.navigation.navigate('GoalEditor', {title: 'New Goal', onAddFn: this.setTitleParam});
  }

  // update the value of the selected goal index
  @action
  setSelectedGoal = (index: number) => {
    this.selectedGoal = index;
  }

  // update the value of the selected goal index and show the goal details
  @action
  showSelectedGoal = (index: number) => {
    requestAnimationFrame(() => { 
      this.setSelectedGoal(index);
      this.showGoalDetails(this.gS.displayList[index]);
    })
  }

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  // change the current group
  getDifferentGroup = () => {
    this.props.groupSvc.getGroupSelection(this.setRadioPickerOpen, this.tI.group, 'Select A Group',
                                        false, TREKLOG_FILENAME_REGEX)
    .then((newGroup) => {
      this.tI.setTrekLogGroupProperties(newGroup)
      .then((result) => {
        if(result === RESP_OK){
          this.gS.setDataReady(false);
          this.fS.clearGroupList();
          this.getGoals();
          requestAnimationFrame(() => {
            this.gS.setDataReady(true);
            this.setOpenGoals(true);
          })
        }
      })
    })
    .catch(() =>{ 
    })
  }

  // respond to a speed dial menu command
  speedDialAction = (cmd: string, index: number) => {
    switch(cmd){
      case 'Reset':
        this.resetGoal(index);
        break;
      case 'Edit':
        this.editGoal(index);
        break;
      case 'Delete':
        this.deleteGoal(index);
        break;
      default:
    }
  }

  setActiveNav = val => {
    requestAnimationFrame(() => {
      switch (val) {
        case "Home":
          this.tI.clearTrek();
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Summary":
        case "Courses":
        case "Settings":
        case "Conditions":
        const resetAction = StackActions.reset({
                index: 1,
                actions: [
                  NavigationActions.navigate({ routeName: 'Log', key: 'Home' }),
                  NavigationActions.navigate({ routeName: val, key: 'Key-' + val }),
                ],
              });
          this.props.navigation.dispatch(resetAction);          
          break;
        default:
      }
    })
  }
  render() {

    const { mediumTextColor, disabledTextColor, dividerColor, highlightedItemColor,
            pageBackground, highTextColor, secondaryColor, rippleColor, textOnSecondaryColor, progressBackground,
            cardItemTitleColor, altCardBackground
          } = this.props.uiTheme.palette[this.tI.colorTheme];
    const { cardLayout, fontRegular, fontLight } = this.props.uiTheme;
    const displayList = this.gS.displayList && this.gS.displayList.length > 0;
    const iconSize = 40;
    const progressCircleSize = 40;
    const iconLabelTextSize = 16;
    const goalCardHeight = 152 + 12;
    let navMenuItems : NavMenuItem[] = 
    [ {icon: 'Home', label: 'Home', value: 'Home'},
      {icon: 'Pie', label: 'Activity', value: 'Summary'},
      {icon: 'Course', label: 'Courses', value: 'Courses'},
      {icon: 'Settings', label: 'Settings', value: 'Settings'},
      {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}
    ]  
    

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      cardCustom: {
        justifyContent: "space-between",
        paddingBottom: 0,
        paddingLeft: 0,
        paddingTop: 0,
        paddingRight: 0,
        marginTop: 2,
        marginBottom: 10,
        marginLeft: 5,
        marginRight: 5,
        borderColor: dividerColor,
        borderStyle: "solid",
        borderWidth: 1,
        borderBottomWidth: 2,         // to give it a little elevation look
        borderRadius: 3,
        backgroundColor: altCardBackground,
      },
      goalHighlight: {
        backgroundColor: highlightedItemColor,
      },
      centered: {
        marginTop: 150,
        alignItems: "center",
        justifyContent: "center"
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      goalDateItem: {
        flexDirection: "row",
        alignItems: "center"
      },
      goalDateType: {
        fontFamily: fontRegular,
        fontSize: 18,
        color: mediumTextColor,
        width: 80,
      },
      goalDateText: {
        fontFamily: fontRegular,
        color: mediumTextColor,
        fontSize: 18
      },
      goalText: {
        fontFamily: fontRegular,
        color: cardItemTitleColor,
        fontSize: 22
      },
      progressLabel: {
        width: iconSize + 5,
        marginTop: 3,
        fontSize: iconLabelTextSize,
        fontFamily: fontLight,
        color: highTextColor,
        textAlign: "center",
      },
      noGoals: {
        marginTop: 100,
        textAlign: "center",
        fontFamily: fontRegular,
        color: disabledTextColor,
        fontSize: 24,
      },
      addGoalFab: {
        backgroundColor: secondaryColor,
      },
      itemsArea: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      speedDialTrigger: {
        backgroundColor: "transparent",
      },
      buttonArea: {
        marginTop: 10,
        marginLeft: 15,
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      listArea: {
        ...cardLayout,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: pageBackground,
      },
    })

    let mapActions : SpeedDialItem[] =
                       [{icon: 'History', label: 'Reset', value: 'Reset'},
                       {icon: 'Edit', label: 'Edit', value: 'Edit'},
                       {icon: 'Delete', label: 'Delete', value: 'Delete'}];


    return(
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          <TrekLogHeader
            titleText={this.headerTitle}
            icon="*"
            backButtonFn={() => this.props.navigation.dispatch(goBack)}
            openMenuFn={this.openMenu}
          />
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
              <View style={styles.listArea}>
                <PageTitle 
                  colorTheme={this.tI.colorTheme}
                  titleText="Goals List"
                  groupName={this.tI.group || "None"}
                  setGroupFn={this.getDifferentGroup}
                  style={pageTitleFormat}
                />
                {this.gS.dataReady &&
                  <ScrollView snapToInterval={goalCardHeight} decelerationRate={.90}> 
                    {!displayList && 
                      <View style={styles.centered}>
                        <Text style={styles.noGoals}>No Goals To Display</Text>
                      </View>
                    }
                    {displayList && 
                      <View style={{paddingBottom: 85}}>
                        {this.gS.displayList.map((dlItem, index) => {
                          let prog = this.gS.computeProgress(dlItem);
                          let progPct = Math.round(prog * 100);
                          let ind = this.uSvc.findRangeIndex(progPct, PROGRESS_RANGES);
                          let pColor = PROGRESS_COLORS[ind];
                          return (
                            <FadeInView startValue={0} key={index} endValue={1} open={this.openGoals} 
                                duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                              <SlideDownView startValue={-170} endValue={0} open={this.openGoals} 
                                  duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                                <View style={[cardLayout, styles.cardCustom, {overflow: "hidden"},
                                            this.selectedGoal === index ? styles.goalHighlight : {}]}>
                                  <RectButton
                                    rippleColor={rippleColor}
                                    onPress={this.showSelectedGoal.bind(this, index)}
                                  >
                                    <View style={styles.buttonArea}>
                                      <Text style={styles.goalText}>{this.gS.formatGoalStatement(dlItem.goal)}</Text>
                                      <View style={[styles.rowLayout, {alignItems: "flex-start", marginBottom: 40, marginTop: 5}]}>
                                        <View>                                  
                                          <ProgressCircle
                                            style={{height: progressCircleSize}}
                                            backgroundColor={progressBackground}
                                            strokeWidth={2}
                                            progress={prog}
                                            progressColor={pColor}
                                          />                         
                                          <Text style={styles.progressLabel}>
                                            {Math.round(this.gS.computeProgress(dlItem) * 100) + '%'}
                                          </Text>
                                        </View>
                                        <View style={{marginLeft: 10}}>  
                                          <View style={styles.goalDateItem}>
                                            <Text style={styles.goalDateType}>Since:</Text>
                                            <Text style={styles.goalDateText}>
                                                    {this.uSvc.dateFromSortDate(dlItem.goal.dateSet)}</Text>
                                          </View>                                
                                          <View style={styles.goalDateItem}>
                                            <Text style={styles.goalDateType}>Last Met:</Text>
                                            <Text style={[styles.goalDateText, {color: highTextColor}]}>
                                                  {dlItem.mostRecentDate === '0' ? "Never" :
                                                    this.uSvc.dateFromSortDate(dlItem.mostRecentDate)}</Text>
                                          </View>
                                        </View>
                                      </View>
                                      {/* <View style={[styles.rowLayout,
                                                    {alignItems: 'flex-end', justifyContent: 'flex-end', 
                                                    marginBottom: 5}]}> */}
                                        <SpeedDial
                                          icon="DotsVertical"
                                          iconColor={mediumTextColor}
                                          items={mapActions}
                                          bottom={3}
                                          // right={10}
                                          sdIndex={index}
                                          selectFn={this.speedDialAction}
                                          style={styles.speedDialTrigger}
                                          horizontal={true}
                                          menuColor="transparent"
                                          itemIconsStyle={{backgroundColor: secondaryColor}}
                                          itemIconsColor={textOnSecondaryColor}
                                          iconSize="Small"
                                        />
                                    </View>
                                  </RectButton>
                                </View>
                              </SlideDownView>
                            </FadeInView>       
                          )})
                        }
                      </View>
                    }
                  </ScrollView>
                }
              </View>
          {(!this.gS.dataReady) &&
            <Waiting/>
          }
          <SpeedDial 
            selectFn={this.addNewGoal}
            bottom={10}
            style={styles.addGoalFab}
            icon="Plus"
            triggerZ={SPEED_DIAL_Z_INDEX}
            raised
          />
        </View>
      </NavMenu>
    )
  }
  
}
export default Goals;