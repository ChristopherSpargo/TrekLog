import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useObserver } from "mobx-react-lite";
import { ProgressCircle } from 'react-native-svg-charts';
import { RectButton } from 'react-native-gesture-handler'

import { UiThemeContext, TrekInfoContext, GoalsSvcContext, UtilsSvcContext,
         PROGRESS_COLORS } from "./App";
import { TrekInfo } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import { PROGRESS_RANGES, GoalsSvc } from './GoalsService';

function SummaryGoals({
  showFn,      // function to call to show the selected goal
  sinceDate,
  noGoals
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);
  const gS: GoalsSvc = useContext(GoalsSvcContext)
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);

  const progressCircleSize = 40;
  const iconLabelTextSize = 14;
  const haveGoals = gS.displayList.length !== 0;
  const { rippleColor, highTextColor, mediumTextColor, cardItemTitleColor,
          progressBackground, dividerColor
        } = uiTheme.palette[tInfo.colorTheme];
  const { fontLight, fontRegular,
        } = uiTheme;
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    goalItem: {
      flexDirection: "column",
      paddingLeft: 15,
    },
    goalStmt: {
      fontSize: 18,
      color: mediumTextColor,
    },
    progressLabel: {
      width: progressCircleSize + 5,
      fontSize: iconLabelTextSize,
      fontFamily: fontLight,
      color: highTextColor,
      textAlign: "center",
    },
    buttonArea: {
      marginTop: 10,
      marginLeft: 15,
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center",
    },
    goalDateItem: {
      flexDirection: "row",
      alignItems: "center"
    },
    goalDateType: {
      fontSize: 18,
      fontFamily: fontRegular,
      color: mediumTextColor,
      width: 80,
    },
    goalDateText: {
      fontFamily: fontRegular,
      color: mediumTextColor,
      fontSize: 18
    },
    goalText: {
      color: cardItemTitleColor,
      fontFamily: fontRegular,
      marginBottom: 3,
      fontSize: 20
    },
    divider: {
      flex: 1,
      marginHorizontal: 15,
      marginTop: 10,
      borderBottomWidth: 1,
      borderStyle: "solid",
      borderColor: dividerColor,
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
          <RectButton
            rippleColor={rippleColor}
            key={index}
            onPress={() => showFn(dlItem)}
          >
            <View style={styles.buttonArea}>
              <Text style={styles.goalText}>{gS.formatGoalStatement(dlItem.goal)}</Text>
              <View style={[styles.rowLayout, {alignItems: "flex-start"}]}>
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
                          {dlItem.mostRecentDate === '0' ? "Not Met" :
                            uSvc.dateFromSortDate(dlItem.mostRecentDate)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.divider}/>
          </RectButton>
        )})
      }
      {!haveGoals &&
        <Text style={{...styles.goalText, ...{textAlign: "center"}}}>{noGoals}</Text>
      }
    </View>
  ))
}
export default SummaryGoals;
