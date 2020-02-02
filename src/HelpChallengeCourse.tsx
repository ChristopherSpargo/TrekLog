import React from 'react';
import {
  View,
  Image
} from "react-native";
import HelpText from './HelpTextComponent';

export const challengeCourseHelpData = [`
The Challenge a Course feature allows you to trek a course you have previously defined and monitor your progress against a previous trek of that course or against a specific time for that course.

To challenge a course select Challenge a Course from the menu at the home screen.  TrekLog will then look for courses you have defined that start near your current position.  Any nearby courses will be displayed in a selection list.  Select the course you wish to challenge.`,
`      
      Once you have selected a course, you will be given a list of methods to use to challenge the course.`,
      `      
      Select a method and specify a value if required by that method.  Press CONTINUE to begin your trek.
      
      In this mode, the Status screen and Map display look slightly different.  The Status screen has an additional element at the top that shows your current time and distance differences from the target trek.  Red values mean you are behind the progress of the target trek, green values mean you are ahead.`,
      `      
      The map will now display a dark grey path of the course and a larger position indicator with a blue center indicating the position of the target trek.`
]

function HelpChallengeCourse() {
  return (
    <View>
      <HelpText text={challengeCourseHelpData[0]}/>
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/course_challenge_menu.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
      <HelpText text={challengeCourseHelpData[1]}/>
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/course_challenge_methods.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
      <HelpText text={challengeCourseHelpData[2]}/>
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/status_screen_challenge.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
      <HelpText text={challengeCourseHelpData[3]}/>
      <View style={{marginRight: 8, marginLeft: 8, marginTop: 10, flex: 0}}>
        <Image source={require('../src/assets/screenshots/logging_map_challenge.png')} 
          style={{width: 160, height: 320, borderWidth: 1, borderStyle: 'solid', borderColor: 'grey'}}
        />
      </View>
    </View>
  )
}

export default HelpChallengeCourse;