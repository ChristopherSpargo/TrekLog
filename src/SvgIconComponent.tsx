import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop } from 'react-native-svg'
import { observer, inject } from 'mobx-react';

@inject('uiTheme')
@observer
class SvgIcon extends Component<{
  uiTheme     ?: any,
  style       ?: any,             // styling for the container
  fill        ?: string,          // color for the svg image
  fillPct     ?: number,          // percent to fill when using gradient
  stroke      ?: string,          // color for the svg outline
  strokeWidth ?: number,          // width of the svg outline
  paths       ?: any[],           // svg paths for the image
  size        ?: number,          // size of the image
  widthAdj    ?: number           // width adjustment
  xOffset     ?: number,          // offset for image in x direction
  yOffset     ?: number,          // offset for image in y direction
}, {} > {


  render() {

    const iconAreaSize = this.props.size || 48;
    const propStyle = this.props.style || {};
    const iconSize = this.props.paths[0].size;
    const scaleAdj = this.props.paths[0].scaleAdj ? this.props.paths[0].scaleAdj : 1;
    const scale = (iconAreaSize / iconSize) * scaleAdj;
    const offset = (scale < 1) ? ((iconAreaSize - (iconSize * scale)) / 2) : 0;
    const xOff = this.props.xOffset === undefined ? offset : this.props.xOffset;
    const yOff = this.props.yOffset === undefined ? offset : this.props.yOffset;
    const wAdj = this.props.widthAdj ? this.props.widthAdj : 0;
    const pctWhite = (this.props.fillPct !== undefined) ? Math.round((1 - this.props.fillPct)*100) : 0;
    const pct1 = pctWhite.toString() + '%';
    const pct2 = (pctWhite === 100 ? 0 : pctWhite + 1).toString() + '%';
    const sColor = pctWhite === 100 ? "rgb(255,255,255)" : "rgb(230, 195, 0)";

    const styles = StyleSheet.create({
      container: {
        width: iconAreaSize,
        height: iconAreaSize,
        backgroundColor: "transparent",
      },
    });

    return (
      <View style={[styles.container, propStyle]}>
        <Svg width={iconAreaSize + wAdj} height={iconAreaSize}>
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset={pct1} stopColor="rgb(255,255,255)" stopOpacity="1" />
                <Stop offset={pct2} stopColor={sColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={sColor} stopOpacity="1" />
            </LinearGradient>     
          </Defs>       
          <G>
            {this.props.paths.map((p, i) => 
                <Path key={i}
                  d={p.d}
                  x={xOff}
                  y={yOff}
                  scale={scale}
                  fill={this.props.fill || p.fill}
                  strokeWidth={this.props.strokeWidth}
                  stroke={this.props.stroke || p.stroke}
                />
              )
            }
          </G>
        </Svg>
      </View>
    )
  }

}

export default SvgIcon;