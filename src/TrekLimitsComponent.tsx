import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { View, StyleSheet, Text, TextInput, Keyboard } from 'react-native';

import { APP_ICONS } from './SvgImages';
import RadioGroup from './RadioGroupComponent';
import SlideUpView from './SlideUpComponent';
import { CONTROLS_HEIGHT } from './App';
import SvgIcon from './SvgIconComponent';
import { TrekInfo } from './TrekInfoModel';

export interface LimitsObj {
  headingIcon   ?: string,    // icon for the header
  heading       ?: string,    // text for the header
  label         ?: string,    // label for the input field
  placeholderValue ?: string,  // default value
  onChangeFn    ?: Function,  // function to call on input changes
  closeFn       ?: Function,  // function to call on finish
  units         ?: string[],  // array of labels for unit radio buttons
  defaultUnits  ?: string,    // default (last) value for units selection
  unitsVertical ?: boolean,   // layout units radio buttons vertically
}


// dialog used for single value string input

@inject('uiTheme', 'trekInfo')
@observer
class TrekLimitsForm extends React.Component<{   
  open        : boolean,    // true if component is open
  done       ?: string,    // 'Close' if call close function, 'Dismiss' if call dismiss function
  limits      : LimitsObj,  // object with limits form config info
  uiTheme     ?: any,
  trekInfo    ?: TrekInfo,
}, {} > {

  @observable value;
  @observable units;
  @observable zValue;

  done = '';
  closeCount = 0;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentDidUpdate() {
    if (this.props.limits.units && (this.props.limits.units.indexOf(this.units) === -1)){
      this.setUnits(this.props.limits.defaultUnits);
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
    this.units = '';
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
    this.props.limits.onChangeFn({value: v, units: this.units});
  }

  @action
  setUnits = (val: string) => {
    this.units = val;
    this.setValue(this.value);      // in case units changed to SAVED_UNITS
  }

  setUnitsInput = (val: string) => {
    this.setUnits(val);
    this.setValueInput();
  }
  
    // call the close method, indicate OK
  close = () => {
      if (this.value === '') { 
        this.setValue(this.props.limits.placeholderValue);
      }
      this.setValueInput();
      Keyboard.dismiss();
      this.props.limits.closeFn(true);
      this.setValue('');
  }

  // call the close method, indicate CANCEL
  dismiss = () => {
      Keyboard.dismiss();
      this.props.limits.closeFn(false);
      this.setValue('');
  }

  render() {

    const { highTextColor, dividerColor, mediumTextColor, headerBackgroundColor, textOnPrimaryColor,
            pageBackground, disabledTextColor } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { cardLayout, roundedTop } = this.props.uiTheme;
    const pHolder = this.props.limits.placeholderValue;
    const formHt = 165 + CONTROLS_HEIGHT;

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
        fontSize: 18
      },
      body: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        minHeight: 100,
      },
      bodyText: {
        fontSize: 16,
        color: highTextColor,
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      colLayout: {
        flexDirection: "column",
        alignItems: "center",
      },
      textInputItem: {
        height: 40,
        width: 200,
        borderWidth: 0,
        fontWeight: "300",
        // textAlign: "center",
        fontSize: 18,
        color: highTextColor,
      },      
      numberInput: {
        width: 75,
      },
      labelText: {
        color: highTextColor,
        fontSize: 18
      },
    })

    return (
      <View style={styles.container}>
          <View style={styles.formArea}>
            <SlideUpView
              startValue={250}
              endValue={0}
              bgColor="transparent"
              open={this.props.open}
              beforeOpenFn={this.setVisible}
              afterCloseFn={this.setNotVisible}
              >
              <View style={[cardLayout, styles.cardCustom, roundedTop]}>
                <View style={[styles.header, roundedTop]}>
                  {this.props.limits.headingIcon &&
                    <SvgIcon 
                      style={{marginRight: 4, backgroundColor: 'transparent'}}
                      size={24}
                      widthAdj={0}
                      fill={textOnPrimaryColor}
                      paths={APP_ICONS[this.props.limits.headingIcon]}
                    />
                  }
                  <Text style={styles.title}>{this.props.limits.heading}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.labelText}>{this.props.limits.label}</Text>
                    <View style={this.props.limits.unitsVertical ? styles.rowLayout : styles.colLayout}>
                      <TextInput
                          style={[styles.textInputItem, styles.numberInput]}
                          onChangeText={(text) => this.setValue(text)}
                          placeholderTextColor={disabledTextColor}
                          placeholder={pHolder}
                          value={this.value}
                          underlineColorAndroid={mediumTextColor}
                          keyboardType="numeric"
                      /> 
                      {(this.props.limits.units !== undefined) &&
                        <RadioGroup 
                          onChangeFn={this.setUnitsInput}
                          selected={this.units}
                          values={this.props.limits.units}
                          labels={this.props.limits.units}
                          labelStyle={{color: highTextColor, fontSize: 18}}
                          vertical={this.props.limits.unitsVertical}
                          inline
                          itemHeight={30}
                          radioFirst
                        />
                      }
                    </View>
                </View>
              </View>
            </SlideUpView>
          </View>
      </View>
    )
  }
}

export default TrekLimitsForm;
