import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableNativeFeedback  } from 'react-native';
import { BorderlessButton} from 'react-native-gesture-handler';
import { observer, inject } from 'mobx-react';

import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import { ICON_BUTTON_Z_INDEX } from './App';
import { TrekInfo } from './TrekInfoModel';


@inject('uiTheme', 'trekInfo')
@observer
class IconButton extends Component<{ 
  icon   ?: string,
  iconSize ?: number,
  iconStyle ?: any,
  buttonSize ?: number,
  color ?: string,
  style ?: any,             // style for the button area
  borderColor ?: string,
  disabled ?: boolean,
  label ?: string,          // optional labe to go under the Icon
  labelStyle ?: any,        // style object for the label
  onPressFn ?: Function,    // function to execute (if not navigate) on button press
  onPressArg ?: any,
  raised ?: boolean,
  horizontal ?: boolean,    // align label to right of icon if true, under icon if false
  rippleColor ?: number,    // optional color for the ripple effect
  trekInfo ?: TrekInfo,
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

    const { disabledTextColor, pageBackground, dividerColor, rippleColor, navIconColor,
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const iconSize = this.props.iconSize || 30;
    const propStyle = this.props.style || {};
    const bSize = this.props.buttonSize || propStyle.width || iconSize;
    const bgColor = propStyle.backgroundColor || pageBackground;
    const bdrColor = this.props.disabled ? dividerColor : (this.props.borderColor || propStyle.borderColor || disabledTextColor);
    const iStyle = this.props.iconStyle || {};
    const iFill = this.props.disabled ? disabledTextColor : this.props.color;
    const raise = this.props.raised ? 2 : undefined;
    const ripple = this.props.rippleColor !== undefined ? this.props.rippleColor : rippleColor


    const styles = StyleSheet.create({
      button: {
        zIndex: ICON_BUTTON_Z_INDEX,
        width: propStyle.flex ? undefined : bSize,
        height: bSize,
        alignItems: "center",
        justifyContent: "center",
        elevation: raise,
      },
      icon: {
        backgroundColor: "transparent"
      },
      shadowArea: {
        width: bSize + 10,
        height: bSize + 10,
        borderRadius: (bSize + 10) / 2,        
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      },
    });

    if (!this.props.horizontal) {
      return ( 
        <View style={{flexDirection: "column", alignItems: "center", justifyContent: "center"}}>
          {this.props.icon &&
            <View style={styles.shadowArea}>
              <BorderlessButton
                rippleColor={ripple}
                style={{flex: propStyle.flex, borderColor: bdrColor, backgroundColor: "transparent"}}
                borderless={true}
                onPress={(!this.props.disabled && this.props.onPressFn) ? this.doOnPress : undefined}
              >
                <View style={{...styles.button, ...propStyle, 
                              ...{borderColor: bdrColor, backgroundColor: bgColor}}}>
                  <SvgIcon 
                    size={iconSize}
                    style={[styles.icon, iStyle]}
                    widthAdj={0}
                    fill={iFill}
                    paths={APP_ICONS[this.props.icon]}
                  />
                </View>
              </BorderlessButton>
            </View>
          }
          {this.props.label &&
            <Text style={[{color: navIconColor}, this.props.labelStyle]}>{this.props.label}</Text>
          }
        </View>
      )
    } else {
      return ( 
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.Ripple(ripple, false)}
          onPress={(!this.props.disabled && this.props.onPressFn) ? this.doOnPress : undefined}
          >
          <View style={{...styles.button, ...propStyle, 
                        ...{borderColor: bdrColor, backgroundColor: bgColor}}}>
            {this.props.icon &&
              <SvgIcon 
                size={iconSize}
                style={[styles.icon, iStyle]}
                widthAdj={0}
                fill={iFill}
                paths={APP_ICONS[this.props.icon]}
              />
            }
            {this.props.label &&
              <Text style={[{color: navIconColor}, this.props.labelStyle]}>{this.props.label}</Text>
            }
          </View>
        </TouchableNativeFeedback>
      )
    }
  }
}

export default IconButton;

