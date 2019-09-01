import React from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { G, Line } from 'react-native-svg'

// Functional component to draw grid lines for a graph

function SvgGrid({
  graphHeight,                  // height of assocaited graph
  gridWidth,                    // width of grid
  maxBarHeight,                 // height of grid
  minBarHeight,                 // minimum bar height (lowest grid line)
  color,                        // color for grid line
  lineWidth = undefined,        // width of grid line (defaults to 1)
  lineCount,                    // number of grid lines
}) {
  
    const gridHeight = maxBarHeight - minBarHeight;
    const lineSpace = gridHeight  / (lineCount + 1);
    const strokeWidth = lineWidth || 1;
    const lines = () => {
      let l = [];
      for(let i=1; i<=lineCount; i++) {
        l.push(i);
      }
      return l;
    }
    // alert("rendering grid")
      // alert(gridHeight + '\n' + 
      //       gridWidth + '\n' + 
      //       lineSpace + '\n' + 
      //       strokeWidth + '\n' + 
      //       color + '\n' + 
      //       lineCount + '\n' + 
      //       JSON.stringify(lines(),null,2))
    

    const styles = StyleSheet.create({
      container: {
        position: "absolute",
        top: graphHeight - maxBarHeight,
        left: 0,
        right: 0,
        height: gridHeight,
      },
    });

    return (
      <View style={styles.container}>
        <Svg width={gridWidth} height={gridHeight}>
          <G>
            <Line
              x1={0}
              y1={1}
              x2={gridWidth - 1}
              y2={1}
              stroke={color}
              strokeWidth={strokeWidth}
            />
            {lines().map((n, i) => 
                  <Line
                    key={i}
                    x1={0}
                    y1={(n * lineSpace)}
                    x2={gridWidth - 1}
                    y2={(n * lineSpace)}
                    stroke={color}
                    strokeWidth={strokeWidth}
                  />
              )
            }
            <Line
              x1={0}
              y1={gridHeight-1}
              x2={gridWidth - 1}
              y2={gridHeight-1}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </G>
        </Svg>
      </View>
    )
}

export default React.memo(SvgGrid);