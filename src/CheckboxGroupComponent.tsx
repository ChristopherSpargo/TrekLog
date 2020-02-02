import React, { useContext, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableNativeFeedback } from "react-native";
import { useObserver } from "mobx-react-lite";

import { UiThemeContext, MainSvcContext } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import { MainSvc } from "./MainSvc";

function CheckboxGroup({
  onChangeFn = undefined, // call this when selection status of an item changes
  selections = undefined, // array of selected flags, one for each item
  labels = undefined, // label for each checkbox choice
  itemHeight = undefined, // height for items
  align = undefined, // style to apply to each item container
  itemStyle = undefined, // style object for items
  labelStyle = undefined, // style object for labels
  justify = undefined, // how to justify buttons
  inline = undefined, // if true, labels should be inline with icons (otherwise above or below the icons)
  checkboxFirst = undefined, // if true, labels are after (or below) the icons
  vertical = undefined // if true, arrange group vertically
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const validProps = labels;
  const [selectedItems, setSelectedItems] = useState([...selections]);
  const checkAll = useRef<boolean>(false);
  const vert = vertical;
  const defHeight = 30;
  const iHeight = itemHeight || defHeight;
  const iconSize = 40;
  const just = justify === "start" ? "flex-start" : "center";
  const alignDir = align === "start" ? "flex-start" : "center";
  const { secondaryColor, highlightColor, highTextColor, mediumTextColor,
          rippleColor } = uiTheme.palette[mainSvc.colorTheme];
  const lStyle = labelStyle || {};
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
      paddingLeft: inline && checkboxFirst ? 3 : 0,
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
      setSelectedItems([...selections]);
  },[selections]);

  function changeOne(indx: number){
    let temp = [...selectedItems];
    temp[indx] = !temp[indx];
    setSelectedItems(temp);
    valueChange(temp);
  }

  // toggle all-selected status
  function changeAll() {
    let temp = [];
    temp.length = selectedItems.length;
    checkAll.current = !checkAll.current;
    temp.fill(checkAll.current);
    valueChange(temp);
  }

  function valueChange(sels: boolean[]) {
    requestAnimationFrame(() => {
      onChangeFn(sels);
    });
  }

  const CheckBoxItem = ({item, indx, onPress, itemSelected}) => {

    return (  
        <TouchableNativeFeedback
        key={indx}
        background={TouchableNativeFeedback.Ripple(rippleColor, false)}
        onPress={onPress}
      >
        <View style={[styles.item, iStyle]}>
          {!checkboxFirst && (
            <Text style={[styles.label, lStyle]}>{item}</Text>
          )}
          <SvgIcon
            size={24}
            widthAdj={0}
            fill={itemSelected ? secondaryColor : mediumTextColor}
            paths={
              APP_ICONS[
                itemSelected
                  ? "CheckBoxChecked"
                  : "CheckBoxOpen"
              ]
            }
          />
          {checkboxFirst && (
            <Text style={[styles.label, lStyle]}>{item}</Text>
          )}
        </View>
      </TouchableNativeFeedback>
    )    
  }

  return useObserver(() => (
    <View>
      {validProps && (selections !== undefined) && (
        <View style={styles.container}>
          <CheckBoxItem item={checkAll.current ? "Select None" : "Select All"} indx={0} 
                                                    onPress={() => changeAll()} itemSelected={checkAll.current}/>
          {labels.map((item, indx) => (
              <CheckBoxItem item={item} indx={indx} onPress={() => changeOne(indx)} itemSelected={selectedItems[indx]}/>
            ))}
        </View>
      )}
    </View>
  ))
}

export default CheckboxGroup;
