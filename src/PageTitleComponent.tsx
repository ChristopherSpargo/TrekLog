import React, { useContext } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import { RectButton } from "react-native-gesture-handler";

import { UiThemeContext, TrekInfoContext, HEADER_HEIGHT } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import { TrekInfo } from './TrekInfoModel';


// this component provides a title for a page 
// and optionally a group identifier that can act as a selector
function PageTitle({
  titleText,            // text to display for title
  style=undefined,      // styling to add to default styling
  groupName=undefined,  // group name to show on right
  setGroupFn=undefined, // allow group selection via this function if present
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const { width } = Dimensions.get('window');

  const { disabledTextColor, highTextColor, rippleColor, secondaryColor
        } = uiTheme.palette[trekInfo.colorTheme];
  const { fontRegular, pageTitle } = uiTheme; 
  const groupTextColor = setGroupFn !== undefined ? highTextColor : disabledTextColor;
  const groupIconColor = setGroupFn !== undefined ? secondaryColor : disabledTextColor

  function callSetGroupFn() {
      setGroupFn();
  }

  const groupIconSize = 20;
  const haveGroupFn = setGroupFn !== undefined;
  const styles = StyleSheet.create({
    titleArea: {
      ...pageTitle,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: width,
      ...style
    },
    titleText: {
      fontSize: 22,
      fontFamily: fontRegular,
      color: highTextColor,
    },
    groupArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    groupIcon: {
      width: groupIconSize,
      height: groupIconSize,
      marginRight: 4,
      backgroundColor: "transparent"
    },
    groupText: {
      fontSize: 20,
      fontFamily: fontRegular,
      color: groupTextColor
    },
});

  return  (
    <View style={styles.titleArea}>
      <Text style={styles.titleText}>{titleText}</Text>
          {groupName && (
            <RectButton
              rippleColor={rippleColor}
              //if setGroupFn is undefined, disable this button
              onPress={haveGroupFn ? () => callSetGroupFn() : undefined}
            >
              <View style={styles.groupArea}>
                <SvgIcon
                  style={styles.groupIcon}
                  size={groupIconSize}
                  paths={APP_ICONS.FolderOpenOutline}
                  fill={groupIconColor}
                />
                <Text style={styles.groupText}>{groupName}</Text>
              </View>
            </RectButton>
          )}
    </View>
  )
}
export default PageTitle;


