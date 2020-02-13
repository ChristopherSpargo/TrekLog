import React, { useContext, useState, useEffect, useCallback } from "react";
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
  UiThemeContext
} from "./App";
import { APP_ICONS } from "./SvgImages";
import CheckboxGroup from './CheckboxGroupComponent';
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";
import { MainSvc } from "./MainSvc";

// dialog used for item selection from a list

function CheckboxPicker({pickerOpen}) {
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
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
    disabledTextColor,
    textOnPrimaryColor,
    footerTextColor,
    footerButtonText,
    shadow1,
    altCardBackground,
  } = uiTheme.palette[mainSvc.colorTheme];
  const { cardLayout, roundedTop, roundedBottom, footer, footerButton, 
          fontRegular } = uiTheme;
  const headerHeight = 50;
  const canClose = this.allowNone || haveSelections();

  const onBackButtonPressCPicker = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

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
      // borderStyle: "solid",
      // borderBottomColor: dividerColor,
      // borderBottomWidth: 1,
      backgroundColor: primaryColor
    },
    title: {
      color: textOnPrimaryColor,
      fontFamily: fontRegular,
      fontSize: 22
    },
    body: {
      flexDirection: "column",
      // paddingVertical: 8
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
      ...footer,
      ...{borderTopColor: dividerColor, backgroundColor: primaryColor}
    },
    rgItem: {
      paddingVertical: 5,
      backgroundColor: altCardBackground,
      paddingRight: 15,
      paddingLeft: 30,
      ...shadow1
    },
    rgItem1: {
      paddingVertical: 5,
      backgroundColor: altCardBackground,
      paddingRight: 15,
      paddingLeft: 30,
      ...shadow1,
      marginTop: 0,
    },
    rgLabel: {
      color: highTextColor,
      fontFamily: fontRegular,
      fontSize: 22,
      paddingLeft: 30,
      paddingRight: 30,
      flex: 1
    }
  });

  useEffect(() => {                       // componentDidUpdate
    if(pickerOpen) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressCPicker);  
    }
  },[pickerOpen])

  useEffect(() => {
    if (mData.selections.length && !selections.length){
      setSelections([...mData.selections]);
    }
  });

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressCPicker);
  }

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
          removeListeners();
          modalSvc.cpData.resolve(result);
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
        .closeCheckboxPicker(400)
        .then(() => {
          setSelections([]);     // clear the local selection so it will be updated from mData in useEffect
          removeListeners();
          modalSvc.cpData.reject("CANCEL");
        })
        .catch(() => {
          removeListeners();
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
                      <CheckboxGroup
                        onChangeFn={changeSelections}
                        selections={selections}
                        itemStyle={styles.rgItem}
                        item1Style={styles.rgItem1}
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
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={dismiss}>
                      <View style={footerButton}>
                        <Text
                          style={{...footerButtonText, ...{color: textOnPrimaryColor}}}
                        >
                          {mData.cancelText}
                        </Text>
                      </View>
                    </RectButton>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={canClose ? close : undefined}>
                      <View style={footerButton}>
                        <Text
                          style={{...footerButtonText, ...{ color: canClose ? textOnPrimaryColor : disabledTextColor }}}
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

export default CheckboxPicker;
