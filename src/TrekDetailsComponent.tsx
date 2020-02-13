import React, { Component } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { RectButton, BorderlessButton } from 'react-native-gesture-handler'
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';

import { UtilsSvc, LB_PER_KG, TERRAIN_DESCRIPTIONS } from './UtilsService';
import { APP_ICONS} from './SvgImages';
import SvgIcon from './SvgIconComponent';
import SvgButton from './SvgButtonComponent';
import { FilterSvc } from './FilterService';
import { ModalModel } from './ModalModel';
import { WeatherSvc, WindInfo, WeatherData } from './WeatherSvc'
import { LoggingSvc } from './LoggingService';
import { MainSvc, PLURAL_STEP_NAMES, STEP_NAMES, SPEED_UNIT_CHOICES,
         WEIGHT_UNIT_CHOICES, TREK_TYPE_HIKE, STEPS_APPLY } from './MainSvc';
import { TrekSvc } from './TrekSvc';
import TrekImageListDisplay  from './TrekImageListDisplay';
import { LARGE_IMAGE_HEIGHT } from './App';

const ELEVATION_DISPLAY_SWITCH = {
  Gain: "Grade",
  Grade: "Points",
  Points: "AllPoints",
  AllPoints: "Gain",
  Average: "Max",
  Max: "Min",
  Min: "Average",
  First: "Last",
  Last: "First"
};
const ELEVATION_DISPLAY_TITLES = {
  First: "Start",
  Last: "End",
  Max: "Max",
  Min: "Min",
  Points: "Points",
  AllPoints: "All Points",
  Gain: "Gain",
  Average: "Avg",
  Grade: "Grade"
};

@inject('utilsSvc', 'uiTheme', 'filterSvc', 'modalSvc', 'weatherSvc', 'loggingSvc',
        'mainSvc', 'trekSvc')
@observer
export class TrekDetails extends Component<{
  selected ?: number,           // number of selected item from associated list (barGraph)
  heightAdj ?: number,          // hight of the display area
  sortBy?: string,              // what to highlight as current sort value
  sortByDate?: boolean,         // true if sort by date in effect
  selectable ?: boolean,        // true if "show" selections are allowed/processed
  selectFn ?: Function,         // function to call when switch 'show' selections are allowed
  toggleShowValueFn ?: Function,// function to call when toggling show value for Steps, Speed or Calories
  switchSysFn ?: Function,      // call if want to switch measurement systems
  showImagesFn ?: Function,     // function to call if user taps an image
  showGroup ?: boolean,         // show group property if true
  showCourseEffortFn ?: Function, // function to call if user taps on course item
  utilsSvc ?: UtilsSvc,
  uiTheme ?: any,
  filterSvc ?: FilterSvc,
  modalSvc ?: ModalModel,
  weatherSvc ?: WeatherSvc,
  loggingSvc ?: LoggingSvc,
  mainSvc ?: MainSvc,
  trekSvc ?: TrekSvc,
}, {} > {

  @observable elevItems1 : string;
  @observable elevItems2 : string;
  @observable elevItems3 : string;

  mS = this.props.mainSvc;
  fS = this.props.filterSvc;
  tS = this.props.trekSvc;
  lS = this.props.loggingSvc;
  uSvc = this.props.utilsSvc;
  tInfo = this.fS.tInfo;


  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // componentDidUpdate(prevProps) {
  //   if(prevProps.selected !== this.props.selected && this.props.selected >= 0){
  //     if(this.tS.getTrekImageCount(this.tInfo) > 0 && this.scrollViewRef){
  //       this.scrollViewRef.scrollToOffset({offset: 0, animated: true});
  //     }
  //   }
  // }
  
  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
   this.fS.setShowAvgSpeed(true);
   this.fS.setShowStepsPerMin(false);
   this.fS.setShowTotalCalories(true);
   this.setElevItems1('Gain');
   this.setElevItems2('Average');
   this.setElevItems3('First');
  }

  @action
  setElevItems1 = (value: string) => {
    this.elevItems1 = value;
  }

  @action
  setElevItems2 = (value: string) => {
    this.elevItems2 = value;
  }

  @action
  setElevItems3 = (value: string) => {
    this.elevItems3 = value;
  }

  // toggle between displaying the various altitude values
  toggleElevDisplay1 = () => {
    this.setElevItems1(ELEVATION_DISPLAY_SWITCH[this.elevItems1]);
}

  toggleElevDisplay2 = () => {
    this.setElevItems2(ELEVATION_DISPLAY_SWITCH[this.elevItems2]);
}

  toggleElevDisplay3 = () => {
    this.setElevItems3(ELEVATION_DISPLAY_SWITCH[this.elevItems3]);
}

  // return a string to be displayed in relation to the elevation data
  // base response on current value of elevDisplay and if an interval is specified
  elevationDisplayValue = (elevItem: string) => {
    let result = {
      value: undefined,
      units: "",
      label: ELEVATION_DISPLAY_TITLES[elevItem] // title to use for current elev item type
    };
    let value: string;

    switch (elevItem) {
      case "Points":
        result.value = this.tS.pointListLength(this.tInfo).toString();
        return result;
      case "AllPoints":
        result.value = this.tInfo.totalGpsPoints
          ? this.tInfo.totalGpsPoints.toString()
          : "N/A";
        return result;
      case "Average":
        value = this.mS.formattedElevation(this.uSvc.getArraySegmentAverage(this.tInfo.elevations));
        break;
      case "First":
        value = this.lS.formattedTrekElevation(this.tInfo.elevations, "First");
        break;
      case "Last":
        value = this.lS.formattedTrekElevation(this.tInfo.elevations, "Last");
        break;
      case "Max":
        value = this.lS.formattedTrekElevation(this.tInfo.elevations, "Max");
        break;
      case "Min":
        value = this.lS.formattedTrekElevation(this.tInfo.elevations, "Min");
        break;
      case "Gain":
        value = this.mS.formattedElevation(this.tInfo.elevationGain);
        break;
      case "Grade":
        value = this.lS.formattedElevationGainPct(this.tInfo.elevationGain, this.tInfo.trekDist);
        break;
      default:
    }
    if (value === 'N/A') {
      result.value = value;
      return result;
    }
    let i = value.indexOf(" ");
    result.value = value.substr(0, i);
    result.units = value.substr(i);
    return result;
  }

  formattedSpeed = () => {
    if (this.fS.showAvgSpeed) {
      return this.tInfo.averageSpeed;
    }
    return this.tInfo.timePerDist;
  }

  // return the user's weight formatted for display with appropriate units
  formattedWeight = (pack = false) => {
    let wt = this.tInfo.weight;
    
    if (pack && (this.tInfo.packWeight !== undefined)){
      wt = this.tInfo.packWeight;
      if (wt === 0) { return 'No'; }
    }
    switch(this.mS.measurementSystem){
      case 'US':
        wt = Math.round(wt * LB_PER_KG);
        break;
      case 'Metric':
        wt = Math.round(wt);
        break;
      default:
    }
    return (wt + ' ' + WEIGHT_UNIT_CHOICES[this.mS.measurementSystem])
  }

  // return the given temperature formatted for the measuring system (or conditions.temp if not given)
  formattedTemp = (temp ?: number) : string => {
    if (temp === undefined) { temp = this.tInfo.conditions ? this.tInfo.conditions.temp : undefined }
    if (temp === undefined) { return 'N/A'; }
    return this.props.weatherSvc.formatTemperature(temp, this.mS.measurementSystem);
  }

  // return the given humidity percentage formatted for display (or conditions.humidity if not given)
  formattedHumidity = (pct ?: number) : string => {
    if (pct === undefined) { pct = this.tInfo.conditions ? this.tInfo.conditions.humidity : undefined }
    if (pct === undefined) { return 'N/A'; }
    return pct + '%';
  }

  // return the given wind information formatted for display (or conditions.wind if not given)
  formattedWind = (part: string, windInfo ?: WindInfo) : string => {
    if (windInfo === undefined) { windInfo = this.tInfo.conditions ? this.tInfo.conditions.wind : undefined }
    if (windInfo === undefined) { return 'N/A'; }
    switch(part){
      case 'Dir':
        return windInfo.windDir;
      case 'Speed':
        return this.uSvc.computeRoundedAvgSpeed(this.mS.measurementSystem, windInfo.windSpeed, 1, true).toString();
      case 'Units':
        return SPEED_UNIT_CHOICES[this.mS.measurementSystem];
      default:
        return '';
    }
  }

  // return the given conditions formatted for display (or tInfo.conditions if not given)
  formattedConditions = (conds ?: WeatherData) : string => {
    if (conds === undefined) { conds = this.tInfo.conditions }
    if (conds === undefined) { return 'Conditions: N/A'; }
    return this.uSvc.formatTime(conds.time * 1000);
  }

  formattedCalories = (showTotal: boolean) => {
    return showTotal ?  this.tInfo.currentCalories : this.tInfo.currentCaloriesPerMin + '/min';
  }

  callEditTrekLabel = (field: string) => {
    this.props.loggingSvc.editTrekLabel(this.tInfo, false, field)
    .then(() => {})
    .catch(() => {})
  }

  // call the given select function with the 'show' choice
  callSelectFn = (val: string) => {
    if (this.props.selectFn) { this.props.selectFn(val); }
  }

  // process a touch on a switchable value, allow touch feedback first
  callSwitchFn = (id: string) => {
    switch(id) {
      case 'Dist':
        if (this.props.switchSysFn) { this.props.switchSysFn(); }
        break;
      case 'Speed':
        this.props.toggleShowValueFn('Speed');
        break;
      case 'Steps':
        this.props.toggleShowValueFn('Steps');
        break;
      case 'Cals':
        this.props.toggleShowValueFn('Cals');
        break;
      case 'Course':
        this.props.showCourseEffortFn(this.fS.tInfo);
        break;
      default:
    }
  }


  render() {
    const { width } = Dimensions.get('window');
    const tI = this.tInfo;
    const { highTextColor, dividerColor, mediumTextColor, trekLogBlue, listIconColor, secondaryColor,
            disabledTextColor, highlightedItemColor, rippleColor, altCardBackground, shadow1
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { fontRegular, fontItalic } = this.props.uiTheme;
    const selectable = this.props.selectable;
    const sortVal = selectable === true ? this.props.sortBy : '';
    const showSpeed = this.fS.showAvgSpeed;
    const hasLabel = this.tS.trekHasLabel(tI);
    const hasNotes = this.tS.trekHasNotes(tI);
    const hasImages = this.tS.haveTrekImages(tI);
    const labelText = hasLabel ? tI.trekLabel : 'No Label';
    const noteText = hasNotes ? tI.trekNotes : 'No Notes'; 
    const sortButtonHeight = 70;
    const trekImageHeight = LARGE_IMAGE_HEIGHT;
    const trekImageWidth = trekImageHeight * .75;
    const sortIconSize = 30;
    const speedLabel = showSpeed ? 'Average Speed' : 'Average Pace';
    const stepsLabel = (this.fS.showStepsPerMin) ? (STEP_NAMES[tI.type] + ' Rate')
                                              : PLURAL_STEP_NAMES[tI.type];
    const calsLabel  = (this.fS.showTotalCalories) ? 'Calories' : 'Calorie Rate';
    const carIconSize = 14;


    const styles = StyleSheet.create({
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      sortControls: {
        flexDirection: "column",
        justifyContent: "flex-start",
        paddingTop: 0,
      },
      sortButton: {
        paddingLeft: 15,
        minHeight: sortButtonHeight,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: altCardBackground,
        borderColor: dividerColor,
        borderStyle: "solid",
        ...shadow1
      },
      sortHighlight: {
        backgroundColor: highlightedItemColor,
      },
      sortButtonTrigger: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",   
      },
      trekNote: {
        flexWrap: "wrap",
        paddingLeft: 30,
        paddingBottom: 10,
      },
      noteText: {
        fontFamily: fontRegular,
        fontSize: 20,
      },
      noteNoText: {
        color: disabledTextColor,
        fontFamily: fontItalic,
      },
      sortButtonIcon: {
        width: sortIconSize,
        height: sortIconSize,
        backgroundColor: "transparent"
      },
      sortButtonTextArea: {
        flexWrap: "wrap",
        flex: 1
      },
      sortButtonText: {
        fontSize: 20,
        fontFamily: fontRegular,
        marginLeft: 10,
        color: highTextColor,
      },
      sortButtonArea: {
        minHeight: sortButtonHeight,
        minWidth: 80,
        justifyContent: "center",
        alignItems: "flex-end",
      },
      sortButtonValue: {
        paddingRight: 15,
        fontSize: 24,
        color: highTextColor,
        fontFamily: fontRegular,
      },
      elevItems: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",   
      },
      elevItem: {
        flex: 1,
        paddingLeft: 10,
        justifyContent: "center",
        alignItems: "center",
      },
      elevItemLabel: {
        fontSize: 16,
        fontFamily: fontRegular,
        color: mediumTextColor,
      },
      elevValue: {
        fontSize: 22,
        color: trekLogBlue,
        fontFamily: fontRegular,
      },
      elevUnits: {
        fontSize: 18,
        marginTop: 3,
        color: trekLogBlue,
        fontFamily: fontRegular,
      },
      weatherHeading: {
        minHeight: sortButtonHeight,
        flexDirection: "row",
        paddingLeft: 50,
        alignItems: "center",
        backgroundColor: altCardBackground,
        borderColor: dividerColor,
        borderStyle: "solid",
        ...shadow1
      },
      weatherTitleText: {
        fontSize: 22,
        fontFamily: fontRegular,
        color: mediumTextColor,
      },
      windText: {
        fontSize: 20,
        color: highTextColor,
        fontFamily: fontRegular,
      },
      windValue: {
        paddingHorizontal: 4,
        fontSize: 24,
        color: highTextColor,
        fontFamily: fontRegular,
      },
      lightItalic: {
        fontFamily: fontItalic,
        color: disabledTextColor
      },
      selectable: {
        color: trekLogBlue,
      },
      carIcon: {
        marginLeft: 10,
        marginTop: 3,
        width: carIconSize,
        height: carIconSize,
        backgroundColor: "transparent"
      },
      imageRow: {
        paddingLeft: 15,
        paddingRight: 15,
        paddingVertical: 1,
        width: width,
        height: trekImageHeight,
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: altCardBackground,
        ...shadow1,
      },
      trekImage: {
        width: trekImageWidth,
        height: trekImageHeight,
        marginRight: 4,
      },
    });

    const SortItem = ({sortType, canSelect, icon, label, valueFn, selValue, 
                   sIcon=undefined, selIcon=undefined, selIconType=undefined, noHighlight=undefined}) => {

      return (  
        <View>      
          {canSelect &&
            <View style={[styles.sortButton, 
                          (!noHighlight && sortVal === sortType) ? styles.sortHighlight : {}]}>
              <RectButton
                rippleColor={rippleColor}
                style={{flex: 1}}
                onPress={() => this.callSelectFn(sortType)}
              >
                <View style={styles.sortButtonTrigger}>
                  <SvgIcon
                    style={styles.sortButtonIcon}
                    size={sortIconSize}
                    paths={APP_ICONS[icon]}
                    fill={listIconColor}
                  />
                  <Text style={styles.sortButtonText}>{label}</Text>
                  {(tI.drivingACar && sortType === 'Cals') && 
                    <SvgIcon
                      style={styles.carIcon}
                      size={carIconSize}
                      paths={APP_ICONS.Car}
                      fill={secondaryColor}
                    />
                  }
                </View>
              </RectButton>
              {selIcon && 
                <View style={[styles.sortButtonArea, {paddingRight: 10}]}>
                  <SvgButton
                    onPressFn={() => this.callSelectFn(selIconType)}
                    size={30}
                    fill={trekLogBlue}
                    path={APP_ICONS[sIcon]}
                  />
                </View>
              }
              {selValue &&
                <RectButton
                  rippleColor={rippleColor}
                  onPress={() => this.callSwitchFn(sortType)}>
                    <View style={styles.sortButtonArea}>
                      <Text style={[styles.sortButtonValue, styles.selectable]}>{valueFn()}</Text>
                    </View>
                </RectButton>
              }
              {(!selValue && !selIcon) && 
                <View style={styles.sortButtonArea}>
                  <Text style={styles.sortButtonValue}>{valueFn()}</Text>
                </View>
              }
            </View>
          }
          {!canSelect &&
            <View style={[styles.sortButton, 
                          (!noHighlight && sortVal === sortType) ? styles.sortHighlight : {}]}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS[icon]}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>{label}</Text>
              </View>
              {selIcon && 
                <View style={[styles.sortButtonArea, {paddingRight: 10}]}>
                  <SvgButton
                    onPressFn={() => this.callSelectFn(selIconType)}
                    size={sortIconSize}
                    fill={trekLogBlue}
                    path={APP_ICONS[sIcon]}
                  />
                </View>
              }
              {selValue &&
                <RectButton
                  rippleColor={rippleColor}
                  onPress={() => this.callSwitchFn(sortType)}>
                    <View style={styles.sortButtonArea}>
                      <Text style={[styles.sortButtonValue, styles.selectable]}>{valueFn()}</Text>
                    </View>
                </RectButton>
              }
              {!selValue && !selIcon && valueFn &&
                <View>
                  <Text style={styles.sortButtonValue}>{valueFn()}</Text>
                </View>
              }
            </View>
          }
          </View>
      )
    }

    const ElevItem = (props: any) => {
      return (
          <BorderlessButton
            rippleColor={rippleColor}
            style={{flex: 1}}
            onPress={props.switchFn}
          >
            <View style={styles.elevItem}>
              <Text style={styles.elevItemLabel}>{props.item.label}</Text>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <Text style={styles.elevValue}>{this.uSvc.zeroSuppressedValue(props.item.value)}</Text>
                <Text style={styles.elevUnits}>{props.item.units}</Text>
              </View>
            </View>
          </BorderlessButton>
      );
    };
  
      return (
      <View>
        { tI.startTime && (this.props.selected >= 0 || this.props.selected === undefined) &&
          <View style={styles.sortControls}>
            <View style={styles.sortButton}>
                <View style={styles.sortButtonTrigger}>
                  <SvgIcon
                    style={styles.sortButtonIcon}
                    size={sortIconSize}
                    paths={APP_ICONS.Label}
                    fill={listIconColor}
                  />
                  <View style={styles.sortButtonTextArea}>
                    <Text style={[styles.sortButtonText, 
                                  !hasLabel ? styles.lightItalic : {}]}>{labelText}</Text>
                  </View>
                </View>
                <View style={[styles.sortButtonArea, {minWidth: 10, paddingRight: 10}]}>
                  <SvgButton 
                    onPressFn={() => this.callEditTrekLabel('Label')}
                    size={24}
                    fill={trekLogBlue}
                    path={APP_ICONS.Edit}
                  />
                </View>
            </View>
            {hasImages &&
              <View style={styles.imageRow}>
                <TrekImageListDisplay
                  tInfo={tI}
                  trekId={tI.sortDate}
                  imageCount={tI.trekImageCount}
                  imageStyle={styles.trekImage}
                  focusImageStyle={styles.trekImage}
                  showImagesFn={this.props.showImagesFn}
                />
              </View>
            }
            <SortItem
              canSelect={selectable && this.props.sortByDate !== undefined}
              sortType={this.props.sortBy}
              icon="ClockStart"
              sIcon={this.props.sortByDate ? "CheckBoxChecked" : "CheckBoxOpen"}
              label={this.uSvc.formattedLocaleDateDay(tI.date) + '  ' + tI.startTime.toLowerCase()}
              valueFn={undefined}
              selValue={false}
              selIcon={this.props.sortByDate !== undefined}
              selIconType='Date'
              noHighlight={true}
            />
            {this.props.showGroup &&
              <SortItem
                canSelect={false}
                sortType='None'
                icon="FolderOpenOutline"
                label="Group"
                valueFn={() => tI.group}
                selValue={false}
              />
            }
            <SortItem
              canSelect={selectable}
              sortType='Dist'
              icon="CompassMath"
              label="Distance"
              valueFn={() => this.mS.formattedDist(tI.trekDist)}
              selValue={this.props.switchSysFn !== undefined}
            />
            <SortItem
              canSelect={selectable}
              sortType='Time'
              icon="TimerSand"
              label="Duration"
              valueFn={() => this.mS.formattedDuration(tI.duration)}
              selValue={false}
            />
            <SortItem
              canSelect={selectable}
              sortType='Speed'
              icon="Speedometer"
              label={speedLabel}
              valueFn={this.formattedSpeed}
              selValue={true}
            />
            <SortItem
              canSelect={selectable}
              sortType='Cals'
              icon="Fire"
              label={calsLabel}
              valueFn={() => this.formattedCalories(this.fS.showTotalCalories)}
              selValue={true}
            />
            {STEPS_APPLY[tI.type] && 
              <SortItem
                canSelect={selectable}
                sortType='Steps'
                icon={tI.type}
                label={stepsLabel}
                valueFn={() => this.tS.formattedSteps(tI, this.fS.showStepsPerMin)}
                selValue={true}
              />
            }
            {tI.type === TREK_TYPE_HIKE &&
              <SortItem
                canSelect={false}
                sortType='None'
                icon="Sack"
                label="Backpack"
                valueFn={() => this.formattedWeight(true)}
                selValue={false}
              />
            }
            {this.tS.hasElevations(tI) &&
              <View style={[styles.sortButton, {paddingRight: 15}]}>
                <View style={[styles.sortButtonTrigger, {flex: 0}]}>
                  <SvgIcon
                    style={styles.sortButtonIcon}
                    size={sortIconSize}
                    paths={APP_ICONS.ElevationRise}
                    fill={listIconColor}
                  />
                  <Text style={styles.sortButtonText}>Elevation</Text>
                </View>
                <View style={styles.elevItems}>
                  <ElevItem item={this.elevationDisplayValue(this.elevItems1)} switchFn={this.toggleElevDisplay1}/> 
                  <ElevItem item={this.elevationDisplayValue(this.elevItems2)} switchFn={this.toggleElevDisplay2}/> 
                  <ElevItem item={this.elevationDisplayValue(this.elevItems3)} switchFn={this.toggleElevDisplay3}/>
                </View>
              </View>
            }
            {this.tS.hasElevations(tI) &&
              <SortItem
                canSelect={false}
                sortType='None'
                icon="SlopeUphill"
                label="Grade"
                valueFn={() => this.lS.formattedElevationGainPct(tI.elevationGain, tI.trekDist) + ' - ' + 
                                            TERRAIN_DESCRIPTIONS[tI.hills]}
                selValue={false}
              />
            }
            {tI.course &&
              <SortItem
                canSelect={false}
                sortType='Course'
                icon="Course"
                label="Course"
                valueFn={() => tI.course}
                selValue={(this.props.showCourseEffortFn !== undefined) ? true : false}
              />
            }
            {this.tS.hasWeather(tI) &&
              <View>
                <View style={styles.weatherHeading}>
                    <Text style={styles.weatherTitleText}>{'At completion  ( ' + this.formattedConditions() + ' )'}</Text>
                </View>
                <SortItem
                  canSelect={false}
                  sortType='None'
                  icon={tI.conditions.tempIconId}
                  label='Temperature'
                  valueFn={this.formattedTemp}
                  selValue={false}
                />
                <SortItem
                  canSelect={false}
                  sortType='None'
                  icon={tI.conditions.condIconId}
                  label='Skies'
                  valueFn={() => this.uSvc.capitalizeWords(tI.conditions.desc)}
                  selValue={false}
                />
                <View style={[styles.sortButton, {paddingRight: 15}]}>
                  <View style={styles.sortButtonTrigger}>
                    <SvgIcon
                      style={styles.sortButtonIcon}
                      size={sortIconSize}
                      paths={APP_ICONS[tI.conditions.windIconId]}
                      fill={listIconColor}
                    />
                    <Text style={styles.sortButtonText}>Wind</Text>
                  </View>
                  <View style={styles.rowLayout}>
                    <Text style={styles.windValue}>{this.formattedWind('Dir')}</Text>
                    <Text style={styles.windText}>at</Text>
                    <Text style={styles.windValue}>{this.formattedWind('Speed')}</Text>
                    <Text style={styles.windText}>{this.formattedWind('Units')}</Text>
                  </View>
                </View>
                <SortItem
                  canSelect={false}
                  sortType='None'
                  icon='Humidity'
                  label='Humidity'
                  valueFn={this.formattedHumidity}
                  selValue={false}
                />
              </View>
            }
            <View style={[styles.sortButton, {flexDirection: 'column', alignItems: 'flex-start'}]}>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <View style={styles.sortButtonTrigger}>
                  <SvgIcon
                    style={styles.sortButtonIcon}
                    size={sortIconSize}
                    paths={APP_ICONS.NoteText}
                    fill={listIconColor}
                  />
                  <Text style={styles.sortButtonText}>Notes</Text>
                </View>
                <View style={[styles.sortButtonArea, {minWidth: 10, paddingRight: 10}]}>
                  <SvgButton 
                    onPressFn={() => this.callEditTrekLabel('Note')}
                    size={24}
                    fill={trekLogBlue}
                    path={APP_ICONS.Edit}
                  />
                </View>
              </View>
              <View style={styles.trekNote}>
                <Text style={[styles.sortButtonValue, hasNotes ? styles.noteText : styles.noteNoText]}>{noteText}</Text>
              </View>
            </View>
          </View>
        }
        </View>
    );
  }
}

export default TrekDetails;