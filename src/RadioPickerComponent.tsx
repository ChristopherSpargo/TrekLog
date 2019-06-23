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

import {
  CONFIRM_Z_INDEX,
  BACKDROP_Z_INDEX,
  ModalSvcContext,
  TrekInfoContext,
  UiThemeContext,
  HEADER_HEIGHT,
  CONTROLS_HEIGHT
} from "./App";
import { APP_ICONS } from "./SvgImages";
import RadioGroup from "./RadioGroupComponent";
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";
import { TrekInfo } from './TrekInfoModel';

// dialog used for item selection from a list

function RadioPicker({pickerOpen}) {
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const mData = modalSvc.rpData;
  const [selection, setSelection] = useState();

  const { height } = Dimensions.get("window");
  const {
    highTextColor,
    dividerColor,
    mediumTextColor,
    contrastingMask_3,
    pageBackground,
    rippleColor,
    disabledTextColor,
    primaryColor
  } = uiTheme.palette[trekInfo.colorTheme];
  const { cardLayout, roundedTop, roundedBottom, footerButton, footerButtonText } = uiTheme;
  const headerHeight = 50;
  const okDisabled = selection === '#new#';

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    formArea: {
      marginTop: 20 + HEADER_HEIGHT,
      marginBottom: 20 + CONTROLS_HEIGHT,
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
      paddingRight: 10,
      maxHeight: height - (40 + CONTROLS_HEIGHT + HEADER_HEIGHT),
      zIndex: CONFIRM_Z_INDEX,
      backgroundColor: pageBackground,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-end",
      height: headerHeight,
      paddingLeft: 25,
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
      paddingTop: 3,
      paddingBottom: 13,
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
      paddingTop: 10,
      backgroundColor: pageBackground,
      paddingRight: 0,
      paddingLeft: 0,
      marginLeft: 25,
    },
    rgLabel: {
      color: highTextColor,
      fontSize: 20,
      paddingLeft: 10,
      paddingRight: 10,
      flex: 1
    }
  });

  useEffect(() => {
    if (mData.selection && !selection){
      setSelection(mData.selection);
    }
  });

  function checkSelection(selText: string){
    if(mData.selectionValues.indexOf(selText) === -1){
      close(selText);      // new value entered and user hit ADD
    } else {
      setSelection(selText);
    }
  }

  // call the resolve method
  function close(txt?: string) {
    let result = txt || selection;
    setTimeout(() => {
      modalSvc
        .closeRadioPicker(400)
        .then(() => {
          setSelection('');     // clear the local selection so it will be updated from mData in useEffect
          modalSvc.rpData.resolve(result);
        })
        .catch(() => {});
    }, 200);
  }

  // call the reject method
  function dismiss() {
    // setSelection(mData.selection);   
    setTimeout(() => {
      modalSvc
        .closeRadioPicker(400)
        .then(() => {
          setSelection('');     // clear the local selection so it will be updated from mData in useEffect
          modalSvc.rpData.reject("CANCEL");
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
                      <RadioGroup
                        onChangeFn={checkSelection}
                        selected={selection}
                        itemStyle={styles.rgItem}
                        values={mData.selectionValues}
                        labels={mData.selectionNames}
                        comments={mData.selectionComments}
                        itemTest={mData.itemTest}
                        labelStyle={styles.rgLabel}
                        vertical={true}
                        align="start"
                        inline
                        itemHeight={40}
                        radioFirst
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
                      onPress={okDisabled ? undefined : () => close()}
                    >
                      <View style={[footerButton, { height: headerHeight }]}>
                        <Text
                          style={[footerButtonText, { color: okDisabled ? disabledTextColor : primaryColor }]}
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

export default RadioPicker;
