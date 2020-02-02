import React, { useContext, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, Text, TouchableWithoutFeedback, BackHandler } from 'react-native';
import { useObserver } from "mobx-react-lite";

import { BACKDROP_Z_INDEX, CONFIRM_Z_INDEX, ModalSvcContext, UiThemeContext, MainSvcContext } from './App';
import SvgIcon from './SvgIconComponent';
import { ModalModel } from './ModalModel';
import { APP_ICONS } from './SvgImages';
import IconButton from './IconButtonComponent';
import { MainSvc } from "./MainSvc";

// dialog used for basic NOTICES and CONFIRMATIONS

function GoalAchievedModal({goalsMetOpen}) {

  const bHandler = useRef(false);
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const uiTheme: any = useContext(UiThemeContext);

  const onBackButtonPressGoalsMet = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(goalsMetOpen && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressGoalsMet); 
      bHandler.current = true;
    }
  },[goalsMetOpen])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressGoalsMet);
    bHandler.current = false;
  }

  // call the resolve method
  function close(response = 'OK') {
    setTimeout(() => {
      modalSvc.closeGoalNoticeModal(400)
      .then(() => {
        removeListeners();
        modalSvc.gnmData.resolve(response);      
      })
      .catch(() => {
        removeListeners();
      })
    }, 200);
  }

  // call the reject method
  function dismiss() {
    setTimeout(() => {
      modalSvc.closeGoalNoticeModal(400)
      .then(() => {
        removeListeners();
        modalSvc.gnmData.reject('CANCEL');      
      })
      .catch(() => {
        removeListeners();
      })
    }, 200);
  }
  
    const gnmData = modalSvc.gnmData;
    const contentLines = modalSvc.goalNoticeIsOpen && modalSvc.gnmData.content.split('\n');
    const { highTextColor, goalGold, mediumTextColor, pageBackground, contrastingMask_3
          } = uiTheme.palette[mainSvc.colorTheme];
    const { cardLayout, fontRegular, fontItalic } = uiTheme;          
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      background: {
        ... StyleSheet.absoluteFillObject,
        zIndex: BACKDROP_Z_INDEX,
        backgroundColor: contrastingMask_3,
      },
      cardCustom: {
        marginTop: 140,
        elevation: 2,
        backgroundColor: pageBackground,
        zIndex: CONFIRM_Z_INDEX,
      },
      interiorBorder1: {
        position: "absolute",
        left: 4,
        right: 4,
        top: 4,
        bottom: 4,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: goalGold,
      },
      interiorBorder2: {
        position: "absolute",
        left: 5,
        right: 5,
        top: 5,
        bottom: 5,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: highTextColor,
      },
      interiorBorder3: {
        position: "absolute",
        left: 6,
        right: 6,
        top: 6,
        bottom: 6,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: goalGold,
      },
      rowCenter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      title: {
        color: mediumTextColor,
        fontSize: 30,
        fontFamily: fontRegular,
        marginLeft: 10,
      },
      body: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 100
      },
      bodyText: {
        fontSize: 20,
        fontFamily: fontItalic,
        color: mediumTextColor,
      },
      itemList: {
        fontSize: 22,
        fontFamily: fontRegular,
        color: highTextColor,
      },
      footer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        height: 40,
        marginTop: 10,
        backgroundColor: pageBackground,
      },
      actionButton: {
        minWidth: 120,
        height: 30,
        paddingHorizontal: 10,
        backgroundColor: pageBackground,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
      },
      button: {
        color: goalGold,
        fontFamily: fontRegular,
        fontSize: 20
      }
    })
    return useObserver(() => (
      <View style={styles.container}>
        {goalsMetOpen &&
          <View style={styles.container}>
            <TouchableWithoutFeedback                 
              onPress={(gnmData.allowOutsideCancel === true) ? dismiss : undefined}
            >
              <View style={styles.background}/>
            </TouchableWithoutFeedback>
            <View style={[cardLayout, styles.cardCustom]}>
              <View style={styles.interiorBorder1}/>
              <View style={styles.interiorBorder2}/>
              <View style={styles.interiorBorder3}/>
              <View style={styles.rowCenter}>
                <SvgIcon 
                  paths={APP_ICONS.Certificate}
                  size={64}
                  fill={goalGold}
                />
                <Text style={styles.title}>{gnmData.heading}</Text>
              </View>
              <View style={styles.body}>
                {contentLines.map((line, indx) =>
                  <Text key={indx} style={styles.bodyText}>{line}</Text>
                )
                }
                {gnmData.itemList.map((item, indx) =>
                  <Text key={indx} style={styles.itemList}>{item.goalStmt}</Text>
                 )
                }
              </View>
              <View style={styles.footer}>
                <IconButton
                  label={gnmData.okText}
                  horizontal
                  onPressFn={close}
                  onPressArg={gnmData.okText}
                  style={styles.actionButton}
                  labelStyle={styles.button}
                />
              </View>
            </View>
          </View>
        }
      </View>
    ))
}

export default GoalAchievedModal;
