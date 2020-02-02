import React from 'react';
import { Animated } from 'react-native';
import { observer } from 'mobx-react'

@observer
export class ExpandViewY extends React.Component<{ 
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

  componentDidMount() {
    requestAnimationFrame(() => {
      this.open();
    })
  }

  componentWillUnmount() {
    this.close();
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
        toValue: this.props.endValue, // Animate to final Y position
        duration: this.props.duration, 
        useNativeDriver: true,         
      }
    ).start();                        // Starts the animation
  }

  close = () => {
    Animated.timing(                  // Animate over time
      this.state.fadeAnim,            // The animated value to drive
      {
        toValue: this.props.startValue,    // Animate to starting Y position
        duration: this.props.duration - 50,            
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
          transform: [{translateY: fadeAnim}]         // Bind translateY to animated value
        }}
      >
        {this.props.children}
      </Animated.View>
    );
  }
}

export default ExpandViewY;