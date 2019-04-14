import React from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import {
  CONTROLS_HEIGHT,
  WAITING_Z_INDEX,
  secondaryColor,
  uiTheme
} from "./App";

// Component to display an ActivityIndicator in the center of the screen

function Waiting({
  msg = undefined, // message to display above the indicator
  bgColor = undefined,
  bottom = undefined // bottom of message container area
}) {

  const { darkBackground, textOnDark, textOnLight } = uiTheme.palette;
  const textColor = bgColor === darkBackground ? textOnDark : textOnLight;
  const bot = bottom || CONTROLS_HEIGHT;
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject, bottom: bot },
    center: {
      flex: 1,
      zIndex: WAITING_Z_INDEX,
      justifyContent: "center",
      alignItems: "center"
    },
    msgArea: {
      height: 40,
      justifyContent: "center",
      backgroundColor: bgColor ? bgColor : "transparent",
      borderRadius: 20,
      marginBottom: 10,
      paddingHorizontal: 20
    },
    msgText: {
      fontSize: 20,
      color: textColor
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        {msg !== undefined && msg !== "" && (
          <View style={styles.msgArea}>
            <Text style={styles.msgText}>{msg}</Text>
          </View>
        )}
        <ActivityIndicator size="large" color={secondaryColor} />
      </View>
    </View>
  );
}

export default Waiting;
