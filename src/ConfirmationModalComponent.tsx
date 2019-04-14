import React, { useContext } from "react";
import { View, StyleSheet, Text, TouchableNativeFeedback } from "react-native";
import { useObserver } from "mobx-react-lite";

import { CONFIRM_Z_INDEX, BACKDROP_Z_INDEX, ModalSvcContext, UiThemeContext } from "./App";
import { ModalModel } from "./ModalModel";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";

// dialog used for basic NOTICES and CONFIRMATIONS

function ConfirmationModal() {
  
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const smData = modalSvc.smData;
  const contentLines = modalSvc.simpleIsOpen && smData.content.split("\n");
  const bigContentLines =
    modalSvc.simpleIsOpen && smData.bigContent && smData.bigContent.split("\n");
  const {
    highTextColor,
    lowTextColor,
    dangerColor,
    cancelColor,
    okChoiceColor,
    warningConfirmColor,
    warningConfirmTextColor
  } = uiTheme.palette;
  const { cardLayout, footerButton, footerButtonText } = uiTheme;
  const titleColor = smData.headingTextColor || warningConfirmTextColor;
  const bgColor = smData.headingStartColor || warningConfirmColor;
  const iconColor =
    smData.iconColor !== undefined ? smData.iconColor : titleColor;

  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    background: {
      ...StyleSheet.absoluteFillObject,
      zIndex: BACKDROP_Z_INDEX,
      backgroundColor: "rgba(0,0,0,.4)"
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
      borderTopWidth: 1,
      borderColor: lowTextColor,
      justifyContent: "space-between",
      zIndex: CONFIRM_Z_INDEX
    },
    header: {
      paddingLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      height: 40
    },
    title: {
      color: titleColor,
      fontSize: 20
    },
    content: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 20,
      paddingRight: 20,
      height: 100
    },
    contentText: {
      fontSize: 18,
      color: highTextColor
    },
    bigContentText: {
      fontSize: 20,
      color: highTextColor
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      backgroundColor: cardLayout.backgroundColor
    }
  });

  // call the resolve method
  function close(response = "OK") {
    setTimeout(() => {
      modalSvc
        .closeSimpleModal(400)
        .then(() => {
          modalSvc.smData.resolve(response);
        })
        .catch(() => {});
    }, 200);
  }

  // call the reject method
  function dismiss() {
    setTimeout(() => {
      modalSvc
        .closeSimpleModal(400)
        .then(() => {
          modalSvc.smData.reject("CANCEL");
        })
        .catch(() => {});
    }, 200);
  }

  return useObserver(() => (
    <View style={styles.container}>
      {modalSvc.simpleIsOpen && (
        <View style={styles.container}>
          <View style={styles.background}>
            <View style={styles.formArea}>
              <View style={[cardLayout, styles.cardCustom]}>
                <View style={[styles.header, { backgroundColor: bgColor }]}>
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
                <View style={styles.footer}>
                  {smData.okText && smData.deleteText && (
                    <TouchableNativeFeedback
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
                      background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
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
