import React, { useContext, useState, useRef, useEffect } from "react";
import { BorderlessButton } from 'react-native-gesture-handler';

import {
  UiThemeContext,
  MainSvcContext,
} from "./App";
import FadeInView from './FadeInComponent';
import { MainSvc } from "./MainSvc";


function FadeInTempComponent({dimOpacity=undefined, fadeDuration=undefined, useFirstTouch=undefined,
        viewTime=undefined, flexVal=undefined, onPressFn=undefined, children}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
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
    showControls();
    if (onPressFn) {
      onPressFn();
    }
  }

  const {
    rippleColor,
  } = uiTheme.palette[mainSvc.colorTheme];
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
export default React.memo(FadeInTempComponent);