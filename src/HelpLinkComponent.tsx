import React, { useContext } from "react";
import { BorderlessButton } from 'react-native-gesture-handler';

import {
  MainSvcContext,
  UiThemeContext,
  HelpSvcContext
} from "./App";
import { View, Text } from "react-native";
import { HelpSvc } from "./HelpService";
import HelpIcon from './HelpIconComponent';
import { MainSvc } from "./MainSvc";


function HelpLink({text, helpId, icon=undefined, color=undefined, size=undefined}) {

  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const helpSvc: HelpSvc = useContext(HelpSvcContext);

  const { rippleColor, helpLink
        } = uiTheme.palette[mainSvc.colorTheme];
  const { fontRegular } = uiTheme;

  return  (
    <View style={{flexDirection: "row", marginTop: 5}}>
      {icon !== undefined &&
        <HelpIcon name={icon} color={color} size={size}/>
      }
      <BorderlessButton
        rippleColor={rippleColor}
        borderless={true}
        onPress={() => helpSvc.pushHelp(helpId)}
      >
        <View>
          <Text style={{fontFamily: fontRegular, fontSize: 18, color: helpLink}}>
            {text}
          </Text>
        </View>
      </BorderlessButton>
    </View>
      
  )
}
export default React.memo(HelpLink);