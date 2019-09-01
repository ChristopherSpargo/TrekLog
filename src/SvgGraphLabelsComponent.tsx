import React from 'react'
import Svg, { G, Text, TextAnchor } from 'react-native-svg'
import { fontFamilyLight } from './App';


// Functional component to draw a label

function SvgGraphLabel({
  labelText,
  width,
  height,
  labelStyle,
  labelAngle
}) {
    let xOff, yOff;
    let anchor : TextAnchor = "middle";
    // alert('rendering graphLabels')

    switch(labelAngle){   // now for a little weirdness (trial-and-error)
      case 0:
        xOff = width/2;
        yOff = 12;
        break;
      case 90:
        xOff = height/2;
        yOff = -width/2 + 3.5;
        break;
      case 287:
        xOff = -height/2 + 5;
        yOff = width/2 + 12;
    }

    return (
      <Svg width={width} height={height}>
        <G>          
          <Text
            fill={labelStyle.color}
            stroke="none"
            fontSize={labelStyle.fontSize}
            fontFamily={labelStyle.fontFamily || fontFamilyLight}
            rotation={labelAngle}
            x={xOff}
            y={yOff}
            textAnchor={anchor}>
            {labelText}
          </Text>
        </G>
      </Svg>
    )
}

export default React.memo(SvgGraphLabel);