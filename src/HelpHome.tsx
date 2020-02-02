import React from 'react';
import {
  View,
} from "react-native";
import HelpText from './HelpTextComponent';
// import HelpLink from './HelpLinkComponent';

export const homeHelpData = [`
      The Home Screen shows a sampling of images taken on your treks. Icons in the header allow you to change the color theme, refresh the picture samples with different ones and open the features menu.`,
      `
      Tapping an image will cause it to be displayed full screen.  Icons in the header allow your to edit the image label/comment and show/hide the comment.`,
      `
      The Help feature is context sensitive so selecting Help off a command menu will always display help relevant to the current situation.`,
      `
      Help also contains a search feature to find help on arbitrary topics.`
  ]

function HelpHome() {
  return (
    <View>
      <HelpText text={homeHelpData[0]}/>
      <HelpText text={homeHelpData[1]}/>
      <HelpText text={homeHelpData[2]}/>
      <HelpText text={homeHelpData[3]}/>
    </View>
  )
}

export default HelpHome;