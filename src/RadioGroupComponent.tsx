import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableNativeFeedback } from "react-native";
import { useObserver } from "mobx-react-lite";

import { UiThemeContext, TrekInfoContext } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import { TrekInfo } from './TrekInfoModel';

function RadioGroup({
  onChangeFn = undefined, // call this when value of radio changes
  selected = undefined, // value of the current selection
  labels = undefined, // label for each radio choice
  itemHeight = undefined, // height for items
  align = undefined, // style to apply to each item container
  itemStyle = undefined, // style object for items
  labelStyle = undefined, // style object for labels
  justify = undefined, // how to justify buttons
  values = undefined, // value for each radio choice
  icons = undefined, // icons to use in place of standard radio button
  iconAreaStyle = undefined, // style object for the icon area when icons present
  colors = undefined, // color for each icon
  inline = undefined, // if true, labels should be inline with icons (otherwise above or below the icons)
  radioFirst = undefined, // if true, labels are after (or below) the icons
  vertical = undefined // if true, arrange group vertically
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);

  const validProps = values && (labels || icons);
  const [selectedIndex, setSelectedIndex] = useState(values.indexOf(selected));
  const vert = vertical;
  const defHeight = 30;
  const iHeight = itemHeight || defHeight;
  const iconSize = 40;
  const just = justify === "start" ? "flex-start" : "center";
  const alignDir = align === "start" ? "flex-start" : "center";
  const { secondaryColor, highlightColor, highTextColor, mediumTextColor,
          rippleColor } = uiTheme.palette[trekInfo.colorTheme];
  const lStyle = labelStyle || {};
  const iaStyleProp = iconAreaStyle || {};
  const iStyle = itemStyle || {};

  const styles = StyleSheet.create({
    container: {
      flexDirection: vert ? "column" : "row",
      justifyContent: just,
      alignItems: alignDir,
      flexWrap: vert ? "nowrap" : "wrap"
    },
    item: {
      marginRight: vert ? 0 : 15,
      height: itemHeight,
      flexDirection: inline ? "row" : "column",
      alignItems: "center",
      justifyContent: inline ? "flex-start" : "center"
    },
    label: {
      fontSize: 16,
      paddingLeft: inline && radioFirst ? 3 : 0,
      color: highTextColor
    },
    typeIconArea: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 15,
      marginRight: 8,
      width: iHeight - 10,
      height: iHeight - 10,
      borderBottomWidth: 2,
      borderStyle: "solid",
      borderColor: "transparent"
    },
    iconHighlight: {
      borderColor: highlightColor
    },
    statHeadingArea: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    typeIcon: {
      marginRight: 5,
      width: iconSize,
      height: iconSize,
      backgroundColor: "transparent"
    }
  });

  useEffect(() => {
    if (selectedIndex !== values.indexOf(selected)){
      setSelectedIndex(values.indexOf(selected));
    }
  },[selected]);


  function valueChange(indx: number) {
    setSelectedIndex(indx);
    requestAnimationFrame(() => {
      onChangeFn(values[indx]);
    });
  }

  return useObserver(() => (
    <View>
      {validProps && (selected !== undefined) && (
        <View style={styles.container}>
          {!icons &&
            labels.map((item, indx) => (
              <TouchableNativeFeedback
                key={indx}
                background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                onPress={() => valueChange(indx)}
              >
                <View style={[styles.item, iStyle]}>
                  {!radioFirst && (
                    <Text style={[styles.label, lStyle]}>{item}</Text>
                  )}
                  <SvgIcon
                    size={24}
                    widthAdj={0}
                    fill={selectedIndex === indx ? secondaryColor : mediumTextColor}
                    paths={
                      APP_ICONS[
                        selectedIndex === indx
                          ? "RadioButtonChecked"
                          : "RadioButtonUnchecked"
                      ]
                    }
                  />
                  {radioFirst && (
                    <Text style={[styles.label, lStyle]}>{item}</Text>
                  )}
                </View>
              </TouchableNativeFeedback>
            ))}
          {icons &&
            icons.map((item, indx) => (
              <TouchableNativeFeedback
                key={indx}
                background={TouchableNativeFeedback.Ripple(rippleColor, true)}
                onPress={() => valueChange(indx)}
              >
                <View
                  style={[
                    styles.typeIconArea,
                    iaStyleProp,
                    selectedIndex === indx ? styles.iconHighlight : {}
                  ]}
                >
                  <SvgIcon
                    style={styles.typeIcon}
                    size={iconSize}
                    widthAdj={0}
                    fill={colors[indx]}
                    paths={APP_ICONS[item]}
                  />
                </View>
              </TouchableNativeFeedback>
            ))}
        </View>
      )}
    </View>
  ))
}

export default RadioGroup;
