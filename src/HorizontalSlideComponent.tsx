import React, { useState, useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from 'react-native';
import { AnimatedValue } from "react-navigation";

function HorizontalSlideView({ 
  index,
  width,
  offset,
  underlineWidth,
  underlineMarginTop,
  style = undefined,      
  duration = undefined,   
  color,
}) {
  const currValue = useRef(index * width + offset - Math.min(index, 1))
  const [scaleAnim] = useState<AnimatedValue>(new Animated.Value(currValue.current));

  useEffect(() => {      
      currValue.current = index * width + offset - Math.min(index, 1);
      slide();
  },[index, width, underlineWidth]);


  function slide() {
    Animated.timing(                          // Animate over time
      scaleAnim,                              // The animated value to drive
      {
        toValue: currValue.current,           // Animate to final marginLeft
        duration: duration,
        useNativeDriver: true,
      }       
    ).start();                                // Starts the animation
  }

  const styles = StyleSheet.create({
    statTypeUnderline: {
      marginTop: underlineMarginTop,
      width: underlineWidth,
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: color,
    }
  })

return (
      <Animated.View                          // Special animatable View
        style={{
          ...style,
          transform: [{translateX: scaleAnim}]    // Bind translateX to animated value
        }}
      >
        <View style={styles.statTypeUnderline}/>
      </Animated.View>
    );
}

export default React.memo(HorizontalSlideView);