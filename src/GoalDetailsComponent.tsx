import React, { Component } from 'react';
import { View, StyleSheet, Text, BackHandler, ScrollView, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { NavigationActions, StackActions } from 'react-navigation';
import { ProgressCircle } from 'react-native-svg-charts';

import { HEADER_HEIGHT, INVISIBLE_Z_INDEX,
         PAGE_TITLE_HEIGHT, PROGRESS_COLORS } from './App';
import { GoalsSvc } from './GoalsService';
import { TrekObj } from './TrekInfoModel';
import { UtilsSvc, M_PER_MILE } from './UtilsService';
import { GoalDisplayObj, GoalObj, PROGRESS_RANGES } from './GoalsService';
import { DIT_GOAL_CAT, CA_GOAL_CAT } from './GoalsService';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import BarDisplay, { BarGraphInfo } from "./BarDisplayComponent";
import TrekDetails from './TrekDetailsComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import SvgYAxis, { YAXIS_TYPE_MAP } from './SvgYAxisComponent';
import SvgGrid from './SvgGridComponent';
import NavMenu, { NavMenuItem } from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import { CourseSvc } from './CourseService';
import { ToastModel } from './ToastModel';
import RadioPicker from "./RadioPickerComponent";
import { FilterSvc } from './FilterService';
import { MainSvc, RESP_CANCEL, MSG_HAS_LINK, RESP_OK, MSG_LINK_ADDED,
         MSG_NO_LIST, MSG_NEW_COURSE_RECORD, MSG_NEW_COURSE, MSG_NONE_NEARBY, TREK_TYPE_HIKE } from './MainSvc';
import { TrekSvc } from './TrekSvc';

const pageTitleFormat = {marginBottom: 10};
const goBack = NavigationActions.back() ;

@inject('mainSvc', 'trekSvc', 'utilsSvc', 'uiTheme', 'goalsSvc', 'courseSvc', 'toastSvc', 'filterSvc')
@observer
class GoalDetails extends Component<{ 
  goalsSvc ?: GoalsSvc,
  courseSvc ?: CourseSvc,
  utilsSvc ?: UtilsSvc,
  toastSvc ?: ToastModel,
  filterSvc ?: FilterSvc,
  uiTheme ?: any,
  navigation ?: any,
  mainSvc ?: MainSvc,
  trekSvc ?: TrekSvc         // object with all non-gps information about the Trek
}, {} > {

  mS = this.props.mainSvc;
  cS = this.props.courseSvc;
  tS = this.props.trekSvc;
  gS = this.props.goalsSvc;
  fS = this.props.filterSvc;
  uSvc = this.props.utilsSvc;
  tInfo = this.fS.tInfo;
  activeNav : string = '';
  detailObj : GoalDisplayObj;
  displayChoice : string;
  scrollViewRef;
  trekGraphData : BarGraphInfo;
  intervalGraphData : BarGraphInfo;
  emptyIntervals = 0;


  @observable selectedTrekIndex : number;
  @observable selectedTrekBar;
  @observable selectedIntervalIndex : number;
  @observable selectedIntervalBar;
  @observable scrollToInterval: number;
  @observable scrollToTrek: number;
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;
  @observable openNavMenu : boolean;
  @observable coursePickerOpen;


  _didFocusSubscription;
  _willBlurSubscription;
 
  constructor(props) {
    super(props);
    this.initializeObservables();
    this._didFocusSubscription = props.navigation.addListener('didFocus', () => {
      // the next line makes sure the graph reflects the right bar if interval changed via Next/Prev
      if (this.trekGraphData) { this.scrollTrekGraph(this.selectedTrekBar); }
      // now add a listener for the back button while this is the active route
      BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPressAndroid)});  
  }

  componentWillMount() {
    this.intervalGraphData = this.trekGraphData = undefined;
    this.detailObj = this.props.navigation.getParam('detailObj');
    this.displayChoice = this.detailObj.goal.metricUnits;
    this.setSelectedIntervalIndex(-1);
    if (this.detailObj.goal.category === DIT_GOAL_CAT){
      this.trekGraphData = this.gS.buildGraphData(this.detailObj, -1, this.displayChoice);
      if (this.trekGraphData.items.length){
        this.setCurrentTrek(this.trekGraphData.items[0].index);
      }
    } else {
      this.intervalGraphData = this.gS.buildGraphData(this.detailObj, -1, this.displayChoice);
      this.emptyIntervals = this.detailObj.emptyIntervals;
    }
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener('willBlur', () =>
      BackHandler.removeEventListener('hardwareBackPress', this.onBackButtonPressAndroid))
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
  }

  checkBackButton = () => {
    requestAnimationFrame(() =>{
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  }

  onBackButtonPressAndroid = () => {
    if (!this.gS.intervalGraph) {
      this.gS.setIntervalGraph(true);
      this.trekGraphData = undefined;
      this.scrollIntervalGraph(this.selectedIntervalBar);
      return true;
    } else {
      return false;
    }
  };

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.selectedTrekIndex = -1;
    this.selectedTrekBar = -1;
    this.selectedIntervalIndex = -1;
    this.selectedIntervalBar = -1;
    this.scrollToInterval = -1;
    this.scrollToTrek = -1;
    this.showStepsPerMin = false;
    this.showTotalCalories = true;
    this.setOpenNavMenu(false);
    this.setCoursePickerOpen(false);
   }

  // set observable that will cause the Interval barGraph to scroll to a given bar
  @action
  setScrollToInterval = (barNum: number) => {
    this.scrollToInterval = barNum;
  }

  // move the Interval barGraph to the specified bar
  scrollIntervalGraph = (pos: number) => {
    this.setScrollToInterval(pos);
    requestAnimationFrame(() => {
      this.setScrollToInterval(undefined);
    })
  }

  // set observable that will cause the Trek barBGaph to scroll to a given bar
  @action
  setScrollToTrek = (barNum: number) => {
    this.scrollToTrek = barNum;
  }

  // move the Trek barGraph to the specified bar
  scrollTrekGraph = (pos: number) => {

    this.setScrollToTrek(pos);
    requestAnimationFrame(() => {
      this.setScrollToTrek(undefined);
    })
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  @action
  setSelectedTrekIndex = (val: number) => {
    let bar = -1;

    if((val !== -1) && this.trekGraphData.items && this.trekGraphData.items.length){
      bar = this.trekGraphData.items.findIndex((item) => item.index === val);
    }
    this.selectedTrekBar = bar;
    this.selectedTrekIndex = val;
  }

  @action
  setSelectedIntervalIndex = (val: number) => {
    let bar = -1;

    if((val !== -1) && this.intervalGraphData.items && this.intervalGraphData.items.length){
      bar = this.intervalGraphData.items.findIndex((item) => item.index === val);
    }
    if (val >= 0) { 
      this.gS.setIntervalGraph(false);
    } else {
      this.gS.setIntervalGraph(true);
    }
    this.selectedIntervalBar = bar;
    this.selectedIntervalIndex = val;
  }

  formatTrekItem = (t: TrekObj) : string => {
    return  this.uSvc.formattedLongDateAbbr(t.date) + ' at ' + t.startTime;
  }

  // return the formatted time for distance in goal metric units
  getTimeForDist = (mValue: number, mUnits: string, tUnits: string, t: TrekObj) => {
    let timePerUnit = t.duration / t.trekDist;

    switch(mUnits){
      case 'miles':
        timePerUnit *= M_PER_MILE;
        break;
      case 'kilometers':
        timePerUnit *= 1000;
        break;
      case 'meters':
      default:
    }
    switch(tUnits){
      case 'hours':
        timePerUnit /= 3600;
        break;
      case 'minutes':
        timePerUnit /= 60;
        break;
      case 'seconds':
      default:
    }
    return Math.round((mValue * timePerUnit * 10)/10).toString();
  }

  // return the formatted goal metric value for the given trek
  getValueForMetric = (metric: string, t: TrekObj) : string => {
    let val;

    if (metric === 'times'){
      metric = t.duration >= 3600 ? 'hours' : 'minutes'
    }
    switch(metric){
      case 'calories':
        val = t.calories;
        break;
      case 'steps':
        val = this.uSvc.computeStepCount(t.trekDist, t.strideLength);
        break;
      case 'miles':
        val = Math.round(t.trekDist/M_PER_MILE*10)/10;
        break;
      case 'kilometers':
        val = Math.round(t.trekDist/100)/10;
        break;
      case 'meters':
        val = t.trekDist;
        break;
      case 'hours':
        val = Math.round(t.duration / 360)/10;
        break;
      case 'minutes':
        val = Math.round(t.duration / 60);
        break;
      default:
    }
    return val + ' ' + metric;
  }

  relevantTrekMetrics = (g: GoalObj, t: TrekObj) : string => {
    let msg = '';
    let act = g.activity;

    if (g.activity === 'Trek' && g.metricUnits === 'calories'){ act = 'Burn'; }
    switch(g.category){
      case DIT_GOAL_CAT:
        msg = act + ' ' + g.metricValue + ' ' + g.metricUnits + ' every ' +
               this.getTimeForDist(g.metricValue, g.metricUnits, g.testUnits, t) + ' ' + g.testUnits;
        break;
      case CA_GOAL_CAT:
        msg = act + ' ' + this.getValueForMetric(g.metricUnits, t);
      break;
      default:
    }
    msg = msg.replace(/Trek/ig, (t.type + ' for'));
    msg = this.makeReplacements(msg);
    msg = msg.replace(/Burned/ig, (t.type + ' Burned'));
    return msg;
  }

  // make various replacements to the wording of the given trek metrics statement
  makeReplacements = (msg: string) => {

    msg = msg.replace(/Trek/ig, 'Treked');
    msg = msg.replace(/Walk/ig, 'Walked');
    msg = msg.replace(/Run/ig, 'Ran');
    msg = msg.replace(/Bike/ig, 'Biked');
    msg = msg.replace(/Hike/ig, 'Hiked');
    msg = msg.replace(/Burn /ig, 'Burned ');
    msg = msg.replace(/ 1 times/ig, ' once');
    msg = msg.replace(/ 2 times/ig, ' twice');
    msg = msg.replace(/ 1 miles/ig, ' 1 mile');
    msg = msg.replace(/ 1 hours/ig, ' hour');
    msg = msg.replace(/ 1 minutes/ig, ' minute');

    return msg;
  }
  
  // format the value of a Cumulative Activity interval accumulator
  formatCAAccum = (accum: number, units: string, act: string) => {
    let val;

    switch(units){
      case 'calories':
      case 'meters':
      case 'steps':
      case 'times':
        val = accum;
        break;
      case 'miles':
        val = Math.round(accum * 10)/10;
        break;
      case 'kilometers':
        val = Math.round(accum * 10)/10;
        break;
      case 'hours':
        val = Math.round(accum * 10)/10;
        break;
      case 'minutes':
        val = Math.round(accum);
        break;
      default:
    }
    return this.makeReplacements(act + ' ' + val + ' ' + units);

  }

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.mS.switchMeasurementSystem();
    this.gS.buildGraphData(this.detailObj, this.selectedIntervalIndex, this.displayChoice);
    this.forceUpdate();
  };

  // Display the map for the Trek at the given index in the items list of the given display object
  showTrekMap = () => {
    this.mS.setShowMapControls(false);
    requestAnimationFrame(() => {
      this.props.navigation.navigate({routeName: 'SelectedTrek', 
        params: { title: this.props.utilsSvc.formattedLocaleDateAbbrDay(this.tInfo.date) + 
                        '  ' + this.tInfo.startTime.toLowerCase(),
                  trek: this.tInfo,
                  changeTrekFn: this.changeTrek,
                  checkTrekChangeFn: this.checkTrekChange,
                  switchSysFn: this.switchMeasurementSystem,
                }, key: 'Key-SelectedTrek'});
    })
  }

  checkTrekChange = (dir: string) => {
    let index = this.selectedTrekIndex;
    let items = this.detailObj.items;
    let origInterval = this.selectedIntervalIndex;
    let newInterval = origInterval;

    if (dir === 'Next') {
      while((index !== (items.length - 1)) && (items[++index].trek === undefined)){
        // change interval here
        newInterval++;
      }
    }
    if (dir === 'Prev'){
      while((index !== 0) && (items[--index].trek === undefined)){
        // change interval here
        newInterval--;
      }
      if(newInterval !== origInterval){
        // find last trek in prior interval
        while(items[index + 1].trek !== undefined) {index++;} 
      }
    }
    return ((index === this.selectedTrekIndex) || (items[index].trek === undefined)) ? -1 : index;
  }

  // Change to Next or Prev trek in the displayObj.treks array.
  // Resolve the header label for the Trek.
  // Resolve '' if user can't change in the selected direction
  changeTrek = (dir: string) => {
    let index = this.checkTrekChange(dir);
    let trek : TrekObj;
    let items = this.detailObj.items;
    let origInterval = this.selectedIntervalIndex;
    let newInterval = origInterval;

    return new Promise<any>((resolve) => {      
      if (index === -1) { 
        resolve('');    // can't move
      } else {    
        index = this.selectedTrekIndex;
        if (dir === 'Next') {
          while((index !== (items.length - 1)) && (items[++index].trek === undefined)){
            // change interval here
            newInterval++;
          }
        }
        if (dir === 'Prev'){
          while((index !== 0) && (items[--index].trek === undefined)){
            // change interval here
            newInterval--;
          }
          if(newInterval !== origInterval){
            // find last trek in prior interval
            while(items[index + 1].trek !== undefined) {index++;} 
          }
        }
        if (newInterval !== origInterval){
          this.intervalSelected(newInterval, false);  // this builds trekGraphData for the new interval
        }
        trek = this.setCurrentTrek(index);        // this sets the selectedTrekBar property
        this.mS.setShowMapControls(false);
        resolve(this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) + '  ' + trek.startTime.toLowerCase());
      }
    }) 
  }

  setCurrentTrek = (trekIndex: number) : TrekObj => {
    let trek = this.mS.allTreks[this.detailObj.items[trekIndex].trek];      
    this.tS.setTrekProperties(this.tInfo, trek, false);
    this.mS.setCurrentMapType(trek.type === TREK_TYPE_HIKE ? 'terrain' 
                                                                : this.mS.defaultMapType)
    this.setSelectedTrekIndex(trekIndex);
    return trek;
  }

  formatDetailsTitle = (dObj: GoalDisplayObj, int: number, type: string) : string => {
    const titleForTreks = (dObj.goal.category === DIT_GOAL_CAT) || !this.gS.intervalGraph;
    let fullTitle = this.gS.formatGraphTitle(dObj, int);
    let i = fullTitle.indexOf(':');
    let str : string;

    switch(type) {
      case 'page':
        if (titleForTreks && (i !== -1)) {
          str = dObj.goal.testUnits + ' Activity' + fullTitle.substr(i);
        } else {
          str = 'Goal Activity';
        }
        break;
      case 'graph':
        if (titleForTreks && (i !== -1)) {
          str = fullTitle.substr(0, i)
        } else {
          str = fullTitle;
        }
        break;
      default:
    }
    str = str.replace(/daily/ig, 'Day')
    str = str.replace(/weekly/ig, 'Week')
    str = str.replace(/monthly/ig, 'Month')
    return str;
  }

  trekSelected = (index: number) => {
    if (index === this.selectedTrekIndex) {
      this.showTrekMap();
    } else {
      this.setCurrentTrek(index)
    }
  }

  @action
  intervalSelected = (index: number, setTrek = true) => {
    this.setSelectedIntervalIndex(index);
    this.trekGraphData = this.gS.buildGraphData(this.detailObj, index, this.displayChoice);
    if (setTrek) {
      if(index >= 0){
        this.setCurrentTrek(this.trekGraphData.items[0].index);
      } else {
        this.setSelectedTrekIndex(index);
      }
    }
  }

  // respond to actions from the BottomNavigation components
  setActiveNav = (val) => {
    this.activeNav = val;
    switch(val){
      case 'Map':
        this.showTrekMap()
        break;
      case "GoBack":
        this.props.navigation.dispatch(goBack);
        break;
      case 'Help':
        this.props.navigation.navigate({routeName: 'ShowHelp', key: 'Key-ShowHelp'});
        break;
      case "Home":
        this.props.navigation.dispatch(StackActions.popToTop());
        break;
      case 'Course':
        this.addCourseOrEffort();
        break;
      default:
    }
  }

  // Display the map for the effort at the given index in trekList
  showCourseEffort = (trek: TrekObj) => {
    this.cS.getCourse(trek.course)
    .then((course) => {
      let effort = this.cS.getTrekEffort(course, trek);
      this.mS.setShowMapControls(true)
      this.cS.initCourseTrackingSnapshot(course, trek, effort, 
                              effort.method, effort.goalValue)
      .then(() => {        
        this.props.navigation.navigate("SelectedTrek", {
          trek: this.tInfo,
          title:
            this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
            "  " +
            trek.startTime.toLowerCase(),
          icon: this.tInfo.type,
          switchSysFn: this.mS.switchMeasurementSystem,
        })
      })
      .catch(() => {})
    })
    .catch(() => {})
};

// show the selected trek image
  showTrekImage = (set: number, image = 0) => {
    let title = this.tS.formatImageTitle(this.tInfo, set, image);
    this.props.navigation.navigate({
      routeName: 'Images', 
      params:  {cmd: 'show', 
                setIndex: set, 
                imageIndex: image, 
                trek: this.tInfo,
                title: title},
      key: 'Key-Images'
    });
  }

  // toggle the selected flag
  toggleShowValue = (type: string) => {
    this.fS.toggleShowValue(type);
  }

  // set the open status of the coursePickerOpen component
  @action
  setCoursePickerOpen = (status: boolean) => {
    this.coursePickerOpen = status;
  };

  // make this trek an effort of some course or use it to create a new course
  addCourseOrEffort = () => {
    let trek = this.tInfo;
    if(!trek.course || !this.cS.isCourse(trek.course)) {
      this.cS.newCourseOrEffort(trek, this.setCoursePickerOpen)
      .then((sel) => {
        switch(sel.resp){
          case RESP_CANCEL:
            break;
            case MSG_NONE_NEARBY:
            case MSG_NO_LIST:
              this.props.toastSvc.toastOpen({
                tType: "Error",
                content: 'No matching courses found.',
              });
              break;
          case MSG_NEW_COURSE_RECORD:
              this.cS.celebrateNewCourseRecord(sel.resp, sel.name, sel.info);
              break;
          case RESP_OK:
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: MSG_LINK_ADDED + trek.type + " linked with course\n" + sel.name,
            });
            break;
          case MSG_NEW_COURSE:
            this.props.navigation.navigate("SelectedTrek", {
              trek: this.tInfo,
              title:
                this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
                "  " +
                trek.startTime,
              icon: this.tInfo.type,
              mapDisplayMode: 'noSpeeds, noIntervals',
              takeSnapshotMode: 'New',
              takeSnapshotName: sel.name,
              takeSnapshotPrompt: "CREATE COURSE\n" + sel.name
            });
            break;
          default:
        }
      })
      .catch((err) => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: err,
        });
      })
    } else {
      this.props.toastSvc.toastOpen({
        tType: "Info",
        content: MSG_HAS_LINK + 'This ' + trek.type + ' is already\nlinked to ' + trek.course,
      });
    }
  }

  render() {
    const {height, width} = Dimensions.get('window');
    this.detailObj = this.props.navigation.getParam('detailObj');

    const { mediumTextColor, pageBackground, dividerColor, highTextColor, bottomBorder,
            itemMeetsGoal, itemMissesGoal, listIconColor, progressBackground, altCardBackground,
            shadow1
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { cardLayout, fontRegular, fontLightItalic
          } = this.props.uiTheme;
    const dObj = this.detailObj;
    const validDisplayObj = dObj !== undefined && dObj.items.length > 0;
    const pageTitleSpacing = 20;
    const titleHt = 20;
    const chartForTreks = (dObj.goal.category === DIT_GOAL_CAT) || (!this.gS.intervalGraph);
    const showEmpties = !chartForTreks && (this.emptyIntervals !== 0);
    const miHt = showEmpties ? 20 : 0;
    const graphHeight = 200;
    const graphAreaWidth = width - 6;
    const yAxisWidth = 60;
    const graphWidth = graphAreaWidth - yAxisWidth - 10;
    const maxBarHeightInterval = 155;
    const maxBarHeightTrek = 145;
    const infoItemHeight = 70;
    const infoIconSize = 24;
    const showLegend = this.gS.intervalGraph;
    const legendHt = showLegend ? 30 : 0;
    const pTitle = this.formatDetailsTitle(dObj, this.selectedIntervalIndex, "page");
    const graphTitle = this.formatDetailsTitle(dObj, this.selectedIntervalIndex, "graph");
    const areaHt = height - 
          (graphHeight + titleHt + 5 + miHt + legendHt + HEADER_HEIGHT + PAGE_TITLE_HEIGHT + pageTitleSpacing);
    const prog = this.gS.computeProgress(dObj);
    const progPct = Math.round(prog * 100);
    const ind = this.uSvc.findRangeIndex(progPct, PROGRESS_RANGES);
    const pColor = PROGRESS_COLORS[ind];
    const showType = (dObj.goal.category === DIT_GOAL_CAT) ? "Time" : 
                      ((dObj.goal.metricUnits === "course" && !this.gS.intervalGraph) ? "Time" : "Dist");
    const hasNoCourse = !this.tInfo.course || !this.cS.isCourse(this.tInfo.course);
    let navMenuItems : NavMenuItem[] = 
    [ 
        {icon: 'Home', label: 'Home', value: 'Home'},
        {icon: 'ArrowBack', label: 'Back', value: 'GoBack'},
        {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'}  
      ]  
    if (validDisplayObj && !showLegend) {
      navMenuItems.unshift(
        {label: 'Detail Options', 
         submenu: [
          {icon: 'Map', label: 'View Map', value: 'Map'}
        ]}
      );
      if(hasNoCourse){ 
        navMenuItems[0].submenu.push({icon: 'Course', label: 'Link to Course', value: 'Course'});
      }
    } 

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      centered: {
        marginTop: 150,
        alignItems: "center",
        justifyContent: "center"
      },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
      },
      rowAround: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
      },
      rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: altCardBackground,
        borderColor: dividerColor,
        borderStyle: "solid",
        paddingHorizontal: 15,
        height: infoItemHeight,
        ...shadow1
      },
      titleArea: {
        height: titleHt + miHt,
        marginBottom: 5,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
      titleText: {
        color: highTextColor,
        fontFamily: fontRegular,
        fontSize: 20,
      },
      miText: {
        color: mediumTextColor,
        fontFamily: fontLightItalic,
        fontSize: 14,
      },
      nothingText: {
        color: highTextColor,
        fontFamily: fontRegular,
        fontSize: 22
      },
      graphAndStats: {
        paddingBottom: 5,
        paddingRight: 10,
        height: graphHeight,
      },
      graphArea: {
        backgroundColor: pageBackground,
        marginLeft: 0,
      },
      graph: {
        marginLeft: yAxisWidth,
      },
      infoIcon: {
        width: infoIconSize,
        height: infoIconSize,
        backgroundColor: "transparent",
        marginRight: 10,
      },
      legendBox: {
        height: 10,
        width: 20,
        marginRight: 5,
      },
      legendText: {
        fontSize: 16,
        fontFamily: fontRegular,
        color: mediumTextColor,
      },
      infoLabel: {
        fontSize: 20,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      infoValue: {
        fontSize: 22,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      divider: {
        flex: 1,
        marginRight: 0,
        marginLeft: 0,
        ...bottomBorder
      },
      hidden: {
        zIndex: INVISIBLE_Z_INDEX,
        opacity: 0,
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
    })

    return(
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          <View style={[styles.container]}>
            <TrekLogHeader 
              titleText={this.props.navigation.getParam('title','')}
              icon="*"
              backButtonFn={this.checkBackButton}
              openMenuFn={this.openMenu} 
            />        
            <RadioPicker pickerOpen={this.coursePickerOpen} />
            <View style={styles.listArea}>
              <PageTitle titleText={pTitle} 
                  style={pageTitleFormat}
                  colorTheme={this.mS.colorTheme}/>
              {(validDisplayObj) && 
                <View style={[cardLayout, {paddingTop: 0, paddingBottom: 0, paddingLeft: 2, 
                                            paddingRight: 2, marginTop: 0}]}>
                  <View style={[styles.titleArea]}>
                    <Text style={styles.titleText}>{graphTitle}</Text>
                    {showEmpties &&
                      <View>
                        <Text style={styles.miText}>
                        {this.gS.formatMissingIntsMsg(dObj, this.emptyIntervals)}</Text>
                      </View>
                    }
                  </View>
                  <View style={styles.graphAndStats}>
                    {this.trekGraphData &&
                      <View style={styles.graphArea}>
                        <View style={!chartForTreks ? styles.hidden : {}}>
                          <SvgYAxis
                            graphHeight={graphHeight}
                            axisTop={maxBarHeightTrek}
                            axisBottom={20}
                            axisWidth={yAxisWidth}
                            color={mediumTextColor}
                            lineWidth={1}
                            majorTics={5}
                            title={this.trekGraphData.title}
                            dataRange={this.trekGraphData.range}
                            dataType={YAXIS_TYPE_MAP[showType]}
                          />
                          <View style={styles.graph}>
                            <SvgGrid
                              graphHeight={graphHeight}
                              gridWidth={graphWidth}
                              lineCount={3}
                              colorTheme={this.mS.colorTheme}
                              maxBarHeight={maxBarHeightTrek}
                            />
                            <BarDisplay 
                              data={this.trekGraphData.items} 
                              dataRange={this.trekGraphData.range}
                              selected={this.selectedTrekBar}
                              selectFn={this.trekSelected} 
                              maxBarHeight={maxBarHeightTrek}
                              style={styles.graphStyle}
                              barStyle={styles.barStyle}
                              scrollToBar={this.scrollToTrek}
                            />
                          </View>
                        </View>
                      </View>
                    }
                    {this.intervalGraphData &&
                      <View style={[styles.graphArea]}>
                        <View style={chartForTreks ? styles.hidden : {}}>
                          <SvgYAxis
                            graphHeight={graphHeight}
                            axisTop={maxBarHeightInterval}
                            axisBottom={20}
                            axisWidth={yAxisWidth}
                            color={mediumTextColor}
                            lineWidth={1}
                            majorTics={5}
                            title={this.intervalGraphData.title}
                            dataRange={this.intervalGraphData.range}
                            dataType={YAXIS_TYPE_MAP[showType]}
                          />
                          <View style={styles.graph}>
                            <SvgGrid
                              graphHeight={graphHeight}
                              gridWidth={graphWidth}
                              lineCount={3}
                              colorTheme={this.mS.colorTheme}
                              maxBarHeight={maxBarHeightInterval}
                            />
                            <BarDisplay 
                              data={this.intervalGraphData.items} 
                              dataRange={this.intervalGraphData.range}
                              selected={this.selectedIntervalBar}
                              selectFn={this.intervalSelected} 
                              maxBarHeight={maxBarHeightInterval}
                              style={styles.graphStyle}
                              barStyle={styles.barStyle}
                              scrollToBar={this.scrollToInterval}
                            />
                          </View>
                        </View>
                      </View>
                    }
                  </View>
                  {showLegend &&
                    <View>
                      <View style={[styles.rowAround, {height: legendHt, alignItems: "flex-start"}]}>
                        <View style={styles.rowStart}>
                          <LinearGradient colors={[itemMeetsGoal, pageBackground]} style={styles.legendBox}/>
                          <Text style={styles.legendText}>Meets Goal</Text>
                        </View>
                        <View style={styles.rowStart}>
                          <LinearGradient colors={[itemMissesGoal, pageBackground]} style={styles.legendBox}/>
                          <Text style={styles.legendText}>Misses Goal</Text>
                        </View>
                      </View>
                    </View>
                  }
                  <View style={styles.divider}/>
                  {(!chartForTreks) &&
                    <View>
                      <View style={styles.rowBetween}>
                        <View style={styles.rowStart}>
                          <ProgressCircle
                            style={styles.infoIcon}
                            backgroundColor={progressBackground}
                            strokeWidth={2}
                            progress={prog}
                            progressColor={pColor}
                          />                         
                          <Text style={styles.infoLabel}>Achievement Rate</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {progPct + '%'}
                        </Text>
                      </View>
                      <View style={styles.rowBetween}>
                        <View style={styles.rowStart}>
                          <SvgIcon
                            style={styles.infoIcon}
                            size={infoIconSize}
                            paths={APP_ICONS['CalendarCheck']}
                            fill={listIconColor}
                          />
                          <Text style={styles.infoLabel}>Activity For:</Text>
                        </View>
                        <Text style={styles.infoValue}>{dObj.dateRange.start + ' - ' + dObj.dateRange.end}</Text>
                      </View>
                    </View>
                  }
                  {chartForTreks &&
                    <View style={styles.scrollArea}>
                      <ScrollView>
                          <TrekDetails
                              showImagesFn={this.showTrekImage}
                              showCourseEffortFn={this.showCourseEffort}
                              toggleShowValueFn={this.toggleShowValue}
                            />
                      </ScrollView>
                    </View>
                  }
                </View>
              }
              {!validDisplayObj &&
                <View style={styles.centered}>
                  <Text style={styles.nothingText}>Nothing to Display</Text>
                </View>
              }
            </View>
          </View>
        </View>    
      </NavMenu>
    )
  }
  
}
export default GoalDetails;