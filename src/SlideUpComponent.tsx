import React from 'react';
import { Animated } from 'react-native';

export class SlideUpView extends React.Component<{ 
  startValue ?: number,
  endValue ?: number,
  bgColor ?: string,
  open ?: boolean,
  style ?: any,
  beforeOpenFn ?: Function,
  afterCloseFn ?: Animated.EndCallback,
}, {} > { 

  state = {
    slideAnim: new Animated.Value(this.props.startValue)  // Initial value for translateY    
  }

  componentDidUpdate(prev){
    if (prev.open !== this.props.open){
      this.props.open ? this.open() : this.close();
    }
  }
  
  open = () => {
    if (this.props.beforeOpenFn) {
      this.props.beforeOpenFn();
    }
    Animated.timing(                  // Animate over time
      this.state.slideAnim,           // The animated value to drive
      {
        toValue: this.props.endValue,                   // Animate to 0 Yoffset
        duration: 300,                // Make it take a while
        useNativeDriver: true,
      }
    ).start();                        // Starts the animation
  }

  close = () => {
    Animated.timing(                  // Animate over time
      this.state.slideAnim,            // The animated value to drive
      {
        toValue: this.props.startValue,    // Animate to full Yoffset 
        duration: 300,              // Make it take a while
        useNativeDriver: true,
      }
    ).start(this.props.afterCloseFn ? this.props.afterCloseFn : undefined);  // Starts the animation
  }

  render() {
    let { slideAnim } = this.state;
    return (
      <Animated.View                 // Special animatable View
        style={{
          ...this.props.style,
          backgroundColor: this.props.bgColor,
          maxHeight: this.props.startValue,
          transform: [{translateY: slideAnim}]         // Bind translateY to animated value
        }}
      >
        {this.props.children}
      </Animated.View>
    );
  }
}

export default SlideUpView;