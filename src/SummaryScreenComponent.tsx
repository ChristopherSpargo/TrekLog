import React, { Component } from "react";
import { View, StyleSheet, Text } from "react-native";
import { observer, inject } from "mobx-react";
import { observable, action } from "mobx";
import { NavigationActions, StackActions } from "react-navigation";

import { TrekInfo, ALL_SELECT_BITS } from "./TrekInfoModel";
import DashBoard from "./DashBoardComponent";
import { ToastModel } from "./ToastModel";
import { LocationSvc } from "./LocationService";
import { FilterSvc, FILTERMODE_DASHBOARD, FILTERMODE_REVIEW, FILTERMODE_FROM_STATS } from "./FilterService";
import TrekLogHeader from "./TreklogHeaderComponent";
import { GroupSvc } from "./GroupService";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from './RadioPickerComponent';
import { SummaryModel } from "./SummaryModel";
import NavMenu from './NavMenuComponent';
import NavMenuTrigger from './NavMenuTriggerComponent'

const goBack = NavigationActions.back();

@inject(
  "trekInfo",
  "uiTheme",
  "toastSvc",
  "locationSvc",
  "filterSvc",
  "summarySvc",
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
    summarySvc?: SummaryModel;
    groupSvc?: GroupSvc;
    uiTheme?: any;
  },
  {}
> {
  @observable checkboxPickerOpen;
  @observable radioPickerOpen;
  @observable openNavMenu : boolean;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  sumSvc = this.props.summarySvc;
  typeSels = 0;
  originalGroup;

  _didFocusSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener("didFocus", () =>
      this.focus()
    );
    this.setCheckboxPickerOpen(false);
    this.setRadioPickerOpen(false);
    this.setOpenNavMenu(false);
  }

  componentWillMount() {
    if(this.fS.groupList.length === 0){
      this.fS.addGroupListItem(this.tInfo.group);
    }
    this.tInfo.setUpdateDashboard('');    
    this.originalGroup = this.tInfo.group;
    // this.fS.filterMode = '';
    this.fS.setTrekType();
    this.focus();
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this.tInfo.clearTrek();
    this.sumSvc.setFTCount(0);
    if(this.tInfo.group !== this.originalGroup){
      this.tInfo.setTrekLogGroupProperties(this.originalGroup)
    }
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  @action
  findTime = () => {
    this.fS.setDefaultSortValues()
    this.fS.findActiveTimeframe(this.tInfo.timeframe);  // filter the treks but don't build graph data
    this.tInfo.dtMin = this.fS.dateMin;
    this.tInfo.dtMax = this.fS.dateMax;
  }

  @action
  focus = () => {
    this.typeSels = this.tInfo.typeSelections;
      this.tInfo.setTypeSelections(ALL_SELECT_BITS);
    if(this.fS.filterMode === FILTERMODE_FROM_STATS){
      this.tInfo.setUpdateDashboard(FILTERMODE_FROM_STATS);
      this.fS.setDateMax(this.sumSvc.beforeRFBdateMax, "None");
      this.fS.setDateMin(this.sumSvc.beforeRFBdateMin, "None");
      this.fS.setTimeframe(this.sumSvc.beforeRFBtimeframe);
    } else {
      this.findTime();
    }
    this.tInfo.setTypeSelections(this.typeSels);
    this.fS.filterMode = '';
    this.tInfo.updateType(this.fS.trekType);
    this.tInfo.clearTrek();
  }

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.tInfo.swapColorTheme();
  };

  setActiveNav = val => {
    requestAnimationFrame(() => {
      switch (val) {
        case "GoBack":
          this.props.navigation.dispatch(goBack);
          break;
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Courses":
        case "Goals":
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
        case "Review":
          this.fS.filterMode = FILTERMODE_REVIEW;
          this.props.navigation.navigate({routeName: val, key: 'Key-Review'});
          break;
        case "ExtraFilters":
          let title = this.fS.formatTitleMessage("Filter:", ALL_SELECT_BITS);
          let filter = this.fS.getFilterSettingsObj(false);
          this.fS.filterMode = FILTERMODE_DASHBOARD;
          this.props.navigation.navigate("ExtraFilters", {
            title: title,
            existingFilter: filter
          });
          break;
        default:
      }
    });
  };

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

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
          this.focus();
        })
      })
      .catch(() => {});
  };

  render() {
    const {
      disabledTextColor,
      pageBackground,
      headerTextColor,
      highTextColor,
    } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const {
      cardLayout,
      pageTitle
    } = this.props.uiTheme;
    const extraFilters = this.fS.extraFilterSet();
    const headerActions = [
      {icon: 'YinYang', color: headerTextColor, style: {marginTop: 10}, actionFn: this.swapColorTheme}
    ];
    const navMenuItems = 
    [ {label: 'Summary Options', 
      submenu: [{icon: extraFilters ? 'FilterRemove' : 'Filter', label: 'Edit Filters', value: 'ExtraFilters'},
                {icon: 'ChartBar', label: 'Review', value: 'Review'},
               ]},
    {icon: 'Home', label: 'Home', value: 'GoBack'},
    {icon: 'Course', label: 'Courses', value: 'Courses'},
    {icon: 'Target', label: 'Goals', value: 'Goals'},
    {icon: 'Settings', label: 'Settings', value: 'Settings'},
    {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}]  

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: pageBackground
      },
      cardAdj: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: 0,
      },
      sloganArea: {
        alignItems: "center",
        marginBottom: 12,
        marginTop: 20
      },
      slogan: {
        fontSize: 18,
        fontStyle: "italic",
        color: disabledTextColor,
      },
      dashboardArea: {
        flex: 1
      },
      listArea: {
        ...cardLayout,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: pageBackground,
      },
      pageTitleAdj: {
        color: highTextColor,
        paddingLeft: 10,
        paddingRight: 10,
        marginBottom: 0,
      },
    });

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
          <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
          {this.tInfo.appReady && (
            <View style={styles.container}>
              <TrekLogHeader
                titleText="Activity"
                icon="*"
                backButtonFn={() => this.props.navigation.dispatch(goBack)}
                actionButtons={headerActions}
                group={this.fS.groupList.length === 1 ? this.fS.groupList[0] : "Multiple"}
                setGroupFn={this.getDifferentGroups}
              />
              <View style={styles.listArea}>
                <NavMenuTrigger openMenuFn={this.openMenu}/>
                <Text style={[pageTitle, styles.pageTitleAdj]}>
                  Activity Summary
                </Text>
                {this.props.trekInfo.dataReady && (
                  <DashBoard
                    pickerOpenFn={this.setRadioPickerOpen}
                    navigation={this.props.navigation}
                    trekChecksum={this.fS.ftChecksum}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </NavMenu>
    );
  }
}

export default SummaryScreen;
