import React from 'react';
import { observer, inject } from 'mobx-react';
import { View, StyleSheet, Text, TouchableNativeFeedback, TouchableWithoutFeedback } from 'react-native';

import { BACKDROP_Z_INDEX, CONFIRM_Z_INDEX } from './App';
import SvgIcon from './SvgIconComponent';
import { ModalModel } from './ModalModel';
import { APP_ICONS } from './SvgImages';

// dialog used for basic NOTICES and CONFIRMATIONS

@inject('modalSvc', 'uiTheme')
@observer
class GoalAchievedModal extends React.Component<{   
  modalSvc   ?: ModalModel,
  uiTheme    ?: any,
}, {} > {

  // call the resolve method
  close = (response = 'OK') => {
    setTimeout(() => {
      this.props.modalSvc.closeGoalNoticeModal(400)
      .then(() => {
        this.props.modalSvc.gnmData.resolve(response);      
      })
      .catch(() => {})
    }, 200);
  }

  // call the reject method
  dismiss = () => {
    setTimeout(() => {
      this.props.modalSvc.closeGoalNoticeModal(400)
      .then(() => {
        this.props.modalSvc.gnmData.reject('CANCEL');      
      })
      .catch(() => {})
    }, 200);
  }
  
  render() {

    const gnmData = this.props.modalSvc.gnmData;
    const contentLines = this.props.modalSvc.goalNoticeIsOpen && this.props.modalSvc.gnmData.content.split('\n');
    const { highTextColor, goalGold, mediumTextColor } = this.props.uiTheme.palette;
    const { cardLayout } = this.props.uiTheme;          
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      background: {
        ... StyleSheet.absoluteFillObject,
        zIndex: BACKDROP_Z_INDEX,
        backgroundColor: "rgba(0,0,0,.4)"
      },
      cardCustom: {
        marginTop: 140,
        elevation: 2,
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
        fontSize: 28,
        marginLeft: 10,
      },
      body: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 100
      },
      bodyText: {
        fontSize: 18,
        fontStyle: "italic",
        color: mediumTextColor,
      },
      itemList: {
        fontSize: 20,
        color: highTextColor,
      },
      footer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        height: 40,
        marginTop: 10,
        backgroundColor: cardLayout.backgroundColor,
      },
      actionButton: {
        minWidth: 100,
        height: 30,
        paddingHorizontal: 10,
        backgroundColor: goalGold,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
      },
      button: {
        color: "white",
        fontSize: 18
      }
    })
    return (
      <View style={styles.container}>
        {this.props.modalSvc.goalNoticeIsOpen &&
          <View style={styles.container}>
            <TouchableWithoutFeedback                 
              onPress={(gnmData.allowOutsideCancel === true) ? this.dismiss : undefined}
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
                <TouchableNativeFeedback
                  background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                  onPress={this.close.bind(this, gnmData.okText)}
                >
                  <View style={styles.actionButton}>
                    <Text style={styles.button}>{gnmData.okText}</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          </View>
        }
      </View>
    )
  }
}

export default GoalAchievedModal;
