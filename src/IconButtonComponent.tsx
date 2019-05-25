import React, { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BorderlessButton } from 'react-native-gesture-handler';
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

    const { disabledTextColor, pageBackground, dividerColor, rippleColor, pageBackgroundFilm
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { navItem } = this.props.uiTheme;
    const iconSize = this.props.iconSize || 30;
    const propStyle = this.props.style || {};
    const bSize = this.props.buttonSize || propStyle.width || iconSize;
    const bgColor = propStyle.backgroundColor || pageBackground;
    const bdrColor = this.props.disabled ? dividerColor : (this.props.borderColor || propStyle.borderColor || dividerColor);
    const iStyle = this.props.iconStyle || {};
    const iFill = this.props.disabled ? disabledTextColor : this.props.color;
    const raise = this.props.raised ? 2 : 0;


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

    if (this.props.label) {
      return ( 
        <BorderlessButton
          rippleColor={rippleColor}
          style={{flex: propStyle.flex, borderColor: bdrColor, backgroundColor: bgColor}}
          borderless={true}
          onPress={!this.props.disabled ? this.doOnPress : undefined}
        >
              <View style={{...styles.button, ...propStyle, ...{backgroundColor: 'transparent'}}}>
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
                <Text style={this.props.labelStyle}>{this.props.label}</Text>
              }
            </View>
        </BorderlessButton>
      )
    } else {
      return ( 
        <View style={styles.shadowArea}>
          <BorderlessButton
            rippleColor={rippleColor}
            style={{flex: propStyle.flex}}
            borderless={true}
            onPress={!this.props.disabled ? this.doOnPress : undefined}
          >
              <View style={{...styles.button, ...propStyle, ...{borderColor: bdrColor, backgroundColor: bgColor}}}>
                {this.props.icon &&
                  <SvgIcon 
                    size={iconSize}
                    style={[styles.icon, iStyle]}
                    widthAdj={0}
                    fill={iFill}
                    paths={APP_ICONS[this.props.icon]}
                  />
                }
              </View>
          </BorderlessButton>
        </View>
      )
    }
  }
}

export default IconButton;

