// This component allows the review of past treks.  Treks can be filtered and sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions } from "react-navigation";

import { FilterSvc } from "./FilterService";
import { TrekInfo, TrekObj, RESP_CANCEL, RESP_HAS_LINK, MSG_HAS_LINK, RESP_OK, MSG_LINK_ADDED,
          RESP_BAD_LENGTH, RESP_NO_MATCH, MSG_LINK_NOT_ADDED, MSG_LINK_NOT_CHANGED, 
          MSG_NEW_COURSE_RECORD, MSG_STARTING_LOC, TrekPoint } from "./TrekInfoModel";
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
import { LoggingSvc } from "./LoggingService";
import { GroupSvc } from "./GroupService";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from "./RadioPickerComponent";
import { StorageSvc } from "./StorageService";
import { CourseSvc } from "./CourseService";

export type SortByTypes = "Dist" | "Time" | "Date" | "Speed" | "Steps" | "Cals";
export type ShowTypes = "Dist" | "Time" | "Steps" | "Speed" | "Cals" | "Date";

export type TimeFrameType = "Today" | "Yesterday" | "TWeek" | "LWeek" | "TMonth" | "LMonth" | "All" | "Custom";

export const TIME_FRAMES = [
  { name: "Today", value: "Today" },
  { name: "Yesterday", value: "Yesterday" },
  { name: "This Week", value: "TWeek" },
  { name: "Last Week", value: "LWeek" },
  { name: "This Month", value: "TMonth" },
  { name: "Last Month", value: "LMonth" },
  { name: "All Dates", value: "All" }
];

export const TIME_FRAME_DISPLAY_NAMES = {
  Today: "Today",
  Yesterday: "Yesterday",
  TWeek: "This Week",
  LWeek: "Last Week",
  TMonth: "This Month",
  LMonth: "Last Month",
  All: "All Dates",
  Custom: "Dates"
};

export const TIME_FRAMES_NEXT = {
  Today: "Yesterday",
  Yesterday: "TWeek",
  TWeek: "LWeek",
  LWeek: "TMonth",
  TMonth: "LMonth",
  LMonth: "All"
};

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
class ReviewTreks extends Component<
  {
    filterSvc?: FilterSvc;
    utilsSvc?: UtilsSvc;
    modalSvc?: ModalModel;
    toastSvc?: ToastModel;
    loggingSvc?: LoggingSvc;
    storageSvc?: StorageSvc;
    courseSvc?: CourseSvc;
    groupSvc?: GroupSvc;
    uiTheme?: any;
    navigation?: any;
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {

  @observable openItems;
  @observable headerTitle;
  @observable checkboxPickerOpen;
  @observable coursePickerOpen;
  @observable showWaiting;
  @observable updateView;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  courseSvc = this.props.courseSvc;

  activeNav: string = "";
  AFFIndex: number;


  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentWillMount() {
    this.setOpenItems(false);
    this.AFFIndex = this.fS.setAfterFilterFn(this.runAfterFilterTreks);
    this.fS.setTrekType();
    this.fS.setDateMax(this.tInfo.dtMax, "None");
    this.fS.setDateMin(
      this.tInfo.dtMin,
      this.tInfo.timeframe !== "Custom" ? "None" : undefined
    );
    this.fS.setTimeframe(this.tInfo.timeframe);
  }

  componentDidMount() {
    this.setUpdateView(true);
  }

  componentWillUnmount() {
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.tInfo.updateType(this.fS.trekType);
    this.tInfo.clearTrek();
    this.fS.setSelectedTrekIndex(-1);
    this.fS.setDataReady(false);
    this.tInfo.restoreCurrentGroupSettings();
    this.props.loggingSvc.stopTrackingMarker();
    // this.tInfo.badPointList = [];                    // **Debug
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setHeaderTitle('Scanning...')
    this.setOpenItems(true);
    this.setUpdateView(false);
    this.setCheckboxPickerOpen(false);
    this.setCoursePickerOpen(false);
    this.setShowWaiting(false);
  };

  @action
  setUpdateView = (status: boolean) => {
    this.updateView = status;
  }

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

  // call the filterTreks function and manage the message in the header
  callFilterTreks = () => {
    this.setHeaderTitle("Scanning...");
    this.fS.filterTreks();
  };

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

  // Display the map for the Trek at the given index in filteredTreks
  showTrekMap = (indx: number) => {
    if (this.fS.filteredTreks.length) {
      let trek = this.tInfo.allTreks[this.fS.filteredTreks[indx]];
      this.tInfo.setTrekProperties(trek);
      // let list = this.tInfo.pointList;
      // this.tInfo.badPointList = [];
      // let newList : TrekPoint[];            // **Debug
      // newList = [];
      // bads = 0;
      // for (let i=1; i<list.length; i++) {
      //   if (this.props.utilsSvc.computeImpliedSpeed(list[i-1], list[i]) < list[i].s * 5) {
      //     // this.tInfo.badPointList.push({p1: list[i-1], p2: list[i]});
      //     newList.push(list[i])
      //   } else {
      //     bads++;
      //   }
      // }
      // list = newList;
      // for (let i=1; i<list.length; i++) {
      //   if (this.props.utilsSvc.computeImpliedSpeed(list[i-1], list[i]) > list[i].s * 5) {
      //     this.tInfo.badPointList.push(i);
      //   }
      // }
      // this.tInfo.pointList = newList;
      // alert(JSON.stringify(this.tInfo.badPointList,null,2))
      this.props.navigation.navigate("SelectedTrek", {
        title:
          this.props.utilsSvc.formattedLongDateAbbrDay(trek.date) +
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
    let indx = this.fS.selectedTrekIndex;
    let trek: TrekObj;

    if (dir === "Next" && indx !== this.fS.filteredTreks.length - 1) {
      indx++;
    } else {
      // Previous
      if (dir === "Prev" && indx !== 0) {
        indx--;
      }
    }
    if (check) {
      return indx === this.fS.selectedTrekIndex ? "NO" : "OK";
    }
    if (indx === this.fS.selectedTrekIndex) {
      return "";
    }
    trek = this.tInfo.allTreks[this.fS.filteredTreks[indx]];
    this.fS.trekSelected(indx, true);
    return (
      this.props.utilsSvc.formattedLongDateAbbrDay(trek.date) +
      "  " +
      trek.startTime
    );
  };

  // delete the trek (after confirmation) at 'index' in the filteredTreks list
  deleteTrek = (index: number) => {
    let trek = this.tInfo.allTreks[this.fS.filteredTreks[index]];
    let content =
      "Delete " +
      trek.type +
      " from:\n" +
      trek.date +
      " " +
      trek.startTime +
      "\n" +
      this.tInfo.getTrekLabel();
    this.props.modalSvc
      .simpleOpen({
        heading: "Delete " + trek.type,
        content: content,
        cancelText: "CANCEL",
        deleteText: "DELETE",
        headingIcon: trek.type,
        allowOutsideCancel: true
      })
      .then(() => {
        this.setShowWaiting(true);
        this.tInfo
          .deleteTrek(trek)
          .then(() => {
            this.setShowWaiting(false);
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: trek.type + " has been deleted."
            });
            this.callFilterTreks();
          })
          .catch(() => {
            this.setShowWaiting(false);
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: "Error: Trek NOT deleted."
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
        case "Filter":
          this.props.navigation.navigate("ExtraFilters", {
            title: this.fS.formatTitleMessage("Filter:"),
            existingFilter: this.fS.getFilterSettingsObj(false),
            mode: "Review"
          });
          break;
        case "Delete":
          this.deleteTrek(this.fS.selectedTrekIndex);
          break;
        case "Map":
          this.tInfo.setUpdateMap(true);
          this.tInfo.setUpdateGraph(false);
          this.showTrekMap(this.fS.selectedTrekIndex);
          break;
        case 'Course':
          this.addCourseOrEffort();
          break;
        default:
      }
    });
  };

  // make this trek an effort of some course or use it to create a new course
  addCourseOrEffort = () => {
    if (this.fS.filteredTreks.length) {
      let trek = this.tInfo.allTreks[this.fS.filteredTreks[this.fS.selectedTrekIndex]];
      this.courseSvc.newCourseOrEffort(trek, this.setCoursePickerOpen)
      .then((sel) => {
        switch(sel.resp){
          case RESP_CANCEL:
            break;
          case RESP_HAS_LINK:
            this.props.toastSvc.toastOpen({
              tType: "Info",
              content: MSG_HAS_LINK + 'This ' + trek.type + ' is already\nlinked to ' + sel.name,
            });
            break;
          case RESP_NO_MATCH:
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: (trek.course ? MSG_LINK_NOT_CHANGED : MSG_LINK_NOT_ADDED) + 
                        trek.type + ' path does not match path\nof course: ' + sel.name + 
                        ' (' + sel.info + '%).',
            });
            break;
          case RESP_BAD_LENGTH:
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: (trek.course ? MSG_LINK_NOT_CHANGED : MSG_LINK_NOT_ADDED) + 
                        trek.type + ' length different than that\nof course: ' + sel.name,
            });
            break;
          case MSG_STARTING_LOC:
              this.props.toastSvc.toastOpen({
                tType: "Error",
                content: (trek.course ? MSG_LINK_NOT_CHANGED : MSG_LINK_NOT_ADDED) + 
                          'Too far from start of course\n' + sel.name + ' (' + 
                          this.props.utilsSvc.formatDist(sel.info, this.tInfo.distUnits()) + ').'
              });
              break;
          case MSG_NEW_COURSE_RECORD:
              this.props.toastSvc.toastOpen({
                tType: "Success",
                content: sel.resp + 'for: ' + sel.name + 
                        ' (' + this.props.utilsSvc.timeFromSeconds(sel.info) + ')',
                time: 5000
              });
              break;
          case RESP_OK:
          default:
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: MSG_LINK_ADDED + trek.type + " linked with course\n" + sel.name,
            });
        }
      })
      .catch((err) => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: err,
        });
      })
    }
  }

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.tInfo.switchMeasurementSystem();
    this.fS.buildGraphData(this.fS.filteredTreks);
    this.fS.getFilterDefaults(this.fS.filteredTreks);
    this.tInfo.setUpdateGraph(true);
    this.forceUpdate();
  };

  // This function will run after a new list of filteredTreks has been created.
  // This function must first be registered (usually in the componentDidMount hook)
  // with filterSvc via setAfterFilterFn(fn) method.
  runAfterFilterTreks = () => {
    this.setHeaderTitle(this.fS.formatTitleMessage("Review:"));
  };

  // request an animation frame then call fS.setSortBy()
  callSetSortBy = (value: SortByTypes) => {
    requestAnimationFrame(() => {
      this.fS.setSortBy(value);
    });
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

  // change the group selections
  getDifferentGroups = () => {
    this.props.groupSvc
      .getGroupSelections(
        this.setCheckboxPickerOpen,
        this.fS.groupList,
        "Select Groups for Review"
      )
      .then(newGroups => {
        this.setOpenItems(false);
        this.fS.clearGroupList();
        newGroups.forEach((group) => this.fS.addGroupListItem(group));
        this.tInfo.readAllTreks(this.fS.groupList)
        .then(() => {
          this.fS.setDataReady(false);
          if(this.tInfo.timeframe !== 'All'){
            this.fS.findActiveTimeframe(this.tInfo.timeframe, true);
          } else {
            this.fS.filterTreks(true);
          }
          this.setOpenItems(true);
        })
        .catch(() => {
          this.setOpenItems(true);
        })
      })
      .catch(() => {});
  };

  render() {
    if (!this.updateView) {
    // alert("render: " + this.updateView)
      return (
        <View
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <TrekLogHeader
            titleText={this.headerTitle}
            icon="*"
            backButtonFn={() => this.props.navigation.dispatch(goBack)}
          />
          <Waiting />
        </View>
      );
    }

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
    const gotTreks = this.fS.dataReady && !this.fS.filteredTreksEmpty();
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
        marginHorizontal: 5,
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
        {this.fS.dataReady && (
          <View style={[styles.container, {bottom: CONTROLS_HEIGHT}]}>
            <TrekLogHeader
              titleText={this.headerTitle}
              icon="*"
              backButtonFn={() => this.props.navigation.dispatch(goBack)}
              group={this.fS.groupList.length === 1 ? this.fS.groupList[0] : "Multiple"}
              setGroupFn={this.getDifferentGroups}
            />
            <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
            <RadioPicker pickerOpen={this.coursePickerOpen} />
            <View style={[cardLayout, { paddingBottom: 0 }]}>
              <Text style={[pageTitle, {color: highTextColor}]}>Trek Review</Text>
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
                          this.fS.sortByDate ? "CheckBoxChecked" : "CheckBoxOpen"
                        }
                        color={trekLogBlue}
                        horizontal
                        label="By Date"
                        labelStyle={{ color: mediumTextColor, fontSize: 14 }}
                        onPressFn={() => this.fS.toggleSortByDate()}
                      />
                      {this.fS.sortByDate && (
                        <SvgButton
                          onPressFn={this.fS.toggleSortDirection}
                          borderWidth={0}
                          areaOffset={0}
                          size={30}
                          fill={trekLogBlue}
                          path={
                            APP_ICONS[
                              this.fS.sortDirection === "Descend"
                                ? "CalendarSortNewest"
                                : "CalendarSortOldest"
                            ]
                          }
                        />
                      )}
                      {!this.fS.sortByDate && (
                        <SvgButton
                          onPressFn={this.fS.toggleSortDirection}
                          borderWidth={0}
                          areaOffset={0}
                          size={30}
                          fill={trekLogBlue}
                          path={
                            APP_ICONS[
                              this.fS.sortDirection === "Descend"
                                ? "SortDescend"
                                : "SortAscend"
                            ]
                          }
                        />
                      )}
                    </View>
                    <View style={styles.graphAndStats}>
                      <View style={styles.graphArea}>
                        <View style={styles.graph}>
                          <BarDisplay
                            data={this.fS.barGraphData.items}
                            dataRange={this.fS.barGraphData.range}
                            selected={this.fS.selectedTrekIndex}
                            selectFn={this.fS.trekSelected}
                            openFlag={this.openItems}
                            barWidth={60}
                            maxBarHeight={160}
                            style={{ height: 210, backgroundColor: "transparent" }}
                            scrollToBar={this.fS.scrollToBar}
                          />
                        </View>
                      </View>
                    </View>
                    <TrekDetails
                      selectable
                      sortBy={this.fS.sortBy}
                      selectFn={this.callSetSortBy}
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
        {!gotTreks && (
          <View style={controlsArea}>
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon={this.fS.extraFilterSet() ? "FilterRemove" : "Filter"}
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Filter"
              label="Filter"
              labelStyle={navItemLabel}
            />
          </View>
        )}
        {gotTreks && (
          <View style={controlsArea}>
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="Delete"
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Delete"
              label="Delete"
              labelStyle={navItemLabel}
            />
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon={this.fS.extraFilterSet() ? "FilterRemove" : "Filter"}
              style={navItemWithLabel}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Filter"
              label="Filter"
              labelStyle={navItemLabel}
            />
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="Course"
              style={navItemWithLabel}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              disabled={false}
              onPressFn={this.setActiveNav}
              onPressArg="Course"
              label="Course"
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
export default ReviewTreks;
