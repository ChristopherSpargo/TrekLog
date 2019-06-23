// This component allows the review of course related treks.  
// Treks can be sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions } from "react-navigation";

import { TrekInfo, TrekObj, MSG_LINK_NOT_REMOVED,
         MeasurementSystemType, DIST_UNIT_CHOICES, MSG_UPDATING_TREK } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import { ModalModel } from "./ModalModel";
import { CONTROLS_HEIGHT, NAV_ICON_SIZE, HEADER_HEIGHT, PAGE_TITLE_HEIGHT } from "./App";
import { ToastModel } from "./ToastModel";
import SvgButton from "./SvgButtonComponent";
import Waiting from "./WaitingComponent";
import IconButton from "./IconButtonComponent";
import { APP_ICONS } from "./SvgImages";
import BarDisplay from "./BarDisplayComponent";
import { TrekDetails } from "./TrekDetailsComponent";
import TrekLogHeader from "./TreklogHeaderComponent";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from "./RadioPickerComponent";
import { StorageSvc } from "./StorageService";
import { CourseSvc, Course, CourseDetailObject } from "./CourseService";
import { BarData, BarGraphInfo, FilterSvc, SortDirection, SORT_DIRECTIONS, 
         SORT_DIRECTION_OTHER } from './FilterService';

export type SortByTypes = "Dist" | "Time" | "Date" | "Speed" | "Steps" | "Cals";
export type ShowTypes = "Dist" | "Time" | "Steps" | "Speed" | "Cals" | "Date";

export type TimeFrameType = "Today" | "Yesterday" | "TWeek" | "LWeek" | "TMonth" | "LMonth" | "All" | "Custom";

const goBack = NavigationActions.back();

@inject(
  "trekInfo",
  "utilsSvc",
  "uiTheme",
  "modalSvc",
  "toastSvc",
  "filterSvc",
  "loggingSvc",
  "storageSvc",
  "courseSvc",
  "groupSvc"
)
@observer
class CourseDetails extends Component<
  {
    utilsSvc?: UtilsSvc;
    modalSvc?: ModalModel;
    toastSvc?: ToastModel;
    storageSvc?: StorageSvc;
    courseSvc?: CourseSvc;
    filterSvc?: FilterSvc;
    uiTheme?: any;
    navigation?: any;
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {

  @observable headerTitle;
  @observable checkboxPickerOpen;
  @observable coursePickerOpen;
  @observable showWaiting;
  @observable dataReady : boolean;
  @observable selectedTrekIndex : number;
  @observable sortBy : SortByTypes;
  @observable show : ShowTypes;
  @observable sortByDate : boolean;
  @observable sortDirection : string;
  @observable openItems : boolean;
  @observable scrollToBar;


  tInfo = this.props.trekInfo;
  uSvc = this.props.utilsSvc;
  cS = this.props.courseSvc;
  fS = this.props.filterSvc;
  tS = this.props.toastSvc;
  focusCourse: Course;
  trekList : CourseDetailObject[];
  barGraphData: BarGraphInfo = {items: [], range: {max: 0, min: 0, range: 0}};

  activeNav: string = "";
  AFFIndex: number;

  updateCount = 0;

  _didFocusSubscription;
  _willBlurSubscription;
 
  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentWillMount() {
    this.setOpenItems(false);
    let cName = this.props.navigation.getParam('focusCourse');
    this.cS.getCourse(cName)
    .then((course) => {
      this.setDataReady(false);
      this.focusCourse = course;
      this.setHeaderTitle(cName);
      // alert(JSON.stringify(course.efforts,null,2))     
      this.cS.readEffortTreks(this.focusCourse)
      .then((courseTreks) => {
        this.setTrekList(courseTreks);
        this.setSortBy('Time');
        this.setDataReady(true);
      })
      .catch((err)  => {
        this.tS.toastOpen({
          tType: "Error",
          content: err,
        })
      })
    })
    .catch((err)  => {
      this.tS.toastOpen({
        tType: "Error",
        content: err,
      })
    })
  }

  componentWillUnmount() {
    this.tInfo.clearTrek();
    this.setSelectedTrekIndex(-1);
    this.setDataReady(false);
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setTrekList([]);
    this.setHeaderTitle('')
    this.setOpenItems(true);
    this.setDataReady(false);
    this.setCheckboxPickerOpen(false);
    this.setCoursePickerOpen(false);
    this.setShowWaiting(false);
    this.setSortDirection('Ascend');
    this.setSortByDate(false);
  };

  // set observable that will cause the bar graph to scroll to a bar
  @action
  setScrollToBar = (barNum: number) => {
    this.scrollToBar = barNum;
  }

  // move the barGraph to the specified bar
  scrollBarGraph = (pos: number) => {
    let oldVal = this.tInfo.updateGraph;

    this.tInfo.setUpdateGraph(true);
    this.setScrollToBar(pos);
    requestAnimationFrame(() => {
      this.tInfo.setUpdateGraph(false);
      this.setScrollToBar(undefined);
      this.tInfo.setUpdateGraph(oldVal);
    })
  }

  // set the trekList property
  @action
  setTrekList = (list: CourseDetailObject[]) => {
    this.trekList = list;
  }

  // set the selectedTrekIndex property
  @action
  setSelectedTrekIndex = (index: number) => {
    this.selectedTrekIndex = index;
  }

  // set the open status of the dataReady component
  @action
  setDataReady = (status: boolean) => {
    this.dataReady = status;
  };

  // set the open status of the checkboxPickerOpen component
  @action
  setCheckboxPickerOpen = (status: boolean) => {
    this.checkboxPickerOpen = status;
  };

  // set the open status of the coursePickerOpen component
  @action
  setCoursePickerOpen = (status: boolean) => {
    this.coursePickerOpen = status;
  };

  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // set the sortBy filter property and then set the initial value of startWith.
  @action
  setShow = (value: ShowTypes) => {
    this.show = value;
  }

  // set the sortByDate property
  @action
  setSortByDate = (status: boolean) => {
    this.sortByDate = status;
  }

  // toggle the sortByDate property
  toggleSortByDate = () => {
    this.setSortByDate(!this.sortByDate);
    this.rebuildGraph();
  }

  // Set the sortBy property
  @action
  setSortBy = (value: SortByTypes) => {
    if(value !== this.sortBy){
      this.sortBy = value;
      this.setShow(value); 
      this.rebuildGraph();
    }
  };

  // Set the sortDirection property
  @action
  setSortDirection = (value: SortDirection) => {
    this.sortDirection = value;
  };

  // toggle the sortDirection property
  toggleSortDirection = () => {
    this.setSortDirection(SORT_DIRECTION_OTHER[this.sortDirection]);
    this.rebuildGraph();
  }

  // Set the title in the header
  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  };

  // Set the value of the showWaiting flag
  @action
  setShowWaiting = (status: boolean) => {
    this.showWaiting = status;
  };

  // Display the map for the effort at the given index in trekList
  showTrekMap = (indx: number) => {
    if (this.trekList.length) {
      let trek = this.trekList[indx].trek;
      this.tInfo.setTrekProperties(trek);
      this.props.courseSvc.initCourseTrackingSnapshot(this.focusCourse, this.trekList[indx].effort, trek)
      this.props.navigation.navigate("SelectedTrek", {
        title:
          this.uSvc.formattedLongDateAbbrDay(trek.date) +
          "  " +
          trek.startTime,
        icon: this.tInfo.type,
        switchSysFn: this.switchMeasurementSystem,
        changeTrekFn: this.changeTrek,
      });
    }
  };

  // Change to Next or Prev trek in the filteredTreks array.
  // Return the header label for the Trek.
  // Return '' if user can't change in the selected direction
  changeTrek = (dir: string, check = false): string => {
    let indx = this.selectedTrekIndex;
    let trek: TrekObj;

    if (dir === "Next" && indx !== this.trekList.length - 1) {
      indx++;
    } else {
      // Previous
      if (dir === "Prev" && indx !== 0) {
        indx--;
      }
    }
    if (check) {
      return indx === this.selectedTrekIndex ? "NO" : "OK";
    }
    if (indx === this.selectedTrekIndex) {
      return "";
    }
    trek = this.trekSelected(indx, true);
    this.props.courseSvc.initCourseTrackingSnapshot(this.focusCourse, 
                                                                    this.trekList[indx].effort, trek);
    return (
      this.uSvc.formattedLongDateAbbrDay(trek.date) +
      "  " +
      trek.startTime
    );
  };

  // Set the Trek at the given index in trekList as the current Trek.
  trekSelected = (indx: number, update = false) : TrekObj => {
    let trek = this.trekList[indx].trek;
    this.tInfo.setTrekProperties(trek);
    if (update) { this.tInfo.setUpdateGraph(true); }
    this.setSelectedTrekIndex(indx);
    return trek;
  }

  // remove the course link (after confirmation) from the selected trek
  removeCourseLink = (index: number) => {
    let trek = this.trekList[index].trek;
    let content =
      "Remove link to course from " +
      trek.type +
      " on:\n" +
      trek.date +
      " " +
      trek.startTime +
      "\n" +
      this.tInfo.getTrekLabel();
    this.props.modalSvc
      .simpleOpen({
        heading: "Remove Course Link",
        content: content,
        cancelText: "CANCEL",
        deleteText: "REMOVE",
        headingIcon: 'LinkOff',
        allowOutsideCancel: true
      })
      .then(() => {
        this.setShowWaiting(true);
        this.cS.removeCourseEffort(this.focusCourse.name, trek.group, trek.date)
        .then(() => {
          // remove treklist entry for this effort
          this.trekList.splice(index,1);

          // update and save trek with no course link
          trek.course = undefined;
          this.tInfo.setCourseLink(undefined)
          this.tInfo.saveTrek(trek, 'none')
          .then(() => {
          this.setShowWaiting(false);
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: 'Link to ' + trek.type + " has been removed."
            })
          })
          .catch((err) => {
            this.setShowWaiting(false);
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: MSG_UPDATING_TREK + err,
            });
          })
        })
        .catch((err) => {
          this.setShowWaiting(false);
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: MSG_LINK_NOT_REMOVED + err
          });
        });
      })
      .catch(() => {});
  };

  // respond to actions from the BottomNavigation components
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "Unlink":
          this.removeCourseLink(this.selectedTrekIndex);
          break;
        case "Map":
          this.tInfo.setUpdateMap(true);
          this.tInfo.setUpdateGraph(false);
          this.showTrekMap(this.selectedTrekIndex);
          break;
        default:
      }
    });
  };

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.tInfo.switchMeasurementSystem();
    this.buildGraphData();
    this.tInfo.setUpdateGraph(true);
    this.forceUpdate();
  };

  // process a touch on a switchable value, allow touch feedback first
  callSwitchFn = (id: string) => {
    requestAnimationFrame(() => {
      // allow touch feedback
      switch (id) {
        case "Dist":
          this.switchMeasurementSystem();
          break;
        default:
      }
    });
  };

  // Compare the appropriate properties based on the sortBy and startWith filter values
  sortFunc = (a: CourseDetailObject, b: CourseDetailObject) : number => {
    let ta = a.trek;
    let tb = b.trek;
    let ascendingSort = this.sortDirection === SORT_DIRECTIONS[0];
    let sb = this.sortByDate ? 'Date' : this.sortBy;

    switch(sb){
      case 'Dist':
        return (ascendingSort ? 
                ta.trekDist - tb.trekDist : tb.trekDist - ta.trekDist);
      case 'Time':
        return (ascendingSort ? 
                ta.duration - tb.duration : tb.duration - ta.duration);
      case 'Date':
        return (ascendingSort ?   
              (parseInt(ta.sortDate, 10) - parseInt(tb.sortDate, 10)) : 
              (parseInt(tb.sortDate, 10) - parseInt(ta.sortDate, 10))); 
      case 'Speed':
        return (ascendingSort ? 
              (ta.duration ? (ta.trekDist / ta.duration) : 0) - 
              (tb.duration ? (tb.trekDist / tb.duration) : 0) : 
              (tb.duration ? (tb.trekDist / tb.duration) : 0) - 
              (ta.duration ? (ta.trekDist / ta.duration) : 0)); 
      case 'Cals':
        return (ascendingSort ? 
              ta.calories - tb.calories : tb.calories - ta.calories);
      case 'Steps':
        return (ascendingSort ? 
              this.uSvc.computeStepCount(ta.trekDist, ta.strideLength) - 
              this.uSvc.computeStepCount(tb.trekDist, tb.strideLength) : 
              this.uSvc.computeStepCount(tb.trekDist, tb.strideLength) - 
              this.uSvc.computeStepCount(ta.trekDist, ta.strideLength)); 
      default:
        return 0;
    }
  }

  sortTreks = () => {
    this.trekList.sort(this.sortFunc)
  }

  rebuildGraph = () => {
    // this.setOpenItems(false);
    this.sortTreks();
    this.buildGraphData();
    this.trekSelected(0, true);
    this.scrollBarGraph(0);
    // this.setOpenItems(true);
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given treks array has already been sorted using the sortBy value.
  // The 'show' value will be displayed on the bar and the Date value will be displayed above the bar.
  buildGraphData = () => {
    let thisSortDate = this.uSvc.formatSortDate();
    let dataRange = this.findDataRange(this.trekList, this.show, this.tInfo.measurementSystem)

    this.barGraphData.items = [];
    this.barGraphData.range = dataRange;
    for(let i=0; i<this.trekList.length; i++) {
      let t = this.trekList[i].trek;
      let barItem : BarData = this.fS.getBarItem(t, thisSortDate, this.show);
      this.barGraphData.items.push(barItem);
    }
  }

  // Return the range of the selected data item in the given list of CourseDetailObjects
  findDataRange = (list: CourseDetailObject[], data: string, system: MeasurementSystemType) => {
    let minD = '999999999999';
    let maxD = '000000000000';
    let minV = 999999;
    let maxV = -999999
    let range;

    list.forEach((cdo) => {
      let trek = cdo.trek;
      switch(data){
        case 'Date':
        case 'Age':
          if (trek.sortDate < minD) { minD = trek.sortDate; }
          if (trek.sortDate > maxD) { maxD = trek.sortDate; }
          break;
        case 'Dist':
          let d = this.uSvc.convertDist(trek.trekDist, DIST_UNIT_CHOICES[system])
          if (d < minV) { minV = d; }
          if (d > maxV) { maxV = d; }
          break;
        case 'Time':
          if (trek.duration < minV) { minV = trek.duration; }
          if (trek.duration > maxV) { maxV = trek.duration; }
          break;
        case 'Speed':
          let s = this.uSvc.computeRoundedAvgSpeed(system, trek.trekDist, trek.duration);
          if (s < minV) { minV = s; }
          if (s > maxV) { maxV = s; }
          break;
        case 'Cals':
          let c = trek.calories;
          if (c < minV) { minV = c; }
          if (c > maxV) { maxV = c; }
          break;
        case 'Steps':
          let st = this.uSvc.computeStepCount(trek.trekDist, trek.strideLength);
          if (st < minV) { minV = st; }
          if (st > maxV) { maxV = st; }
          break;
        default:
      }
    })
    if (data === 'Date' || data === 'Age'){ 
      maxV = this.uSvc.daysBetween(this.uSvc.formatSortDate(), minD);
      minV = this.uSvc.daysBetween(this.uSvc.formatSortDate(), maxD);
    }
    maxV = Math.round(maxV*10)/10;
    minV = Math.round(minV*10)/10;
    range = maxV - minV;
    return {max: maxV, min: minV, range: range}
  }

  render() {

    const {height} = Dimensions.get('window');
    const pageTitleSpacing = 20;
    const statusBarHt = 0;
    const sortControlsHt = 30;
    const areaHt = height - (statusBarHt + pageTitleSpacing + HEADER_HEIGHT + PAGE_TITLE_HEIGHT + CONTROLS_HEIGHT);
    const { cardLayout, controlsArea, navIcon, navItemWithLabel, navItemLabel, pageTitle } = this.props.uiTheme;
    const {
      disabledTextColor,
      pageBackground,
      trekLogBlue,
      mediumTextColor,
      highTextColor,
      navItemBorderColor,
      navIconColor
    } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const gotTreks = this.dataReady && this.cS.haveCourses();
    const graphBgColor = pageBackground;
    const graphHeight = 210;

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: pageBackground
      },
      center: {
        justifyContent: "center"
      },
      noPadding: {
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0
      },
      graphAndStats: {
        marginBottom: 5,
        height: graphHeight
      },
      graphArea: {
        backgroundColor: graphBgColor,
        marginLeft: 0
      },
      emptyGraphArea: {
        height: graphHeight,
        justifyContent: "center"
      },
      graph: {
        paddingHorizontal: 3
      },
      noMatches: {
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 22
      },
      labelText: {
        color: mediumTextColor,
        marginLeft: 15,
        marginTop: -5,
        fontSize: 22
      },
      button: {
        color: "white",
        fontSize: 16
      },
      sortCtrls: {
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginHorizontal: 10,
        height: sortControlsHt,
      },
      scrollArea: {
        flexDirection: "column",
        justifyContent: "flex-start",
        paddingTop: 0,
        height: areaHt,
      },
    });

    return (
      <View style={styles.container}>
        {this.dataReady && (
          <View style={[styles.container, {bottom: CONTROLS_HEIGHT}]}>
            <TrekLogHeader
              titleText={this.headerTitle}
              icon="*"
              backButtonFn={() => this.props.navigation.dispatch(goBack)}
            />
            <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
            <RadioPicker pickerOpen={this.coursePickerOpen} />
            <View style={[cardLayout, { paddingBottom: 0 }]}>
              <Text style={[pageTitle, {color: highTextColor}]}>Course Detail</Text>
            </View>
            {gotTreks && 
              <View style={styles.scrollArea}>
                <ScrollView>
                  <View style={[cardLayout, styles.noPadding]}>
                    <View style={styles.sortCtrls}>
                      <IconButton
                        iconSize={30}
                        style={{ flexDirection: "row", marginRight: 5, backgroundColor: "transparent",
                                 width: 90 }}
                        icon={
                          this.sortByDate ? "CheckBoxChecked" : "CheckBoxOpen"
                        }
                        color={trekLogBlue}
                        horizontal
                        label="By Date"
                        labelStyle={{ color: mediumTextColor, fontSize: 14 }}
                        onPressFn={() => this.toggleSortByDate()}
                      />
                      {this.sortByDate && (
                        <SvgButton
                          onPressFn={this.toggleSortDirection}
                          borderWidth={0}
                          areaOffset={0}
                          size={30}
                          fill={trekLogBlue}
                          path={
                            APP_ICONS[
                              this.sortDirection === "Descend"
                                ? "CalendarSortNewest"
                                : "CalendarSortOldest"
                            ]
                          }
                        />
                      )}
                      {!this.sortByDate && (
                        <SvgButton
                          onPressFn={this.toggleSortDirection}
                          borderWidth={0}
                          areaOffset={0}
                          size={30}
                          fill={trekLogBlue}
                          path={
                            APP_ICONS[
                              this.sortDirection === "Descend"
                                ? "ArrowDown"
                                : "ArrowUp"
                            ]
                          }
                        />
                      )}
                      {!this.sortByDate && (
                          <SvgButton
                          onPressFn={this.toggleSortDirection}
                          style={{marginLeft: -12}}
                          borderWidth={0}
                          areaOffset={0}
                          size={30}
                          fill={trekLogBlue}
                          path={
                            APP_ICONS.Sort
                          }
                        />
                      )}
                    </View>
                    <View style={styles.graphAndStats}>
                      <View style={styles.graphArea}>
                        <View style={styles.graph}>
                          <BarDisplay
                            data={this.barGraphData.items}
                            dataRange={this.barGraphData.range}
                            selected={this.selectedTrekIndex}
                            selectFn={this.trekSelected}
                            openFlag={this.openItems}
                            barWidth={60}
                            maxBarHeight={160}
                            style={{ height: 210, backgroundColor: "transparent" }}
                            scrollToBar={this.scrollToBar}
                          />
                        </View>
                      </View>
                    </View>
                    <TrekDetails
                      selectable
                      sortBy={this.sortBy}
                      selectFn={this.setSortBy}
                      switchSysFn={this.switchMeasurementSystem}
                    />
                  </View>
                </ScrollView>
              </View>
            }
            {!gotTreks && this.tInfo.typeSelections !== 0 && (
              <View style={[styles.emptyGraphArea, styles.graph]}>
                <Text style={styles.noMatches}>Nothing To Display</Text>
              </View>
            )}
            {!gotTreks && this.tInfo.typeSelections === 0 && (
              <View style={[styles.emptyGraphArea, styles.graph]}>
                <Text style={styles.noMatches}>No Trek Type Selected</Text>
              </View>
            )}
          </View>
        )}
        {this.showWaiting && <Waiting />}
        {gotTreks && (
          <View style={controlsArea}>
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="LinkOff"
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Unlink"
              label="Unlink"
              labelStyle={navItemLabel}
            />
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="Map"
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Map"
              label="Map"
              labelStyle={navItemLabel}
            />
          </View>
        )}
      </View>
    );
  }
}
export default CourseDetails;
