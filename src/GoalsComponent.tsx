import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView, TouchableNativeFeedback } from 'react-native'
import { action } from 'mobx'
import { observer, inject } from 'mobx-react'
import { NavigationActions } from 'react-navigation';

import { TrekInfo } from './TrekInfoModel'
import { ToastModel } from './ToastModel';
import { TREKLOG_GOALS_KEY } from './App';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel';
import Waiting from './WaitingComponent';
import { GoalsSvc } from './GoalsService';
import { StorageSvc } from './StorageService';
import { GoalDisplayObj } from './GoalsService';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import SpeedDial, { SpeedDialItem } from './SpeedDialComponent';
import TrekLogHeader from './TreklogHeaderComponent';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'uiTheme', 'utilsSvc', 'modalSvc', 'goalsSvc', 'storageSvc')
@observer
class Goals extends Component<{ 
  utilsSvc ?: UtilsSvc,
  storageSvc ?: StorageSvc,
  goalsSvc ?: GoalsSvc,
  navigation ?: any
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  static navigationOptions = ({ navigation }) => {

    return {
      header: <TrekLogHeader titleText={navigation.getParam('title','Scanning...')}
                             icon="*"
                             backButtonFn={() =>  navigation.dispatch(goBack)}
              />
    };
  };


  selectedGoal = -1;             // index of currently selected goal list item (-1 if none)
  
  tI = this.props.trekInfo;
  gS = this.props.goalsSvc;
  uSvc = this.props.utilsSvc;
  APGIndex = -1;


  componentWillMount() {
    // read the User's GoalsList from the database
    this.APGIndex = this.gS.setAfterProcessGoalsFn(this.setTitleParam);
    this.setSelectedGoal(-1);
    this.gS.getGoalList()
    .then(() => {
      if (this.gS.goalList.length){
        this.gS.clearDisplayList();
        this.gS.updateDataReady(false);
        let gl = this.gS.processGoalList(this.gS.goalList);
        this.gS.afterProcessGoals();
        this.gS.setDisplayList(gl);
        this.setSelectedGoal(0);
        this.gS.updateDataReady(true);          
      }
      else {
      // Goals List is there but empty
      this.props.toastSvc.toastOpen({tType: "Error", content: "Goal list is empty."});
      this.gS.updateDataReady(true);
      this.setTitleParam();
      }
    })
    .catch(() => {
      // Failed to read Goals List
      this.props.toastSvc.toastOpen({tType: "Error", content: "No goal list found."});
      this.gS.updateDataReady(true);
      this.setTitleParam();
    })
  }

  componentWillUnmount() {
    this.gS.removeAfterProcessGoalsFn(this.APGIndex - 1);
    this.gS.clearDisplayList();
    this.gS.updateDataReady(false);
  }

  // Set the title in the header
  setTitleParam = (titleMsg?: string) => {
    if(this.gS.goalList && (this.gS.goalList.length > 0)) {
      let plural = this.gS.goalList.length === 1 ? '' : 's';
      this.props.navigation.setParams({title: 
        titleMsg || (this.gS.goalList.length + ' Goal' + plural)});
    }
    else {
      this.props.navigation.setParams({title: "No Goals"});
    }
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
      this.removeGoalListEntry(index);
      this.gS.saveGoalList();
      this.setTitleParam();
    })
    .catch(() => {
    });
  }

  // delete the selected goal from the list
  @action
  resetGoal = (index: number) => {
    const {infoConfirmColor, infoConfirmTextColor} = this.props.uiTheme.palette;
    let g = this.gS.goalList[index];

    this.props.modalSvc.simpleOpen({heading: "Reset Goal", headingIcon: "History",
      headingStartColor: infoConfirmColor, headingTextColor: infoConfirmTextColor,
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

  render() {

    const { mediumTextColor, disabledTextColor, dividerColor, highlightedItemColor,
            pageBackground, highTextColor, secondaryColor, primaryLighter } = this.props.uiTheme.palette;
    const { cardLayout } = this.props.uiTheme;
            const displayList = this.gS.displayList && this.gS.displayList.length > 0;
    const ribbonIconSize = 30;

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      cardCustom: {
        // borderBottomWidth: 1,
        justifyContent: "space-between",
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingRight: 0,
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
      goalDate: {
        color: mediumTextColor,
        paddingRight: 15,
        fontSize: 16
      },
      goalText: {
        color: highTextColor,
        fontSize: 20
      },
      ribbonArea: {
        width: ribbonIconSize,
        height: ribbonIconSize,
        marginRight: 5,
        backgroundColor: "transparent",
      },
      progressLabel: {
        width: ribbonIconSize + 5,
        marginBottom: 10,
        marginTop: -4,
        fontSize: 12,
        fontWeight: "200",
        color: highTextColor,
        textAlign: "center",
      },
      noGoals: {
        marginTop: 100,
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 22,
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
      pageTitle: {
        fontSize: 20,
        color: highTextColor,
        fontWeight: "bold",
      },
      speedDialTrigger: {
        backgroundColor: primaryLighter,
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
    })

    let mapActions : SpeedDialItem[] =
                       [{icon: 'History', label: 'Reset', value: 'Reset'},
                       {icon: 'Edit', label: 'Edit', value: 'Edit'},
                       {icon: 'Delete', label: 'Delete', value: 'Delete'}];


    return(
      <View style={styles.container}>
            <SpeedDial 
              selectFn={this.addNewGoal}
              bottom={5}
              style={styles.addGoalFab}
              icon="Plus"
            />
        {this.gS.dataReady &&
          <View style={styles.itemsArea}>
            <View style={[cardLayout, {marginBottom: 0, paddingBottom: 15}]}>
              <Text style={styles.pageTitle}>Status of Goals</Text>
            </View>
            <ScrollView>
              {!displayList && 
                <View style={styles.centered}>
                  <Text style={styles.noGoals}>No Goals To Display</Text>
                </View>
              }
              {displayList && 
                <View style={{paddingBottom: 85}}>
                  {this.gS.displayList.map((dlItem, index) => (
                    <View key={index}>
                      <View style={[cardLayout, styles.cardCustom, 
                                  this.selectedGoal === index ? styles.goalHighlight : {}]}>
                        <TouchableNativeFeedback
                          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                          onPress={this.showSelectedGoal.bind(this, index)}
                        >
                          <View>
                            <View style={styles.rowLayout}>
                              <SvgIcon 
                                paths={APP_ICONS.Ribbon}
                                size={ribbonIconSize}
                                fill="url(#grad)"
                                fillPct={this.gS.computeProgress(dlItem)}
                                // stroke={"#e6c300"}
                                stroke={highTextColor}
                                strokeWidth={.5}
                                style={styles.ribbonArea}
                              />
                              <Text style={styles.goalText}>{this.gS.formatGoalStatement(dlItem.goal)}</Text>
                            </View>
                            <View style={[styles.rowLayout,
                                          {alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10}]}>
                              <View>
                                <Text style={styles.progressLabel}>
                                  {Math.round(this.gS.computeProgress(dlItem) * 100) + '%'}
                                </Text>
                                <Text style={styles.goalDate}>{"Set: " + this.uSvc.dateFromSortDate(dlItem.goal.dateSet)}</Text>
                              </View>
                              <View>
                                <SpeedDial
                                  icon="DotsVertical"
                                  items={mapActions}
                                  sdIndex={index}
                                  selectFn={this.speedDialAction}
                                  style={styles.speedDialTrigger}
                                  horizontal={true}
                                  menuColor='transparent'
                                  iconSize="Small"
                                  itemSize="Small"
                                />
                              </View>
                            </View>
                          </View>
                        </TouchableNativeFeedback>
                      </View>
                      <View style={styles.divider}/>
                    </View>
                    ))
                  }
                </View>
              }
            </ScrollView>
          </View>
        }
        {(!this.gS.dataReady) &&
          <Waiting 
        />
      }
      </View>
    )
  }
  
}
export default Goals;