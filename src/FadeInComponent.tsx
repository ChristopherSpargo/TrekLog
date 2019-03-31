import React from 'react';
import { Animated } from 'react-native';

export class FadeInView extends React.Component<{ 
  startValue ?: number,
  endValue ?: number,
  bgColor ?: string,
  open ?: boolean,
  style ?: any         
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
        duration: 300,                // Make it take a while
      }
    ).start();                        // Starts the animation
  }

  close = () => {
    Animated.timing(                  // Animate over time
      this.state.fadeAnim,            // The animated value to drive
      {
        toValue: this.props.startValue,    // Animate to starting opacity 
        duration: 300,                // Make it take a while
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
          height: fadeAnim,       // Bind height to animated value
        }}
      >
        {this.props.children}
      </Animated.View>
    );
  }
}

export default FadeInView;