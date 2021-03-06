import React from 'react';
import { Animated } from 'react-native';

export class FadeInView extends React.Component<{ 
  startValue ?: number,
  endValue ?: number,
  bgColor ?: string,
  open ?: boolean,
  style ?: any,      
  duration : number,   
}, {} > { 

  state = {
    fadeAnim: new Animated.Value(this.props.startValue)  // Initial value for opacity   
  }

  componentDidUpdate(prev){
    if (prev.open !== this.props.open){
      this.props.open ? this.open() : this.close();
    }
  }
  
  open = () => {
    Animated.timing(                  // Animate over time
      this.state.fadeAnim,            // The animated value to drive
      {
        toValue: this.props.endValue, // Animate to final opacity
        duration: this.props.duration,                // Make it take a while
        useNativeDriver: true,
      }       
    ).start();                        // Starts the animation
  }

  close = () => {
    Animated.timing(                  // Animate over time
      this.state.fadeAnim,            // The animated value to drive
      {
        toValue: this.props.startValue,    // Animate to starting opacity 
        duration: this.props.duration,                // Make it take a while
        useNativeDriver: true,         
      }
    ).start();                        // Starts the animation
  }

  render() {
    let { fadeAnim } = this.state;
    return (
      <Animated.View                 // Special animatable View
        style={{
          ...this.props.style,
          backgroundColor: this.props.bgColor,
          opacity: fadeAnim         // Bind scaleY to animated value
        }}
      >
        {this.props.children}
      </Animated.View>
    );
  }
}

export default FadeInView;