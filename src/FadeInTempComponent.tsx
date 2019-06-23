import React, { useContext, useState, useRef, useEffect } from "react";
import { BorderlessButton } from 'react-native-gesture-handler';

import {
  TrekInfoContext,
  UiThemeContext,
} from "./App";
import { TrekInfo } from './TrekInfoModel';
import FadeInView from './FadeInComponent';


function FadeInTempComponent({dimOpacity=undefined, fadeDuration=undefined, useFirstTouch=undefined,
        viewTime=undefined, flexVal=undefined, onPressFn=undefined, children}) {
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const [controlsOpen, setControlsOpen] = useState(false);
  const timerId = useRef<number>(undefined);

  function showControls(){
    if(timerId.current !== undefined){
      window.clearTimeout(timerId.current);
    }
    setControlsOpen(true);
    timerId.current = window.setTimeout(() => {
      setControlsOpen(false);   // hide incDec buttons after some time
      timerId.current = undefined;
    }, viewTime || 3000);
  }

  useEffect(() => {             // componentDidMount
    showControls();           
  },[]);

  useEffect(() => {             // componentWillUnmount
    return () => {
      if(timerId.current !== undefined){
        window.clearTimeout(timerId.current);
      }
    }
  },[]);

  function callOnPressFn(){
    if (onPressFn) {
      onPressFn();
      showControls();
    }
  }

  const {
    rippleColor,
  } = uiTheme.palette[trekInfo.colorTheme];
  const dO = dimOpacity !== undefined ? dimOpacity : 0.2;
  const fD = fadeDuration !== undefined ? fadeDuration : 300;

  return  (
    <FadeInView startValue={dO} endValue={1} open={controlsOpen} 
        duration={fD} style={{overflow: "hidden"}}>       
      <BorderlessButton
        rippleColor={rippleColor}
        style={{flex: flexVal}}
        borderless={true}
        onPress={(controlsOpen || useFirstTouch ) ? callOnPressFn : showControls}
      >
        {children}
      </BorderlessButton>
    </FadeInView>
      
  )
}
export default FadeInTempComponent;