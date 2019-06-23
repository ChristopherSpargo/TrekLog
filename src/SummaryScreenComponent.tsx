import React, { Component } from "react";
import { View, StyleSheet, Text } from "react-native";
import { observer, inject } from "mobx-react";
import { observable, action } from "mobx";
import { NavigationActions } from "react-navigation";

import { NAV_ICON_SIZE } from "./App";
import { TrekInfo, ALL_SELECT_BITS } from "./TrekInfoModel";
import IconButton from "./IconButtonComponent";
import DashBoard from "./DashBoardComponent";
import { ToastModel } from "./ToastModel";
import { LocationSvc } from "./LocationService";
import { FilterSvc } from "./FilterService";
import TrekLogHeader from "./TreklogHeaderComponent";
import { GroupSvc } from "./GroupService";
import CheckboxPicker from "./CheckboxPickerComponent";

const goBack = NavigationActions.back();

@inject(
  "trekInfo",
  "uiTheme",
  "toastSvc",
  "locationSvc",
  "filterSvc",
  "groupSvc"
)
@observer
class SummaryScreen extends Component<
  {
    navigation?: any;
    toastSvc?: ToastModel;
    locationSvc?: LocationSvc;
    filterSvc?: FilterSvc;
    trekInfo?: TrekInfo;
    groupSvc?: GroupSvc;
    uiTheme?: any;
  },
  {}
> {
  @observable checkboxPickerOpen;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  activeNav = "";
  originalGroup;

  _didFocusSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener("didFocus", () =>
      this.init()
    );
    this.setCheckboxPickerOpen(false);
  }

  componentWillMount() {
    if(this.fS.groupList.length === 0){
      this.fS.addGroupListItem(this.tInfo.group);
    }
    this.originalGroup = this.tInfo.group;
    this.init();
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    if(this.tInfo.group !== this.originalGroup){
      this.tInfo.setTrekLogGroupProperties(this.originalGroup)
    }
  }

  init = () => {
    let typeSels;

    if(this.fS.groupList.length !== 1 || this.fS.groupList[0] !== this.tInfo.group){
      this.tInfo.readAllTreks(this.fS.groupList);
    }
    this.tInfo.updateDashboard = true;
    typeSels = this.tInfo.typeSelections;
    this.tInfo.setTypeSelections(ALL_SELECT_BITS);
    this.fS.filterAndSort();
    this.tInfo.setTypeSelections(typeSels);
    this.tInfo.clearTrek();
  };

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.tInfo.swapColorTheme();
  };

  setActiveNav = val => {
    this.activeNav = val;
    requestAnimationFrame(() => {
      switch (val) {
        case "Review":
          this.tInfo.updateDashboard = false;
          this.props.navigation.navigate(val);
          break;
        case "ExtraFilters":
          let title = this.fS.formatTitleMessage("Filter:", ALL_SELECT_BITS);
          let filter = this.fS.getFilterSettingsObj(false);
          this.tInfo.updateDashboard = true;
          this.fS.filterMode = "Dashboard";
          this.props.navigation.navigate("ExtraFilters", {
            title: title,
            existingFilter: filter
          });
          break;
        default:
      }
    });
  };

  // set the open status of the checkboxPickerOpen component
  @action
  setCheckboxPickerOpen = (status: boolean) => {
    this.checkboxPickerOpen = status;
  };

  // change the group selections
  getDifferentGroups = () => {
    this.props.groupSvc
      .getGroupSelections(
        this.setCheckboxPickerOpen,
        this.fS.groupList,
        "Select Groups for Summary"
      )
      .then(newGroups => {
        this.fS.clearGroupList();
        newGroups.forEach((group) => this.fS.addGroupListItem(group));
        this.tInfo.readAllTreks(this.fS.groupList)
        .then(() => {
          if(this.tInfo.timeframe !== 'All'){
            this.fS.findActiveTimeframe(this.tInfo.timeframe);
          }
        })
      })
      .catch(() => {});
  };

  render() {
    const {
      disabledTextColor,
      pageBackground,
      navIconColor,
      navItemBorderColor,
      headerTextColor,
      highTextColor
    } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const {
      controlsArea,
      navItemWithLabel,
      navItemLabel,
      navIcon,
      cardLayout,
      pageTitle
    } = this.props.uiTheme;
    const navIconSize = NAV_ICON_SIZE;
    const extraFilters = this.fS.extraFilterSet();

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: pageBackground
      },
      sloganArea: {
        alignItems: "center",
        marginBottom: 12,
        marginTop: 20
      },
      slogan: {
        fontSize: 18,
        fontStyle: "italic",
        color: disabledTextColor
      },
      dashboardArea: {
        flex: 1
      }
    });

    return (
      <View style={styles.container}>
        {this.tInfo.appReady && (
          <View style={[styles.container]}>
            <TrekLogHeader
              titleText="Summary"
              icon="*"
              backButtonFn={() => this.props.navigation.dispatch(goBack)}
              headerRightIcon="YinYang"
              headerRightIconColor={headerTextColor}
              headerRightButtonStyle={{ marginTop: 10 }}
              headerRightFn={this.swapColorTheme}
              group={this.fS.groupList.length === 1 ? this.fS.groupList[0] : "Multiple"}
              setGroupFn={this.getDifferentGroups}
            />
            <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
            <View style={[cardLayout, { paddingBottom: 0 }]}>
              <Text style={[pageTitle, { color: highTextColor }]}>
                Activity Summary
              </Text>
            </View>
            {/* <View style={styles.sloganArea}>
            <Text style={styles.slogan}>"Information is strength ...</Text>
            <Text style={styles.slogan}>... Live strong, Live long "</Text>
          </View> */}
            {this.props.trekInfo.dataReady && (
              <View style={styles.dashboardArea}>
                <DashBoard
                  navigation={this.props.navigation}
                  trekCount={this.props.trekInfo.trekCount}
                />
              </View>
            )}
            <View style={controlsArea}>
              <IconButton
                iconSize={navIconSize}
                icon={extraFilters ? "FilterRemove" : "Filter"}
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="ExtraFilters"
                label="Filter"
                labelStyle={navItemLabel}
                />
              <IconButton
                iconSize={navIconSize}
                icon="ChartBar"
                style={navItemWithLabel}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="Review"
                label="Review"
                labelStyle={navItemLabel}
                />
            </View>
          </View>
        )}
      </View>
    );
  }
}

export default SummaryScreen;
