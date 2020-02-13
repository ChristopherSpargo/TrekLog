import React, { Component } from "react";
import { View, StyleSheet, BackHandler } from "react-native";
import { observer, inject } from "mobx-react";
import { observable, action } from "mobx";
import { NavigationActions, StackActions } from "react-navigation";

import { TrekInfo } from "./TrekInfoModel";
import DashBoard from "./DashBoardComponent";
import { ToastModel } from "./ToastModel";
import { LocationSvc } from "./LocationService";
import { FilterSvc, FILTERMODE_DASHBOARD, FILTERMODE_REVIEW, FILTERMODE_FROM_STATS } from "./FilterService";
import TrekLogHeader from "./TreklogHeaderComponent";
import { GroupSvc } from "./GroupService";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from './RadioPickerComponent';
import { SummarySvc } from "./SummarySvc";
import NavMenu from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import { MainSvc, ALL_SELECT_BITS } from "./MainSvc";
import { TrekSvc } from "./TrekSvc";
import Waiting from './WaitingComponent';

const pageTitleFormat = {marginBottom: 5};
const goBack = NavigationActions.back();

@inject(
  "mainSvc",
  "trekSvc",
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
    mainSvc?: MainSvc;
    trekSvc?: TrekSvc;
    uiTheme?: any;
    toastSvc?: ToastModel;
    locationSvc?: LocationSvc;
    filterSvc?: FilterSvc;
    summarySvc?: SummarySvc;
    groupSvc?: GroupSvc;
    navigation?: any;
  },
  {}
> {
  @observable checkboxPickerOpen;
  @observable radioPickerOpen;
  @observable openNavMenu : boolean;

  mS = this.props.mainSvc;
  tS = this.props.trekSvc;
  fS = this.props.filterSvc;
  tInfo: TrekInfo = this.fS.tInfo;
  sumSvc = this.props.summarySvc;
  needToFocus = true;

  typeSels = 0;
  originalGroup;
  headerActions = [];

  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = this.props.navigation.addListener("didFocus", () => {
      this.focus(1)
    });
    this.initializeObservables();
    this.setHeaderActions();
  }

  componentWillMount() {
    this.originalGroup = this.mS.group;
    if(this.fS.groupList.length === 0){
      this.fS.addGroupListItem(this.mS.group);
    }
    // read the appropriate group of treks if necessary
    if ( !this.mS.allTreks.length ||
         (this.fS.groupList.length === 1 && this.mS.allTreksGroup !== this.mS.group) ||
         (this.fS.groupList.length > 1 && this.mS.allTreksGroup !== 'Multiple')) {
      this.mS.setDataReady(false);
      this.needToFocus = false;
      this.mS.readAllTreks(this.fS.groupList)
      .then(() => {
        this.mS.setUpdateDashboard('');    
        let havFocused = this.needToFocus;
        this.needToFocus = true;
        this.focus(2);
        this.needToFocus = havFocused;
      })
    } else {
      this.mS.setUpdateDashboard('');    
      this.focus(3);
      this.needToFocus = false;
    }
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.tS.clearTrek(this.tInfo, false);
    this.sumSvc.setFTCount(0);
  }

  checkBackButton = () => {
    if (!this.onBackButtonPressAndroid()) {
      this.props.navigation.dispatch(goBack);
    }
  };

  onBackButtonPressAndroid = () => {
    return false;
  }

  // give initial values to all observable properties
  @action
  initializeObservables = () => {
    this.setCheckboxPickerOpen(false);
    this.setRadioPickerOpen(false);
    this.setOpenNavMenu(false);
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
    this.fS.setDefaultSortValues();
    this.fS.findActiveTimeframe(this.fS.timeframe);  // filter the treks but don't build graph data
    this.mS.dtMin = this.fS.dateMin;
    this.mS.dtMax = this.fS.dateMax;
  }

  @action
  focus = (id: number) => {
    if(this.mS.dataReady && this.needToFocus){     
      // alert("focus " + id);
      this.fS.setDataReady(false);
      this.typeSels = this.fS.typeSelections;
      this.fS.setTypeSelections(ALL_SELECT_BITS);
      if(this.fS.filterMode === FILTERMODE_FROM_STATS){
        this.mS.setUpdateDashboard(FILTERMODE_FROM_STATS);
        this.fS.setDateMax(this.sumSvc.beforeRFBdateMax, "None");
        this.fS.setDateMin(this.sumSvc.beforeRFBdateMin, "None");
        this.fS.setDefaultSortValues();
        this.fS.setTimeframe(this.sumSvc.beforeRFBtimeframe);
      } else {
        this.findTime();
      }
      this.fS.setTypeSelections(this.typeSels);
      this.fS.filterMode = '';
      this.tS.clearTrek(this.tInfo, false);
      this.fS.setDataReady(true);
    }
    this.needToFocus = true;
  }

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.mS.swapColorTheme();
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
        case 'Help':
        this.props.navigation.navigate({routeName: 'ShowHelp', key: 'Key-ShowHelp'});
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
        case "NoEmpties":
          this.sumSvc.setAllowEmptyIntervals(false);
          this.sumSvc.findStartingInterval();
          break;
        case "EmptiesOK":
          this.sumSvc.setAllowEmptyIntervals(true);
          this.sumSvc.findStartingInterval();
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
        this.mS.readAllTreks(this.fS.groupList)
        .then(() => {
          this.focus(4);
        })
      })
      .catch(() => {});
  };

  setHeaderActions = () => {
    this.headerActions.push(
      {icon: 'YinYang', style: {marginTop: 0}, actionFn: this.swapColorTheme});
  }
  
  render() {
    const {
      disabledTextColor, dividerColor,
      pageBackground,
    } = this.props.uiTheme.palette[this.mS.colorTheme];
    const {
      cardLayout,
    } = this.props.uiTheme;
    const extraFilters = this.fS.extraFilterSet();
    const navMenuItems = 
    [ {label: 'Summary Options', 
      submenu: [{icon: extraFilters ? 'FilterRemove' : 'Filter', label: 'Edit Filters', value: 'ExtraFilters'},
                (this.sumSvc.allowEmptyIntervals 
                    ? {icon: 'NoEmpties', label: 'Hide Empty Intervals', value: 'NoEmpties'} 
                    : {icon: 'EmptiesOK', label: 'Show Empty Intervals', value: 'EmptiesOK'}),
                {icon: 'ChartBar', label: 'Review All', value: 'Review'},
               ]},
    {icon: 'Home', label: 'Home', value: 'GoBack'},
    {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'}  
  ]  

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
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
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
          <View style={styles.container}>
            <TrekLogHeader
              titleText="Activity"
              icon="*"
              backButtonFn={this.checkBackButton}
              actionButtons={this.headerActions}
              openMenuFn={this.openMenu}
            />
            <View style={styles.listArea}>
              <PageTitle 
                colorTheme={this.mS.colorTheme}
                titleText="Activity Summary"
                groupName={this.fS.groupList.length === 1 ? this.fS.groupList[0] : "Multiple"}
                setGroupFn={this.getDifferentGroups}
                style={pageTitleFormat}
              />
              <View style={styles.divider}/>
              {(this.mS.dataReady && this.fS.dataReady) && (
                <DashBoard
                  pickerOpenFn={this.setRadioPickerOpen}
                  navigation={this.props.navigation}
                  trekChecksum={this.fS.ftChecksum}
                />
              )}
            </View>
            {(!this.mS.dataReady || !this.fS.dataReady) && 
              <Waiting/>
            }
          </View>
        </View>
      </NavMenu>
    );
  }
}

export default SummaryScreen;
