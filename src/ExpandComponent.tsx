import React, { useState, useEffect } from "react";
import { Animated } from 'react-native';
import { AnimatedValue } from "react-navigation";

function ExpandView({ 
  startValue = undefined,
  endValue = undefined,
  bgColor = undefined,
  isOpen = undefined,
  style = undefined,      
  duration = undefined,   
  openDelay = undefined,
  closeDelay = undefined,
  beforeOpenFn = undefined,
  afterCloseFn = undefined,
  children
}) {
  const [scaleAnim] = useState<AnimatedValue>(new Animated.Value(startValue));

  useEffect(() => {             // componentDidMount
    close();           
  },[]);

  useEffect(() => {      
    isOpen ? open() : close();           
  },[isOpen]);


  function open() {
    if (beforeOpenFn) {
      beforeOpenFn();
    }
    Animated.timing(                          // Animate over time
      scaleAnim,                              // The animated value to drive
      {
        toValue: endValue,                    // Animate to final scale
        duration: duration,                   // Make it take a while
        delay: openDelay,
        useNativeDriver: true,
      }       
    ).start();                                // Starts the animation
  }

  function close() {
    Animated.timing(                          // Animate over time
      scaleAnim,                              // The animated value to drive
      {
        toValue: startValue,                  // Animate to starting opacity 
        duration: duration,                   // Make it take a while
        delay: closeDelay,
        useNativeDriver: true,         
      }
      ).start(afterCloseFn ? afterCloseFn : undefined);  // Starts the animation
    }

    return (
      <Animated.View                          // Special animatable View
        style={{
          ...style,
          backgroundColor: bgColor,
          transform: [{scale: scaleAnim}]    // Bind scale transform to animated value
        }}
      >
        {children}
      </Animated.View>
    );
}

export default ExpandView;