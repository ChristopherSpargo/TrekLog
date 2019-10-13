import React, { useContext, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Dimensions, BackHandler } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'

import { TOAST_Z_INDEX, semitransWhite_3, ToastSvcContext, UiThemeContext, TrekInfoContext } from './App';
import SvgIcon  from './SvgIconComponent';
import { ToastModel } from './ToastModel'
import { APP_ICONS } from './SvgImages'
import { TrekInfo } from './TrekInfoModel';

export const TOAST_ICON_SIZE = 30;

// Toast component used for basic NOTICES, WARNINGS and CONFIRMATIONS

function Toast({toastOpen}) {

  const bHandler = useRef(false);
  const toastSvc: ToastModel = useContext(ToastSvcContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const uiTheme: any = useContext(UiThemeContext);
  const timerId = useRef(undefined);
  const tData = toastSvc.tData;

  const onBackButtonPressToast = useCallback(
    () => {
      callClose();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(toastOpen && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressToast); 
      bHandler.current = true;
    }
    if (toastOpen) {
      startCloseTimer();
    }
  },[toastOpen])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressToast);
    bHandler.current = false;
  }

  function callClose() {
    removeListeners();
    if(timerId.current !== undefined) {
      window.clearTimeout(timerId.current);
      timerId.current = undefined;
    }
    requestAnimationFrame(() => {
      toastSvc.closeToast();
    })
  }

  function startCloseTimer() {
    if (!tData.waitForOK){
      timerId.current = window.setTimeout(() => {
        timerId.current = undefined;
        callClose();
      }, tData.time)
    }
  }
  
    const {width} = Dimensions.get('window');
    const toastWidth = width - 20;
    const { roundedLeft, roundedRight, fontRegular } = uiTheme;
    const { primaryColor, rippleColor, textOnPrimaryColor, footerButtonText,
          } = uiTheme.palette[trekInfo.colorTheme];
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      toast: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        left: 10,
        minHeight: 55,
        width: toastWidth,
        paddingTop: 0,
        paddingBottom: 0,
        elevation: 5,
        borderStyle: "solid",
        borderWidth: 0,
        backgroundColor: tData.tColor,
        zIndex: TOAST_Z_INDEX,
        ...roundedLeft, ...roundedRight
      },
      bottom: {
        bottom: 70
      },
      top: {
        top: 125
      },
      content: {
        flex: 1,
        paddingTop: 5,
        paddingBottom: 10,
        paddingRight: 5,
        marginLeft: 15,
        flexWrap: "wrap",
      },
      contentText: {
        color: "white",
        fontSize: 20,
        fontFamily: fontRegular,
      },
      okArea: {
        width: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primaryColor,
        borderLeftWidth: 1,
        borderStyle: "solid",
        borderColor: semitransWhite_3,
        ...roundedRight
      },
      okButton: {
        flex: 1,
        justifyContent: "center",
        paddingLeft: 5,
        paddingRight: 10,
      }
    })
    return (
      <View style={styles.container}>
        {toastSvc.toastIsOpen &&
            <View style={[styles.toast, styles.bottom]}>
              <SvgIcon 
                  size={TOAST_ICON_SIZE}
                  widthAdj={0}
                  fill={tData.iColor}
                  paths={APP_ICONS[tData.icon]}
                  style={{marginLeft: 10}}
              />
              <View style={styles.content}>
                <Text style={styles.contentText}>{tData.content}</Text>
              </View>
              { toastSvc.tData.waitForOK &&
                <View style={[styles.okArea]}>
                  <RectButton
                    rippleColor={rippleColor}
                    onPress={callClose}
                  >
                      <View style={styles.okButton}>
                        <Text style={[footerButtonText, { color: textOnPrimaryColor }]}>OK</Text>
                      </View>
                  </RectButton>
                </View>
              }
            </View>
        }
      </View>
    )
}

export default Toast;
