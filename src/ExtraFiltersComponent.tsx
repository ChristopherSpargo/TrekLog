import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { observer, inject } from 'mobx-react'
import { observable, action } from 'mobx';
import { NavigationActions } from 'react-navigation';

import { FilterSvc, FilterSettingsObj, FILTERMODE_DASHBOARD, FILTERMODE_FROM_STATS } from './FilterService'
import { TrekInfo, ALL_SELECT_BITS } from './TrekInfoModel'
import { UtilsSvc, TIME_FRAMES, TIME_FRAME_DISPLAY_NAMES,
         TimeFrameType } from './UtilsService';
import IconButton from './IconButtonComponent';
import TrekTypeSelect from './TrekTypeSelectComponent';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import TextInputField from './TextInputFieldComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import { ModalModel } from './ModalModel';
import RadioPicker from './RadioPickerComponent';
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';
import PageTitle from './PageTitleComponent';

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

  @observable radioPickerOpen;
  @observable openItems;
  @observable headerTitle;

  tInfo = this.props.trekInfo;
  uSvc = this.props.utilsSvc;
  fS = this.props.filterSvc;
  AFFIndex: number;
  typeSels = 0;
  origFilter : FilterSettingsObj;
  updateDshBrd = '';

  activeNav : string = '';

  componentWillMount() {
    this.origFilter = this.props.navigation.getParam('existingFilter');
    this.updateDshBrd = this.tInfo.updateDashboard;
    this.typeSels = this.tInfo.typeSelections;
    this.setRadioPickerOpen(false);
    this.setOpenItems(false);
    this.setHeaderTitle(this.props.navigation.getParam('title', ''))
  }

  componentDidMount() {
    this.AFFIndex = this.fS.setAfterFilterFn(this.setTitleParam);
    requestAnimationFrame(() => {
      this.setOpenItems(true);
    })
  }

  componentWillUnmount() {
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.tInfo.updateDashboard = this.updateDshBrd;
    if (this.fS.filterMode !== FILTERMODE_DASHBOARD) {
      this.fS.buildAfterFilter();
    }
    this.fS.filterMode = '';
  }

  // Set the title in the header
  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  };

  // update the title of the header
  setTitleParam = () => {
    this.setHeaderTitle(this.fS.formatTitleMessage('Filter:'));
  }

  // set the open status of the radioPicker component
  @action
  setRadioPickerOpen = (status: boolean) => {
    this.radioPickerOpen = status;
  }

  // allow the animation for the items list to start
  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // reset the trek type selections to what they were when component was mounted
  resetTypeSels = () => {
    this.fS.setTypeSels(this.typeSels);
  }

  callGetDateMin = () => {
    this.fS.getDateMin()
    .then(() => {})
    .catch(() => {
    })
  }

  callGetDateMax = () => {
    this.fS.getDateMax()
    .then(() => {
    })
    .catch(() => {})
  }
  
  openRadioPicker = () => {
    let selNames = TIME_FRAMES.map((item) => 
          this.uSvc.formatTimeframeDisplayName(item.value as TimeFrameType))
    let selValues = TIME_FRAMES.map((item) => item.value);

    this.props.modalSvc.openRadioPicker({heading: 'Select A Timeframe', selectionNames: selNames,
                              selectionValues: selValues, selection: this.tInfo.timeframe,
                              openFn: this.setRadioPickerOpen})
    .then((newTimeframe) => {
      this.fS.setTimeframe(newTimeframe);
      this.fS.buildAfterFilter();
    })
    .catch(() =>{ 
    })
  }

  @action
  resetFilter = (fName: string) => {
    if(this.fS.filterMode === FILTERMODE_DASHBOARD) { 
      this.tInfo.setTypeSelections(ALL_SELECT_BITS); 
    }
    switch(fName){
      case 'Date':
        this.fS.setTimeframe(this.origFilter.timeframe)
      break;
      case 'Dist':
        this.fS.resetDistFilter();
      break;
      case 'Time':
        this.fS.resetTimeFilter();
      break;
      case 'Speed':
        this.fS.resetSpeedFilter();
      break;
      case 'Cals':
        this.fS.resetCalsFilter();
      break;
      case 'Steps':
        this.fS.resetStepsFilter();
      break;
    }
    if (fName !== 'Date') {
      this.fS.filterTreks();
      this.fS.runAfterFilterFns();
    }
  }
  
  render() {

    const { cardLayout, navItem, navIcon, fontRegular,
            formTextInput, formNumberInput } = this.props.uiTheme;
    const { highTextColor, pageBackground, secondaryColor, trekLogBlue, listIconColor,
            primaryColor, dividerColor, rippleColor, navItemBorderColor, mediumTextColor
             } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const cardHeight = 130;
    const settingIconSize = 24;
    const resetIconColor = secondaryColor;
    const timeframeSelectIconSize = 26;
    const timeframeSelectButtonSize = 40;
    const resetButtonSize = 30;
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
        borderColor: dividerColor,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 10,
        paddingBottom: 15,
      },
      labelText: {
        fontFamily: fontRegular,
        color: mediumTextColor,
        marginLeft: 5,
        marginTop: -5,
        fontSize: 18,
      },
      titleText: {
        fontFamily: fontRegular,
        color: primaryColor,
        fontSize: 20
      },
      toText: {
        marginRight: 5,
        fontFamily: fontRegular,
        fontSize: 18,
        color: mediumTextColor
      },
      textInputItem: {
        ...formTextInput,
        ...formNumberInput,
        marginRight: 5,
      },      
      inputTextStyle: {
        fontFamily: fontRegular,
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
        marginTop: -10,
      },
      dateInputText: {
        fontFamily: fontRegular,
        color: trekLogBlue,
        fontSize: 22,
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
        width: resetButtonSize,
        height: resetButtonSize,
        borderRadius: resetButtonSize/2,
      },
      resetIconLabel: {
        marginTop: -3,
        fontFamily: fontRegular,
        fontSize: 14,
      },
      rowStart: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      },
      settingIcon: {
        width: settingIconSize,
        height: settingIconSize,
        marginRight: 6,
        backgroundColor: "transparent"
      },
      timeFrameName:{
        fontSize: 22,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      timeframeSelectButtonStyle: {
        height: timeframeSelectButtonSize,
        width: timeframeSelectButtonSize,
        borderRadius: timeframeSelectButtonSize / 2,
      }
  })

    return(
        <View style={styles.container}>
          <TrekLogHeader
            titleText={this.headerTitle}
            icon="*"
            backButtonFn={() => this.props.navigation.dispatch(goBack)}
          />
          <RadioPicker pickerOpen={this.radioPickerOpen}/>
          <View style={[cardLayout, {paddingBottom: 0}]}>
            <PageTitle titleText="Filter Settings" style={{paddingLeft: 0}}
                       colorTheme={this.tInfo.colorTheme}/>
          </View>
          <ScrollView>
            {this.fS.filterMode !== FILTERMODE_DASHBOARD &&
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-140} endValue={0} open={this.openItems} 
                                duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom, {paddingTop: 10, minHeight: 140}]}>
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
                        size={40}
                        selected={this.tInfo.typeSelections}
                        onChangeFn={this.fS.setType}
                      />
                  </View>    
                </SlideDownView>
              </FadeInView>       
            }
            {this.fS.filterMode !== FILTERMODE_DASHBOARD && 
             this.fS.filterMode !== FILTERMODE_FROM_STATS &&
              <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                <SlideDownView startValue={-140} endValue={0} open={this.openItems} 
                                duration={SCROLL_DOWN_DURATION}>
                  <View style={[cardLayout, styles.cardCustom, {paddingTop: 10, minHeight: 140}]}>
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
                    <View style={[styles.rowLayout, {marginTop: -12, marginLeft: 80}]}>
                      <RectButton
                        rippleColor={rippleColor}
                        onPress={this.openRadioPicker}
                      >
                        <Text style={styles.timeFrameName}>{TIME_FRAME_DISPLAY_NAMES[this.tInfo.timeframe]}</Text>
                      </RectButton>
                      <IconButton 
                        iconSize={timeframeSelectIconSize}
                        icon="CalendarEdit"
                        style={{...navItem, ...styles.timeframeSelectButtonStyle}}
                        borderColor={navItemBorderColor}
                        raised
                        iconStyle={navIcon}
                        color={secondaryColor}
                        onPressFn={this.openRadioPicker}
                      />
                    </View>
                    <View style={[styles.rowLayout]}>
                      <RectButton
                        rippleColor={rippleColor}
                        onPress={this.callGetDateMin}
                      >
                        <View style={[styles.rowStart, styles.dateInputArea]}>
                          <Text style={styles.dateInputText}>
                          {this.fS.dateMin}</Text>
                        </View>
                      </RectButton>
                      <Text style={[styles.toText, {marginTop: -8, marginLeft: 5}]}> - </Text>
                      <RectButton
                        rippleColor={rippleColor}
                        onPress={this.callGetDateMax}
                      >
                        <View style={[styles.rowStart, styles.dateInputArea]}>
                          <Text style={styles.dateInputText}>
                          {this.fS.dateMax}</Text>
                        </View>
                      </RectButton>
                    </View>
                  </View>  
                </SlideDownView>
              </FadeInView>     
            }  
            <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
              <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION}>
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
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('distMin', text)}
                      placeholderValue={this.fS.distMin !== '' ? this.fS.distMin : this.fS.distDefMin}
                      pvDisplayOnly={this.fS.distMin === ''}
                    />
                    <Text style={styles.toText}> to </Text>
                    <TextInputField
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('distMax', text)}
                      placeholderValue={this.fS.distMax !== '' ? this.fS.distMax : this.fS.distDefMax}
                      pvDisplayOnly={this.fS.distMax === ''}
                    />
                    <Text style={styles.toText}> {this.tInfo.distUnits()}.</Text>
                  </View>
                </View>           
              </SlideDownView>
            </FadeInView>       
            <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
              <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION}>
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
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('timeMin', text)}
                      placeholderValue={this.fS.timeMin ? this.fS.timeMin : this.fS.timeDefMin}
                      pvDisplayOnly={this.fS.timeMin === ''}
                    />
                    <Text style={styles.toText}> to </Text>
                    <TextInputField
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('timeMax', text)}
                      placeholderValue={this.fS.timeMax ? this.fS.timeMax : this.fS.timeDefMax}
                      pvDisplayOnly={this.fS.timeMax === ''}
                    />
                    <Text style={styles.toText}> minutes.</Text>
                  </View>
                </View>           
              </SlideDownView>
            </FadeInView>       
            <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
              <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION}>
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
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('speedMin', text)}
                      placeholderValue={this.fS.speedMin ? this.fS.speedMin : this.fS.speedDefMin}
                      pvDisplayOnly={this.fS.speedMin === ''}
                    />
                    <Text style={styles.toText}> to </Text>
                    <TextInputField
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('speedMax', text)}
                      placeholderValue={this.fS.speedMax ? this.fS.speedMax : this.fS.speedDefMax}
                      pvDisplayOnly={this.fS.speedMax === ''}
                    />
                    <Text style={styles.toText}> {this.tInfo.speedUnits()}.</Text>
                  </View>
                </View>           
                </SlideDownView>
            </FadeInView>       
            <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
              <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION}>
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
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('calsMin', text)}
                    placeholderValue={this.fS.calsMin ? this.fS.calsMin : this.fS.calsDefMin}
                    pvDisplayOnly={this.fS.calsMin === ''}
                  />
                  <Text style={styles.toText}> to </Text>
                  <TextInputField
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('calsMax', text)}
                    placeholderValue={this.fS.calsMax ? this.fS.calsMax : this.fS.calsDefMax}
                    pvDisplayOnly={this.fS.calsMax === ''}
                  />
                </View>
              </View> 
              </SlideDownView>
            </FadeInView>       
            <FadeInView startValue={0.1} endValue={1} open={this.openItems} 
                        duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
              <SlideDownView startValue={-130} endValue={0} open={this.openItems} 
                              duration={SCROLL_DOWN_DURATION}>
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
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('stepsMin', text)}
                    placeholderValue={this.fS.stepsMin ? this.fS.stepsMin : this.fS.stepsDefMin}
                    pvDisplayOnly={this.fS.stepsMin === ''}
                  />
                  <Text style={styles.toText}> to </Text>
                  <TextInputField
                      style={styles.textInputItem}
                      onChangeFn={(text) => this.fS.setFilterItem('stepsMax', text)}
                    placeholderValue={this.fS.stepsMax ? this.fS.stepsMax : this.fS.stepsDefMax}
                    pvDisplayOnly={this.fS.stepsMax === ''}
                  />
                </View>
              </View> 
              </SlideDownView>
            </FadeInView>       
          </ScrollView>
        </View>    
    )
  }
  
}
export default ExtraFilters;