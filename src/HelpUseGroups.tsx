import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';
import HelpLink from './HelpLinkComponent';
import { HELP_GOALS, HELP_SETTINGS } from './HelpService';

export const useGroupHelpData = [`
      Use Groups allow you to organize your goals and activities for different purposes or users.

      Examples of groups: Training, FamilyHikes, WalkingDogs, Errands, Commuting, etc.

      For group specific functions the currently active group is displayed near the top right of the screen.  You can tap this indicator to change the currently acive group.

      Goals and user attributes are specified per Group.  Be sure you have set the weight, height and stride lengths for each group via Settings.`
]

function HelpUseGroups() {
  return (
    <View>
      <HelpText text={useGroupHelpData[0]}/>
      <HelpLink icon='Target' text="Goals" helpId={HELP_GOALS}/> 
      <HelpLink icon='Settings' text="Settings" helpId={HELP_SETTINGS}/> 
    </View>
  )
}

export default HelpUseGroups;