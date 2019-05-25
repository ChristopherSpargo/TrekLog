// This component is used to display maps of treks selected in the Review/GoalDetails components.

import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native'
import { observable, action } from 'mobx';
import { LatLng } from 'react-native-maps';
import { observer, inject } from 'mobx-react';
import IconButton from './IconButtonComponent';
import { NavigationActions } from 'react-navigation';

import TrekDisplay from './TrekDisplayComponent';
import NumbersBar from './NumbersBarComponent'
import { TrekInfo, DIST_UNIT_LONG_NAMES, TrekObj, MapType } from './TrekInfoModel';
import { SHORT_CONTROLS_HEIGHT, NAV_ICON_SIZE, INVISIBLE_Z_INDEX, INTERVAL_GRAPH_Z_INDEX, 
        } from './App';
import Waiting from './WaitingComponent';
import TrekLimitsForm, {LimitsObj} from './TrekLimitsComponent';
import { M_PER_MILE, UtilsSvc } from './UtilsService';
import { ToastModel } from './ToastModel';
import { FilterSvc } from './FilterService';
import SlideUpView from './SlideUpComponent';
import BarDisplay from './BarDisplayComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { ModalModel } from './ModalModel';
import { IntervalSvc, INTERVALS_UNITS, SAVED_UNITS } from './IntervalSvc';
export const INTERVAL_AREA_HEIGHT = 115;
export const INTERVAL_GRAPH_HEIGHT = 95;

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'uiTheme', 'toastSvc', 'utilsSvc', 'modalSvc', 'filterSvc', 'intervalSvc')
@observer
class SelectedTrek extends Component<{
  uiTheme ?: any,
  filterSvc ?: FilterSvc,
  trekInfo ?: TrekInfo,
  toastSvc ?: ToastModel,
  modalSvc ?: ModalModel,
  intervalSvc ?: IntervalSvc,
  utilsSvc ?: UtilsSvc,
  navigation ?: any
}, {} > {

  @observable statsOpen;
  @observable layoutOpts;
  @observable zValue;
  @observable selectedIntervalIndex;
  @observable intervalFormOpen;
  @observable intervalFormDone;
  @observable intervalsActive;
  @observable graphOpen;
  @observable waitingForChange;
  @observable scrollToBar;
  @observable speedDialZoom;
  @observable keyboardOpen;
  @observable openItems;

  tInfo = this.props.trekInfo;
  iSvc = this.props.intervalSvc;
  fS = this.props.filterSvc;
  activeNav : string;
  changeTrekFn : Function;
  limitProps : LimitsObj = {} as LimitsObj;
  activeIntervalValue = 0;
  activeIntervalUnits = '';

  keyboardDidShowListener;
  keyboardDidHideListener;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.statsOpen = false;
    this.layoutOpts = "All";
    this.zValue = -1;
    this.selectedIntervalIndex = -1;
    this.intervalFormOpen = false;
    this.intervalFormDone = '';
    this.intervalsActive = false;
    this.graphOpen = false; 
    this.waitingForChange = false;
    this.speedDialZoom = false;
    this.keyboardOpen = false;
    this.setOpenItems(false);
   }

   componentWillMount() {
    this.changeTrekFn = this.props.navigation.getParam('changeTrekFn');
   }

   componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
     requestAnimationFrame(() => {
      this.setLayoutOpts('NewAll');
    })
   }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
    this.setStatsOpen(false);
  }

  @action
  setKeyboardOpen = (status: boolean) => {
    this.keyboardOpen = status;
  }

  keyboardDidShow = () => {
    this.setKeyboardOpen(true);
  }

  keyboardDidHide = () => {
    this.setKeyboardOpen(false);
  }
  
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  toggleOpenItems = () => {
    this.setOpenItems(!this.openItems);
  }

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
      this.tInfo.setUpdateGraph(oldVal);
      this.setScrollToBar(undefined);
    })
  }

  // set the background color for the page header then set the mapType
  setMapType = (type: MapType) => {
    this.tInfo.setDefaultMapType(type);
  }

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  }

  setVisible = () => {
    this.setZValue(INTERVAL_GRAPH_Z_INDEX);
  }

  setNotVisible = () => {
    this.setZValue(INVISIBLE_Z_INDEX);
  }

  @action
  setGraphOpen = (val: boolean) => {
    this.graphOpen = val;
  }

  @action
  setLayoutOpts = (val: string, update = true) => {
    this.tInfo.setUpdateMap(update);
    this.layoutOpts = val;
  }
  
  @action
  setStatsOpen = (status: boolean) => {
    this.statsOpen = status;
  }

  @action
  setWaiting = (status: boolean) => {
    this.tInfo.setUpdateMap(false);
    this.waitingForChange = status;
  }

  @action
  setIntervalFormOpen = (status: boolean) => {
    this.intervalFormOpen = status;
  }

  @action
  setIntervalFormDone = (value: string) => {
    this.intervalFormDone = value;
  }

  @action
  setIntervalsActive = (status: boolean) => {
    this.intervalsActive = status;
  }

  // call the markerToPath function then forceUpdate
  callMarkerToPath = (index: number, pt: LatLng, path: LatLng[]) => {
    this.iSvc.markerToPath(index, pt, path);
    this.forceUpdate();
  }

  // save/delete the current set of intervals with this trek
  saveCurrentIntervals = (del = false) => {
    let t = this.tInfo.getSaveObj();

    if (del) {
      this.props.modalSvc.simpleOpen({heading: 'Delete Intervals', 
            content: "Delete saved intervals?", 
            cancelText: 'CANCEL', okText: 'YES', headingIcon: 'Delete'})
      .then(() => {
        t.intervals = undefined;
        t.intervalDisplayUnits = undefined;
        this.finishIntervalsSave(t, del);
      })
      .catch(() =>{ // CANCEL, DO NOTHING
      })
    } else {
      t.intervals = this.iSvc.intervalData.iDists.slice();
      t.intervalDisplayUnits = this.iSvc.intervalData.displayUnits;
      this.finishIntervalsSave(t, del);
    }
  }

  // finish saving or deleteing the current intervals
  finishIntervalsSave = (t: TrekObj, del : boolean) => {

    this.tInfo.setIntervals(t.intervals);
    this.tInfo.intervalDisplayUnits = t.intervalDisplayUnits;
    this.tInfo.saveTrek(t, 'update')
    .then(() => {
      this.props.toastSvc.toastOpen({tType: 'Success', content: 'Intervals ' + (del ? 'deleted.' : 'saved.')});
      this.iSvc.setIntervalChange(false);
      if(del) {
        this.cancelIntervalsActive();
      } 
    })
    .catch(() => {
      this.props.toastSvc.toastOpen({tType: 'Error', content: 'Intervals not ' + (del ? 'deleted.' : 'saved.')});
    })
  }
  // Start displaying the intervals graph or stop displaying it.
  @action
  showIntervals = (start: boolean) => {
    let change = false;
    let saved = false;
    let tempDist;

    this.setIntervalFormDone('')
    if (start) {
      change =  (this.iSvc.lastIntervalValue !== this.iSvc.intervalValue) || (this.iSvc.lastUnits !== this.iSvc.units) ||
                (this.iSvc.intervalData === undefined);
      this.iSvc.lastIntervalValue = this.iSvc.intervalValue;
      this.iSvc.lastUnits = this.iSvc.units;
      switch(this.iSvc.units){
        case 'meters':
          tempDist = this.iSvc.intervalValue;
          break;
        case INTERVALS_UNITS:
          if (this.iSvc.intervalValue > 0) {
            tempDist = (this.tInfo.trekDist / this.iSvc.intervalValue) + (1 / this.iSvc.intervalValue);
          } else {
            this.iSvc.intervalValue = tempDist = 0;
          }
          break;
        case 'miles':
          tempDist = this.iSvc.intervalValue * M_PER_MILE;
          break;
        case 'kilometers':
          tempDist = this.iSvc.intervalValue * 1000;
          break;
        case 'minutes':
          tempDist = this.iSvc.intervalValue * 60;     // convert minutes to seconds
          change = true;
          saved = true;
          break;
        case SAVED_UNITS:
          tempDist = -1;
          this.iSvc.intervalValue = -1;
          change = false;
          saved = true;
          break;
        default:
      }
      if (this.iSvc.intervalDistOK(tempDist)) {
        this.iSvc.intervalDist = tempDist;
        this.setIntervalsActive(true);
        this.setIntervalFormOpen(false);
        this.activeIntervalValue = this.iSvc.intervalValue;
        this.activeIntervalUnits = this.iSvc.units;
        if(change || saved){
          this.iSvc.getIntervalData(this.iSvc.intervalDist, this.tInfo.pointList);
          this.iSvc.buildGraphData(this.iSvc.intervalData)
          this.tInfo.setUpdateMap(true);
          this.setSpeedDialZoom(false);
          this.setSelectedIntervalIndex(0)
          this.setGraphOpen(true);
          this.iSvc.setIntervalChange(change);
          this.setOpenItems(true);
        }
      } else {
        this.props.toastSvc.toastOpen({tType: 'Error', content: 'Interval distance too small.'});
        this.openIntervalForm();
      }
    } else {
      this.cancelIntervalsActive();
    }
  }
  
  // indicate that intervals are not active, close interval graph
  @action
  cancelIntervalsActive = () => {
    if(this.intervalsActive){
      this.setLayoutOpts("All");
      this.setSpeedDialZoom(false);
      this.setGraphOpen(false);
      this.setOpenItems(false)
    }
    this.iSvc.intervalDist = 0;
    this.iSvc.intervalData = undefined;
    this.setIntervalsActive(false);
    this.setIntervalFormOpen(false);
    this.iSvc.setIntervalChange(false);
  }

  // Open the Trek Intervals form using DISTANCE parameters
  openIntervalForm = () => {
    this.tInfo.setUpdateMap(false);
    if(this.intervalsActive || !this.tInfo.intervals) {
      let units = [INTERVALS_UNITS, 'meters', DIST_UNIT_LONG_NAMES[this.tInfo.measurementSystem], 'minutes'];
      this.limitProps = {heading: "Intervals", headingIcon: "RayStartEnd",     
          onChangeFn: this.iSvc.setIntervalValue,    
          label: 'Set interval distance, time or count:', 
          placeholderValue: (this.tInfo.intervals || this.iSvc.lastIntervalValue < 0) ? '0' : this.iSvc.lastIntervalValue.toString(),
          units: units, defaultUnits: units[0], 
          closeFn: this.showIntervals};
      this.setIntervalFormOpen(true);
    }
    else {
      this.iSvc.units = SAVED_UNITS;
      this.iSvc.intervalDist = -1;
      this.showIntervals(true)
    }
  }

  // Set the property that keeps trak of whick Interval is currently in focus
  @action
  setSelectedIntervalIndex = (val: number) => {
    this.tInfo.setUpdateMap(true);
    this.tInfo.setUpdateGraph(true);
    this.selectedIntervalIndex = val;
  }

  // set the value of the speedDialZoom property
  @action
  setSpeedDialZoom = (status: boolean) => {
    this.speedDialZoom = status;
  }
  
  // toggle the value of the speedDialZoom property
  toggleSpeedDialZoom = (val: string, toggle = true) => {
    if (toggle) { this.setSpeedDialZoom(!this.speedDialZoom); }
    this.setLayoutOpts(val);
  }

  // show the images for the selected image marker
  showCurrentImageSet = (index: number) => {
    let title = this.tInfo.formatImageTitle(index, 0);
    this.props.navigation.navigate('Images', {cmd: 'show', setIndex: index, title: title});
  }

  // respond to touch in navigation bar
  setActiveNav = (val) => {
    if ('PrevNext'.includes(val)) {
      this.setWaiting(true);
    }
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch(val){
        case 'Stats':            // switch between Info' and 'Close' function for this button
          this.tInfo.setUpdateMap(false);
          this.setStatsOpen(!this.statsOpen)
          break;
        case 'Prev':          // move to previous trek in list
        case 'Next':          // move to next trek in list
          let title;
          title = this.changeTrekFn(val);  // try to change to the Next/Previous trek
          if (title !== '') {
            // change was successful 
            if (this.intervalsActive) { this.cancelIntervalsActive(); }
            this.props.navigation.setParams({ title: title, icon: this.tInfo.type });
            this.setWaiting(false);
            // set to show full path on map
            this.setLayoutOpts("NewAll");    
          }
          else {
            this.setWaiting(false);
          }
          break;
        case 'Intervals':
          this.setStatsOpen(false);
          this.openIntervalForm();
          break;
        case 'IntervalsDelete':
          this.saveCurrentIntervals(true);
          break;
        case 'IntervalsDone':
          this.cancelIntervalsActive();
          break;
        case 'IntervalsSave':
          this.saveCurrentIntervals();
          break;
        case 'IntervalsContinue':
          this.setIntervalFormDone('Close');
          break;
        case 'IntervalsCancel':
          if (this.intervalsActive){
            if((this.iSvc.units !== this.activeIntervalUnits) || (this.iSvc.intervalValue !== this.activeIntervalValue)){
              this.iSvc.units = this.activeIntervalUnits;
              this.iSvc.intervalValue = this.iSvc.units === SAVED_UNITS ? 0 : this.activeIntervalValue;
              this.showIntervals(true);
            } else {
              this.setIntervalFormDone('Keyboard');
              this.setIntervalFormOpen(false);
            }  
          } else {
            this.setIntervalFormDone('Dismiss');
          }
          break;
        default:
      }
    });
  }

  render () {

    const { controlsArea, navItem, navIcon } = this.props.uiTheme;
    const { highTextColor, highlightColor, lowTextColor, matchingMask_7, textOnTheme,
            pageBackground, dividerColor, navIconColor, navItemBorderColor
             } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const ints = (this.intervalsActive ) ? this.iSvc.intervalDist : undefined;
    const iMarkers = ints ? this.iSvc.intervalData.markers : undefined;
    const changeZFn = iMarkers ? this.toggleSpeedDialZoom : this.toggleSpeedDialZoom;
    const sdIcon = iMarkers ? (this.speedDialZoom ? "ZoomOut" : "ZoomIn") 
                            : (this.speedDialZoom ? "ZoomOutMap" : "Location");
    const sdValue = iMarkers ? (this.speedDialZoom ? "All" : "Interval")
                             : (this.speedDialZoom ? "All" : "Current");
    const interval = ((iMarkers !== undefined) && this.speedDialZoom) ? this.selectedIntervalIndex : undefined;
    const showButtonHeight = 20;
    const caHt = SHORT_CONTROLS_HEIGHT;
    const graphAndControlsHt = INTERVAL_AREA_HEIGHT + SHORT_CONTROLS_HEIGHT;
    const bottomHeight = (ints && this.graphOpen) ? graphAndControlsHt : 0;
    const prevOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Prev', true) === 'OK');
    const nextOk = (this.changeTrekFn !== undefined) && (this.changeTrekFn('Next', true) === 'OK');
    const showControls = this.tInfo.showMapControls;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      caAdjust: {
        height: caHt,
      },
      rowLayout1: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      center: {
        justifyContent: "center",
      },
      graphAndControls: {
        backgroundColor: "transparent",
        minHeight: graphAndControlsHt,
        zIndex: this.zValue,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
      },
      graphArea: {
        height: INTERVAL_GRAPH_HEIGHT,
        marginLeft: 0,
        marginRight: 0,
      },
      graph: {
        paddingHorizontal: 2,
      },
      showControls: {
        height: showButtonHeight,
        flexDirection: "row",
        paddingHorizontal: 5,
        paddingTop: 2,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      showButton: {
        flex: 1,
        height: showButtonHeight,
        paddingBottom: 2,
        paddingHorizontal: 0,
        borderBottomWidth: 2,
        borderStyle: "solid",
        borderColor: "transparent",
      },
      showButtonSelected: {
        flex: 1,
        height: showButtonHeight,
        paddingBottom: 3,
        paddingHorizontal: 0,
        borderBottomWidth: 2,
        borderStyle: "solid",
        borderColor: highlightColor,
      },
      detailsIcon: {
        width: 24,
        height: 24,
        backgroundColor: "transparent"
      },
      buttonText: {
        fontSize: 16,
        color: lowTextColor,
      },
      buttonTextSelected: {
        fontSize: 16,
        color: highTextColor,
      },
      button: {
        color: "white",
        fontSize: 16
      }
    })


    return (
      <View style={styles.container}>
        {showControls &&
          <TrekLogHeader titleText={this.props.navigation.getParam('title', '')}
                                    icon={this.props.navigation.getParam('icon', '')}
                                    backgroundColor={matchingMask_7}
                                    textColor={textOnTheme}
                                    position="absolute"
                                    backButtonFn={() => this.props.navigation.dispatch(goBack)}
          />        
        }
        <TrekDisplay 
          layoutOpts={this.layoutOpts} 
          intervalMarkers={iMarkers}
          intervalLabelFn={this.iSvc.intervalLabel}
          selectedInterval={this.selectedIntervalIndex}
          selectedPath={ints ? this.iSvc.intervalData.segPaths[this.selectedIntervalIndex] : undefined}
          selectFn={this.setSelectedIntervalIndex} 
          bottom={bottomHeight} 
          speedDialIcon={sdIcon}
          speedDialValue={sdValue}
          markerDragFn={this.callMarkerToPath}
          mapType={this.props.trekInfo.defaultMapType}
          changeMapFn={this.setMapType}
          changeZoomFn={changeZFn}
          showImagesFn={this.showCurrentImageSet}
          prevFn={prevOk ? (() => this.setActiveNav('Prev')) : undefined}
          nextFn={nextOk ? (() => this.setActiveNav('Next')) : undefined}
        />
        {this.waitingForChange && 
          <Waiting/>
        }
        <View style={styles.graphAndControls}>
          <SlideUpView 
            bgColor={pageBackground}
            startValue={graphAndControlsHt}
            endValue={0}
            open={this.graphOpen}
            beforeOpenFn={this.setVisible}
            afterCloseFn={this.setNotVisible}
          >
            <View style={{height: graphAndControlsHt, backgroundColor: pageBackground}}>
              <View style={styles.showControls}>
                <IconButton
                  label="DIST"
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Distance'}
                  style={this.iSvc.show === "Distance" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Distance" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="ELEV"
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Elevation'}
                  style={this.iSvc.show === "Elevation" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Elevation" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="TIME"
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Time'}
                  style={this.iSvc.show === "Time" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Time" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="SPEED"
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Speed'}
                  style={this.iSvc.show === "Speed" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Speed" ? styles.buttonTextSelected : styles.buttonText}
                />
                <IconButton
                  label="CALS"
                  onPressFn={this.iSvc.setShow}
                  onPressArg={'Calories'}
                  style={this.iSvc.show === "Calories" ? styles.showButtonSelected : styles.showButton}
                  labelStyle={this.iSvc.show === "Calories" ? styles.buttonTextSelected : styles.buttonText}
                />
              </View>
              <View style={styles.graphArea}>
                <View style={styles.graph}>
                  <BarDisplay 
                        data={this.iSvc.intervalGraphData.items} 
                        dataRange={this.iSvc.intervalGraphData.range}
                        selected={this.selectedIntervalIndex}
                        selectFn={this.setSelectedIntervalIndex} 
                        barWidth={60}
                        openFlag={this.openItems}
                        maxBarHeight={70}
                        style={{height: 95, backgroundColor: "transparent"}}
                        scrollToBar={this.scrollToBar}
                      />
                </View>
              </View>
            </View>
          </SlideUpView>
        </View>
        <NumbersBar 
          bottom={0} 
          open={this.statsOpen}
          interval={interval}
          intervalData={this.iSvc.intervalData}
        />
        <TrekLimitsForm
          open={this.intervalFormOpen}
          done={this.intervalFormDone}
          limits={this.limitProps}
        />
        {!this.intervalFormOpen && showControls &&
          <View style={[controlsArea, styles.caAdjust]}>
            {(ints && this.tInfo.intervals) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="Delete"
                style={navItem}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsDelete"
              />
            }
            {(ints && this.iSvc.intervalChange) &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="CheckMark"
                style={navItem}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsSave"
              />
            }
            {ints &&
              <IconButton 
                iconSize={NAV_ICON_SIZE}
                icon="Close"
                style={navItem}
                borderColor={navItemBorderColor}
                iconStyle={navIcon}
                color={navIconColor}
                raised
                onPressFn={this.setActiveNav}
                onPressArg="IntervalsDone"
              />
            }
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon={ints ? "Edit" : "RayStartEnd"}
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Intervals"
            />
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon={this.statsOpen ? 'ChevronDown' : 'ChevronUp'}
              style={navItem}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Stats"
            />
          </View>
        }
        {(this.intervalFormOpen) &&
          <View style={[controlsArea, styles.caAdjust]}>
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="ArrowBack"
              style={navItem}
              iconStyle={navIcon}
              borderColor={navItemBorderColor}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsCancel"
            />
            <IconButton 
              iconSize={NAV_ICON_SIZE}
              icon="CheckMark"
              style={navItem}
              borderColor={navItemBorderColor}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="IntervalsContinue"
            />
          </View>
        }
      </View>
    )   

  }
}

export default SelectedTrek;

