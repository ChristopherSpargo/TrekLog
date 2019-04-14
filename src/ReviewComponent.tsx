// This component allows the review of past treks.  Treks can be filtered and sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions } from "react-navigation";

import { FilterSvc } from "./FilterService";
import { TrekInfo, TrekObj } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import { ModalModel } from "./ModalModel";
import { CONTROLS_HEIGHT, NAV_ICON_SIZE, HEADER_HEIGHT } from "./App";
import { ToastModel } from "./ToastModel";
import SvgButton from "./SvgButtonComponent";
import Waiting from "./WaitingComponent";
import IconButton from "./IconButtonComponent";
import { APP_ICONS } from "./SvgImages";
import { StorageSvc } from "./StorageService";
import BarDisplay from "./BarDisplayComponent";
import { TrekDetails } from "./TrekDetailsComponent";
import TrekLogHeader from "./TreklogHeaderComponent";

export type SortByTypes = "Dist" | "Time" | "Date" | "Speed" | "Steps" | "Cals";
export type ShowTypes = "Dist" | "Time" | "Steps" | "Speed" | "Cals" | "Date";

export const SORT_BY_CHOICES: SortByTypes[] = [
  "Dist",
  "Time",
  "Date",
  "Speed",
  "Steps",
  "Cals"
];
export const SHOW_CHOICES: ShowTypes[] = [
  "Dist",
  "Time",
  "Steps",
  "Speed",
  "Cals",
  "Date"
];
export const DISPLAY_NAMES = {
  Dist: "Distance",
  Time: "Time",
  Steps: "Steps",
  Speed: "Speed",
  Date: "Date",
  Cals: "Calories"
};
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
  "storageSvc"
)
@observer
class ReviewTreks extends Component<
  {
    filterSvc?: FilterSvc;
    utilsSvc?: UtilsSvc;
    modalSvc?: ModalModel;
    toastSvc?: ToastModel;
    storageSvc?: StorageSvc;
    uiTheme?: any;
    navigation?: any;
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {
  static navigationOptions = ({ navigation }) => {
    return {
      header: (
        <TrekLogHeader
          titleText={navigation.getParam("title", "Scanning...")}
          icon="*"
          backButtonFn={() => navigation.dispatch(goBack)}
        />
      )
    };
  };

  @observable deletingTrek;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;

  activeNav: string = "";
  AFFIndex: number;

  updateCount = 0;
  updateView = false;

  constructor(props) {
    super(props);
    this.updateView = false;
    this.initializeObservables();
  }

  shouldComponentUpdate() {
    return this.updateView;
  }

  componentWillMount() {
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
    this.updateView = true;
  }

  componentWillUnmount() {
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.tInfo.updateType(this.fS.trekType);
    this.tInfo.clearTrek();
    this.setDeletingTrek(false);
    this.fS.setSelectedTrekIndex(-1);
    this.fS.setDataReady(false);
    this.tInfo.restoreCurrentUserSettings();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.deletingTrek = false;
  };

  // call the filterTreks function and manage the message in the header
  callFilterTreks = () => {
    this.props.navigation.setParams({ title: "Scanning..." });
    this.fS.filterTreks();
  };

  // Set the title in the header
  setTitleParam = () => {
    this.props.navigation.setParams({
      title: this.fS.formatTitleMessage("Review:")
    });
  };

  // Set the value of the deletingTrek flag
  @action
  setDeletingTrek = (val: boolean) => {
    this.deletingTrek = val;
  };

  // Display the map for the Trek at the given index in filteredTreks
  showTrekMap = (indx: number) => {
    if (this.fS.filteredTreks.length) {
      let trek = this.tInfo.allTreks[this.fS.filteredTreks[indx]];
      this.tInfo.setTrekProperties(trek);
      this.props.navigation.navigate("SelectedTrek", {
        title:
          this.props.utilsSvc.formattedLongDateAbbrDay(trek.date) +
          "  " +
          trek.startTime,
        icon: this.tInfo.type,
        switchSysFn: this.switchMeasurementSystem,
        changeTrekFn: this.changeTrek
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
        this.setDeletingTrek(true);
        this.tInfo
          .deleteTrek(trek)
          .then(() => {
            this.setDeletingTrek(false);
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: trek.type + " has been deleted."
            });
            this.callFilterTreks();
          })
          .catch(() => {
            this.setDeletingTrek(false);
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
          this.props.trekInfo.setUpdateMap(true);
          this.tInfo.setUpdateGraph(false);
          this.showTrekMap(this.fS.selectedTrekIndex);
          break;
        default:
      }
    });
  };

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
    this.setTitleParam();
  };

  // format the label for the timeframe picker field
  formatTimeframeHeading = () => {
    return this.fS.getTitleActivity() + "s for:";
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

  render() {
    if (!this.updateView) {
      return (
        <View
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <Waiting />
        </View>
      );
    }

    const {height} = Dimensions.get('window');
    const pageTitleHt = 25;
    const pageTitleSpacing = 20;
    const statusBarHt = 15;
    const sortControlsHt = 30;
    const areaHt = height - (statusBarHt + pageTitleSpacing + HEADER_HEIGHT + pageTitleHt + CONTROLS_HEIGHT);
    const { cardLayout, controlsArea, navIcon, navItem } = this.props.uiTheme;
    const {
      highTextColor,
      disabledTextColor,
      pageBackground,
      trekLogBlue,
      mediumTextColor,
      navIconColor
    } = this.props.uiTheme.palette;
    const gotTreks = this.fS.dataReady && !this.fS.filteredTreksEmpty();
    const graphBgColor = "white";
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
      pageTitle: {
        fontSize: 20,
        height: pageTitleHt,
        color: highTextColor,
        fontWeight: "bold"
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
            <View style={[cardLayout, { paddingBottom: 0 }]}>
              <Text style={styles.pageTitle}>Trek Review</Text>
            </View>
            {gotTreks && 
              <View style={styles.scrollArea}>
                <ScrollView>
                  <View style={[cardLayout, styles.noPadding]}>
                    <View style={styles.sortCtrls}>
                      <IconButton
                        iconSize={30}
                        style={{ flexDirection: "row", marginRight: 5 }}
                        icon={
                          this.fS.sortByDate ? "CheckBoxChecked" : "CheckBoxOpen"
                        }
                        color={trekLogBlue}
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
                            barWidth={60}
                            maxBarHeight={155}
                            style={{ height: 210, backgroundColor: "transparent" }}
                            scrollToBar={this.fS.scrollToBar}
                          />
                        </View>
                      </View>
                    </View>
                    <TrekDetails
                      selectable
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
        {(!this.fS.dataReady || this.deletingTrek) && <Waiting />}
        {!gotTreks && (
          <View style={controlsArea}>
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon={this.fS.extraFilterSet() ? "FilterRemove" : "Filter"}
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Filter"
            />
          </View>
        )}
        {gotTreks && (
          <View style={controlsArea}>
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="Delete"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Delete"
            />
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon={this.fS.extraFilterSet() ? "FilterRemove" : "Filter"}
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Filter"
            />
            <IconButton
              iconSize={NAV_ICON_SIZE}
              icon="Map"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Map"
            />
          </View>
        )}
      </View>
    );
  }
}
export default ReviewTreks;
