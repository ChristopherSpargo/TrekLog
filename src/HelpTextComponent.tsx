import React, { useContext } from "react";

import {
  MainSvcContext,
  UiThemeContext,
} from "./App";
import { View, Text } from "react-native";
import { MainSvc } from "./MainSvc";


function HelpText({text, wrap=undefined}) {

  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const { highTextColor
        } = uiTheme.palette[mainSvc.colorTheme];
  const { fontRegular } = uiTheme;
  const textWrap = wrap === false ? "nowrap" : "wrap";

  return  (
        <View style={{flexWrap: textWrap}}>
          <Text style={{fontFamily: fontRegular, fontSize: 18, 
                        color: highTextColor}}>
            {text}
          </Text>
        </View>
      
  )
}

export default React.memo(HelpText);