import React, { useContext} from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { G, Line, Text } from 'react-native-svg'

import { UiThemeContext } from "./App";
export const YAXIS_DATA_TYPES = ['Number', 'String', 'Time', 'Dist'];
export const YAXIS_TYPE_MAP = {
  dist: 'Number',
  Dist: 'Number',
  time: 'Time',
  Time: 'Time',
  cals: 'Number',
  Cals: 'Number',
  steps: 'Number',
  Steps: 'Number',
  speed: 'Number',
  Speed: 'Number',
  pace: 'Time',
  Date: 'String'
}

// Functional component to draw a scale for the y-axis of a graph

function SvgYAxis({
  title= undefined,             // optional title for the scale (space must be included in axisWidth)
  graphHeight,                  // height of associated graph
  axisWidth,                    // width of scale
  axisTop,                      // top of scale
  axisBottom,                   // bottom of scale
  color,                        // color for scale lines
  lineWidth = undefined,        // width of lines (1)
  dataType,                     // type of data ["Time", "Dist", "String", "Number"]
  dataRange,                    // range of values for the graph data
  majorTics,                    // number of major scale tics
}) {
    const uiTheme: any = useContext(UiThemeContext);
  
    const adjWidth = axisWidth - 3;
    const axisHeight = axisTop - axisBottom;
    const majorTicDist = axisHeight / (majorTics - 1);
    const strokeWidth = lineWidth || 1;
    const majorTicWidth = 5;
    const majorTicStart = adjWidth - majorTicWidth;
    const lastIndex = majorTics - 1;

    const { fontLight, fontRegular } = uiTheme;

    const getTickValues = (rng) => {
      let tickValues = [];
      let nRanges = majorTics - 1;
      let rSize = rng.range / nRanges;
      let precision = rng.range < 1 ? 100 : (rng.range > 10 ? 1 : 10);
      for(let i=0; i<majorTics; i++) {
        tickValues.push(Math.round((rng.max - (rSize * i)) * precision) / precision);
      }
      return tickValues;
    }

    const fomratTime = (sec) => {      
      sec = Math.round(sec);
      let s = sec % 60;
      let m = Math.trunc(sec / 60) % 60;
      let h = Math.trunc(sec / 3600);
      let lzm = m < 10 ? '0' : '';
      let lzs = s < 10 ? '0' : '';
      return ((h ? h + ':' : '') + lzm + m + ':' + lzs + s);
    }

    const labels = () => {
      let rng = dataRange;
      return (
        getTickValues(rng).map((item, index) => {
          switch(dataType){
            case 'Number':
              return (index === lastIndex || item !==0 ) ? item.toString() : '';
            case 'String':
              return item;
            case 'Time':
              return (index === lastIndex || item !==0 ) ? fomratTime(item) : '';
          }
        })
      )
    }

    const majors = () => {
      let l = [];
      for(let i=0; i<=lastIndex; i++) {
        l.push(i);
      }
      return l;
    }   

    const startY = 5;
    const styles = StyleSheet.create({
      container: {
        position: "absolute",
        top: graphHeight - axisTop - 5,
        left: 0,
        bottom: 0,
        width: axisWidth,
      },
    });

    return (
      <View style={styles.container}>
        <Svg width={axisWidth} height={axisHeight + 10}>
          <G>
            <Line
              x1={adjWidth}
              y1={startY}
              x2={adjWidth}
              y2={(startY + axisHeight)}
              stroke={color}
              strokeWidth={strokeWidth}
            />
            {/* draw major tics */}
            {majors().map((n, i) => 
                <Line
                  key={i}
                  x1={majorTicStart}
                  y1={startY + (i === lastIndex ? (axisHeight - 1) : (n * majorTicDist))}
                  x2={adjWidth}
                  y2={startY + (i === lastIndex ? (axisHeight - 1) : (n * majorTicDist))}
                  stroke={color}
                  strokeWidth={strokeWidth}
                />
              )
            }
            {/* draw labels */}
            {labels().map((l, i) => 
                <Text
                  key={i}
                  fill={color}
                  stroke="none"
                  fontSize="12"
                  fontFamily={fontLight}
                  x={axisWidth - majorTicWidth - 5}
                  y={ startY + 4 + (i === lastIndex ? (axisHeight - 1) : (i * majorTicDist))}
                  textAnchor="end">
                  {l}
                </Text>
              )
            }
            {title &&
              <Text
                fill={color}
                stroke="none"
                fontSize="14"
                rotation={270}
                x={-(startY + (axisHeight / 2))}
                y={15}
                fontFamily={fontRegular}
                textAnchor="middle">
                {title}
              </Text>
            }
          </G>
        </Svg>
      </View>
    )
}

export default React.memo(SvgYAxis);