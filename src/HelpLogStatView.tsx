import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';
import HelpLink from './HelpLinkComponent';
import { HELP_TREK_TYPES, HELP_LOGGING_A_TREK, HELP_USE_GROUPS, HELP_CHALLENGE_COURSE,
         HELP_LIMIT_BY_TIME, HELP_LIMIT_BY_DIST
       } from './HelpService';

export const statViewHelpData = [`
      The Log Stats screen is where you access the main logging function.  Press the large play button when you are ready to begin your trek.`,
      `
      Before you begin you may want to set certain parameters for the recording such as the Trek Type and the Use Group.
  
      To set the Trek Type you can press the current type indicator in the upper left of the screen or select Change Type from the menu.`,
      `
      To set the Use Group tap the current group indicator in the upper right of the screen.`,
      `
      Other features you can configure before logging are:`
]

function HelpLogStatView() {
  return (
    <View>
      <HelpText text={statViewHelpData[0]}/>
        <HelpLink icon='CheckeredFlag' color="green" size={24}
                  text="Logging a Trek" helpId={HELP_LOGGING_A_TREK}/> 
      <HelpText text={statViewHelpData[1]}/>
      <HelpLink  icon='BulletedList' text="Trek Types" helpId={HELP_TREK_TYPES}/> 
      <HelpText text={statViewHelpData[2]}/>
      <HelpLink icon='FolderOpenOutline' text="Use Groups" helpId={HELP_USE_GROUPS}/> 
      <HelpText text={statViewHelpData[3]}/>
      <HelpLink icon='Course' text="Challenge a Course" helpId={HELP_CHALLENGE_COURSE}/> 
      <HelpLink icon='TimerSand' text="Limit by Time" helpId={HELP_LIMIT_BY_TIME}/> 
      <HelpLink icon='CompassMath' text="Limit by Distance" helpId={HELP_LIMIT_BY_DIST}/> 
    </View>
  )
}

export default HelpLogStatView;