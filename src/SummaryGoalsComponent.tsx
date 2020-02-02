import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useObserver } from "mobx-react-lite";
import { ProgressCircle } from 'react-native-svg-charts';
import { RectButton } from 'react-native-gesture-handler'

import { UiThemeContext, GoalsSvcContext, UtilsSvcContext, MainSvcContext,
         PROGRESS_COLORS } from "./App";
import { UtilsSvc } from './UtilsService';
import { PROGRESS_RANGES, GoalsSvc } from './GoalsService';
import { MainSvc } from "./MainSvc";

function SummaryGoals({
  showFn,      // function to call to show the selected goal
  sinceDate,
  noGoals,
  colorTheme
}) {

  const mS : MainSvc = useContext(MainSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const gS: GoalsSvc = useContext(GoalsSvcContext)
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);

  const progressCircleSize = 40;
  const iconLabelTextSize = 14;
  const haveGoals = gS.displayList.length !== 0;
  const { rippleColor, highTextColor, cardItemTitleColor,
          progressBackground, dividerColor, altCardBackground, shadow1
        } = uiTheme.palette[colorTheme];
  const { fontLight, fontRegular,
        } = uiTheme;
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    progressLabel: {
      width: progressCircleSize + 5,
      fontSize: iconLabelTextSize,
      fontFamily: fontLight,
      color: highTextColor,
      textAlign: "center",
    },
    buttonArea: {
      backgroundColor: altCardBackground,
      borderColor: dividerColor,
      borderStyle: "solid",
      ...shadow1
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingLeft: 15,
      paddingBottom: 5,
    },
    goalDateItem: {
      flexDirection: "row",
      alignItems: "center"
    },
    goalDateType: {
      fontSize: 18,
      fontFamily: fontRegular,
      color: highTextColor,
      width: 80,
    },
    goalDateText: {
      fontFamily: fontRegular,
      color: highTextColor,
      fontSize: 18
    },
    goalText: {
      paddingLeft: 15,
      color: cardItemTitleColor,
      fontFamily: fontRegular,
      marginBottom: 3,
      fontSize: 20
    },
  })

  return useObserver(() => (
    <View>
      {gS.dataReady && haveGoals && gS.displayList.map((dlItem, index) => {
          let prog = gS.computeProgress(dlItem);
          let progPct = Math.round(prog * 100);
          let ind = uSvc.findRangeIndex(progPct, PROGRESS_RANGES);
          let pColor = PROGRESS_COLORS[ind];
          return (
            <View style={styles.buttonArea} key={index}>
              <RectButton
                rippleColor={rippleColor}
                onPress={() => showFn(dlItem)}
              >
              <Text style={styles.goalText}>{gS.formatGoalStatement(dlItem.goal)}</Text>
              <View style={styles.rowLayout}>
                <View>         
                  <ProgressCircle
                    style={{height: progressCircleSize}}
                    backgroundColor={progressBackground}
                    strokeWidth={2}
                    progress={prog}
                    progressColor={pColor}
                  />                         
                  <Text style={styles.progressLabel}>
                    {progPct + '%'}
                  </Text>
                </View>
                <View style={{marginLeft: 5}}>  
                  <View style={styles.goalDateItem}>
                    <Text style={styles.goalDateType}>Since:</Text>
                    <Text style={styles.goalDateText}>
                                {sinceDate}</Text>
                  </View>                                
                  <View style={styles.goalDateItem}>
                    <Text style={styles.goalDateType}>Last Met:</Text>
                    <Text style={[styles.goalDateText, {color: highTextColor}]}>
                          {dlItem.mostRecentDate === '0' ? "Not Met" 
                                        : uSvc.getTodayOrDate(mS.todaySD, dlItem.mostRecentDate)}</Text>
                  </View>
                </View>
              </View>
          </RectButton>
            </View>
        )})
      }
      {!haveGoals &&
        <Text style={{...styles.goalText, ...{textAlign: "center"}}}>{noGoals}</Text>
      }
    </View>
  ))
}
export default React.memo(SummaryGoals);
