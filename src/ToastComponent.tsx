import React from 'react';
import { observer, inject } from 'mobx-react'
import { View, StyleSheet, Text } from 'react-native'

import { TOAST_Z_INDEX } from './App';
import SvgIcon  from './SvgIconComponent';
import { ToastModel } from './ToastModel'
import { APP_ICONS } from './SvgImages'

export const TOAST_ICON_SIZE = 30;

// Toast component used for basic NOTICES, WARNINGS and CONFIRMATIONS

@inject('toastSvc')
@observer
class Toast extends React.Component<{   
  toastSvc   ?: ToastModel
}, {} > {

  
  render() {

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      toast: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        left: 10,
        height: 50,
        width: 325,
        elevation: 5,
        borderStyle: "solid",
        borderWidth: 0,
        borderRadius: 10,
        // borderColor: this.props.toastSvc.tData.bColor,
        backgroundColor: this.props.toastSvc.tData.tColor,
        zIndex: TOAST_Z_INDEX,
      },
      bottom: {
        bottom: 70
      },
      top: {
        top: 125
      },
      contentText: {
        marginLeft: 15,
        color: "white",
        fontSize: 20
      }
    })
    return (
      <View style={styles.container}>
        {this.props.toastSvc.toastIsOpen &&
            <View style={[styles.toast, styles.bottom]}>
              <SvgIcon 
                  size={TOAST_ICON_SIZE}
                  widthAdj={0}
                  fill={this.props.toastSvc.tData.iColor}
                  paths={APP_ICONS[this.props.toastSvc.tData.icon]}
                  style={{marginLeft: 10}}
              />
              <Text style={styles.contentText}>{this.props.toastSvc.tData.content}</Text>
            </View>
        }
      </View>
    )
  }
}

export default Toast;
