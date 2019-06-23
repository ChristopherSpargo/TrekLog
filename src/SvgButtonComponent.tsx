import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { BorderlessButton, LongPressGestureHandler, State } from 'react-native-gesture-handler'
import { observer, inject } from 'mobx-react';
import SvgIcon from './SvgIconComponent';
import { TrekInfo } from './TrekInfoModel';

@inject('uiTheme', 'trekInfo')
@observer
class SvgButton extends Component<{
  uiTheme ?: any,
  trekInfo ?: TrekInfo,
  value ?: string,          // value of the current selection
  onPressFn ?:  Function,   // call this when button pressed
  onLongPressFn ?: Function, // call this when botton longPressed
  style ?: any,             // styling for the container
  fill ?: string,           // color for the svg image
  stroke ?:  string,        // color for the svg outline
  path ?:   any[],         // svg path for the imiage
  size ?: number,           // size of the the button the image will be smaller
  areaOffset ?: number,     // amount to shrink the button image by (10 is default)
  highlight ?: boolean,     // true if this button is to show a highlight border
  highlightColor ?: string, // color for highlight border (defaults to purple-ish)
  elevWithHighlight ?: boolean,  // true if elevate button with highlight
  svgWidthAdj ?: number,    // amount to add to the SVG width property
  pathXAdj ?: number,       // amount to add to the path x position
  borderWidth ?: number,    // optional border width spec
}, {} > {


  buttonPressed = () => {
    this.props.onPressFn(this.props.value);
  }

  buttonLongPressed = ({ nativeEvent }) => {
    if (nativeEvent.state === State.ACTIVE) {
      if(this.props.onLongPressFn){
        this.props.onLongPressFn(this.props.value);
      }
    }
  }

  render() {
    const { highlightColor, dividerColor, rippleColor 
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];

    const areaOffset = this.props.areaOffset === undefined ? 10 : this.props.areaOffset;
    const iconAreaSize = this.props.size || 50;
    const iconSize =  iconAreaSize - areaOffset;
    const iconOffset = this.props.borderWidth !== undefined ? this.props.borderWidth : 3;
    const propStyle = this.props.style || {};
    const widAdj = this.props.svgWidthAdj || 0;
    const fillColor = this.props.highlightColor ? 
                      (this.props.highlight ? this.props.highlightColor : dividerColor) :
                      this.props.fill;

    const styles = StyleSheet.create({
      container: {
        width: iconAreaSize,
        height: iconAreaSize,
        // borderRadius: 6,
        marginLeft: 6,
        marginRight: 6,
        backgroundColor: "transparent",
        borderWidth: this.props.borderWidth !== undefined ? this.props.borderWidth : 1,
        borderBottomWidth: this.props.borderWidth !== undefined ? this.props.borderWidth : 2,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      highlight: {
        borderBottomColor: this.props.highlightColor || highlightColor,
        borderBottomWidth: 2,
      },
      appIcon: {
        marginRight: 5,
        width: iconSize + widAdj,
        height: iconSize,
        backgroundColor: "transparent",
      },
    });

    const borderHighlight = this.props.highlight ? styles.highlight : {};
    
    return(
      <LongPressGestureHandler
            onHandlerStateChange={this.buttonLongPressed}
            minDurationMs={400}>
        <BorderlessButton rippleColor={rippleColor} onPress={this.buttonPressed}>
          <View style={[styles.container, propStyle, borderHighlight]}>
            <SvgIcon 
                style={styles.appIcon}
                size={iconSize}
                widthAdj={widAdj}
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