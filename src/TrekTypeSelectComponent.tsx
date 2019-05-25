import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useObserver } from "mobx-react-lite";

import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';
import { TREK_SELECT_BITS } from './TrekInfoModel';
import { TREK_TYPE_COLORS_OBJ } from './App';

function TrekTypeSelect({
  size = undefined,
  style = undefined,
  onChangeFn = undefined,  // call this when value of radio changes
  selected  = undefined        // bitlist of the current selections
}) {

  // call onChange with toggle param 'true'
  function toggleType(value: string) {
    onChangeFn(value, true);
  }

  // call onChange with toggle param 'false'
  function setType(value: string) {
    onChangeFn(value, false);
  }

  const typeIconAreaSize = size;

  const styles = StyleSheet.create({
    typeControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    controlButton: {
      justifyContent: "center",
      borderColor: "transparent",
      backgroundColor: "transparent",
    },
  });

  return useObserver(() => (
    <View style={[styles.typeControls, style || {}]}>
      <SvgButton 
        value="Walk"
        onPressFn={toggleType}
        onLongPressFn={setType}
        size={typeIconAreaSize}
        fill={TREK_TYPE_COLORS_OBJ.Walk}
        style={styles.controlButton}
        path={APP_ICONS.Walk}
        highlight={(selected & TREK_SELECT_BITS.Walk) !== 0}
      />
      <SvgButton 
        value="Run"
        onPressFn={toggleType}
        onLongPressFn={setType}
        size={typeIconAreaSize}
        style={styles.controlButton}
        fill={TREK_TYPE_COLORS_OBJ.Run}
        path={APP_ICONS.Run}
        highlight={(selected & TREK_SELECT_BITS.Run) !== 0}
      />
      <SvgButton 
        value="Bike"
        onPressFn={toggleType}
        onLongPressFn={setType}
        size={typeIconAreaSize}
        style={styles.controlButton}
        fill={TREK_TYPE_COLORS_OBJ.Bike}
        path={APP_ICONS.Bike}
        highlight={(selected & TREK_SELECT_BITS.Bike) !== 0}
        svgWidthAdj={4}
      />
      <SvgButton 
        value="Hike"
        onPressFn={toggleType}
        onLongPressFn={setType}
        size={typeIconAreaSize}
        style={styles.controlButton}
        fill={TREK_TYPE_COLORS_OBJ.Hike}
        path={APP_ICONS.Hike}
        highlight={(selected & TREK_SELECT_BITS.Hike) !== 0}
      />
    </View>
  ))
}

export default TrekTypeSelect;