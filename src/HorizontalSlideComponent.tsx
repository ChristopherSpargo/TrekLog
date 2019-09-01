import React, { useState, useEffect, useRef } from "react";
import { Animated } from 'react-native';
import { AnimatedValue } from "react-navigation";

function HorizontalSlideView({ 
  endValue = undefined,
  style = undefined,      
  duration = undefined,   
  children
}) {
  const [scaleAnim] = useState<AnimatedValue>(new Animated.Value(endValue));
  const currValue = useRef();

  useEffect(() => {      
    if (endValue !== currValue.current){
      currValue.current = endValue;
      slide();
    }           
  },[endValue]);


  function slide() {
    Animated.timing(                          // Animate over time
      scaleAnim,                              // The animated value to drive
      {
        toValue: endValue,                    // Animate to final marginLeft
        duration: duration,
        useNativeDriver: true,
      }       
    ).start();                                // Starts the animation
  }

    return (
      <Animated.View                          // Special animatable View
        style={{
          ...style,
          transform: [{translateX: scaleAnim}]    // Bind translateX to animated value
        }}
      >
        {children}
      </Animated.View>
    );
}

export default React.memo(HorizontalSlideView);