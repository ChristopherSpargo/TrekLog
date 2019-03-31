import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableNativeFeedback } from 'react-native';
import { observer, inject } from 'mobx-react';
import { action, observable } from 'mobx';

import { TrekInfo, SWITCH_SPEED_AND_TIME, PLURAL_STEP_NAMES, STEP_NAMES, SPEED_UNIT_CHOICES,
         WEIGHT_UNIT_CHOICES, TREK_TYPE_HIKE} from './TrekInfoModel';
import { UtilsSvc, LB_PER_KG, TERRAIN_DESCRIPTIONS } from './UtilsService';
import { APP_ICONS} from './SvgImages';
import SvgIcon from './SvgIconComponent';
import SvgButton from './SvgButtonComponent';
import { FilterSvc } from './FilterService';
import { ModalModel } from './ModalModel';
import { WeatherSvc, WindInfo, WeatherData } from './WeatherSvc'
import { LoggingSvc } from './LoggingService';

@inject('trekInfo', 'utilsSvc', 'uiTheme', 'filterSvc', 'modalSvc', 'weatherSvc', 'loggingSvc')
@observer
export class TrekDetails extends Component<{
  heightAdj ?: number,             // hight of the display area
  selectable ?: boolean,        // true if "show" selections are allowed/processed
  selectFn ?: Function,         // function to call when switch 'show' selections are allowed
  switchSysFn ?: Function,      // call if want to switch measurement systems
  uiTheme ?: any,
  filterSvc ?: FilterSvc,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  weatherSvc ?: WeatherSvc,
  loggingSvc ?: LoggingSvc,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  @observable showSpeedOrTime: string;
  @observable showStepsPerMin: boolean;
  @observable showTotalCalories: boolean;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  scrollViewRef;


  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
   this.showSpeedOrTime = 'speed';
   this.showStepsPerMin = false;
   this.showTotalCalories = true;
  }

  formattedSpeed = () => {
    if (this.showSpeedOrTime === 'speed') {
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
    switch(this.tInfo.measurementSystem){
      case 'US':
        wt = Math.round(wt * LB_PER_KG);
        break;
      case 'Metric':
        wt = Math.round(wt);
        break;
      default:
    }
    return (wt + ' ' + WEIGHT_UNIT_CHOICES[this.tInfo.measurementSystem])
  }

  // return the given temperature formatted for the measuring system (or conditions.temp if not given)
  formattedTemp = (temp ?: number) : string => {
    if (temp === undefined) { temp = this.tInfo.conditions ? this.tInfo.conditions.temp : undefined }
    if (temp === undefined) { return 'N/A'; }
    return this.props.weatherSvc.formatTemperature(temp, this.tInfo.measurementSystem);
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
        return this.props.utilsSvc.computeRoundedAvgSpeed(this.tInfo.measurementSystem, windInfo.windSpeed, 1, true).toString();
      case 'Units':
        return SPEED_UNIT_CHOICES[this.tInfo.measurementSystem];
      default:
        return '';
    }
  }

  // return the given conditions formatted for display (or this.conditions if not given)
  formattedConditions = (conds ?: WeatherData) : string => {
    if (conds === undefined) { conds = this.tInfo.conditions }
    if (conds === undefined) { return 'Conditions: N/A'; }
    return 'Conditions at ' + this.props.utilsSvc.formatTime(conds.time * 1000);
  }

  formattedCalories = (showTotal: boolean) => {
    return showTotal ?  this.tInfo.currentCalories : this.tInfo.currentNetCalories;
  }

  // toggle between displaying time/distance and distance/time
  @action
  toggleAvgSpeedorTimeDisplay = () => {
    this.showSpeedOrTime = SWITCH_SPEED_AND_TIME[this.showSpeedOrTime];
  }

  // toggle between displaying total steps and steps/min
  @action
  toggleShowStepsPerMin = () => {
    this.showStepsPerMin = !this.showStepsPerMin;
  }

  // toggle between displaying total calories and net calories
  @action
  toggleShowTotalCalories = () => {
    this.showTotalCalories = !this.showTotalCalories;
  }

  callEditTrekLabel = () => {
    this.props.loggingSvc.editTrekLabel()
    .then(() => {})
    .catch(() => {})
  }

  // call the given select function with the 'show' choice
  callSelectFn = (val: string) => {
    if (this.props.selectFn) { this.props.selectFn(val); }
  }

  // process a touch on a switchable value, allow touch feedback first
  callSwitchFn = (id: string) => {
    requestAnimationFrame(() => {     // allow touch feedback
      switch(id) {
        case 'Dist':
          if (this.props.switchSysFn) { this.props.switchSysFn(); }
          break;
        case 'Speed':
          this.toggleAvgSpeedorTimeDisplay();
          break;
        case 'Steps':
          this.toggleShowStepsPerMin();
          break;
        case 'Cals':
          this.toggleShowTotalCalories();
          break;
        default:
      }
    })
  }

  render() {
    const { highTextColor, dividerColor, mediumTextColor, trekLogBlue, listIconColor, secondaryColor,
            pageBackground, disabledTextColor, highlightedItemColor } = this.props.uiTheme.palette;
    const tInfo = this.props.trekInfo;
    const uSvc = this.props.utilsSvc;
    const selectable = this.props.selectable;
    const sortVal = selectable === true ? this.fS.sortBy : '';
    const showSpeed = this.showSpeedOrTime === 'speed';
    const hasLabel = tInfo.trekHasLabel();
    const hasNotes = tInfo.trekHasNotes();
    const labelText = hasLabel ? tInfo.trekLabel : 'No Label';
    const noteText = hasNotes ? tInfo.trekNotes : 'No Notes'; 
    const sortButtonHeight = 43;
    const sortIconSize = 20;
    const speedLabel = showSpeed ? 'Average Speed' : 'Average Pace';
    const stepsLabel = (this.showStepsPerMin) ? (STEP_NAMES[tInfo.type] + ' Rate')
                                              : PLURAL_STEP_NAMES[tInfo.type];
    const calsLabel  = (this.showTotalCalories) ? 'Calories' : 'Net Calories';
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
        // height: areaHt,
      },
      sortButton: {
        paddingLeft: 15,
        minHeight: sortButtonHeight,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: pageBackground,
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
        marginLeft: 30,
        paddingBottom: 10,
      },
      noteText: {
        fontSize: 16,
      },
      noteNoText: {
        color: disabledTextColor,
        fontStyle: "italic",
        fontWeight: "normal"
      },
      sortButtonIcon: {
        width: sortIconSize,
        height: sortIconSize,
        backgroundColor: "transparent"
      },
      sortButtonText: {
        fontSize: 16,
        marginLeft: 10,
        color: highTextColor,
      },
      sortButtonArea: {
        minWidth: 80,
        alignItems: "flex-end",
      },
      sortButtonValue: {
        paddingRight: 15,
        fontSize: 18,
        color: highTextColor,
        fontWeight: "bold",
      },
      elevItem: {
        paddingLeft: 15,
        justifyContent: "center",
        alignItems: "center",
      },
      elevItemLabel: {
        fontSize: 12,
        color: mediumTextColor,
      },
      elevValue: {
        fontSize: 18,
        color: highTextColor,
        fontWeight: "bold",
      },
      windText: {
        fontSize: 16,
        color: highTextColor,
        fontWeight: "bold",
      },
      windValue: {
        paddingHorizontal: 4,
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
      bcTrans: {
        borderColor: "transparent",
      },
      lightItalic: {
        fontStyle: "italic",
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
    });

    const SortItem = ({dividerCheck, sortType, canSelect, icon, label, valueFn, selValue}) => {

      return (  
        <View>      
          <View style={[styles.divider, dividerCheck.indexOf(sortVal) !== -1 ? styles.bcTrans : {}]}/>
          {canSelect &&
            <View style={[styles.sortButton, sortVal === sortType ? styles.sortHighlight : {}]}>
              <TouchableNativeFeedback
                background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
                  {(this.tInfo.drivingACar && sortType === 'Cals') && 
                        <SvgIcon
                          style={styles.carIcon}
                          size={carIconSize}
                          paths={APP_ICONS.Car}
                          fill={secondaryColor}
                        />
                      }
                  
                </View>
              </TouchableNativeFeedback>
              {selValue &&
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={() => this.callSwitchFn(sortType)}>
                    <View style={styles.sortButtonArea}>
                      <Text style={[styles.sortButtonValue, styles.selectable]}>{valueFn()}</Text>
                    </View>
                </TouchableNativeFeedback>
              }
              {!selValue && 
                <View>
                  <Text style={styles.sortButtonValue}>{valueFn()}</Text>
                </View>
              }
            </View>
          }
          {!canSelect &&
            <View style={[styles.sortButton, sortVal === sortType ? styles.sortHighlight : {}]}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS[icon]}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>{label}</Text>
              </View>
              {selValue &&
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={() => this.callSwitchFn(sortType)}>
                    <View style={styles.sortButtonArea}>
                      <Text style={[styles.sortButtonValue, styles.selectable]}>{valueFn()}</Text>
                    </View>
                </TouchableNativeFeedback>
              }
              {!selValue && 
                <View>
                  <Text style={styles.sortButtonValue}>{valueFn()}</Text>
                </View>
              }
            </View>
          }
          </View>
      )
    }

    return (
      <View>
        <View style={styles.sortControls}>
          {/* <ScrollView ref={e => this.scrollViewRef = e}> */}
            <View style={styles.sortButton}>
                <View style={styles.sortButtonTrigger}>
                  <SvgIcon
                    style={styles.sortButtonIcon}
                    size={sortIconSize}
                    paths={APP_ICONS['Label']}
                    fill={listIconColor}
                  />
                  <Text style={[styles.sortButtonText, 
                                !hasLabel ? styles.lightItalic : {fontWeight: "bold"}]}>{labelText}</Text>
                </View>
            </View>
            <View style={styles.divider}/>
            <View style={styles.sortButton}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS['ClockStart']}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>
                  { this.props.utilsSvc.formattedLongDateAbbr(tInfo.date) + ' at ' + tInfo.startTime}</Text>
              </View>
            </View>
            <SortItem
              canSelect={selectable}
              dividerCheck={['Dist']}
              sortType='Dist'
              icon="CompassMath"
              label="Distance"
              valueFn={tInfo.formattedDist}
              selValue={this.props.switchSysFn !== undefined}
            />
            <SortItem
              canSelect={selectable}
              dividerCheck={['Dist', 'Time']}
              sortType='Time'
              icon="TimerSand"
              label="Time"
              valueFn={tInfo.formattedDuration}
              selValue={false}
            />
            <SortItem
              canSelect={selectable}
              dividerCheck={['Time', 'Speed']}
              sortType='Speed'
              icon="Speedometer"
              label={speedLabel}
              valueFn={this.formattedSpeed}
              selValue={true}
            />
            <SortItem
              canSelect={selectable}
              dividerCheck={['Speed', 'Cals']}
              sortType='Cals'
              icon="Fire"
              label={calsLabel}
              valueFn={() => this.formattedCalories(this.showTotalCalories)}
              selValue={true}
            />
            <SortItem
              canSelect={selectable}
              dividerCheck={['Cals', 'Steps']}
              sortType='Steps'
              icon={tInfo.type}
              label={stepsLabel}
              valueFn={() => tInfo.formattedSteps(this.showStepsPerMin)}
              selValue={true}
            />
            {tInfo.type === TREK_TYPE_HIKE &&
              <SortItem
                canSelect={false}
                dividerCheck={['Steps']}
                sortType='None'
                icon="Sack"
                label="Backpack"
                valueFn={() => this.formattedWeight(true)}
                selValue={false}
              />
            }
            <View style={[styles.divider, 
                         (sortVal === 'Steps' && tInfo.type !== TREK_TYPE_HIKE) ? styles.bcTrans : {}]}/>
            <View style={[styles.sortButton, {paddingRight: 15}]}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS.ElevationRise}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>Elevation</Text>
              </View>
              <View style={styles.elevItem}>
                <Text style={styles.elevItemLabel}>Min</Text>
                <Text style={styles.elevValue}>{tInfo.formattedTrekElevation('Min')}</Text>
              </View>
              <View style={styles.elevItem}>
                <Text style={styles.elevItemLabel}>Max</Text>
                <Text style={styles.elevValue}>{tInfo.formattedTrekElevation('Max')}</Text>
              </View>
              <View style={styles.elevItem}>
                <Text style={styles.elevItemLabel}>Gain</Text>
                <Text style={styles.elevValue}>{tInfo.formattedElevation(tInfo.elevationGain)}</Text>
              </View>
            </View>
            <SortItem
              canSelect={false}
              dividerCheck={[]}
              sortType='None'
              icon="SlopeUphill"
              label="Grade"
              valueFn={() => this.tInfo.formattedElevationGainPct() + ' - ' + TERRAIN_DESCRIPTIONS[this.tInfo.hills]}
              selValue={false}
            />
            {tInfo.hasWeather() &&
              <View>
                <View style={styles.divider}/>
                <View style={[styles.sortButton, {justifyContent: "center"}]}>
                    <Text style={styles.sortButtonText}>{'Weather ' + this.formattedConditions()}</Text>
                </View>
                <SortItem
                  canSelect={false}
                  dividerCheck={[]}
                  sortType='None'
                  icon={tInfo.conditions.condIconId}
                  label='Skies'
                  valueFn={() => uSvc.capitalizeWords(tInfo.conditions.desc)}
                  selValue={false}
                />
                <SortItem
                  canSelect={false}
                  dividerCheck={[]}
                  sortType='None'
                  icon={tInfo.conditions.tempIconId}
                  label='Temperature'
                  valueFn={this.formattedTemp}
                  selValue={false}
                />
                <View style={styles.divider}/>
                <View style={[styles.sortButton, {paddingRight: 15}]}>
                  <View style={styles.sortButtonTrigger}>
                    <SvgIcon
                      style={styles.sortButtonIcon}
                      size={sortIconSize}
                      paths={APP_ICONS[tInfo.conditions.windIconId]}
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
                  dividerCheck={[]}
                  sortType='None'
                  icon='Humidity'
                  label='Humidity'
                  valueFn={this.formattedHumidity}
                  selValue={false}
                />
              </View>
            }
            <View style={styles.divider}/>
            <View style={styles.sortButton}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS.NoteText}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>Notes</Text>
              </View>
              <SvgButton 
                style={{alignItems: "center", justifyContent: "center"}}
                onPressFn={this.callEditTrekLabel}
                borderWidth={0}
                size={34}
                fill={trekLogBlue}
                path={APP_ICONS["Edit"]}
              />
            </View>
            <View style={[styles.sortButton, styles.trekNote]}>
              <Text style={[styles.sortButtonValue, hasNotes ? styles.noteText : styles.noteNoText]}>{noteText}</Text>
            </View>
          {/* </ScrollView> */}
        </View>
      </View>
    );
  }
}

export default TrekDetails;