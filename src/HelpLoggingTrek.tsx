import React from 'react';
import {
  View,
  Image
} from "react-native";
import HelpText from './HelpTextComponent';
import HelpLink from './HelpLinkComponent';
import { HELP_COURSES } from './HelpService';

export const loggingTrekHelpData = [`
      To log a trek, first make sure you are at the desired starting location (important when treking a Course you have defined or wish to define), and the Group and Trek Type values are what you want.`,
      `
      Next, press the large Start button.  TrekLog will determine your current location and display a status screen showing various values pertaining to your activity.`,
      `
      Values displayed with BLUE labels can be toggled to show different information by tapping.  For example: the Speed Now value can be tapped to show Average Speed and tapped again to show Time per mi/km and finally tapped again to return to Speed Now.
      
      Near the bottom of the screen are buttons to use the Camera, view your path on a Map or Finish logging.
      
      Note: Although you can log a trek without cell service, you will not be able to track your location on the map without it.
      
      When viewing the map, the starting location is shown as a circular indicator with a green center.  The current position is an indicator with a yellow center.`,
      `
      Status indicators are at the top and bottom of the screen.  As in the Status screen, values with BLUE labels can be toggled.
      
      Several other buttons, displayed in the map area, are available to change the map type, use the camera and toggle the zoom of the map from focus on the current position to showing the whole path and vice versa.  These buttons can be hidden/restored by tapping the map once.
      
      Using the camera to take a picture or video will cause a photo marker to appear on the path at the point the camera was used.
      
      To end your recording, press the Finish button on the status screen.  You will be given the option to DISCARD this recording, CANCEL the Finish request or SAVE the recording.
      
      To keep the recording tap SAVE.  TrekLog will then communicate with other services to obtain current weather conditions for your location and also to obtain elevation information along your path (if appllicable).
      
      Next, you are given an opportunity to give this trek a label and a breif description.  You may SKIP this step or enter information and press SAVE.
      
      At this point you should be informed that your trek has been saved and left viewing the Status screen.  You may review this screen and the Map at this point.  Tap the Done button to return to the TrekLog Home screen.`
  ]

function HelpLoggingTrek() {
  return (
    <View>
      <HelpText text={loggingTrekHelpData[0]}/>
      <HelpLink icon='Course' text="Courses" helpId={HELP_COURSES}/> 
      <HelpText text={loggingTrekHelpData[1]}/>
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/status_screen1.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
      <HelpText text={loggingTrekHelpData[2]}/> 
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/logging_map1.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
      <HelpText text={loggingTrekHelpData[3]}/>
    </View>
  )
}

export default HelpLoggingTrek;