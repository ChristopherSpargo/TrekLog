import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useObserver } from "mobx-react-lite";
import { View, StyleSheet, Text, Keyboard, BackHandler } from 'react-native';
import { RectButton } from 'react-native-gesture-handler'

import { APP_ICONS } from './SvgImages';
import RadioGroup from './RadioGroupComponent';
import SlideUpView from './SlideUpComponent';
import TextInputField from './TextInputFieldComponent';
import { 
  UiThemeContext,
  TrekInfoContext,
  LIMITS_FORM_Z_INDEX,
  INVISIBLE_Z_INDEX,
  FOOTER_HEIGHT,
  FORMHEADER_HEIGHT
 } from './App';
import SvgIcon from './SvgIconComponent';
import { TrekInfo, TREK_SELECT_BITS } from './TrekInfoModel';
import TrekTypeSelect from "./TrekTypeSelectComponent";

export interface LimitsObj {
  headingIcon   ?: string,    // icon for the header
  heading       ?: string,    // text for the header
  label         ?: string,    // label for the input field
  placeholderValue ?: string,  // default value
  onChangeFn    ?: Function,  // function to call on input changes
  cancelText    ?: string,    // text for cancel button
  okText        ?: string,    // text for the OK button
  units         ?: string[],  // array of labels for unit radio buttons
  defaultUnits  ?: string,    // default (last) value for units selection
  unitsVertical ?: boolean,   // layout units radio buttons vertically
  typeSelect    ?: boolean,   // present a TrekTypeSelect component if true
}

// dialog used for various inputs (time limit, dist limit, interval data)

function TrekLimitsForm({open=undefined, limits=undefined}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);

  const [value, setValue] = useState('');
  const [units, setUnits] = useState('');
  const [zValue, setZValue] = useState(-1);

  const bHandler = useRef(false);

  const onBackButtonPressLimits = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(open && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressLimits); 
      bHandler.current = true;
    }
  },[open])

  useEffect(() => {     
    setValue('')                  // componentDidMount
  },[])

  useEffect(() => {                       // DidUpdate
    if (limits.units && (limits.units.indexOf(units) === -1)){
      updateUnits(limits.defaultUnits);
    }
  },[limits.units])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressLimits);
    bHandler.current = false;
  }

  function setVisible() {
    setZValue(LIMITS_FORM_Z_INDEX);
  }

  function setNotVisible() {
    setZValue(INVISIBLE_Z_INDEX);
  }

  function setValueInput(val: string) {
    let v = parseFloat(val);
    limits.onChangeFn({value: v, units: units});
  }

  function updateUnits(val: string) {
    setUnits(val);
    setValue(value);      // in case units changed to SAVED_UNITS
  }

  function setUnitsInput(val: string) {
    updateUnits(val);
    setValueInput(value);
  }
  
  function setType(tType: string){
    limits.onChangeFn(tType);
    close();
  }

    // call the close method, indicate OK
  function close() {
    if (!limits.typeSelect) {
      let v = value;
      if (v === '') { 
        // alert(limits.placeholderValue);
        v = limits.placeholderValue;
        setValue(v);
      }
      setValueInput(v);
    }
    Keyboard.dismiss();
    removeListeners();
    tInfo.limitsCloseFn(true);
    setValue('');
  }

  // call the close method, indicate CANCEL
  function dismiss() {
      Keyboard.dismiss();
      removeListeners();
      tInfo.limitsCloseFn(false);
      setValue('');
  }

    const { highTextColor, dividerColor, textOnPrimaryColor, footerButtonText,
            pageBackground, rippleColor } = uiTheme.palette[tInfo.colorTheme];
    const { cardLayout, roundedTop, footer, footerButton,
            formHeader, formHeaderText, formBody, formBodyText, formTextInput, formNumberInput
          } = uiTheme;
    const footerHeight = FOOTER_HEIGHT;
    const headerHeight = FORMHEADER_HEIGHT;
    const bodyHeight = 130;
    const pHolder = limits.placeholderValue;
    const formHt = bodyHeight + footerHeight + headerHeight;
    const okTxt = limits.okText || 'CONTINUE';
    const canTxt = limits.cancelText || 'CANCEL';

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
      headerText: {
        ...formHeaderText,
        color: textOnPrimaryColor,
      },
      body: {
        ...formBody,
        height: bodyHeight,
      },
      labelText: {
        ...formBodyText,
        color: highTextColor,
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      footer: {
        ...footer,
        ...{borderTopColor: dividerColor, backgroundColor: pageBackground}
      },
      colLayout: {
        flexDirection: "column",
        alignItems: "center",
      },
      textInputItem: {
        ...formTextInput,
        color: highTextColor,
      },      
      rgLabel: {
        fontSize: 20,
      },
    })

    return useObserver(() => (
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
                  {limits.headingIcon &&
                    <SvgIcon 
                      style={{marginRight: 4, backgroundColor: 'transparent'}}
                      size={24}
                      widthAdj={0}
                      fill={textOnPrimaryColor}
                      paths={APP_ICONS[limits.headingIcon]}
                    />
                  }
                  <Text style={styles.headerText}>{limits.heading}</Text>
                </View>
                <View style={styles.body}>
                  <Text style={styles.labelText}>{limits.label}</Text>
                    {!limits.typeSelect && 
                      <View style={limits.unitsVertical ? styles.rowLayout : styles.colLayout}>
                        <View style={{marginBottom: 5}}>
                          <TextInputField
                            style={[styles.textInputItem, formNumberInput]}
                            onChangeFn={(text) => setValue(text)}
                            placeholderValue={value || pHolder}
                            topAdjust={0}
                          />
                        </View>
                        {(limits.units !== undefined) &&
                          <RadioGroup 
                            onChangeFn={setUnitsInput}
                            selected={units}
                            values={limits.units}
                            labels={limits.units}
                            labelStyle={styles.rgLabel}
                            vertical={limits.unitsVertical}
                            inline
                            itemHeight={30}
                            radioFirst
                          />
                        }
                      </View>
                    }
                    {limits.typeSelect &&
                      <View style={[styles.rowLayout, {marginTop: 5}]}>
                        <TrekTypeSelect
                          style={{justifyContent: "flex-start"}}
                          size={40}
                          selected={TREK_SELECT_BITS[tInfo.type]}
                          onChangeFn={setType}
                        />
                      </View>
                    }
                </View>
                <View style={styles.footer}>
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
                  {okTxt !== 'Auto' && 
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
                  }
                </View>
              </View>
            </SlideUpView>
          </View>
      </View>
    ))
}

export default TrekLimitsForm;
