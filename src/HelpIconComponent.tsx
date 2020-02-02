import React, { useContext } from "react";
import { View } from 'react-native';

import {
  UiThemeContext,
  MainSvcContext,
} from "./App";
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from "./SvgImages";
import { MainSvc } from "./MainSvc";


function HelpIcon({name, color=undefined, size=20}) {

  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const { highTextColor
        } = uiTheme.palette[mainSvc.colorTheme];
  const fill = color || highTextColor;

  return  (
    <View style={{marginRight: 8, marginLeft: 8, marginTop: 3}}>
      <SvgIcon paths={APP_ICONS[name]} fill={fill} size={size}/>
    </View>
  )
}

export default React.memo(HelpIcon);