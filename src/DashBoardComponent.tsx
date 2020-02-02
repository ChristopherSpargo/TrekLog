import React, { Component, } from 'react'
import { View, Text, StyleSheet, ScrollView, Dimensions, 
         NativeSyntheticEvent, NativeScrollEvent} from 'react-native';
import { RectButton } from 'react-native-gesture-handler'

import { observable, action } from 'mobx'
import { observer, inject } from 'mobx-react'

import { MainSvc,
         TREK_TYPE_CHOICES, TrekType, TREK_SELECT_BITS, ALL_SELECT_BITS,
         TREK_TYPE_BIKE, TREK_TYPE_RUN, TREK_TYPE_WALK, TREK_TYPE_HIKE,TREK_TYPE_BOARD, TREK_TYPE_DRIVE,
         BIKE_SELECT_BIT, WALK_SELECT_BIT, RUN_SELECT_BIT, HIKE_SELECT_BIT,
         BOARD_SELECT_BIT, DRIVE_SELECT_BIT
       } from './MainSvc';
import { TREK_TYPE_COLORS_OBJ, TREK_TYPE_DIM_COLORS_OBJ, HEADER_HEIGHT,
         PAGE_TITLE_HEIGHT } from './App'
import { UtilsSvc, TIME_FRAMES, TIME_FRAME_DISPLAY_NAMES, TimeFrameType,
         TIME_FRAME_CUSTOM } from './UtilsService';
import TreksPieChart from './TreksPieChartComponent';
import { FilterSvc, FILTERMODE_FROM_STATS } from './FilterService';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';
import IconButton from './IconButtonComponent';
import { ModalModel } from './ModalModel';
import SvgIcon from './SvgIconComponent';
import { GoalsSvc, GoalDisplayObj } from './GoalsService';
import { SummarySvc } from './SummarySvc';
import SummaryIntervals from './SummaryIntervalsComponent';
import SummaryGoals from './SummaryGoalsComponent';


@inject('mainSvc', 'summarySvc', 'utilsSvc', 'uiTheme', 'filterSvc', 'modalSvc', 'goalsSvc')
@observer
class DashBoard extends Component<{ 
  trekChecksum : number,
  pickerOpenFn ?: Function,       // function to call to open the radioPicker for TimeFrames
  uiTheme ?: any,
  navigation ?: any,
  mainSvc ?: MainSvc,
  summarySvc ?: SummarySvc,
  utilsSvc ?: UtilsSvc,
  filterSvc ?: FilterSvc,
  goalsSvc  ?: GoalsSvc,
  modalSvc ?: ModalModel,
}, {} > {

  mS = this.props.mainSvc;
  fS = this.props.filterSvc;
  gS = this.props.goalsSvc;
  uSvc = this.props.utilsSvc;
  sumSvc = this.props.summarySvc;
  winHeight : number;
  winWidth : number;
  statAreaWidth : number;
  summaryHeight : number;

  scanCount = 0;

  @observable currScrollPos;          // current y-position in section scrollView

  ftCsum = 0;                       // checksum of the filtered treks array

  noGoals = '';

  renderCount = 0;

  constructor(props) {
    super(props);
    this.getWindowSize();
    this.initializeObservables();
  }

  componentDidMount() {
    this.init();
  }

  componentWillUnmount() {
    this.gS.clearDisplayList();
    this.gS.updateDataReady(false);
    this.fS.setSelectedTrekIndex(-1);
    this.fS.setDataReady(false);
  }

  componentDidUpdate() {
    if ((this.fS.dataReady) && (
           this.ftCsum !== this.props.trekChecksum ||
            this.mS.updateDashboard === FILTERMODE_FROM_STATS)) {  
        this.updateDashboard();
    }
  }

  @action
  updateDashboard = () => {
    let cSum = this.props.trekChecksum;
    if(!this.sumSvc.returningFromGoalDetail && this.mS.updateDashboard !== 'Skip'){
      this.sumSvc.scanTreks();
      if (this.ftCsum !== cSum){
        this.prepareGoals();
        this.sumSvc.findStartingInterval(this.sumSvc.selectedInterval);
      }
      this.ftCsum = cSum;
    } else {
      this.sumSvc.returningFromGoalDetail = false;
      this.ftCsum = cSum;
    }
    this.mS.setUpdateDashboard('');    
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setCurrScrollPos(0);
  }

  // get the window dimensions for later use and save in a stable location
  getWindowSize = () => {
    const { height, width } = Dimensions.get('window');
    this.winHeight = height;
    this.winWidth = width;
    this.statAreaWidth = width - 6;
  }

  @action
  init = () => {
    this.sumSvc.scanTreks();
    this.sumSvc.findStartingInterval();
    this.prepareGoals();
    this.ftCsum = this.fS.ftChecksum;
  }

  prepareGoals = () => {
    this.gS.updateDataReady(false);
    this.gS.clearDisplayList();
    if (this.fS.groupList.length > 1){
      this.noGoals = "N/A For Multiple Groups"
      this.gS.updateDataReady(true);
    } else {      
      this.gS.getGoalList(this.fS.groupList[0])
      .then(() => {
        if (this.gS.goalList.length){
          let gl = this.gS.processGoalList(this.gS.goalList, 1, 
                                           this.fS.getDateMinValue(), this.fS.getDateMaxValue());
          this.gS.setDisplayList(gl);
          this.gS.sortGoals();
          this.gS.updateDataReady(true);  
          this.sumSvc.setOpenItems(true);
          this.noGoals = '';
        }
        else {
          // Goals List is there but empty
          this.noGoals = 'Goals list is empty ';
          this.sumSvc.setOpenItems(true);
          this.gS.updateDataReady(true);
        }
      })
      .catch(() => {
        // Failed to read Goals List
        this.noGoals = 'No goals list found';
        this.sumSvc.setOpenItems(true);
        this.gS.updateDataReady(true);
      })
    }
  }

  openRadioPicker = () => {
    let selNames = TIME_FRAMES.map((item) => 
          this.uSvc.formatTimeframeDisplayName(item.value as TimeFrameType))
    let selValues = TIME_FRAMES.map((item) => item.value);

    this.props.modalSvc.openRadioPicker({heading: 'Select A Timeframe', selectionNames: selNames,
                              selectionValues: selValues, selection: this.fS.timeframe,
                              openFn: this.props.pickerOpenFn})
    .then((newTimeframe : TimeFrameType) => {
      if(newTimeframe !== this.fS.timeframe){        
          this.gS.clearDisplayList();
          let sels = this.fS.typeSelections;
          this.fS.setTypeSelections(ALL_SELECT_BITS);    // be sure to get data for all types
          this.fS.setTimeframe(newTimeframe);
          this.fS.setTypeSelections(sels);
      }
    })
    .catch(() =>{ 
    })
  }

  // set the value of the currScrollPos property
  @action
  setCurrScrollPos = (value: number) => {
    this.currScrollPos = value;
  }

  @action
  updateTypeSels = (value: TrekType, toggle: boolean) => {
    if (toggle) {
      this.fS.updateTypeSelections(value, !(this.fS.typeSelections & TREK_SELECT_BITS[value]));
    } else {
      this.fS.setTypeSelections(TREK_SELECT_BITS[value]);
    }
    this.sumSvc.scanTreks();
    this.sumSvc.findStartingInterval(this.sumSvc.selectedInterval);
  }

  setType = (value: TrekType, active = true) => {
    if(active) {
      this.updateTypeSels(value, false);
    }
  }

  toggleType = (value: TrekType) => {
      this.updateTypeSels(value, true);
  }

  callGetDateMin = () => {
    let sels = this.fS.typeSelections;
    this.fS.setTypeSelections(ALL_SELECT_BITS);    // be sure to get data for all types
    this.fS.getDateMin()
    .then(() => {
      this.fS.setTypeSelections(sels);
    })
    .catch(() => {
      this.fS.setTypeSelections(sels);
    })
  }

  callGetDateMax = () => {
    let sels = this.fS.typeSelections;
    this.fS.setTypeSelections(ALL_SELECT_BITS);    // be sure to get data for all types
    this.fS.getDateMax()
    .then(() => {
      this.fS.setTypeSelections(sels);
    })
    .catch(() => {
      this.fS.setTypeSelections(sels);
    })
  }
  
  setCurrPage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.setCurrScrollPos(event.nativeEvent.contentOffset.y);
  }

  // Show the details of the given GoalDisplayObj
  showGoalDetails = (gdo: GoalDisplayObj) => {
    this.sumSvc.returningFromGoalDetail = true;
    this.props.navigation.navigate('GoalDetail', {title: this.gS.formatGoalStatement(gdo.goal), detailObj: gdo});
  }

  // allow review of treks in selected interval
  // save state of filtered treks to restore on return
  @action
  showReviewFromBarGraph = (index: number) => {
    if (index === this.sumSvc.selectedInterval){
      let iData = this.sumSvc.activityData[index];
      if(iData.data.Selected.treks){
        this.mS.setUpdateDashboard('Skip');
        this.fS.filterMode = FILTERMODE_FROM_STATS;
        this.sumSvc.beforeRFBdateMax = this.fS.dateMax;
        this.sumSvc.beforeRFBdateMin = this.fS.dateMin;
        this.sumSvc.beforeRFBtimeframe = this.fS.timeframe;
        this.mS.dtMin = this.uSvc.dateFromSortDateYY(iData.interval.start);
        let sdMax = this.uSvc.formatShortSortDate(this.fS.dateMax) + '9999';
        if (iData.interval.end < sdMax) {     // check for interval end beyond current date range
          this.mS.dtMax = iData.endDate;        
        } else {
          this.mS.dtMax = this.fS.dateMax;
        }
        this.fS.setDateMax(this.mS.dtMax, "None");
        this.fS.setDateMin(this.mS.dtMin, "None");
        this.fS.updateTimeframe(TIME_FRAME_CUSTOM);
        this.fS.selectedTrekDate = '';
        this.props.navigation.navigate({routeName: 'Review', key: 'Key-Review'});
      }
    } else {
        this.sumSvc.setSelectedInterval(index);
    }
  }

  render() {
    ++this.renderCount;
    const dateAreaHt = 65;
    const sectionTitleHt = 40;
    const sectionCardHeight = this.winHeight - (dateAreaHt + HEADER_HEIGHT + PAGE_TITLE_HEIGHT + 25);
    const sectionCardWidth = this.winWidth;
    const currScrollPage = Math.trunc(this.currScrollPos / sectionCardHeight) + 1;
    const haveTreks = !this.fS.filteredTreksEmpty();
    const bikeSel  = ((this.fS.typeSelections  & BIKE_SELECT_BIT)  !== 0);
    const haveBikes = (this.sumSvc.activeTypes & BIKE_SELECT_BIT) !== 0;
    const hikeSel  = ((this.fS.typeSelections  & HIKE_SELECT_BIT)  !== 0);
    const haveHikes = (this.sumSvc.activeTypes & HIKE_SELECT_BIT) !== 0;
    const walkSel  = ((this.fS.typeSelections  & WALK_SELECT_BIT)  !== 0);
    const haveWalks =  (this.sumSvc.activeTypes & WALK_SELECT_BIT) !== 0;
    const runSel   = ((this.fS.typeSelections  & RUN_SELECT_BIT)   !== 0);
    const haveRuns =  (this.sumSvc.activeTypes & RUN_SELECT_BIT) !== 0;
    const boardSel = ((this.fS.typeSelections  & BOARD_SELECT_BIT) !== 0);
    const haveBorards =  (this.sumSvc.activeTypes & BOARD_SELECT_BIT) !== 0;
    const driveSel = ((this.fS.typeSelections  & DRIVE_SELECT_BIT) !== 0);
    const haveDrives =  (this.sumSvc.activeTypes & DRIVE_SELECT_BIT) !== 0;
    const trekCounts = '(' + this.sumSvc.totalCounts(this.fS.typeSelections) + ' of ' + 
                         this.sumSvc.ftCount + ' Treks)' + (this.fS.extraFilterSet() ? ' *' : '');

    const { navItem, navIcon, cardLayout, pickerTitle, dateInputText,
            fontRegular, fontLight
          } = this.props.uiTheme;
    const { highTextColor, disabledTextColor, secondaryColor,
            navItemBorderColor, rippleColor, dividerColor,
            altCardBackground, pageBackground, summarySectionTitle
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const sectionIconSize = 24;
    const sectionIconColor = highTextColor;
    const statTitleIconSize = 24;
    const timeframeSelectIconSize = 24;
    const timeframeSelectButtonSize = 34;
    const pieHeight = sectionCardHeight * .3;
    const pieWidth = sectionCardHeight * .33;
    const summaryHeight = (sectionCardHeight * .52) ;
    const typeIconAreaSize = sectionCardHeight * .07;
    const typeIconTop = 10;
    const typeIconMid = (pieHeight - typeIconAreaSize) / 2 + typeIconTop;
    const typeIconBot = pieHeight - typeIconAreaSize + typeIconTop;
    const pieEdge = (sectionCardWidth - pieWidth) / 2;
    const pieMidEdge = pieEdge - (typeIconAreaSize / 2);
    const pieAtEdge = pieEdge - typeIconAreaSize;
    // alert(haveTreks + '\n' + this.fS.filterRuns + '\n' + this.fS.dataReady)

    let data = [];
    // Build the data object for the PieChart
    TREK_TYPE_CHOICES.forEach((type) =>{
      if (this.sumSvc.trekCountData[type] !== 0){
        data.push({ value: this.sumSvc.trekCountData[type], color: TREK_TYPE_COLORS_OBJ[type], 
                    type: type,
                  })
      }
    })
    const styles = StyleSheet.create({
      container: {
        flexDirection: "column",
      },
      timeFrameArea: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      statTitleIcon: {
        width: statTitleIconSize,
        height: statTitleIconSize,
        marginRight: 4,
        backgroundColor: "transparent"
      },
      noMatches: {
        textAlign: "center",
        color: disabledTextColor,
        fontFamily: fontRegular,
        fontSize: 24,
      },
      chartAndTypes: {
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
      },
      typeControl: {
        position: "absolute",
        zIndex: 10,
      },
      controlButton: {
        justifyContent: "center",
        alignItems: "center",
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      rowCenter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      dateInputArea: {
        height: 25,
      },
      dateArea: {
        height: dateAreaHt,
        paddingTop: 15,
        paddingBottom: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      },
      toText: {
        fontSize: 20,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      timeFrameName:{
        ...pickerTitle,
        color: highTextColor
      },
      summaryArea: {
        flexDirection: "column",
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        backgroundColor: "transparent",
        justifyContent: "center",
        zIndex: this.sumSvc.summaryZValue,
      },
      timeframeSelectButtonStyle: {
        height: timeframeSelectButtonSize,
        width: timeframeSelectButtonSize,
        borderRadius: timeframeSelectButtonSize / 2,
      },
      sectionCardAdj: {
        borderColor: dividerColor,
        borderWidth: 1,
        borderBottomWidth: 2,
        backgroundColor: altCardBackground,
        marginTop: 0,
        marginBottom: 10,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        marginLeft: 3,
        marginRight: 3,
        height: sectionCardHeight,
        borderRadius: 3,
      },
      sectionTitleArea: {
        borderColor: dividerColor,
        borderStyle: "solid",
        borderBottomWidth: 1,
        marginTop: 0,
        marginBottom: 5,
        height: sectionTitleHt,
        flexDirection: "row",
        alignItems: "center",  
        backgroundColor: altCardBackground,
      },
      sectionTitle: {
        fontSize: 20,
        color: highTextColor,
        paddingLeft: 10,
        fontFamily: fontLight
      },        
      sectionIconArea: {
        width: sectionIconSize,
        height: sectionIconSize,
        marginLeft: 10,
        backgroundColor: "transparent",
      },
      pageIndicator: {
        flexDirection: "row",
        marginRight: 5,
        justifyContent: "flex-end",
        marginTop: -20,
      },
      pageIndicatorText: {
        fontFamily: fontLight,
        fontSize: 14,
        color: highTextColor,
      },
    });

    return (
      <View style={styles.container}>
        <View style={styles.dateArea}>
          <View style={styles.timeFrameArea}>
            <RectButton
              rippleColor={rippleColor}
              onPress={this.openRadioPicker}
            >
              <Text style={styles.timeFrameName}>{TIME_FRAME_DISPLAY_NAMES[this.fS.timeframe]}</Text>
            </RectButton>
            <IconButton 
              iconSize={timeframeSelectIconSize}
              icon="CalendarEdit"
              style={{...navItem, ...styles.timeframeSelectButtonStyle}}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={secondaryColor}
              onPressFn={this.openRadioPicker}
            />
          </View>
          {(haveTreks || this.fS.timeframe !== 'All') &&
            <View style={[styles.rowCenter, {marginTop: -8, marginBottom: 25}]}>
              <RectButton
                rippleColor={rippleColor}
                onPress={this.callGetDateMin}
              >
                <View style={{...styles.rowStart, ...styles.dateInputArea}}>
                  <Text style={dateInputText}>
                  {this.fS.dateMin}</Text>
                </View>
              </RectButton>
              <Text style={{...styles.toText, ...{marginTop: -2, marginLeft: 5, marginRight: 5}}}
              > - </Text>
              <RectButton
                rippleColor={rippleColor}
                onPress={this.callGetDateMax}
              >
                <View style={{...styles.rowStart, ...styles.dateInputArea}}>
                  <Text style={dateInputText}>
                  {this.fS.dateMax}</Text>
                </View>
              </RectButton>
            </View>
          }
        </View>
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{currScrollPage + '/2'}</Text>
        </View>
        <View style={{height: sectionCardHeight + 10, flexDirection: "row", alignItems: "center"}}>
          <ScrollView snapToInterval={sectionCardHeight + 10} decelerationRate={.77} 
                    showsVerticalScrollIndicator={false}
                    onMomentumScrollEnd={this.setCurrPage}>          
            <View style={{...cardLayout, ...styles.sectionCardAdj, ...{paddingBottom: summaryHeight}}}>
              <View style={styles.sectionTitleArea}>
                <SvgIcon 
                  paths={APP_ICONS.Pie}
                  size={sectionIconSize}
                  fill={sectionIconColor}
                  style={styles.sectionIconArea}
                />
                <Text style={styles.sectionTitle}>Stats</Text>
                <Text style={styles.sectionTitle}>{trekCounts}</Text>
              </View>
              {(!haveTreks && !this.mS.resObj && this.fS.filterRuns) &&
                <View style={{height: summaryHeight, justifyContent: "center"}}>
                  <Text style={styles.noMatches}>Nothing for Selected Dates</Text>
                </View>
              }
              {(haveTreks && this.fS.filterRuns) &&
                <View style={styles.chartAndTypes}>
                  {haveHikes &&
                    <View style={[styles.typeControl, {top: typeIconTop, left: pieMidEdge - 5}]}>
                      <SvgButton 
                        value={TREK_TYPE_HIKE}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        size={typeIconAreaSize}
                        style={styles.controlButton}
                        fill={hikeSel ? TREK_TYPE_COLORS_OBJ.Hike : TREK_TYPE_DIM_COLORS_OBJ.Hike}
                        path={APP_ICONS.Hike}
                      />
                    </View>
                  }
                  {haveBorards &&
                    <View style={[styles.typeControl, {top: typeIconMid, left: pieAtEdge - 5}]}>
                      <SvgButton 
                        value={TREK_TYPE_BOARD}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        size={typeIconAreaSize}
                        style={styles.controlButton}
                        fill={boardSel ? TREK_TYPE_COLORS_OBJ.Board : TREK_TYPE_DIM_COLORS_OBJ.Board}
                        path={APP_ICONS.Board}
                      />
                    </View>
                  }
                  {haveBikes &&
                    <View style={[styles.typeControl, {top: typeIconBot, left: pieMidEdge - 8}]}>
                      <SvgButton 
                        value={TREK_TYPE_BIKE}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        size={typeIconAreaSize}
                        style={styles.controlButton}
                        fill={bikeSel ? TREK_TYPE_COLORS_OBJ.Bike : TREK_TYPE_DIM_COLORS_OBJ.Bike}
                        path={APP_ICONS.Bike}
                      />
                    </View>
                  }
                  <TreksPieChart 
                    selectFn={this.updateTypeSels} 
                    width={pieWidth}
                    height={pieHeight}
                    labelColor={highTextColor}
                    data={data} 
                    selected={this.fS.typeSelections}
                  />
                  {haveWalks &&
                    <View style={[styles.typeControl, {top: typeIconTop, right: pieMidEdge -5}]}>
                      <SvgButton 
                        value={TREK_TYPE_WALK}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        size={typeIconAreaSize}
                        style={styles.controlButton}
                        fill={walkSel ? TREK_TYPE_COLORS_OBJ.Walk : TREK_TYPE_DIM_COLORS_OBJ.Walk}
                        path={APP_ICONS.Walk}
                      />
                    </View>
                  }
                  {haveDrives &&
                    <View style={[styles.typeControl, {top: typeIconMid, right: pieAtEdge - 10}]}>
                      <SvgButton 
                        value={TREK_TYPE_DRIVE}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        size={typeIconAreaSize}
                        style={styles.controlButton}
                        fill={driveSel ? TREK_TYPE_COLORS_OBJ.Drive : TREK_TYPE_DIM_COLORS_OBJ.Drive}
                        path={APP_ICONS.Drive}
                      />
                    </View>
                  }
                  {haveRuns &&
                    <View style={[styles.typeControl, {top: typeIconBot, right: pieMidEdge - 5}]}>
                      <SvgButton 
                        value={TREK_TYPE_RUN}
                        onPressFn={this.toggleType}
                        onLongPressFn={this.setType}
                        style={styles.controlButton}
                        size={typeIconAreaSize}
                        fill={runSel ? TREK_TYPE_COLORS_OBJ.Run : TREK_TYPE_DIM_COLORS_OBJ.Run}
                        path={APP_ICONS.Run}
                      />
                    </View>
                  }
                </View>
              }
              <View style={styles.summaryArea}>
                <SummaryIntervals
                  showFn={this.showReviewFromBarGraph}
                  summaryHeight={summaryHeight}
                  statAreaWidth={this.statAreaWidth}
                  haveTreks={haveTreks}
                />
              </View>
            </View>
            <View style={{...cardLayout, ...styles.sectionCardAdj, ...{backgroundColor: pageBackground}}}>
              <ScrollView nestedScrollEnabled={true}>
                <View style={[styles.sectionTitleArea, {marginBottom: 0}, summarySectionTitle]}>
                  <SvgIcon 
                    paths={APP_ICONS.Target}
                    size={sectionIconSize}
                    fill={sectionIconColor}
                    style={styles.sectionIconArea}
                  />
                  <Text style={styles.sectionTitle}>Goals Acheived</Text>
                  <Text style={styles.sectionTitle}>{'(' + this.gS.displayList.length + ')'}</Text>
                </View>
                <SummaryGoals
                  showFn={this.showGoalDetails}
                  sinceDate={this.fS.getDateMinValue()}
                  noGoals={this.noGoals}
                  colorTheme={this.mS.colorTheme}
                />
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>
    )
  }
}

export default DashBoard;