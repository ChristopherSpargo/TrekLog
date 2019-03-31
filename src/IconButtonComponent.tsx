import React, { Component } from 'react'
import { View, StyleSheet, TouchableNativeFeedback, Text } from 'react-native'
import { observer, inject } from 'mobx-react'

import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import { NAV_ITEM_SIZE, ICON_BUTTON_Z_INDEX } from './App';


@inject('uiTheme')
@observer
class IconButton extends Component<{ 
  icon   ?: string,
  iconSize ?: number,
  iconStyle ?: any,
  buttonSize ?: number,
  color ?: string,
  style ?: any,
  disabled ?: boolean,
  label ?: string,          // optional labe to go under the Icon
  labelStyle ?: any,        // style object for the label
  onPressFn ?: Function,    // function to execute (if not navigate) on button press
  onPressArg ?: any,
  raised ?: boolean,
  uiTheme ?: any,
}, {} > {

  menuOpen = false;

  doOnPress = () => {
    if (this.props.onPressFn) {
      requestAnimationFrame(() => {
        this.props.onPressFn(this.props.onPressArg);
      })
    } 
  }

  render() {

    const { disabledTextColor } = this.props.uiTheme.palette;
    const { navItem } = this.props.uiTheme;
    const iconSize = this.props.iconSize || 30;
    const propStyle = this.props.style || {};
    const iStyle = this.props.iconStyle || {};
    const iFill = this.props.disabled ? disabledTextColor : this.props.color;
    const bSize = this.props.buttonSize || NAV_ITEM_SIZE;

    const styles = StyleSheet.create({
      menuButton: {
        zIndex: ICON_BUTTON_Z_INDEX,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      },
      shadowArea: {
        width: bSize,
        height: bSize,
        borderRadius: bSize/2,        
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: propStyle.borderColor || navItem.borderColor,
        alignItems: "center",
        justifyContent: "center",
      },
    });


    if (this.props.raised) {
      return ( 
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
          disabled={this.props.disabled}
          onPress={this.doOnPress}
        >
          <View style={[styles.shadowArea]}>
            <View style={[styles.menuButton, propStyle, 
                  { borderColor: 'transparent', elevation: 4}]}>
              {this.props.icon &&
                <SvgIcon 
                  size={iconSize}
                  style={[iStyle]}
                  widthAdj={0}
                  fill={iFill}
                  paths={APP_ICONS[this.props.icon]}
                />
              }
              {this.props.label &&
                <Text style={this.props.labelStyle}>{this.props.label}</Text>
              }
            </View>
          </View>
        </TouchableNativeFeedback>
      )}
    else {
      return (
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
          disabled={this.props.disabled}
          onPress={this.doOnPress}
        >
          <View style={[styles.menuButton, propStyle]}>
            {this.props.icon &&
              <SvgIcon 
                size={iconSize}
                style={iStyle}
                widthAdj={0}
                fill={iFill}
                paths={APP_ICONS[this.props.icon]}
              />
            }
            {this.props.label &&
              <Text style={this.props.labelStyle}>{this.props.label}</Text>
            }
          </View>
        </TouchableNativeFeedback>
      )
    }

  }

}

export default IconButton;

