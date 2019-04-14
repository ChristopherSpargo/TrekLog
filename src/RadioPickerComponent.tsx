import React, { useContext, useState, useEffect } from "react";
import { useObserver } from "mobx-react-lite";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  Dimensions
} from "react-native";

import {
  CONFIRM_Z_INDEX,
  BACKDROP_Z_INDEX,
  pageBackground,
  ModalSvcContext,
  UiThemeContext
} from "./App";
import { APP_ICONS } from "./SvgImages";
import RadioGroup from "./RadioGroupComponent";
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";

// dialog used for item selection from a list

function RadioPicker() {
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const [selection, setSelection] = useState("");
  const mData = modalSvc.rpData;

  const { height } = Dimensions.get("window");
  const {
    highTextColor,
    dividerColor,
    mediumTextColor,
    primaryColor
  } = uiTheme.palette;
  const { cardLayout, footerButton, footerButtonText } = uiTheme;
  const headerHeight = 50;

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    formArea: {
      marginVertical: 40,
      marginHorizontal: 20
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      zIndex: BACKDROP_Z_INDEX,
      backgroundColor: "rgba(0,0,0,.4)"
    },
    cardCustom: {
      marginTop: 0,
      marginBottom: 0,
      elevation: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      borderWidth: 0,
      maxHeight: height - 100,
      zIndex: CONFIRM_Z_INDEX
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
      justifyContent: "space-around",
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
      paddingLeft: 30
    },
    rgLabel: {
      color: highTextColor,
      fontSize: 20,
      paddingLeft: 30,
      flex: 1
    }
  });

  useEffect(() => {
    if (mData.selection && !selection){
      setSelection(mData.selection);
    }
  });

  // call the resolve method
  function close() {
    let result = selection;
    setTimeout(() => {
      modalSvc
        .closeRadioPicker(400)
        .then(() => {
          modalSvc.rpData.resolve(result);
        })
        .catch(() => {});
    }, 200);
  }

  // call the reject method
  function dismiss() {
    setSelection("");   // clear the local selection so it will be updated from mData in useEffect
    setTimeout(() => {
      modalSvc
        .closeRadioPicker(400)
        .then(() => {
          modalSvc.rpData.reject("CANCEL");
        })
        .catch(() => {});
    }, 200);
  }

  return useObserver(() => (
    <View style={styles.container}>
      {modalSvc.radioPickerOpen && (
        <View style={styles.container}>
          <TouchableWithoutFeedback onPress={dismiss}>
            <View style={styles.background}>
              <View style={styles.formArea}>
                <View style={[cardLayout, styles.cardCustom]}>
                  <View style={styles.header}>
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
                      {mData.selectionNames !== undefined && (
                        <RadioGroup
                          onChangeFn={setSelection}
                          selected={selection}
                          itemStyle={styles.rgItem}
                          values={mData.selectionValues}
                          labels={mData.selectionNames}
                          labelStyle={styles.rgLabel}
                          vertical={true}
                          align="start"
                          inline
                          itemHeight={40}
                          radioFirst
                        />
                      )}
                    </View>
                  </ScrollView>
                  <View style={styles.footer}>
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                      onPress={close}
                    >
                      <View style={[footerButton, { height: headerHeight }]}>
                        <Text
                          style={[footerButtonText, { color: primaryColor }]}
                        >
                          {mData.okText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}
    </View>
  ))
}

export default RadioPicker;
