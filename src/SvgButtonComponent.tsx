import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { BorderlessButton, LongPressGestureHandler, State } from 'react-native-gesture-handler'
import { observer, inject } from 'mobx-react';
import SvgIcon from './SvgIconComponent';
import { MainSvc } from './MainSvc';

@inject('uiTheme', 'mainSvc')
@observer
class SvgButton extends Component<{
  uiTheme ?: any,
  mainSvc ?: MainSvc,
  value ?: string,          // value of the current selection
  onPressFn ?:  Function,   // call this when button pressed
  onLongPressFn ?: Function, // call this when botton longPressed
  style ?: any,             // styling for the container
  fill ?: string,           // color for the svg image
  stroke ?:  string,        // color for the svg outline
  path ?:   any[],         // svg path for the imiage
  size ?: number,           // size of the the button the image will be smaller
  areaOffset ?: number,     // amount to shrink the button image by (0 is default)
  highlight ?: boolean,     // true if this button is to show a highlight border
  highlightColor ?: string, // color for highlight border (defaults to purple-ish)
  elevWithHighlight ?: boolean,  // true if elevate button with highlight
  svgWidthAdj ?: number,    // amount to add to the SVG width property
  svgHeightAdj ?: number,    // amount to add to the SVG height property
  pathXAdj ?: number,       // amount to add to the path x position
  borderWidth ?: number,    // optional border width spec
  rippleColor ?: number,    // color for ripple effect
  disabled ?: boolean,      // don't respond to press if true
  repeats ?: number,        // interval to repeat onPressFn call if button longPressed
}, {} > {

  timerId : number;

  buttonPressed = (repeating = false) => {
    if(this.props.onPressFn && !this.props.disabled){
      this.props.onPressFn(this.props.value, repeating);
    }
  }

  buttonLongPressed = ({ nativeEvent }) => {
   if ( nativeEvent.state === State.ACTIVE || 
        nativeEvent.state === State.END || 
        nativeEvent.state === State.CANCELLED) {
      if (this.props.repeats) {
        this.togglOnPressedRepeater(nativeEvent.state === State.ACTIVE)
      } else {
        if(this.props.onLongPressFn){
          this.props.onLongPressFn(this.props.value, nativeEvent.state === State.ACTIVE);
        }
      }
    }
   }

  // start/stop repeatedly moving the selected marker
  togglOnPressedRepeater = (start: boolean) => {
    if (start && this.timerId === undefined) {
      this.timerId = window.setInterval(() => {
        this.buttonPressed(true);
      }, this.props.repeats)
    } else {
      if(!start){
        window.clearInterval(this.timerId);
        this.timerId = undefined;
      }
    }
  }


  render() {
    const { highlightColor, dividerColor, rippleColor, disabledTextColor
          } = this.props.uiTheme.palette[this.props.mainSvc.colorTheme];

    const areaOffset = this.props.areaOffset === undefined ? 0 : this.props.areaOffset;
    const iconAreaSize = this.props.size || 50;
    const iconSize =  iconAreaSize - areaOffset;
    const iconOffset = this.props.borderWidth !== undefined ? this.props.borderWidth : 0;
    const propStyle = this.props.style || {};
    const htAdj = this.props.svgHeightAdj || 0;
    const widAdj = this.props.svgWidthAdj || 0;
    const ripple = this.props.rippleColor !== undefined ? this.props.rippleColor : rippleColor;
    const fillColor = this.props.highlightColor ? 
                      (this.props.highlight ? this.props.highlightColor : dividerColor) :
                      (!this.props.disabled ? this.props.fill : disabledTextColor);

    const styles = StyleSheet.create({
      container: {
        width: iconAreaSize,
        height: iconAreaSize,
        // borderRadius: 6,
        marginLeft: 6,
        marginRight: 6,
        backgroundColor: "transparent",
        alignItems: "center",
        borderWidth: this.props.borderWidth !== undefined ? this.props.borderWidth : 0,
        borderBottomWidth: this.props.borderWidth !== undefined ? this.props.borderWidth : 0,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      highlight: {
        borderBottomColor: this.props.highlightColor || highlightColor,
        borderBottomWidth: 2,
      },
      appIcon: {
        width: iconSize + widAdj,
        height: iconSize + htAdj,
        backgroundColor: "transparent",
      },
    });

    const borderHighlight = this.props.highlight ? styles.highlight : {};
    
    return(
      <LongPressGestureHandler
            onHandlerStateChange={this.buttonLongPressed}
            minDurationMs={400}>
        <BorderlessButton rippleColor={ripple} onPress={this.buttonPressed}>
          <View style={[styles.container, propStyle, borderHighlight]}>
            <SvgIcon 
                style={styles.appIcon}
                size={iconSize}
                widthAdj={widAdj}
                heightAdj={htAdj}
                xOffset={iconOffset ? iconOffset : undefined}
                yOffset={iconOffset ? iconOffset : undefined}
                fill={fillColor}
                paths={this.props.path}
            />
          </View>
        </BorderlessButton>
      </LongPressGestureHandler>        
    )
  }

}

export default SvgButton;