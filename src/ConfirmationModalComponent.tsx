import React, { useContext, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, TouchableNativeFeedback, BackHandler } from "react-native";
import { useObserver } from "mobx-react-lite";

import { CONFIRM_Z_INDEX, BACKDROP_Z_INDEX, ModalSvcContext, UiThemeContext, TrekInfoContext } from "./App";
import { ModalModel, CONFIRM_INFO } from "./ModalModel";
import { TrekInfo } from './TrekInfoModel';
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";

// dialog used for basic NOTICES and CONFIRMATIONS

function ConfirmationModal({confirmOpen}) {

  const bHandler = useRef(false);
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const uiTheme: any = useContext(UiThemeContext);
  const smData = modalSvc.smData;
  const contentLines = confirmOpen && smData.content.split("\n");
  const bigContentLines =
    confirmOpen && smData.bigContent && smData.bigContent.split("\n");

  const onBackButtonPressConfirm = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(confirmOpen && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressConfirm); 
      bHandler.current = true;
    }
  },[confirmOpen])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressConfirm);
    bHandler.current = false;
  }

    // call the resolve method
  function close(response = "OK") {
    setTimeout(() => {
      modalSvc
        .closeSimpleModal(400)
        .then(() => {
          removeListeners();
          modalSvc.smData.resolve(response);
        })
        .catch(() => {
          removeListeners();
        });
    }, 200);
  }

  // call the reject method
  function dismiss() {
    setTimeout(() => {
      modalSvc
        .closeSimpleModal(400)
        .then(() => {
          removeListeners();
          modalSvc.smData.reject("CANCEL");
        })
        .catch(() => {
          removeListeners();
        });
    }, 200);
  }

  const {
    highTextColor,
    lowTextColor,
    dangerColor,
    cancelColor,
    okChoiceColor,
    warningConfirmColor,
    warningConfirmTextColor,
    infoConfirmColor,
    infoConfirmTextColor,
    pageBackground,
    dividerColor,
    rippleColor,
    contrastingMask_2
  } = uiTheme.palette[trekInfo.colorTheme];
  const { cardLayout, roundedTop, roundedBottom, footer, footerButton, footerButtonText,
          formHeader, formHeaderText, formBody, formBodyText } = uiTheme;
  const titleColor = smData.dType === CONFIRM_INFO ? infoConfirmTextColor : warningConfirmTextColor;
  const bgColor = smData.dType === CONFIRM_INFO ? infoConfirmColor : warningConfirmColor;
  const iconColor =
    smData.iconColor !== undefined ? smData.iconColor : titleColor;

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    background: {
      ...StyleSheet.absoluteFillObject,
      zIndex: BACKDROP_Z_INDEX,
      backgroundColor: contrastingMask_2
    },
    formArea: {
      position: "absolute",
      top: 140,
      left: 0,
      right: 0,
      maxHeight: 190
    },
    cardCustom: {
      elevation: 2,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      marginLeft: 5,
      marginRight: 5,
      borderColor: lowTextColor,
      backgroundColor: pageBackground,
      justifyContent: "space-between",
      zIndex: CONFIRM_Z_INDEX
    },
    header: {
      ...formHeader,
      ...roundedTop,
      backgroundColor: bgColor,
      borderBottomWidth: 0,
    },
    title: {
      ...formHeaderText,
      color: titleColor,
    },
    content: {
      ...formBody,
      padding: 0,
      paddingLeft: 20,
      paddingRight: 20,
      height: 100
    },
    contentText: {
      ...formBodyText,
      color: highTextColor,
    },
    bigContentText: {
      ...formBodyText,
      fontSize: 20,
      color: highTextColor,
    },
    footer: {
      ...footer,
      borderTopColor: dividerColor, 
      backgroundColor: pageBackground,
    }
  });

  return useObserver(() => (
    <View style={styles.container}>
      {confirmOpen && (
        <View style={styles.container}>
          <View style={styles.background}>
            <View style={styles.formArea}>
              <View style={[cardLayout, styles.cardCustom, roundedTop, roundedBottom]}>
                <View style={styles.header}>
                  {smData.headingIcon && (
                    <SvgIcon
                      style={{ marginRight: 6, backgroundColor: "transparent" }}
                      size={24}
                      widthAdj={0}
                      fill={iconColor}
                      paths={APP_ICONS[smData.headingIcon]}
                    />
                  )}
                  <Text style={styles.title}>{smData.heading}</Text>
                </View>
                <View style={styles.content}>
                  {contentLines.map((line, indx) => (
                    <Text key={indx} style={styles.contentText}>
                      {line}
                    </Text>
                  ))}
                  {smData.bigContent &&
                    bigContentLines.map((line, indx) => (
                      <Text key={indx} style={styles.bigContentText}>
                        {line}
                      </Text>
                    ))}
                </View>
                <View style={[styles.footer, roundedBottom]}>
                  {smData.okText && smData.deleteText && (
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                      onPress={() => close(smData.deleteText)}
                    >
                      <View style={footerButton}>
                        <Text
                          style={[footerButtonText, { color: dangerColor }]}
                        >
                          {smData.deleteText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  )}
                  {!smData.notifyOnly && (
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                      onPress={dismiss}
                    >
                      <View style={footerButton}>
                        <Text
                          style={[footerButtonText, { color: cancelColor }]}
                        >
                          {smData.cancelText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  )}
                  {!smData.okText && smData.deleteText && (
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                      onPress={() => close(smData.deleteText)}
                    >
                      <View style={footerButton}>
                        <Text
                          style={[footerButtonText, { color: dangerColor }]}
                        >
                          {smData.deleteText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  )}
                  {smData.okText && (
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.Ripple(rippleColor, false)}
                      onPress={() => close(smData.okText)}
                    >
                      <View style={[footerButton, { marginRight: 1 }]}>
                        <Text
                          style={[footerButtonText, { color: okChoiceColor }]}
                        >
                          {smData.okText}
                        </Text>
                      </View>
                    </TouchableNativeFeedback>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  ));
}

export default ConfirmationModal;
