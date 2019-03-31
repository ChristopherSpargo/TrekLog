import React, { Component } from 'react';
import { View, StyleSheet, Text, BackHandler, ScrollView, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { NavigationActions } from 'react-navigation';

import { CONTROLS_HEIGHT, NAV_ICON_SIZE, HEADER_HEIGHT, INVISIBLE_Z_INDEX } from './App';
import { GoalsSvc } from './GoalsService';
import { TrekInfo, TrekObj } from './TrekInfoModel';
import { UtilsSvc, M_PER_MILE } from './UtilsService';
import { GoalDisplayObj, GoalObj } from './GoalsService';
import { BarGraphInfo } from './FilterService';
import { DIT_GOAL_CAT, CA_GOAL_CAT } from './GoalsService';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import BarDisplay from './BarDisplayComponent';
import TrekDetails from './TrekDetailsComponent';
import IconButton from './IconButtonComponent';
import TrekLogHeader from './TreklogHeaderComponent';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'utilsSvc', 'uiTheme', 'goalsSvc')
@observer
class GoalDetails extends Component<{ 
  goalsSvc ?: GoalsSvc,
  utilsSvc ?: UtilsSvc,
  uiTheme ?: any,
  navigation ?: any,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  static navigationOptions = ({ navigation }) => {
    const params = navigation.state.params || {};

    return {
      header: <TrekLogHeader titleText={params.title || ''}
                             icon="*"
                             backButtonFn={params.checkBackButton}
              />
    };
  };

  tInfo = this.props.trekInfo;
  gS = this.props.goalsSvc;
  uSvc = this.props.utilsSvc;
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
    this.props.navigation.setParams({ checkBackButton: this.checkBackButton });
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
    this.tInfo.clearTrek();
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
   }

  // set observable that will cause the Interval barGraph to scroll to a given bar
  @action
  setScrollToInterval = (barNum: number) => {
    this.scrollToInterval = barNum;
  }

  // move the Interval barGraph to the specified bar
  scrollIntervalGraph = (pos: number) => {
    let oldVal = this.tInfo.updateGraph;

    this.tInfo.setUpdateGraph(true);
    this.setScrollToInterval(pos);
    requestAnimationFrame(() => {
      this.tInfo.setUpdateGraph(oldVal);
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
    let oldVal = this.tInfo.updateGraph;

    this.tInfo.setUpdateGraph(true);
    this.setScrollToTrek(pos);
    requestAnimationFrame(() => {
      this.tInfo.setUpdateGraph(oldVal);
      this.setScrollToTrek(undefined);
    })
  }

  @action
  setSelectedTrekIndex = (val: number) => {
    let bar = -1;

    if((val !== -1) && this.trekGraphData.items && this.trekGraphData.items.length){
      bar = this.trekGraphData.items.findIndex((item) => item.index === val);
    }
    if (val >= 0) { this.tInfo.setUpdateGraph(true); }
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
      this.tInfo.setUpdateGraph(true); 
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

  // Display the map for the Trek at the given index in the items list of the given display object
  showTrekMap = () => {
    requestAnimationFrame(() => {
      this.props.navigation.navigate('SelectedTrek', 
        {title: this.props.utilsSvc.formattedLongDateAbbrDay(this.tInfo.date) + '  ' + this.tInfo.startTime,
          changeTrekFn: this.changeTrek});
    })
  }

  // Change to Next or Prev trek in the displayObj.treks array.
  // Return the header label for the Trek.
  // Return '' if user can't change in the selected direction
  changeTrek = (dir: string, check = false) : string => {
    let index = this.selectedTrekIndex;
    let trek : TrekObj;
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
    if (check) { return ((index === this.selectedTrekIndex) || (items[index].trek === undefined)) ? "NO" : "OK"; }
    if ((index === this.selectedTrekIndex) || (items[index].trek === undefined)) { return ''; } // can't move
    if (newInterval !== origInterval){
      this.tInfo.setUpdateGraph(true);
      this.intervalSelected(newInterval, false);  // this builds trekGraphData for the new interval
    }
    trek = this.setCurrentTrek(index);        // this sets the selectedTrekBar property
    return this.props.utilsSvc.formattedLongDateAbbrDay(trek.date) + '  ' + trek.startTime;
  }

  setCurrentTrek = (trekIndex: number) : TrekObj => {
    let trek = this.tInfo.allTreks[this.detailObj.items[trekIndex].trek];      
    this.tInfo.setTrekProperties(trek);
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
    this.setCurrentTrek(index)
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
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch(val){
        case 'Map':
          this.showTrekMap()
          break;
        default:
      }
    });
  }

  render() {
    const {height} = Dimensions.get('window');
    this.detailObj = this.props.navigation.getParam('detailObj');

    const { mediumTextColor, pageBackground, dividerColor, highTextColor,
            navIconColor, itemMeetsGoal, itemMissesGoal, listIconColor } = this.props.uiTheme.palette;
    const { cardLayout, controlsArea, roundedTop, navItem, navIcon } = this.props.uiTheme;
    const dObj = this.detailObj;
    const validDisplayObj = dObj !== undefined && dObj.items.length > 0;
    const statusBarHt = 15;
    const pageTitleHt = 25;
    const pageTitleSpacing = 30;
    const titleHt = 20;
    const chartForTreks = (dObj.goal.category === DIT_GOAL_CAT) || (!this.gS.intervalGraph);
    const showEmpties = !chartForTreks && (this.emptyIntervals !== 0);
    const miHt = showEmpties ? 20 : 0;
    const graphHeight = 200;
    const infoItemHeight = 45;
    const infoIconSize = 24;
    const showLegend = this.gS.intervalGraph;
    const legendHt = showLegend ? 30 : 0;
    const pageTitle = this.formatDetailsTitle(dObj, this.selectedIntervalIndex, "page");
    const graphTitle = this.formatDetailsTitle(dObj, this.selectedIntervalIndex, "graph");
    const areaHt = height - (statusBarHt + HEADER_HEIGHT + pageTitleHt + pageTitleSpacing + CONTROLS_HEIGHT);

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
        paddingHorizontal: 15,
        height: infoItemHeight,
      },
      pageTitle: {
        fontSize: 20,
        height: pageTitleHt,
        color: highTextColor,
        fontWeight: "bold",
      },
      titleArea: {
        height: titleHt + miHt,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
      titleText: {
        color: highTextColor,
        fontSize: 18,
      },
      miText: {
        color: highTextColor,
        fontSize: 14,
      },
      nothingText: {
        color: highTextColor,
        fontSize: 20
      },
      graphAndStats: {
        marginBottom: 5,
        height: graphHeight,
      },
      graphArea: {
        backgroundColor: pageBackground,
      },
      graph: {
        paddingLeft: 0
      },
      infoIcon: {
        width: infoIconSize,
        height: infoIconSize,
        backgroundColor: "transparent",
        marginRight: 6,
      },
      legendBox: {
        height: 10,
        width: 20,
        marginRight: 5,
      },
      legendText: {
        fontSize: 14,
        color: mediumTextColor,
      },
      infoLabel: {
        fontSize: 16,
        color: highTextColor,
      },
      infoValue: {
        fontSize: 18,
        color: highTextColor,
        fontWeight: "bold",
      },
      divider: {
        flex: 1,
        marginRight: 15,
        marginLeft: 45,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
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
    })

    return(
        <View style={styles.container}>
          <View style={[styles.container, {bottom: CONTROLS_HEIGHT}]}>
              <View style={cardLayout}>
                <Text style={styles.pageTitle}>{pageTitle}</Text>
              </View>
              {(validDisplayObj) && 
                <View style={styles.scrollArea}>
                  <ScrollView>
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
                        <View style={[styles.graphArea]}>
                          <View style={styles.graph}>
                            {this.trekGraphData &&
                              <View style={!chartForTreks ? styles.hidden : {}}>
                                <BarDisplay 
                                  data={this.trekGraphData.items} 
                                  dataRange={this.trekGraphData.range}
                                  selected={this.selectedTrekBar}
                                  selectFn={this.trekSelected} 
                                  barWidth={60}
                                  maxBarHeight={145}
                                  style={{height: 195, backgroundColor: "transparent"}}
                                  scrollToBar={this.scrollToTrek}
                                />
                              </View>
                            }
                            {this.intervalGraphData &&
                              <View style={chartForTreks ? styles.hidden : {}}>
                                <BarDisplay 
                                  data={this.intervalGraphData.items} 
                                  dataRange={this.intervalGraphData.range}
                                  selected={this.selectedIntervalBar}
                                  selectFn={this.intervalSelected} 
                                  barWidth={60}
                                  maxBarHeight={155}
                                  style={{height: 195, backgroundColor: "transparent"}}
                                  scrollToBar={this.scrollToInterval}
                                />
                              </View>
                            }
                          </View>
                        </View>
                      </View>
                      {showLegend &&
                        <View>
                          <View style={[styles.rowAround, {height: legendHt, alignItems: "flex-start"}]}>
                            <View style={styles.rowStart}>
                              <LinearGradient colors={[itemMeetsGoal, 'white']} style={styles.legendBox}/>
                              <Text style={styles.legendText}>Meets Goal</Text>
                            </View>
                            <View style={styles.rowStart}>
                              <LinearGradient colors={[itemMissesGoal, 'white']} style={styles.legendBox}/>
                              <Text style={styles.legendText}>Misses Goal</Text>
                            </View>
                          </View>
                        </View>
                      }
                      {!chartForTreks &&
                        <View>
                          <View style={styles.rowBetween}>
                            <View style={styles.rowStart}>
                              <SvgIcon 
                                paths={APP_ICONS.Ribbon}
                                size={infoIconSize}
                                fill="url(#grad)"
                                fillPct={this.gS.computeProgress(dObj)}
                                stroke={highTextColor}
                                strokeWidth={.5}
                                style={styles.infoIcon}
                              />
                              <Text style={styles.infoLabel}>Achievement Rate</Text>
                            </View>
                            <Text style={styles.infoValue}>
                              {Math.round(this.gS.computeProgress(dObj) * 100) + '%'}
                            </Text>
                          </View>
                          <View style={styles.divider}/>
                          <View style={styles.rowBetween}>
                            <View style={styles.rowStart}>
                              <SvgIcon
                                style={styles.infoIcon}
                                size={infoIconSize}
                                paths={APP_ICONS['CalendarCheck']}
                                fill={listIconColor}
                              />
                              <Text style={styles.infoLabel}>Effective Date</Text>
                            </View>
                            <Text style={styles.infoValue}>{this.uSvc.dateFromSortDateYY(dObj.goal.dateSet)}</Text>
                          </View>
                          <View style={styles.divider}/>
                        </View>
                      }
                      {chartForTreks &&
                        <TrekDetails/>
                      }
                    </View>
                  </ScrollView>
                </View>
              }
            {!validDisplayObj &&
              <View style={styles.centered}>
                <Text style={styles.nothingText}>Nothing to Display</Text>
              </View>
            }
          </View>
          {(chartForTreks) &&
            <View style={[controlsArea, roundedTop]}>
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
          }
        </View>    
    )
  }
  
}
export default GoalDetails;