import React, { Component } from 'react';
import { View, StyleSheet, TouchableNativeFeedback } from 'react-native';
// import Svg, { Path } from 'react-native-svg'
import { observer, inject } from 'mobx-react';
import SvgIcon from './SvgIconComponent';

@inject('uiTheme')
@observer
class SvgButton extends Component<{
  uiTheme ?: any,
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
    requestAnimationFrame(() => {
      this.props.onPressFn(this.props.value);
    });
  }

  buttonLongPressed = () => {
    requestAnimationFrame(() => {
      this.props.onLongPressFn(this.props.value);
    });
  }

  render() {
    const {  highlightColor, dividerColor } = this.props.uiTheme.palette;

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
        backgroundColor: "white",
        borderWidth: this.props.borderWidth !== undefined ? this.props.borderWidth : 1,
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
      <TouchableNativeFeedback 
        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
        onLongPress={this.buttonLongPressed}
        onPress={this.buttonPressed}>
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
      </TouchableNativeFeedback>
    )
  }

}

export default SvgButton;