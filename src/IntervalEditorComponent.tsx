import React, { useState, useEffect, useContext, useRef } from "react";
import { Text, View, StyleSheet, Slider } from "react-native";
import { RectButton } from 'react-native-gesture-handler'

import { UiThemeContext, MainSvcContext, UtilsSvcContext } from "./App";
import SvgButton from "./SvgButtonComponent";
import { APP_ICONS } from "./SvgImages";
import { UtilsSvc } from './UtilsService'
import { MainSvc } from "./MainSvc";

export const INTERVAL_EDITOR_HEIGHT = 130;

function IntervalEditor({
  firstIntervalInfo,
  secondIntervalInfo,
  firstIntervalLoc,
  secondIntervalLoc,
  units,
  onChangeFn,
  onSaveFn,
  showSave,
  style,
  maxINum
}) {

  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext)

  const [firstMarker, setFirstMarker] = useState(firstIntervalLoc);
  const [secondMarker, setSecondMarker] = useState(secondIntervalLoc);
  const timerId = useRef<number>();

  useEffect(() => {           // componentDidUpdate
    setFirstMarker(firstIntervalInfo.curr);
  },[firstIntervalInfo]);

  useEffect(() => {           // componentDidUpdate
    setSecondMarker(secondIntervalInfo.curr);
  },[secondIntervalInfo]);

  useEffect(() => {             // componentWillUnmount
    return () => {
      if(timerId.current !== undefined){
        window.clearInterval(timerId.current);
      }
    }
  },[]);

  function firstMarkerChange(val: number){
    setFirstMarker(val);
    onChangeFn(firstIntervalInfo.iNum, val);
  }

  function secondMarkerChange(val: number){
    setSecondMarker(val);
    onChangeFn(secondIntervalInfo.iNum, val)
  }

  function updateMarker(sel: string, val: number){
    val = validateMovement(sel, val);
    if (sel === 'first') {
      firstMarkerChange(firstMarker + val);
    } else {
      secondMarkerChange(secondMarker + val);
    }
  }

  // don't let user move a marker outside the acceptable limits
  function validateMovement(sel: string, val: number) {
    if (sel === 'first') {
      if(val < 0) {
        return firstMarker + val < firstIntervalInfo.min ? firstIntervalInfo.min - firstMarker : val;
      } else {
        let max = firstIntervalInfo.iNum === -1 ? 0 : secondMarker;
        return firstMarker + val > max ? max - firstMarker : val;
      }
    } else {
      if(val < 0) {
        let min = secondIntervalInfo.iNum === maxINum ? secondIntervalInfo.max : firstMarker;
        return secondMarker + val < min ? min - secondMarker : val;
      } else {
        return secondMarker + val > secondIntervalInfo.max ? secondIntervalInfo.max - secondMarker : val;
      }
    }
  }

  // get the number of units of measure in the given interval
  function getMarkerRange(sel: string) {
    if (sel === 'first') {
      return firstIntervalInfo.max - firstIntervalInfo.min;
    } else {
      return secondIntervalInfo.max - secondIntervalInfo.min;
    }
  }

  // add one (meter) from the selected marker
  function incrementMarker(sel: string, repeating = false) {
    updateMarker(sel, repeating ? getMarkerRange(sel)/100 : 1)
  }

  // subtract one (meter) from the selected marker
  function decrementMarker(sel: string, repeating = false) {
    updateMarker(sel, repeating ? getMarkerRange(sel)/-100 : -1)
  }

  // format the position value for the current adjustment units
  function fmtPos(val: number){
    switch(units){
      case 'time':
        return uSvc.timeFromSeconds(val)
      default:
        return uSvc.formatDist(val, units);
    }
  }

  function dismiss(){
    onSaveFn('CANCEL', !showSave);    //don't save
  }

  function close(){
    onSaveFn(showSave ? 'SAVE' : 'DONE', !showSave); // save, close editor if 
  }

  const {
          rippleColor, footerButtonText, dividerColor, pageBackground,
          disabledTextColor, footerTextColor, highTextColor, trekLogBlue
        } = uiTheme.palette[mainSvc.colorTheme];
  const { footer, footerButton, fontRegular 
        } = uiTheme;
  const styles = StyleSheet.create({
    container: {
      ...style,
      ...{height: INTERVAL_EDITOR_HEIGHT},
      backgroundColor: pageBackground,
    },
    sliderArea: {
      height: 30,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 5,
    },
    sliderText: {
      fontSize: 14,
      width: 50,
      fontFamily: fontRegular,
      color: highTextColor,
    },
    flex1: {
      flex: 1,
    },
    ml0: {
      marginLeft: 0,
    },
    mr0: {
      marginRight: 0,
    },
    footer: {
      ...footer,
      ...{borderColor: dividerColor, borderBottomWidth: 1, borderTopWidth: 0,
          backgroundColor: pageBackground, height: 30}
    },
    intervalName: {
      fontSize: 14,
      fontFamily: fontRegular,
      color: highTextColor,
      textAlign: "center",
    }
  })
  const arrowIconSize = 24;
  const arrowIconColor = trekLogBlue;
  const trekStart = firstIntervalInfo.iNum === -1;
  const firstIntervalName = trekStart ? 'Trek Start' : 
            ('Marker ' + (firstIntervalInfo.iNum + 1) + ' (' + fmtPos(firstMarker) + ')');
  const trekEnd = secondIntervalInfo.iNum === maxINum;
  const secondIntervalName = trekEnd ? 'Trek End' : 
            ('Marker ' + (secondIntervalInfo.iNum + 1) + ' (' + fmtPos(secondMarker) + ')');
  const slider1Max = trekStart ? 0 : secondMarker;
  const slider2Min = trekEnd ? secondIntervalInfo.max : firstMarker;

  return  (
    <View style={styles.container}>
        <Text style={styles.intervalName}>{firstIntervalName}</Text>
        <View style={styles.sliderArea}>
          <Text style={styles.sliderText}>{fmtPos(firstIntervalInfo.min)}</Text>
          <SvgButton
            onPressFn={decrementMarker}
            repeats={500}
            value='first'
            size={arrowIconSize}
            fill={arrowIconColor}
            style={styles.ml0}
            disabled={trekStart}
            path={APP_ICONS.ArrowBack}
          />
          <Slider
            style={styles.flex1}
            disabled={trekStart}
            maximumTrackTintColor={disabledTextColor}
            minimumValue={firstIntervalInfo.min}
            maximumValue={slider1Max}
            onValueChange={firstMarkerChange}
            value={firstMarker}
          />                        
          <SvgButton
            onPressFn={incrementMarker}
            repeats={500}
            value='first'
            size={arrowIconSize}
            fill={arrowIconColor}
            style={styles.mr0}
            disabled={trekStart}
            path={APP_ICONS.ArrowForward}
          />
          <Text style={[styles.sliderText, {textAlign: 'right'}]}>
            {fmtPos(trekStart ? 0 : secondMarker)}</Text>
        </View>
        <Text style={styles.intervalName}>{secondIntervalName}</Text>
        <View style={styles.sliderArea}>
          <Text style={styles.sliderText}>{fmtPos(trekEnd ? secondIntervalInfo.max : firstMarker)}</Text>
          <SvgButton
            onPressFn={decrementMarker}
            repeats={500}
            value='second'
            size={arrowIconSize}
            fill={arrowIconColor}
            disabled={trekEnd}
            style={styles.ml0}
            path={APP_ICONS.ArrowBack}
          />
          <Slider
            style={styles.flex1}
            disabled={trekEnd}
            maximumTrackTintColor={disabledTextColor}
            minimumValue={slider2Min}
            maximumValue={secondIntervalInfo.max}
            onValueChange={secondMarkerChange}
            value={secondMarker}
          />                        
          <SvgButton
            onPressFn={incrementMarker}
            repeats={500}
            value='second'
            size={arrowIconSize}
            fill={arrowIconColor}
            disabled={trekEnd}
            style={styles.mr0}
            path={APP_ICONS.ArrowForward}
          />
          <Text style={[styles.sliderText, {textAlign: 'right'}]}>{fmtPos(secondIntervalInfo.max)}</Text>
        </View>
        <View style={styles.footer}>
          <RectButton
            rippleColor={rippleColor}
            style={styles.flex1}
            onPress={showSave ? dismiss : undefined}>
            <View style={footerButton}>
              <Text
                style={{...footerButtonText, 
                        ...{fontSize: 16, color: showSave ? footerTextColor : disabledTextColor}}}
              >
                CANCEL
              </Text>
            </View>
          </RectButton>
          <RectButton
            rippleColor={rippleColor}
            style={styles.flex1}
            onPress={close}>
            <View style={footerButton}>
              <Text
                style={{...footerButtonText, 
                        ...{ color: footerTextColor,
                             fontSize: 16 }}}
              >{showSave ? 'SAVE' : 'DONE'}
              </Text>
            </View>
          </RectButton>
        </View>
    </View>
      
  )
}
export default IntervalEditor;


