import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
} from "react-native";
import { BorderlessButton } from 'react-native-gesture-handler';

import {
  MainSvcContext,
  UiThemeContext,
  SPEED_DIAL_Z_INDEX,
} from "./App";
import IconButton from "./IconButtonComponent";
import FadeInView from './FadeInComponent';
import { MainSvc } from "./MainSvc";

// component provides a value incrementor/decrementor function

function IncDecComponent({inVal, label, onChangeFn, horizontal = undefined}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const [value, setValue] = useState("1");
  const [controlsOpen, setControlsOpen] = useState(false);
  const timerId = useRef<number>(undefined);


  useEffect(() => {                 // componentDidMount, componentDidUpdate
    setValue(inVal);
  },[inVal]);

  useEffect(() => {                 // componentWillUnmount
    return () => {
      if(timerId.current !== undefined){
        window.clearTimeout(timerId.current);
      }
    }
  },[]);


  function incValue(){
    callChangeFn('inc');
  }

  function decValue(){
    callChangeFn('dec');
  }

  function callChangeFn(dir: string) {
    onChangeFn(dir);
    showControls();
  }

  function showControls(){
    if(timerId.current !== undefined){
      window.clearTimeout(timerId.current);
    }
    setControlsOpen(true);
    timerId.current = window.setTimeout(() => {
      setControlsOpen(false);   // hide incDec buttons after some time
      timerId.current = undefined;
    }, 3000);
  }

  const {
    rippleColor,
    navItemBorderColor,
    primaryColor,
    textOnPrimaryColor
  } = uiTheme.palette[mainSvc.colorTheme];
  const { navIcon } = uiTheme;
  const incDecButtonSize = 30;
  const incDecDisplaySize = 40;
  const incDecIconSize = 24;

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    incDecArea: {
      flexDirection: horizontal ? "row" : "column",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: SPEED_DIAL_Z_INDEX
    },
    incDecButton: {
      width: incDecButtonSize,
      height: incDecButtonSize,
      borderRadius: incDecButtonSize / 2,
      backgroundColor: primaryColor,
    },
    incDecDisplay: {
      width: incDecDisplaySize,
      height: incDecDisplaySize,
      elevation: 4,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: incDecDisplaySize / 2,
      backgroundColor: primaryColor,
    },
    displayValue: {
      fontSize: 22,
      color: textOnPrimaryColor
    },
    displayText: {
      fontSize: 18,
      color: textOnPrimaryColor
    }
  });

  return  (
    <View style={styles.incDecArea}>
      <FadeInView startValue={0.2} endValue={1} open={controlsOpen} 
          duration={300} style={{overflow: "hidden"}}>
        <IconButton
          iconSize={incDecButtonSize}
          icon="Minus"
          style={styles.incDecButton}
          borderColor={navItemBorderColor}
          iconStyle={navIcon}
          color={textOnPrimaryColor}
          raised={controlsOpen}
          onPressFn={decValue}
        />
      </FadeInView>
      <BorderlessButton
        rippleColor={rippleColor}
        borderless={true}
        onPress={showControls}
      >
        <View style={styles.incDecDisplay}>
          <Text style={styles.displayValue}>{value}</Text>
          <Text style={styles.displayText}>{label}</Text>
        </View>
      </BorderlessButton>
      <FadeInView startValue={0.2} endValue={1} open={controlsOpen} 
          duration={300} style={{overflow: "hidden"}}>
        <IconButton
          iconSize={incDecIconSize}
          icon="Plus"
          style={styles.incDecButton}
          borderColor={navItemBorderColor}
          iconStyle={navIcon}
          color={textOnPrimaryColor}
          raised={controlsOpen}
          onPressFn={incValue}
        />
      </FadeInView>
    </View>
  )
}
export default IncDecComponent;