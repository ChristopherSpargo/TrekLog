import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';

export const limitByDistHelpData = [`
      Test help for limit trek by distance`
]

function HelpLimitDist() {
  return (
    <View>
      <HelpText text={limitByDistHelpData[0]}/>
    </View>
  )
}

export default HelpLimitDist;