import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView, TouchableNativeFeedback } from 'react-native'
import { observer, inject } from 'mobx-react'
import { action } from 'mobx';
import { NavigationActions } from 'react-navigation';

import { FilterSvc, FilterSettingsObj } from './FilterService'
import { TrekInfo, ALL_SELECT_BITS } from './TrekInfoModel'
import { UtilsSvc } from './UtilsService';
import IconButton from './IconButtonComponent';
import { TIME_FRAMES, TIME_FRAME_DISPLAY_NAMES } from './ReviewComponent';
import TrekTypeSelect from './TrekTypeSelectComponent';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import TextInputField from './TextInputFieldComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { ModalModel } from './ModalModel';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'utilsSvc', 'uiTheme', 'filterSvc', 'modalSvc')
@observer
class ExtraFilters extends Component<{ 
  filterSvc ?: FilterSvc,
  utilsSvc ?: UtilsSvc,
  navigation ?: any,
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  trekInfo ?: TrekInfo         // object with all information about the Trek
}, {} > {

  static navigationOptions = ({navigation}) => {
  const params = navigation.state.params || {};
   
    return {
      header: <TrekLogHeader titleText={params.title || ''}
                             icon="*"
                             backButtonFn={() =>  navigation.dispatch(goBack)}
              />
    };
  }  

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  AFFIndex: number;
  typeSels = 0;
  origFilter : FilterSettingsObj;
  updateDshBrd = true;

  activeNav : string = '';

  componentWillMount() {
    this.origFilter = this.props.navigation.getParam('existingFilter');
    this.updateDshBrd = this.tInfo.updateDashboard;
    this.tInfo.updateDashboard = true;
    this.typeSels = this.tInfo.typeSelections;
    if (this.fS.filterMode === 'Dashboard') {
      this.tInfo.setTypeSelections(ALL_SELECT_BITS);
      this.fS.filterTreks(false);
    }
  }

  componentDidMount() {
    this.AFFIndex = this.fS.setAfterFilterFn(this.setTitleParam);
  }

  componentWillUnmount() {
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.tInfo.updateDashboard = this.updateDshBrd;
    if (this.fS.filterMode === 'Dashboard') {
      this.tInfo.setTypeSelections(this.typeSels);
    }
    else {
      this.fS.filterTreks(true);
    }
    this.fS.filterMode = '';
  }

  // update the title of the header
  setTitleParam = () => {
    this.props.navigation.setParams({title: this.fS.formatTitleMessage('Filter:')});
  }

  // reset the trek type selections to what they were when component was mounted
  resetTypeSels = () => {
    this.fS.setTypeSels(this.typeSels);
  }

  openRadioPicker = () => {
    let names = TIME_FRAMES.map((item) => item.name);
    let values = TIME_FRAMES.map((item) => item.value);

    let selNames = names.concat(['Dates']);
    let selValues = values.concat(['Custom']);

    this.props.modalSvc.openRadioPicker({heading: 'Select A Timeframe', selectionNames: selNames,
                              selectionValues: selValues, selection: this.tInfo.timeframe})
    .then((newTimeframe) => {
      this.fS.setTimeframe(newTimeframe);
    })
    .catch(() =>{ 
    })
  }


  @action
  resetFilter = (fName: string) => {
    requestAnimationFrame(() => {          // allow for ink ripple animation
      switch(fName){
        case 'Date':
          this.fS.setTimeframe(this.origFilter.timeframe, false)
        break;
        case 'Dist':
          this.fS.resetDistFilter(false);
        break;
        case 'Time':
          this.fS.resetTimeFilter(false);
        break;
        case 'Speed':
          this.fS.resetSpeedFilter(false);
        break;
        case 'Cals':
          this.fS.resetCalsFilter(false);
        break;
        case 'Steps':
          this.fS.resetStepsFilter(false);
        break;
      }
      if(this.fS.filterMode === 'Dashboard') { this.tInfo.setTypeSelections(ALL_SELECT_BITS); }
      this.fS.filterTreks();
    })
  }
  
  render() {

    const { cardLayout, navItem, navIcon } = this.props.uiTheme;
    const { highTextColor, pageBackground, secondaryColor, trekLogBlue, listIconColor,
            primaryColor,
             } = this.props.uiTheme.palette;
    const cardHeight = 100;
    const settingIconSize = 24;
    const resetIconColor = secondaryColor;
    const timeframeSelectIconSize = 22;
    const timeframeSelectButtonSize = 34;
    const timeframeChanged = 
                        (this.tInfo.timeframe !== this.origFilter.timeframe) ||
                        (this.origFilter.dateMax !== this.fS.dateMax || this.origFilter.dateMin !== this.fS.dateMin);

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 35,
      },
      cardCustom: {
        minHeight: cardHeight,
        borderBottomWidth: 1,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 10,
        paddingBottom: 5,
      },
      labelText: {
        color: highTextColor,
        marginLeft: 5,
        marginTop: -5,
        fontSize: 16,
      },
      titleText: {
        color: primaryColor,
        fontSize: 16
      },
      toText: {
        marginRight: 5,
        fontSize: 16,
        color: highTextColor
      },
      textInputItem: {
        height: 40,
        width: 200,
        borderWidth: 0,
        color: highTextColor,
        fontWeight: "300",
        fontSize: 18,
        marginRight: 5,
        marginTop: -10,
      },      
      inputTextStyle: {
        fontWeight: "300",
        color: trekLogBlue,
        fontSize: 18,
      },
      pickInputItem: {
        height: 40,
        width: 150,
        color: trekLogBlue,
        borderWidth: 0,
        marginRight: 0,
        marginLeft: 5,
      },      
      dateInputArea: {
        height: 30,
        // width: 105,
        marginTop: -10,
      },
      dateInputText: {
        fontWeight: "300",
        color: trekLogBlue,
        fontSize: 18,
      },
      numberInput: {
        width: 75,
      },
      mr10: {
        marginRight: 10
      },
      resetIconArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end"
      },
      resetIcon: {
        width: 40,
        height: 30,
      },
      resetIconLabel: {
        marginTop: -3,
        fontSize: 12,
      },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      pageTitle: {
        fontSize: 20,
        color: highTextColor,
        fontWeight: "bold",
      },
      settingIcon: {
        width: settingIconSize,
        height: settingIconSize,
        marginRight: 6,
        backgroundColor: "transparent"
      },
      timeframeSelectButtonStyle: {
        minHeight: timeframeSelectButtonSize,
        minWidth: timeframeSelectButtonSize,
        borderRadius: timeframeSelectButtonSize / 2,
        padding: 5,
      }
  })

    return(
        <View style={styles.container}>
          <View style={[cardLayout, {paddingBottom: 0}]}>
            <Text style={styles.pageTitle}>Filter Settings</Text>
          </View>
          <ScrollView>
            {this.fS.filterMode !== 'Dashboard' &&
              <View style={[cardLayout, styles.cardCustom, {paddingTop: 10, height: cardHeight + 30}]}>
                <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Types</Text>
                </View>
                <View style={styles.rowStart}>
                  <SvgIcon
                    style={styles.settingIcon}
                    size={settingIconSize}
                    paths={APP_ICONS['BulletedList']}
                    fill={listIconColor}
                  />
                  <Text style={styles.labelText}>Show treks of type(s): </Text>
                  <View style={styles.resetIconArea}>
                    <IconButton
                      icon="History"
                      disabled={this.tInfo.typeSelections ===  this.origFilter.typeSels}
                      color={resetIconColor}
                      onPressFn={this.resetTypeSels}
                      onPressArg={true}
                      style={styles.resetIcon}
                    />
                  </View>
                </View>
                  <TrekTypeSelect
                    size={50}
                    selected={this.tInfo.typeSelections}
                    onChangeFn={this.fS.setType}
                  />
              </View>           
            }
            <View style={[cardLayout, styles.cardCustom, {paddingTop: 10, paddingBottom: 0}]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Dates</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['CalendarRange']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks from:</Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={!timeframeChanged}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Date'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
                <View style={[styles.rowLayout, {marginTop: -12, marginBottom: 5, marginLeft: 80}]}>
                <Text style={{color: highTextColor, fontSize: 18, width: 150}}>
                      {TIME_FRAME_DISPLAY_NAMES[this.tInfo.timeframe]}</Text>
                    <IconButton 
                      iconSize={timeframeSelectIconSize}
                      icon="CalendarEdit"
                      style={[navItem, styles.timeframeSelectButtonStyle]}
                      buttonSize={timeframeSelectButtonSize}
                      raised
                      iconStyle={navIcon}
                      color={secondaryColor}
                      onPressFn={this.openRadioPicker}
                    />
                </View>
              <View style={[styles.rowLayout]}>
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={this.fS.getDateMin}
                >
                  <View style={[styles.rowStart, styles.dateInputArea]}>
                    <Text style={styles.dateInputText}>
                    {this.fS.dateMin === '' ? this.fS.dateDefMin : this.fS.dateMin}</Text>
                  </View>
                </TouchableNativeFeedback>
                <Text style={[styles.toText, {marginTop: -6, marginLeft: 5}]}> - </Text>
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={this.fS.getDateMax}
                >
                  <View style={[styles.rowStart, styles.dateInputArea]}>
                    <Text style={styles.dateInputText}>
                    {this.fS.dateMax === '' ? this.fS.dateDefMax : this.fS.dateMax}</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>  
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Distance</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['CompassMath']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks with distances of: </Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={(this.fS.distMax === '' && this.fS.distMin === '')}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Dist'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
              <View style={styles.rowLayout}>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('distMin', text)}
                  placeholderValue={this.fS.distMin !== '' ? this.fS.distMin : this.fS.distDefMin}
                />
                <Text style={styles.toText}> to </Text>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('distMax', text)}
                  placeholderValue={this.fS.distMax !== '' ? this.fS.distMax : this.fS.distDefMax}
                />
                <Text style={styles.toText}> {this.tInfo.distUnits()}.</Text>
              </View>
            </View>           
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Duration</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['TimerSand']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks with durations of: </Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={(this.fS.timeMax === '' && this.fS.timeMin === '')}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Time'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
              <View style={styles.rowLayout}>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('timeMin', text)}
                  placeholderValue={this.fS.timeMin ? this.fS.timeMin : this.fS.timeDefMin}
                />
                <Text style={styles.toText}> to </Text>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('timeMax', text)}
                  placeholderValue={this.fS.timeMax ? this.fS.timeMax : this.fS.timeDefMax}
                />
                <Text style={styles.toText}> minutes.</Text>
              </View>
            </View>           
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Speed</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['Speedometer']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks with average speeds of: </Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={(this.fS.speedMax === '' && this.fS.speedMin === '')}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Speed'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
              <View style={styles.rowLayout}>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('speedMin', text)}
                  placeholderValue={this.fS.speedMin ? this.fS.speedMin : this.fS.speedDefMin}
                />
                <Text style={styles.toText}> to </Text>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('speedMax', text)}
                  placeholderValue={this.fS.speedMax ? this.fS.speedMax : this.fS.speedDefMax}
                />
                <Text style={styles.toText}> {this.tInfo.speedUnits()}.</Text>
              </View>
            </View>           
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Calories</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['Fire']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks with calories burned of: </Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={(this.fS.calsMax === '' && this.fS.calsMin === '')}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Cals'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
              <View style={styles.rowLayout}>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('calsMin', text)}
                  placeholderValue={this.fS.calsMin ? this.fS.calsMin : this.fS.calsDefMin}
                />
                <Text style={styles.toText}> to </Text>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('calsMax', text)}
                  placeholderValue={this.fS.calsMax ? this.fS.calsMax : this.fS.calsDefMax}
                />
              </View>
            </View> 
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.rowStart}>
                  <Text style={styles.titleText}>Steps</Text>
              </View>
              <View style={styles.rowStart}>
                <SvgIcon
                  style={styles.settingIcon}
                  size={settingIconSize}
                  paths={APP_ICONS['Walk']}
                  fill={listIconColor}
                />
                <Text style={styles.labelText}>Show treks with steps/revs of: </Text>
                <View style={styles.resetIconArea}>
                  <IconButton
                    icon="History"
                    disabled={(this.fS.stepsMax === '' && this.fS.stepsMin === '')}
                    color={resetIconColor}
                    onPressFn={this.resetFilter}
                    onPressArg={'Steps'}
                    style={styles.resetIcon}
                  />
                </View>
              </View>
              <View style={styles.rowLayout}>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('stepsMin', text)}
                  placeholderValue={this.fS.stepsMin ? this.fS.stepsMin : this.fS.stepsDefMin}
                />
                <Text style={styles.toText}> to </Text>
                <TextInputField
                  style={[styles.textInputItem, styles.numberInput]}
                  onChangeFn={(text) => this.fS.setFilterItem('stepsMax', text)}
                  placeholderValue={this.fS.stepsMax ? this.fS.stepsMax : this.fS.stepsDefMax}
                />
              </View>
            </View> 
          </ScrollView>
        </View>    
    )
  }
  
}
export default ExtraFilters;