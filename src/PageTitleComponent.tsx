import React, { useContext } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import { RectButton } from "react-native-gesture-handler";
// import { useObserver } from "mobx-react-lite";

import { UiThemeContext } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
// import { TrekInfo } from './TrekInfoModel';


// this component provides a title for a page 
// and optionally a group identifier that can act as a selector
function PageTitle({
  icon = undefined,     // icon to display before title text
  iconColor = undefined,// color for icon
  iconFn = undefined,   // function to execute on press of the icon
  iconFnArg = undefined, // argument to pass to iconFn
  iconFnDisabled = undefined,  // do not respond to icon if this is true
  titleText,            // text to display for title
  style=undefined,      // styling to add to default styling
  groupName=undefined,  // group name to show on right
  setGroupFn=undefined, // allow group selection via this function if present
  colorTheme            // pass trekInfo.colorTheme to cause update on theme change
}) {
  const uiTheme: any = useContext(UiThemeContext);
  // const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const { width } = Dimensions.get('window');

  function callSetGroupFn() {
      setGroupFn();
  }

  function callIconFn() {
    iconFn(iconFnArg);
}
  // alert('render ' + titleText)
  const { disabledTextColor, highTextColor, rippleColor, secondaryColor
        } = uiTheme.palette[colorTheme];
  const { fontRegular, pageTitle } = uiTheme; 
  const groupTextColor = setGroupFn !== undefined ? highTextColor : disabledTextColor;
  const canPressIcon = iconFn && !iconFnDisabled;
  const propStyle = style || {marginBottom: 0, marginTop: 15};

  const groupIconSize = 20;
  const titleIconSize = 24;
  const haveGroupFn = setGroupFn !== undefined;
  const styles = StyleSheet.create({
    titleArea: {
      ...pageTitle,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: width,
      ...propStyle
    },
    iconAndTitle: {
      flexDirection: "row",
      alignItems: "center",
    },
    titleIcon: {
      width: titleIconSize,
      height: titleIconSize,
      marginLeft: 6,
      marginRight: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
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

return (
  <View style={styles.titleArea}>
      {icon && !canPressIcon &&
        <View style={styles.iconAndTitle}>
          <SvgIcon
            style={styles.titleIcon}
            size={titleIconSize}
            paths={APP_ICONS[icon]}
            fill={iconColor}
          />
          <Text style={[styles.titleText, {color: disabledTextColor}]}>{titleText}</Text>
        </View>
      }
      {icon && canPressIcon &&
        <RectButton
          rippleColor={rippleColor}
          //if setGroupFn is undefined, disable this button
          onPress={callIconFn}
        >
          <View style={styles.iconAndTitle}>
            <SvgIcon
              style={styles.titleIcon}
              size={titleIconSize}
              paths={APP_ICONS[icon]}
              fill={iconColor}
            />
            <Text style={styles.titleText}>{titleText}</Text>
          </View>
        </RectButton>
      }
      {!icon && titleText &&
        <Text style={styles.titleText}>{titleText}</Text>
      }
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
              fill={secondaryColor}
            />
            <Text style={styles.groupText}>{groupName}</Text>
          </View>
        </RectButton>
      )}
    </View>
  )
}
export default React.memo(PageTitle);
// export default PageTitle;


