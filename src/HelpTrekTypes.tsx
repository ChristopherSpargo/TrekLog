import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';

export const trekTypesHelpData = [`
      Trek Type indicates what mode of movement will be used for the trek.  This will be used to compute calories and steps (if applicabel).

      There are 6 Trek Types: Walk, Run, Bike, Hike, Board and Drive.   When reviewing your activity, results can be limited by Trek Type.`
]

function HelpTrekTypes() {
  return (
    <View>
      <HelpText text={trekTypesHelpData[0]}/>
    </View>
  )
}

export default HelpTrekTypes;