// This component allows the review of course related treks.  
// Treks can be sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions, StackActions } from "react-navigation";

import { TrekInfo, TrekObj, MSG_LINK_NOT_REMOVED, TrekType,
         MeasurementSystemType, DIST_UNIT_CHOICES, MSG_UPDATING_TREK } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import { ModalModel } from "./ModalModel";
import { HEADER_HEIGHT, PAGE_TITLE_HEIGHT, CONTROLS_HEIGHT } from "./App";
import { ToastModel } from "./ToastModel";
import SvgButton from "./SvgButtonComponent";
import Waiting from "./WaitingComponent";
import { APP_ICONS } from "./SvgImages";
import BarDisplay, { BarData, BarGraphInfo } from "./BarDisplayComponent";
import { TrekDetails } from "./TrekDetailsComponent";
import TrekLogHeader from "./TreklogHeaderComponent";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from "./RadioPickerComponent";
import { StorageSvc } from "./StorageService";
import { CourseSvc, Course, CourseDetailObject, CourseEffort } from "./CourseService";
import TrackingMethodForm from './TrackingMethodComponent';
import { FilterSvc, SortDirection, SORT_DIRECTIONS, 
         SORT_DIRECTION_OTHER } from './FilterService';
import SvgYAxis, { YAXIS_TYPE_MAP } from './SvgYAxisComponent';
import SvgGrid from './SvgGridComponent';
import SpeedDial from './SpeedDialComponent';
import NavMenu from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
         
export type SortByTypes = "Dist" | "Time" | "Date" | "Speed" | "Steps" | "Cals";
export type ShowTypes = "Dist" | "Time" | "Steps" | "Speed" | "Cals" | "Date";

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
  @observable dataReady : boolean;
  @observable selectedTrekIndex : number;
  @observable sortBy : SortByTypes;
  @observable show : ShowTypes;
  @observable sortByDate : boolean;
  @observable sortDirection : string;
  @observable openItems : boolean;
  @observable scrollToBar;
  @observable trackingMethodFormOpen: boolean;
  @observable openNavMenu : boolean;
  @observable otherEffortSelect : boolean;


  tInfo = this.props.trekInfo;
  uSvc = this.props.utilsSvc;
  cS = this.props.courseSvc;
  fS = this.props.filterSvc;
  tS = this.props.toastSvc;
  focusCourse: Course;
  trekList : CourseDetailObject[];
  barGraphData: BarGraphInfo = {items: [], range: {max: 0, min: 0, range: 0}};
  selectedTrekDate = '';

  activeNav: string = "";
  AFFIndex: number;
  prevGroup: string;          // Group name on entry to this component, needs to be restored
  prevType: TrekType;           // previous trek type
  subjectEffort: number;
  targetEffort: number;

  updateCount = 0;

  _didFocusSubscription;
 
  constructor(props) {
    super(props);
    this.initializeObservables();
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        // go back to Courses menu level if we are returning from changing the defining effort for this course
        if (this.cS.changedDefiningEffort){
          this.cS.changedDefiningEffort = false;
          this.props.navigation.dispatch(goBack)
        }
      }
    );
  }

  componentWillMount() {
    this.prevGroup = this.tInfo.group;
    this.prevType = this.tInfo.type;
    this.setDataReady(false);
    this.setOpenItems(false);
    let cName = this.props.navigation.getParam('focusCourse');
    this.cS.getCourse(cName)
    .then((course) => {
      this.focusCourse = course;
      this.setHeaderTitle(cName);
      this.cS.readEffortTreks(this.focusCourse)   // this creates a CourseDetailObj[]
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
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this.tInfo.clearTrek();
    this.tInfo.updateGroup(this.prevGroup);
    this.tInfo.updateType(this.prevType);
    this.setSelectedTrekIndex(-1);
    this.tInfo.setTrackingValueInfo({value: 0, method: 'courseTime'});
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
    this.setSortDirection('Ascend');
    this.setSortByDate(false);
    this.setTrackingMethodFormOpen(false);
    this.setOpenNavMenu(false);
  };

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  @action
  setOtherEffortSelect = (status: boolean) => {
    this.otherEffortSelect = status;
  }

  // set observable that will cause the bar graph to scroll to a bar
  @action
  setScrollToBar = (barNum: number) => {
    this.scrollToBar = barNum;
  }

  // move the barGraph to the specified bar
  scrollBarGraph = (pos: number) => {
    this.setScrollToBar(pos);
    requestAnimationFrame(() => {
      this.setScrollToBar(undefined);
    })
  }

  // set the trekList property
  setTrekList = (list: CourseDetailObject[]) => {
    this.trekList = list;
  }

  // set the selectedTrekIndex property
  @action
  setSelectedTrekIndex = (index: number) => {
    this.selectedTrekIndex = index;
    this.selectedTrekDate = index < 0 ? '' :  this.trekList[index].trek.sortDate;
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
    if (value === 'Date'){
      this.toggleSortByDate();
    } else {
      if(value !== this.sortBy){
        this.sortBy = value;
        this.setShow(value); 
        this.rebuildGraph();
      } else {
        this.toggleSortDirection();
      }
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

  // set the value of the trackingMethodFormOpen property
  @action
  setTrackingMethodFormOpen = (status: boolean) => {
    this.trackingMethodFormOpen = status;
  };

  // Open the Tracking method form
  openTrackingMethodForm = () => {
    this.tInfo.limitsCloseFn = this.prepareForReplay;
    this.setTrackingMethodFormOpen(true);
  };

  // Display the map for the effort at the given index in trekList
  showTrekMap = (subjectEffort: number, useEffortTarget: boolean, targetTrek?: TrekObj) => {
    if (this.trekList.length) {
      let trek = this.trekList[subjectEffort].trek;
      let effort = useEffortTarget ? this.trekList[subjectEffort].effort : undefined;
      this.tInfo.setTrekProperties(trek);
      this.tInfo.setShowMapControls(true)
      this.props.courseSvc.initCourseTrackingSnapshot(this.focusCourse, trek, effort, targetTrek)
      .then(() => {        
        // alert(JSON.stringify({...this.cS.trackingSnapshot, ...{coursePath: undefined, trekPath: undefined}},null,2))
        this.props.navigation.navigate("SelectedTrek", {
          title:
            this.uSvc.formattedLocaleDateAbbrDay(trek.date) +
            "  " +
            trek.startTime,
          icon: this.tInfo.type,
          switchSysFn: this.switchMeasurementSystem,
          changeTrekFn: this.changeTrek,
          checkTrekChangeFn: this.checkTrekChange,
        })
      })
      .catch(() => {})
    }
  };

  checkTrekChange = (dir: string) => {
    let indx = this.selectedTrekIndex;
    if (dir === "Next" && indx !== this.trekList.length - 1) {
      indx++;
    } else {
      // Previous
      if (dir === "Prev" && indx !== 0) {
        indx--;
      }
    }
    return (indx === this.selectedTrekIndex ? -1 : indx);
  }

  // Change to Next or Prev trek in the filteredTreks array.
  // Return the header label for the Trek.
  // Return '' if user can't change in the selected direction
  changeTrek = (dir: string) => {
    let indx = this.checkTrekChange(dir);
    let trek: TrekObj;

    return new Promise<any>((resolve, reject) => {      
      if (indx === -1) {
        resolve("");
      }
      trek = this.trekSelected(indx);
      this.tInfo.setShowMapControls(true)
      this.props.courseSvc.initCourseTrackingSnapshot(this.focusCourse, trek, this.trekList[indx].effort)
      .then(() => {        
        resolve(
          this.uSvc.formattedLocaleDateAbbrDay(trek.date) +
          "  " +
          trek.startTime
        );
      })
      .catch((err) => reject(err))
    })
  };

  // Set the Trek at the given index in trekList as the current Trek.
  trekSelected = (indx: number) : TrekObj => {
    let trek = this.trekList[indx].trek;
    this.setSelectedTrekIndex(indx);
    this.tInfo.setTrekProperties(trek);

    this.tInfo.setTrackingMethod(this.trekList[indx].effort.subject.method);
    this.tInfo.setTrackingValue(this.trekList[indx].effort.subject.goalValue);      

    return trek;
  }

  // respond to graph bar being pressed
  callTrekSelected = (indx: number) => {
    if (indx === this.selectedTrekIndex) {
      this.tInfo.setTrackingMethod(this.trekList[indx].effort.subject.method);
      this.tInfo.setTrackingValue(this.trekList[indx].effort.subject.goalValue);      
      this.showTrekMap(indx, true);
    } else {
      this.trekSelected(indx)
    }
  }

  // remove the trekList item at the specified index
  removeTrekListItem = (index: number) => {
    this.trekList.splice(index,1);
    this.rebuildGraph();
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
        this.tInfo.setWaitingForSomething("NoMsg");
        this.cS.removeCourseEffort(this.focusCourse.name, trek.group, trek.sortDate)
        .then(() => {
          // remove treklist entry for this effort
          this.removeTrekListItem(index);

          // update and save trek with no course link
          trek.course = undefined;
          this.tInfo.setCourseLink(undefined)
          this.tInfo.saveTrek(trek)
          .then(() => {
            this.tInfo.setWaitingForSomething();
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: 'Link to ' + trek.type + " has been removed."
            })
          })
          .catch((err) => {
            this.tInfo.setWaitingForSomething();
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: MSG_UPDATING_TREK + err,
            });
          })
        })
        .catch((err) => {
          this.tInfo.setWaitingForSomething();
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: MSG_LINK_NOT_REMOVED + err
          });
        });
      })
      .catch(() => {});
  };

  // remove the course link (after confirmation) from the selected trek
  setDefiningEffort = (index: number) => {
    let trek = this.trekList[index].trek;
    if (this.cS.isDefiningEffort(this.focusCourse, trek)) {
      this.props.toastSvc.toastOpen({
        tType: "Info",
        content: 'This ' + trek.type + ' is already the\nDefault Effort for this course.',
        waitForOK: true
      });
    } else {      
      let content =
        "Change default effort for course to " +
        trek.type +
        " on:\n" +
        trek.date +
        " " +
        trek.startTime +
        "\n" +
        this.tInfo.getTrekLabel();
      this.props.modalSvc
        .simpleOpen({
          heading: "Set Default Effort",
          content: content,
          cancelText: "CANCEL",
          okText: "SET",
          headingIcon: 'Key',
          allowOutsideCancel: true
        })
      .then(() => {
        this.props.navigation.navigate("SelectedTrek", {
          title:
            this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
            "  " +
            trek.startTime,
          icon: this.tInfo.type,
          mapDisplayMode: 'noSpeeds,noIntervals',
          takeSnapshotMode: "Update",
          takeSnapshotName: this.focusCourse.name,
          takeSnapshotPrompt: 'SET DEFAULT EFFORT\n' + this.focusCourse.name
          
        });
      })
      .catch(() => {});
    }
  };

  // user selected to run the selected trek against a specific other effort
  // call showTrekMap with the two choices
  otherEffortSelected = () => {
    this.targetEffort = this.selectedTrekIndex;
    let trek = this.trekList[this.targetEffort].trek; // get the trek selected as target
    this.setSelectedTrekIndex(this.subjectEffort);    // restore selectedTrekIndex to that of subject
    this.setOtherEffortSelect(false);
    this.tInfo.setTrackingValue(trek.duration);
    this.tInfo.setTrackingMethod('otherEffort');
    this.showTrekMap(this.subjectEffort, false, trek);
  }

  // user has selected to configure the replay of the selected trek on this course
  prepareForReplay = (start: boolean) => {
    if (start) {
      this.setTrackingMethodFormOpen(false);
      this.targetEffort = undefined;
      if(this.tInfo.trackingMethod === 'otherEffort') {
        this.subjectEffort = this.selectedTrekIndex;
        this.setOtherEffortSelect(true);    // allow user to select target effort
      } else {
        this.showTrekMap(this.selectedTrekIndex, false);
      }
    } else {
      this.setTrackingMethodFormOpen(false);
    }
  }

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.tInfo.switchMeasurementSystem();
    this.buildGraphData();
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
    let sel = this.findCurrentSelection();
    this.trekSelected(sel);
    this.scrollBarGraph(sel);
  }

  // find the index for the trek with the date matching selectedTrekDate
  findCurrentSelection = () : number => {
    if (this.selectedTrekDate === '') { return 0; }
    for (let i=0; i<this.trekList.length; i++) {
      if (this.trekList[i].trek.sortDate === this.selectedTrekDate) {
        return i;
      }
    }
    return 0;
  }

  // set the title property of the barGraphData object
  setGraphTitle = (sType: ShowTypes) => {
    this.barGraphData.title = undefined;
    switch(sType){
      case 'Dist':
        this.barGraphData.title = this.tInfo.longDistUnitsCaps();
        break;
      case 'Speed':
        this.barGraphData.title = this.tInfo.speedUnits();
        break;
    }
  }

  // Create the data array for the bar graph.
  // Content depends on which show category is currently selected
  // The given treks array has already been sorted using the sortBy value.
  // The 'show' value will be displayed on the bar and the Date value will be displayed above the bar.
  buildGraphData = () => {
    let thisSortDate = this.uSvc.formatSortDate();
    let dataRange = this.findDataRange(this.trekList, this.show, this.tInfo.measurementSystem)

    this.barGraphData.items = [];
    dataRange.range = dataRange.max;
    dataRange.min = 0;
    this.setGraphTitle(this.show);
    this.barGraphData.range = dataRange;
    for(let i=0; i<this.trekList.length; i++) {
      let t = this.trekList[i].trek;
      let barItem : BarData = this.fS.getBarItem(t, thisSortDate, this.show);
      if (this.cS.isDefiningEffort(this.focusCourse, t)) {
        barItem.extraIcon = "Key";
      }
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

  // respond to actions from the Navigation components
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "Unlink":
          this.removeCourseLink(this.selectedTrekIndex);
          break;
        case "Default":
          this.setDefiningEffort(this.selectedTrekIndex);
          break;
        case "Map":
          this.showTrekMap(this.selectedTrekIndex, true);
          break;
        case "Replay":
          this.openTrackingMethodForm();
          break;
        case "GoBack":
          this.props.navigation.dispatch(goBack);
          break;
        case "Home":
          this.tInfo.clearTrek();
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Summary":
        case "Goals":
        case "Settings":
        case "Conditions":
          this.tInfo.clearTrek();
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
    });
  };

  // show the selected trek image
  showTrekImage = (set: number, image = 0) => {
    let title = this.tInfo.formatImageTitle(set, image);
    this.props.navigation.navigate('Images', {cmd: 'show', setIndex: set, imageIndex: image, title: title});
  }

  render() {

    const {height, width} = Dimensions.get('window');
    const pageTitleSpacing = 20;
    const statusBarHt = 0;
    const sortControlsHt = 30;
    const areaHt = height - (statusBarHt + pageTitleSpacing + HEADER_HEIGHT + PAGE_TITLE_HEIGHT);
    const { cardLayout } = this.props.uiTheme;
    const {
      disabledTextColor,
      pageBackground,
      trekLogBlue,
      mediumTextColor,
      dividerColor,
      secondaryColor
    } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const gotTreks = this.dataReady && this.cS.haveCourses();
    const graphBgColor = pageBackground;
    const graphHeight = 210;
    const maxBarHeight = 160;
    const graphAreaWidth = width;
    const yAxisWidth = 60;
    const graphWidth = graphAreaWidth - yAxisWidth - 10;
    const sortAsc = this.sortDirection === 'Ascend';
    const replayFormOpen = this.trackingMethodFormOpen;
    const navMenuItems = 
    [ 
      {label: 'Course Options', 
        submenu: [
        {icon: 'LinkOff', label: 'Unlink', value: 'Unlink', disabled: !gotTreks},
        {icon: 'Key', label: 'Set as Default', value: 'Default', disabled: !gotTreks},
        {icon: 'Replay', label: 'Configure Replay', value: 'Replay', disabled: !gotTreks},
        {icon: 'Map', label: 'View Map', value: 'Map', disabled: !gotTreks}]
      },
      {icon: 'Home', label: 'Home', value: 'Home'},
      {icon: 'Pie', label: 'Activity', value: 'Summary'},
      {icon: 'Course', label: 'Courses', value: 'GoBack'},
      {icon: 'Target', label: 'Goals', value: 'Goals'},
      {icon: 'Settings', label: 'Settings', value: 'Settings'},
      {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}
    ]  


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
        marginRight: 10,
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
        marginLeft: yAxisWidth,
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
      graphStyle: {
        height: graphHeight,
      },
      barStyle: { 
        height: graphHeight, 
        width: 40,
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
      listArea: {
        ...cardLayout,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: pageBackground,
      },
      saveFab: {
        backgroundColor: secondaryColor,
      },
    });

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        locked={replayFormOpen}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          {this.dataReady && (
            <View style={styles.container}>
              <TrekLogHeader
                titleText={this.headerTitle}
                icon="*"
                backButtonFn={() => this.props.navigation.dispatch(goBack)}
                openMenuFn={this.openMenu}
              />
              <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
              <RadioPicker pickerOpen={this.coursePickerOpen} />
              <View style={styles.listArea}>
                <PageTitle titleText="Course Detail"/>
                {gotTreks && 
                  <View style={styles.scrollArea}>
                    <ScrollView>
                      <View style={[cardLayout, styles.noPadding, {marginTop: 0}]}>
                        <View style={styles.sortCtrls}>
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
                              style={sortAsc ? {transform: ([{ rotateX: "180deg" }])} : {}}
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
                            <SvgYAxis
                              graphHeight={graphHeight}
                              axisTop={maxBarHeight}
                              axisBottom={20}
                              axisWidth={yAxisWidth}
                              color={mediumTextColor}
                              lineWidth={1}
                              majorTics={5}
                              title={this.barGraphData.title}
                              dataRange={this.barGraphData.range}
                              dataType={YAXIS_TYPE_MAP[this.show]}
                            />
                            <View style={styles.graph}>
                              <SvgGrid
                                graphHeight={graphHeight}
                                gridWidth={graphWidth}
                                lineCount={3}
                                color={dividerColor}
                                maxBarHeight={maxBarHeight}
                                minBarHeight={20}
                              />
                              <BarDisplay
                                data={this.barGraphData.items}
                                dataRange={this.barGraphData.range}
                                selected={this.selectedTrekIndex}
                                selectFn={this.callTrekSelected}
                                openFlag={this.openItems}
                                maxBarHeight={maxBarHeight}
                                style={styles.graphStyle}
                                barStyle={styles.barStyle}
                                scrollToBar={this.scrollToBar}
                              />
                            </View>
                          </View>
                        </View>
                        <TrekDetails
                          selectable
                          sortBy={this.sortBy}
                          sortByDate={this.sortByDate}
                          selectFn={this.setSortBy}
                          switchSysFn={this.switchMeasurementSystem}
                          showImagesFn={this.showTrekImage}
                          showGroup={true}
                        />
                      </View>
                    </ScrollView>
                  </View>
                }
              </View>
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
          {this.tInfo.waitingForSomething && <Waiting />}
          {this.dataReady && 
            <TrackingMethodForm
              open={this.trackingMethodFormOpen}
              header="Replay Course Effort"
              title="Move Course Marker Using:"
              icon="Replay"
              inMethod={this.trekList[this.selectedTrekIndex].effort.subject.method}
              inValue={this.trekList[this.selectedTrekIndex].effort.subject.goalValue}
              onChangeFn={this.tInfo.setTrackingValueInfo}
              course={this.focusCourse}
              trek={{date: this.tInfo.sortDate, group: this.tInfo.group}}
            />
          }
          {(this.dataReady && this.otherEffortSelect && this.selectedTrekIndex !== this.subjectEffort) &&
            <SpeedDial 
              selectFn={this.otherEffortSelected}
              bottom={CONTROLS_HEIGHT}
              style={styles.saveFab}
              icon="CheckMark"
              raised
            />
          }
        </View>
      </NavMenu>
    );
  }
}
export default CourseDetails;
