import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Keyboard, BackHandler } from 'react-native';
import { RectButton } from 'react-native-gesture-handler'

import { APP_ICONS } from './SvgImages';
import RadioGroup from './RadioGroupComponent';
import SlideUpView from './SlideUpComponent';
import { 
  UiThemeContext,
  LIMITS_FORM_Z_INDEX,
  INVISIBLE_Z_INDEX,
  FORMHEADER_HEIGHT,
  FOOTER_HEIGHT,
  MainSvcContext,
 } from './App';
import SvgIcon from './SvgIconComponent';
import TextInputField from './TextInputFieldComponent';
import TimeInput from './TimeInputComponent';
import { MainSvc } from "./MainSvc";

export type CourseTrackingMethod = 'courseTime' | 'lastTime' | 'bestTime' | 'otherEffort' |
                        'timeLimit' | 'avgSpeed' | 'avgRate';

// dialog used for single value string input

function TrackingMethodForm({
  open       = undefined,     // true if component is open
  inMethod   = undefined, 
  inValue    = undefined, 
  header     = undefined,     // text for header
  title      = undefined,     // text for title
  icon       = undefined,     // icon to display in header
  course     = undefined,     // Course for selected course
  trek       = undefined,     // sortDate and group of focus trek (selected in Course Details)
  onChangeFn = undefined,     // function to call on input changes
  }) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const [value, setValue] = useState('');
  const [method, setMethod] = useState();
  const [zValue, setZValue] = useState(-1);

  const bHandler = useRef(false);

  const onBackButtonPressTMethods = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(open && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressTMethods); 
      bHandler.current = true;
    }
  },[open])

  useEffect(() => {                       // DidUpdate
    if (inMethod !== method) {
      if (inValue === undefined) {
        updateMethod(inMethod)
      } else {
        updateMethod(inMethod !== 'courseTime' ? 'challenge' : inMethod);
      }
    }
  },[inMethod])

  useEffect(() => {                       // DidUpdate
    if (inValue === undefined) {
      updateMethod(inMethod)
    } else {
      updateMethod(inMethod !== 'courseTime' ? 'challenge' : inMethod);
    }
  },[title])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressTMethods);
    bHandler.current = false;
  }

  const trackingMethods = ['challenge', 'courseTime', 'lastTime', 'bestTime', 'otherEffort', 
                           'timeLimit', 'avgSpeed', 'avgRate'];
  const trackingMethodsLabels = [
    'initial effort challenged',
    'standard time for course', 
    'last effort',
    'best effort',
    'other effort', 
    'specific finish time', 
    'specific average speed', 
    'specific average pace'
  ];

  function setVisible() {
    setZValue(LIMITS_FORM_Z_INDEX);
  }

  function setNotVisible() {
    setZValue(INVISIBLE_Z_INDEX);
  }

  function setValueInput(val: string) {
    let v = parseFloat(val);
    onChangeFn({value: v, method: method === 'challenge' ? inMethod : method});
  }

  function updateMethod(val: string) {
    setMethod(val);
    setValue(''); 
    switch(val){
      case 'challenge':
        setValue(inValue.toString());
        break;
      case 'courseTime':
        setValue(course.definingEffort.duration.toString());
        break;
      case 'lastTime':
        setValue(course.lastEffort.duration.toString());
        break;
      case 'bestTime':
        setValue(course.bestEffort.duration.toString());
        break;
      default:
    }
  }
  
  // call the close method, indicate OK
  function close() {
    let v = value;
      if (value === '') { 
        v = '0';
        setValue(v);
      }
      setValueInput(v);
      Keyboard.dismiss();
      removeListeners();
      mainSvc.limitsCloseFn(true);
  }

  // call the close method, indicate CANCEL
  function dismiss() {
      Keyboard.dismiss();
      removeListeners();
      mainSvc.limitsCloseFn(false);
  }


    const { highTextColor, dividerColor, textOnPrimaryColor,
            pageBackground, rippleColor, footerButtonText,
          } = uiTheme.palette[mainSvc.colorTheme];
    const { cardLayout, roundedTop, footer, footerButton,
            formHeader, formHeaderText, formBodyText, formTextInput, formNumberInput,
            fontRegular } = uiTheme;
    const headerHeight = FORMHEADER_HEIGHT;
    const footerHeight = FOOTER_HEIGHT;
    const radioItemHt = 40;
    const okTxt = 'CONTINUE';
    const canTxt = 'CANCEL';
    const cTime = method === 'courseTime';
    const bTime = method === 'bestTime';
    const lTime = method === 'lastTime';
    const challenge = method === 'challenge';
    const singleEffort = course.efforts.length === 1;

    let replayChoices = [];
    let replayLabels = [];
    trackingMethods.forEach((method, idx) => {
      switch(method){
        case 'challenge':
          if (inValue !== undefined && inMethod !== 'courseTime'){
            replayChoices.push(method);
            replayLabels.push(trackingMethodsLabels[idx])
          }
          break;
        case 'courseTime':
          if(trek === undefined || trek.date !== course.definingEffort.date || 
                                        trek.group !== course.definingEffort.group) {
            replayChoices.push(method);
            replayLabels.push(trackingMethodsLabels[idx])
          }
          break;
        case 'bestTime':
          if(trek === undefined || trek.date !== course.bestEffort.date || 
                                        trek.group !== course.bestEffort.group) {
            replayChoices.push(method);
            replayLabels.push(trackingMethodsLabels[idx])
          }
          break;
        case 'lastTime':
          if(trek === undefined || trek.date !== course.lastEffort.date || 
                                        trek.group !== course.lastEffort.group) {
            replayChoices.push(method);
            replayLabels.push(trackingMethodsLabels[idx])
          }
          break;
        case 'otherEffort':
          if(trek === undefined || singleEffort){
            break;
          }
        default:
          replayChoices.push(method);
          replayLabels.push(trackingMethodsLabels[idx])
      }
    })

    const bodyHeight = 118 + (replayChoices.length * radioItemHt);
    const formHt = headerHeight + bodyHeight + footerHeight;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      formArea: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: zValue,
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
        ...formHeader,
        borderBottomColor: dividerColor,
      },
      title: {
        ...formHeaderText,
        color: textOnPrimaryColor,
        marginLeft: 5,
      },
      body: {
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 8,
        paddingBottom: 10,
        marginLeft: 20,
        marginRight: 15,
      },
      bodyText: {
        ...formBodyText,
        color: highTextColor,
      },
      footer: {
        ...footer,
        ...{borderTopColor: dividerColor, backgroundColor: pageBackground}
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      textInputItem: {
        ...formTextInput,
        ...formNumberInput,
        color: highTextColor,
      },      
      labelText: {
        color: highTextColor,
        fontSize: 20,
        fontFamily: fontRegular,
        marginBottom: 10,
        marginLeft: 25,
      },
      inputVal: {
        marginTop: 10,
        height: 45,
        alignSelf: "center",
        marginBottom: 10,
      },
      rgItem: {
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: pageBackground,
        paddingRight: 0,
        paddingLeft: 0,
        marginLeft: 20,
      },
      rgLabel: {
        color: highTextColor,
        fontFamily: fontRegular,
        fontSize: 20,
        paddingLeft: 10,
        paddingRight: 10,
      },
      rateUnits: {
        fontFamily: fontRegular,
        fontSize: 18,
        marginLeft: 15,
        color: highTextColor,
      },
    })

    return (
      <View style={styles.container}>
          <View style={styles.formArea}>
            <SlideUpView
              startValue={formHt}
              endValue={0}
              bgColor="transparent"
              open={open}
              beforeOpenFn={setVisible}
              afterCloseFn={setNotVisible}
              >
              <View style={[cardLayout, styles.cardCustom, roundedTop]}>
                <View style={[styles.header, roundedTop]}>
                  <SvgIcon 
                    style={{marginRight: 4, backgroundColor: 'transparent'}}
                    size={24}
                    widthAdj={0}
                    fill={textOnPrimaryColor}
                    paths={APP_ICONS[icon]}
                  />
                  <Text style={styles.title}>{header}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.labelText}>{title}</Text>
                    <RadioGroup 
                      onChangeFn={updateMethod}
                      selected={method}
                      values={replayChoices}
                      itemStyle={styles.rgItem}
                      labels={replayLabels}
                      labelStyle={styles.rgLabel}
                      vertical
                      inline
                      align="start"
                      itemHeight={radioItemHt}
                      radioFirst
                    />
                    {(cTime || bTime || lTime || challenge) &&
                      <View style={styles.inputVal}>
                        <TimeInput
                          timeVal={value}
                        />
                      </View>
                    }
                    {method === 'timeLimit' &&
                      <View style={styles.inputVal}>
                        <TimeInput
                          onChangeFn={setValue}
                          timeVal={value}
                        />
                      </View>
                    }
                    {method === 'avgSpeed' &&
                      <View style={[styles.rowLayout, styles.inputVal]}>
                        <View style={[styles.textInputItem]}>
                          <TextInputField
                            onChangeFn={setValue}
                            placeholderValue={value}
                          />
                        </View>
                        <Text style={styles.rateUnits}>{mainSvc.speedUnits()}</Text>
                      </View>
                    }
                    {(method === 'avgRate') &&
                      <View style={[styles.rowLayout, styles.inputVal]}>
                        <TimeInput
                            onChangeFn={setValue}
                            timeVal={value}
                        />
                        <Text style={styles.rateUnits}>{'/' + mainSvc
                        .distUnits()}</Text>
                      </View>
                    }
                    {(method === 'otherEffort') &&
                      <View style={[styles.rowLayout, styles.inputVal]}>
                        <Text style={styles.labelText}>Press CONTINUE then select other effort.</Text>
                      </View>
                    }
                </View>
                <View style={[styles.footer]}>
                  <RectButton
                    rippleColor={rippleColor}
                    style={{flex: 1}}
                    onPress={dismiss}>
                    <View style={footerButton}>
                      <Text
                        style={footerButtonText}
                      >
                        {canTxt}
                      </Text>
                    </View>
                  </RectButton>
                  <RectButton
                    rippleColor={rippleColor}
                    style={{flex: 1}}
                    onPress={() => close()}>
                    <View style={footerButton}>
                      <Text
                        style={footerButtonText}
                      >
                        {okTxt}
                      </Text>
                    </View>
                  </RectButton>
                </View>
              </View>
            </SlideUpView>
          </View>
      </View>
    )
}

export default TrackingMethodForm;
