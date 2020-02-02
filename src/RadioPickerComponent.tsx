import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useObserver } from "mobx-react-lite";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
  BackHandler
} from "react-native";
import { RectButton } from 'react-native-gesture-handler'

import {
  CONFIRM_Z_INDEX,
  BACKDROP_Z_INDEX,
  ModalSvcContext,
  MainSvcContext,
  UiThemeContext,
  HEADER_HEIGHT,
} from "./App";
import { APP_ICONS } from "./SvgImages";
import RadioGroup from "./RadioGroupComponent";
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";
import { MainSvc } from "./MainSvc";

// dialog used for item selection from a list

function RadioPicker({pickerOpen}) {
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const mData = modalSvc.rpData;
  const [selection, setSelection] = useState();
  const bHandler = useRef(false);

  const onBackButtonPressRPicker = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  const { height } = Dimensions.get("window");
  const {
    highTextColor,
    dividerColor,
    mediumTextColor,
    contrastingMask_3,
    pageBackground,
    rippleColor,
    disabledTextColor,
    primaryColor,
    textOnPrimaryColor,
    footerTextColor,
    footerButtonText,
  } = uiTheme.palette[mainSvc.colorTheme];
  const { cardLayout, roundedTop, roundedBottom, footer, footerButton, fontRegular 
        } = uiTheme;
  const headerHeight = 50;
  const okDisabled = selection === '#new#';

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    formArea: {
      marginTop: 20 + HEADER_HEIGHT,
      marginBottom: 20,
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
      maxHeight: height - (40 + HEADER_HEIGHT),
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
      backgroundColor: primaryColor,
    },
    title: {
      color: textOnPrimaryColor,
      fontFamily: fontRegular,
      fontSize: 22
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
    footer: {
      ...footer,
      ...{borderTopColor: dividerColor, backgroundColor: pageBackground}
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center"
    },
    colLayout: {
      flexDirection: "column",
      alignItems: "center"
    },
    rgItem: {
      paddingTop: 10,
      backgroundColor: pageBackground,
      paddingRight: 0,
      paddingLeft: 0,
      marginLeft: 25,
    },
    rgLabel: {
      fontSize: 22,
      paddingLeft: 10,
      paddingRight: 10,
      flex: 1
    }
  });

  useEffect(() => {                       // componentDidUpdate
    if(pickerOpen && !bHandler.current) {
      bHandler.current = true;
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressRPicker);  
    }
  },[pickerOpen])

  useEffect(() => {                       // componentDidUpdate
    setSelection(mData.selection);
  },[mData.selection]);

  function removeListener() {
    bHandler.current = false;
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressRPicker);
  }

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
          removeListener();
          modalSvc.rpData.resolve(result);
        })
        .catch(() => {
          removeListener();
        });
    }, 200);
  }

  // call the reject method
  function dismiss() {
    setTimeout(() => {
      modalSvc
        .closeRadioPicker(400)
        .then(() => {
          setSelection(mData.selection);        // replace selection
          removeListener();
          modalSvc.rpData.reject("CANCEL");
        })
        .catch(() => {
          removeListener();
        });
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
                        commentStyle={{flex: 1}}
                        itemTest={mData.itemTest}
                        labelStyle={styles.rgLabel}
                        vertical={true}
                        align="start"
                        inline
                        itemHeight={40}
                        radioFirst
                        autoNew={mData.selectionValues.length === 1}
                      />
                    </View>
                  </ScrollView>
                  <View style={[styles.footer, roundedBottom]}>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={dismiss}>
                      <View style={footerButton}>
                        <Text
                          style={footerButtonText}
                        >
                          {mData.cancelText}
                        </Text>
                      </View>
                    </RectButton>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={okDisabled ? undefined : () => close()}>
                      <View style={footerButton}>
                        <Text
                          style={{...footerButtonText, 
                                  ...{ color: okDisabled ? disabledTextColor : footerTextColor }}}
                        >
                          {mData.okText}
                        </Text>
                      </View>
                    </RectButton>
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
