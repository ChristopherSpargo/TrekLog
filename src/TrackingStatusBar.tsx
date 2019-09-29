import React, { useContext } from "react";
import { View, StyleSheet, Text } from "react-native";

import { UiThemeContext, TrekInfoContext, UtilsSvcContext, HEADER_Z_INDEX, TRACKING_STATUS_BAR_HEIGHT, HEADER_HEIGHT
       } from "./App";
import { TrekInfo } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';

function TrackingStatusBar({
  trackingHeader,
  trackingDiffTime,
  trackingDiffDist,
  trackingTime,
  barTop,
  headerLeft = undefined,
  logOn
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);

    const {
            matchingMask_9, trackingStatsBackgroundHeader, highTextColor, trackingColorMinus,
            trackingColorPlus
          } = uiTheme.palette[tInfo.colorTheme];
    const { fontRegular 
          } = uiTheme;
    const tdTime = trackingDiffTime;
    const tdTimeColor = tdTime < 0 ? trackingColorMinus : trackingColorPlus;
    const tdDist = trackingDiffDist ;
    const tdDistColor = tdDist < 0 ? trackingColorMinus : trackingColorPlus;
    const tdDistStr = tInfo.formattedDist(Math.abs(tdDist));
    const spindx = tdDistStr.indexOf(' ');
    const tdDistValue = tdDistStr.substr(0, spindx);
    const tdDistUnits = tdDistStr.substr(spindx);

    const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    trackingStatus: {
      position: "absolute",
      top: barTop,
      height: logOn ? TRACKING_STATUS_BAR_HEIGHT : HEADER_HEIGHT,
      right: 0,
      left: logOn ? 0 : 56,
      paddingRight: 5,
      paddingLeft: logOn ? 5 : 0,
      backgroundColor: logOn ? matchingMask_9 : trackingStatsBackgroundHeader,
      flexDirection: headerLeft ? "row" : "column",
      alignItems: "center",
      zIndex: HEADER_Z_INDEX+1,
    },
    headingGroup: {
      marginTop: -12,
      flex: headerLeft ? .35 : 1,
      flexDirection: headerLeft ? "column" : "row",
      justifyContent: "center",
      alignItems: "center",
    },
    trackingGroup: {
      marginTop: -17,
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    trackingItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      maxHeight: 60,
    },
    trackingItemValue: {
      fontFamily: fontRegular,
      fontSize: logOn ? 54 : 38,
    },
    trackingItemUnits: {
      fontSize: logOn ? 36 : 28,
      fontFamily: fontRegular,
      marginTop: logOn ? 12 : 8,
    },
    trackingTime: {
      fontSize: logOn ? 22 : 20,
      fontFamily: fontRegular,
      color: highTextColor
    },
    trackingHeader: {
      fontSize: 18,
      fontFamily: fontRegular,
      color: highTextColor
    },
})

  return  (
    <View style={styles.trackingStatus}>
      <View style={styles.headingGroup}>
        <Text style={styles.trackingHeader}>{trackingHeader}</Text>
        {trackingTime !== undefined &&
          <View style={[styles.trackingItem, {flex: 0}]}>
            <Text style={styles.trackingTime}>
                {' (' + uSvc.timeFromSeconds(trackingTime) + ')'}
            </Text>
          </View>
        }
      </View>
      <View style={styles.trackingGroup}>
        <View style={styles.trackingItem}>
          <Text style={[styles.trackingItemValue, {color: tdTimeColor}]}>
            {uSvc.timeFromSeconds(Math.abs(tdTime))}
          </Text>
        </View>
        <View style={styles.trackingItem}>
          <Text style={[styles.trackingItemValue, {color: tdDistColor}]}>
            {tdDistValue}
          </Text>
          <Text style={[styles.trackingItemUnits, {color: tdDistColor}]}>
            {tdDistUnits}
          </Text>
        </View>
      </View>
    </View>
      
  )
}
export default React.memo(TrackingStatusBar);


