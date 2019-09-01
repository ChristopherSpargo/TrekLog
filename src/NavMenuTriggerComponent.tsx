import React, { useContext } from "react";
import { View } from "react-native";

import { UiThemeContext, TrekInfoContext, MENUTRIGGER_SIZE } from "./App";
import SvgButton from "./SvgButtonComponent";
import { APP_ICONS } from "./SvgImages";
import { TrekInfo } from './TrekInfoModel';


// this component provides a button with a menu icon on it
// pass the function to call when the button is pressed
function NavMenuTrigger({
  openMenuFn,       // call this when button is pressed
  menuStyle=undefined,
  disabled=undefined,
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);

  const { navIconColor, disabledTextColor } = uiTheme.palette[trekInfo.colorTheme];
  const { navMenuTriggerArea } = uiTheme; 
  const mStyle = menuStyle || {};
  const iconColor = mStyle.color || navIconColor;

  function callOpenMenuFn() {
    if(!disabled){
      openMenuFn();
    }
  }
  
  return  (
    <View style={[navMenuTriggerArea, mStyle]}>
      <SvgButton
        onPressFn={callOpenMenuFn}
        borderWidth={0}
        areaOffset={0}
        size={MENUTRIGGER_SIZE}
        fill={disabled ? disabledTextColor : iconColor}
        path={ APP_ICONS.Menu }
      />
    </View>
  )
}
export default NavMenuTrigger;


