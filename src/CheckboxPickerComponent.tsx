import React, { useContext, useState, useEffect } from "react";
import { useObserver } from "mobx-react-lite";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableNativeFeedback,
  Dimensions
} from "react-native";
// import { RectButton, TouchableWithoutFeedback, TouchableNativeFeedback,
//          ScrollView } from 'react-native-gesture-handler';

import {
  CONFIRM_Z_INDEX,
  BACKDROP_Z_INDEX,
  ModalSvcContext,
  TrekInfoContext,
  UiThemeContext
} from "./App";
import { APP_ICONS } from "./SvgImages";
import CheckboxGroup from './CheckboxGroupComponent';
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";
import { TrekInfo } from './TrekInfoModel';

// dialog used for item selection from a list

function CheckboxPicker({pickerOpen}) {
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const mData = modalSvc.cpData;
  const [selections, setSelections] = useState([]);

  const { height } = Dimensions.get("window");
  const {
    highTextColor,
    dividerColor,
    mediumTextColor,
    contrastingMask_3,
    pageBackground,
    rippleColor,
    primaryColor,
    disabledTextColor
  } = uiTheme.palette[trekInfo.colorTheme];
  const { cardLayout, roundedTop, roundedBottom, footerButton, footerButtonText } = uiTheme;
  const headerHeight = 50;
  const canClose = this.allowNone || haveSelections();

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    formArea: {
      marginTop: 60,
      marginBottom: 40,
      marginHorizontal: 20,
      backgroundColor: "transparent",
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      zIndex: BACKDROP_Z_INDEX,
      backgroundColor: contrastingMask_3
    },
    cardCustom: {
      marginTop: 0,
      marginBottom: 0,
      elevation: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      maxHeight: height - 100,
      zIndex: CONFIRM_Z_INDEX,
      backgroundColor: pageBackground,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: headerHeight,
      paddingLeft: 30,
      paddingBottom: 5,
      borderStyle: "solid",
      borderBottomColor: dividerColor,
      borderBottomWidth: 1,
      backgroundColor: cardLayout.backgroundColor
    },
    title: {
      color: highTextColor,
      fontWeight: "bold",
      fontSize: 20
    },
    body: {
      flexDirection: "column",
      paddingVertical: 8
    },
    bodyText: {
      fontSize: 16,
      color: highTextColor
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center"
    },
    colLayout: {
      flexDirection: "column",
      alignItems: "center"
    },
    footer: {
      height: headerHeight,
      flexDirection: "row",
      alignItems: "center",
      borderStyle: "solid",
      borderTopColor: dividerColor,
      borderTopWidth: 1,
      backgroundColor: cardLayout.backgroundColor
    },
    rgItem: {
      paddingVertical: 5,
      backgroundColor: pageBackground,
      paddingRight: 15,
      paddingLeft: 30,
    },
    rgLabel: {
      color: highTextColor,
      fontSize: 20,
      paddingLeft: 30,
      paddingRight: 30,
      flex: 1
    }
  });

  useEffect(() => {
    if (mData.selections.length && !selections.length){
      setSelections([...mData.selections]);
    }
  });

  // see if there are anu selections
  function haveSelections() {
    return selections.indexOf(true) !== -1;
  }

  // toggle the selection at index
  function changeSelections(sels: boolean[]) {
    setSelections([...sels]);
  }

  // call the resolve method
  function close() {
    let result = selections;
    setTimeout(() => {
      modalSvc
        .closeCheckboxPicker(400)
        .then(() => {
          setSelections([]);     // clear the local selections so it will be updated from mData in useEffect
          modalSvc.cpData.resolve(result);
        })
        .catch(() => {});
    }, 200);
  }

  // call the reject method
  function dismiss() {
    // setSelection(mData.selection);   
    setTimeout(() => {
      modalSvc
        .closeCheckboxPicker(400)
        .then(() => {
          setSelections([]);     // clear the local selection so it will be updated from mData in useEffect
          modalSvc.cpData.reject("CANCEL");
        })
        .catch(() => {});
    }, 200);
  }

  return useObserver(() => (
    <View style={styles.container}>
      {(pickerOpen && mData.selectionNames.length) &&
        <View style={styles.container}>
          {/* <TouchableWithoutFeedback onPress={dismiss}> */}
            <View style={styles.background}>
              <View style={styles.formArea}>
                <View style={[cardLayout, styles.cardCustom, roundedTop, roundedBottom]}>
                  <View style={[styles.header, roundedTop]}>
                    {mData.headingIcon && (
                      <SvgIcon
                        style={{
                          marginRight: 4,
                          backgroundColor: "transparent"
                        }}
                        size={24}
                        widthAdj={0}
                        fill={mediumTextColor}
                        paths={APP_ICONS[mData.headingIcon]}
                      />
                    )}
                    <Text style={styles.title}>{mData.heading}</Text>
                  </View>
                  <ScrollView>
                    <View style={styles.body}>
                      <CheckboxGroup
                        onChangeFn={changeSelections}
                        selections={selections}
                        itemStyle={styles.rgItem}
                        labels={mData.selectionNames}
                        labelStyle={styles.rgLabel}
                        vertical={true}
                        align="start"
                        inline
                        itemHeight={40}
                        checkboxFirst
                      />
                    </View>
                  </ScrollView>
                  <View style={[styles.footer, roundedBottom]}>
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, true)}
                      onPress={dismiss}
                    >
                      <View style={[footerButton, { height: headerHeight }]}>
                        <Text
                          style={[footerButtonText, { color: primaryColor }]}
                        >
                          {mData.cancelText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, true)}
                      onPress={canClose ? close : undefined}
                    >
                      <View style={[footerButton, { height: headerHeight }]}>
                        <Text
                          style={[footerButtonText, { color: canClose ? primaryColor : disabledTextColor }]}
                        >
                          {mData.okText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  </View>
                </View>
              </View>
            </View>
          {/* </TouchableWithoutFeedback> */}
        </View>
      }
    </View>
  ))
}

export default CheckboxPicker;
