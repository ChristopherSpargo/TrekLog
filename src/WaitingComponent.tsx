import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native'
import { CONTROLS_HEIGHT, WAITING_Z_INDEX, secondaryColor } from './App';

// Component to display an ActivityIndicator in the center of the screen

class Waiting extends React.Component<{   
  msg ?: string,      // message to display above the indicator
  bgColor ?: string,
  bottom ?: number,   // bottom of message container area
}, {} > {

  
  render() {
    const bot = this.props.bottom || CONTROLS_HEIGHT;
    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, bottom: bot },
      center: {
        flex: 1,
        zIndex: WAITING_Z_INDEX,
        justifyContent: "center",
        alignItems: "center",
      },
      msgArea: {
        height: 40,
        justifyContent: "center",
        backgroundColor: this.props.bgColor ? this.props.bgColor : "transparent",
        borderRadius: 20,
        marginBottom: 10,
        paddingHorizontal: 10
      },
      msgText: {
        fontSize: 20
      }
    })

    return (
      <View style={styles.container}>
          <View style={styles.center}>
            {(this.props.msg !== undefined && this.props.msg !== '') && 
              <View style={styles.msgArea}>
                <Text style={styles.msgText}>{this.props.msg}</Text>
              </View>
            }
            <ActivityIndicator size="large" color={secondaryColor} />
          </View>
      </View>
    )
  }
}

export default Waiting;
