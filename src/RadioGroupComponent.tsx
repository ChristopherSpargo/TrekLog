import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableNativeFeedback } from "react-native";
import { useObserver } from "mobx-react-lite";

import { UiThemeContext, MainSvcContext } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import TextInputField from './TextInputFieldComponent';
import { MainSvc } from "./MainSvc";

function RadioGroup({
  onChangeFn = undefined, // call this when value of radio changes
  selected = undefined, // value of the current selection
  labels = undefined, // label for each radio choice
  itemHeight = undefined, // height for items
  align = undefined, // style to apply to each item container
  itemStyle = undefined, // style object for items
  item1Style = undefined, // style object for first item
  labelStyle = undefined, // style object for labels
  justify = undefined, // how to justify buttons
  values = undefined, // value for each radio choice
  icons = undefined, // icons to use in place of standard radio button
  comments = undefined, // comment to add under items
  commentStyle = undefined, // style for comment area
  itemTest = undefined, // RegExp used to test validity of new items
  iconAreaStyle = undefined, // style object for the icon area when icons present
  colors = undefined, // color for each icon
  inline = undefined, // if true, labels should be inline with icons (otherwise above or below the icons)
  radioFirst = undefined, // if true, labels are after (or below) the icons
  vertical = undefined, // if true, arrange group vertically
  autoNew = undefined   // auto focus on new element if true
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const validProps = values && (labels || icons);
  const [selectedIndex, setSelectedIndex] = useState(values.indexOf(selected));
  const [enterItem, setEnterItem] = useState(false);
  const [newItem, setNewItem] = useState('');

  const vert = vertical;
  const defHeight = 30;
  const iHeight = itemHeight || defHeight;
  const radioIconSize = 24;
  const iconSize = 40;
  const just = justify === "start" ? "flex-start" : "center";
  const alignDir = align === "start" ? "flex-start" : "center";
  const { secondaryColor, highlightColor, highTextColor, mediumTextColor, okChoiceColor, cancelColor,
          rippleColor } = uiTheme.palette[mainSvc.colorTheme];
  const { fontRegular, fontLight, formTextInput } = uiTheme;
  const lStyle = labelStyle || {};
  const iaStyleProp = iconAreaStyle || {};
  const iStyle = itemStyle || {};
  const i1Style = item1Style || iStyle;
  const cStyle = commentStyle || {};
  const textInputWidth = 155;

  const styles = StyleSheet.create({
    container: {
      flexDirection: vert ? "column" : "row",
      justifyContent: just,
      alignItems: alignDir,
      flexWrap: vert ? "nowrap" : "wrap"
    },
    itemArea: {
      flexDirection: "column",
    },
    item: {
      marginRight: vert ? 0 : 15,
      height: itemHeight,
      flexDirection: inline ? "row" : "column",
      alignItems: "center",
      justifyContent: inline ? "flex-start" : "center",
    },
    label: {
      fontSize: 18,
      fontFamily: fontRegular, 
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
    },
    commentArea: {
      marginLeft: iStyle.marginLeft ? iStyle.marginLeft : 0,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    commentText: {
      fontSize: 14,
      fontFamily: fontLight,
      marginLeft: (lStyle.paddingLeft ? lStyle.paddingLeft : 0) + radioIconSize,
      color: mediumTextColor,
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center",
    },
    addIconArea: {
      flex: 1,
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end"
    },
    groupActionButton: {
      flex: 1,
      height: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center"
    },
    button: {
      color: "white",
      fontFamily: fontRegular,
      fontSize: 14
    },
  });

  useEffect(() => {       // didUpdate
    if (selectedIndex !== values.indexOf(selected)){
      let idx = values.indexOf(selected);
      setSelectedIndex(idx);
    }
  },[selected]);

  useEffect(() => {               // DidMount
    if(autoNew) {
      setEnterItem(true)
    }
  })

  // Update the value of the enterItem property
  function addNewItem() {
    if(newItem !== ''){
      onChangeFn(newItem);
      setEnterItem(false);
    }
  }

  // update the value of the new item
  function setNewItemValue(text: string){
    setNewItem(text);
  }

  // Cancel new item input
  function cancelNewItem() {
    setEnterItem(false);
    setNewItem('');
  }

  function valueChange(indx: number) {
    setSelectedIndex(indx);
    if(values[indx] === '#new#'){
      setEnterItem(true);
    } else {
      setEnterItem(false);
    }
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
              <View style={styles.container}>
                <TouchableNativeFeedback
                  key={indx}
                  background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                  onPress={() => valueChange(indx)}
                >
                  <View style={styles.rowLayout}>
                    <View style={{...(indx === 0 ? i1Style : iStyle)}}>
                      <View style={styles.item}>
                        {!radioFirst && (
                          <Text style={{...styles.label, ...lStyle}}>{item}</Text>
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
                            <Text style={{...styles.label, ...lStyle}}>{item}</Text>
                        )}
                      </View>
                      {vertical && comments &&
                        <View style={styles.commentArea}>
                          <Text style={[styles.commentText, cStyle]}>{comments[indx]}</Text>
                        </View>
                      }
                    </View>
                  </View>
                </TouchableNativeFeedback>
                {enterItem && values[indx] === '#new#' &&
                  <View style={[styles.rowLayout, {marginLeft: 30}]}>
                    <View style={{width: textInputWidth}}>
                      <TextInputField
                        style={{...formTextInput, ...{width: textInputWidth}}}
                        inputWidth={textInputWidth}
                        onChangeFn={(text : string) => setNewItemValue(text)}
                        kbType='default'
                        itemTest={itemTest}
                        placeholderValue={newItem}
                        autoFocus={true}
                      /> 
                    </View>
                    <View style={styles.addIconArea}>
                      <TouchableNativeFeedback
                        background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                        onPress={cancelNewItem}
                      >
                        <View style={styles.groupActionButton}>
                          <Text style={[styles.button, {color: cancelColor}]}>CANCEL</Text>
                        </View>
                      </TouchableNativeFeedback>
                      <TouchableNativeFeedback
                        background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                        onPress={addNewItem}
                      >
                        <View style={styles.groupActionButton}>
                          <Text style={[styles.button, {color: okChoiceColor}]}>ADD</Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  </View>
                }
                {/* {vertical && comments &&
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                  onPress={() => valueChange(indx)}
                >
                  <View style={styles.commentArea}>
                    <Text style={[styles.commentText, cStyle]}>{comments[indx]}</Text>
                  </View>
                </TouchableNativeFeedback>
                } */}
              </View>
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
