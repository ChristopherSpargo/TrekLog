import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { View, StyleSheet, Text, Keyboard } from 'react-native';

import { APP_ICONS } from './SvgImages';
import RadioGroup from './RadioGroupComponent';
import SlideUpView from './SlideUpComponent';
import { CONTROLS_HEIGHT } from './App';
import SvgIcon from './SvgIconComponent';
import { TrekInfo } from './TrekInfoModel';
import TextInputField from './TextInputFieldComponent';
import TimeInput from './TimeInputComponent';
import { Course } from './CourseService';

export type CourseTrackingMethod = 'courseTime' | 'bestTime' | 'timeLimit' | 'avgSpeed' | 'avgRate';

// dialog used for single value string input

@inject('uiTheme', 'trekInfo')
@observer
class TrackingMethodForm extends React.Component<{   
  open         : boolean,    // true if component is open
  done        ?: string,    // 'Close' if call close function, 'Dismiss' if call dismiss function
  method      ?: CourseTrackingMethod,
  value       ?: number,
  course      ?: Course,    // Course for selected course
  onChangeFn  ?: Function,  // function to call on input changes
  closeFn     ?: Function,  // function to call on finish
  uiTheme     ?: any,
  trekInfo    ?: TrekInfo,
}, {} > {

  @observable value;
  @observable method : CourseTrackingMethod;
  @observable zValue;

  done = '';
  closeCount = 0;
  trackingMethods = ['courseTime', 'bestTime', 'timeLimit', 'avgSpeed', 'avgRate'];
  trackingMethodsLabels = [
    '.vs. standard time for course', 
    '.vs. best time for course', 
    '.vs. specific finish time', 
    '.vs. specific average speed', 
    '.vs. specific average pace'
  ];

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentDidUpdate() {
    if (this.props.method && (this.trackingMethods.indexOf(this.method) === -1)){
      this.setMethod(this.props.method);
    }
    if (this.props.done !== this.done){
      this.done = this.props.done;
      switch(this.done){
        case 'Dismiss':
          this.dismiss();
          break;
        case 'Close':
          this.close();
          break;
        case 'Keyboard':
          Keyboard.dismiss();
          break;
        default:
      }
    }
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.value = '';
    this.method = '' as CourseTrackingMethod;
    this.zValue = -1;
  }

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  }

  setVisible = () => {
    this.setZValue(9);
  }

  setNotVisible = () => {
    this.setZValue(-1);
  }

  @action
  setValue = (val: string) => {
      this.value = val;
  }

  setValueInput = () => {
    let v = parseFloat(this.value);
    this.props.onChangeFn({value: v, method: this.method});
  }

  @action
  setMethod = (val: CourseTrackingMethod) => {
    this.method = val;
    this.setValue(''); 
    switch(val){
      case 'courseTime':
        this.setValue(this.props.course.definingEffort.subject.duration.toString());
        break;
      case 'bestTime':
        this.setValue(this.props.course.bestEffort.subject.duration.toString());
        break;
      default:
    }
  }

  setMethodInput = (val: CourseTrackingMethod) => {
    this.setMethod(val);
    // this.setValueInput();
  }
  
    // call the close method, indicate OK
  close = () => {
      if (this.value === '') { 
        this.setValue('0');
      }
      this.setValueInput();
      Keyboard.dismiss();
      this.props.closeFn(true);
      this.setMethod('courseTime');
  }

  // call the close method, indicate CANCEL
  dismiss = () => {
      Keyboard.dismiss();
      this.props.closeFn(false);
      this.setValue('');
  }

  render() {

    const { highTextColor, dividerColor, headerBackgroundColor, textOnPrimaryColor,
            pageBackground } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { cardLayout, roundedTop } = this.props.uiTheme;
    const formHt = 330 + CONTROLS_HEIGHT;
    const cTime = this.method === 'courseTime';
    const bTime = this.method === 'bestTime';

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      formArea: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: this.zValue,
      },
      cardCustom: {
        marginTop: 0,
        marginBottom:0,
        elevation: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        borderBottomWidth: 0,
        minHeight: formHt,
        backgroundColor: pageBackground,
      },
      header: {
        paddingLeft: 10,
        flexDirection: "row",
        alignItems: "center",
        height: 40,
        borderStyle: "solid",
        borderBottomColor: dividerColor,
        borderBottomWidth: 1,
        backgroundColor: headerBackgroundColor,
      },
      title: {
        color: textOnPrimaryColor,
        fontSize: 18,
      },
      body: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 8,
        paddingBottom: 15,
        marginLeft: 15,
        marginRight: 15,

      },
      bodyText: {
        fontSize: 16,
        color: highTextColor,
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      textInputItem: {
        height: 40,
        width: 75,
        borderWidth: 0,
        fontWeight: "300",
        fontSize: 18,
        color: highTextColor,
      },      
      labelText: {
        color: highTextColor,
        fontSize: 18,
        marginBottom: 5,
        marginLeft: 20,
      },
      inputVal: {
        marginTop: 10,
        alignSelf: "center",
        marginBottom: 10,
      },
      rgItem: {
        paddingTop: 10,
        backgroundColor: pageBackground,
        paddingRight: 0,
        paddingLeft: 0,
        marginLeft: 20,
      },
      rgLabel: {
        color: highTextColor,
        fontSize: 18,
        paddingLeft: 10,
      },
      rateUnits: {
        fontSize: 16,
        marginLeft: 15,
        color: highTextColor,
      }
    })

    return (
      <View style={styles.container}>
          <View style={styles.formArea}>
            <SlideUpView
              startValue={formHt}
              endValue={0}
              bgColor="transparent"
              open={this.props.open}
              beforeOpenFn={this.setVisible}
              afterCloseFn={this.setNotVisible}
              >
              <View style={[cardLayout, styles.cardCustom, roundedTop]}>
                <View style={[styles.header, roundedTop]}>
                  <SvgIcon 
                    style={{marginRight: 4, backgroundColor: 'transparent'}}
                    size={24}
                    widthAdj={0}
                    fill={textOnPrimaryColor}
                    paths={APP_ICONS.Course}
                  />
                  <Text style={styles.title}>Course Challenge Method</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.labelText}>{'Challenge ' + this.props.course.name + ' Course:'}</Text>
                    <RadioGroup 
                      onChangeFn={this.setMethodInput}
                      selected={this.method}
                      values={this.trackingMethods}
                      itemStyle={styles.rgItem}
                      labels={this.trackingMethodsLabels}
                      labelStyle={styles.rgLabel}
                      vertical
                      inline
                      align="start"
                      itemHeight={40}
                      radioFirst
                    />
                    {(cTime || bTime) &&
                      <View style={styles.inputVal}>
                        <TimeInput
                          timeVal={this.value}
                        />
                      </View>
                    }
                    {this.method === 'timeLimit' &&
                      <View style={styles.inputVal}>
                        <TimeInput
                          onChangeFn={this.setValue}
                          timeVal={this.value}
                        />
                      </View>
                    }
                    {this.method === 'avgSpeed' &&
                      <View style={[styles.rowLayout, styles.inputVal]}>
                        <View style={[styles.textInputItem]}>
                          <TextInputField
                            onChangeFn={this.setValue}
                            placeholderValue={this.value}
                          />
                        </View>
                        <Text style={styles.rateUnits}>{this.props.trekInfo.speedUnits()}</Text>
                      </View>
                    }
                    {(this.method === 'avgRate') &&
                      <View style={[styles.rowLayout, styles.inputVal]}>
                        <TimeInput
                            onChangeFn={this.setValue}
                            timeVal={this.value}
                        />
                        <Text style={styles.rateUnits}>{'/' + this.props.trekInfo.distUnits()}</Text>
                      </View>
                    }
                </View>
              </View>
            </SlideUpView>
          </View>
      </View>
    )
  }
}

export default TrackingMethodForm;
