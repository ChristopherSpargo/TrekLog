import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';

export const limitByTimeHelpData = [`
      Test help for limit trek by time`
]

function HelpLimitTime() {
  return (
    <View>
      <HelpText text={limitByTimeHelpData[0]}/>
    </View>
  )
}

export default HelpLimitTime;