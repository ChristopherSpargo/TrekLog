import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer, inject } from 'mobx-react';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';
import { TREK_SELECT_BITS } from './TrekInfoModel';
import { TREK_TYPE_COLORS_OBJ } from './App';

@inject('uiTheme')
@observer
class TrekTypeSelect extends Component<{
  uiTheme ?: any,
  size ?: number,
  style ?: any,
  onChangeFn ?:  Function,  // call this when value of radio changes
  selected ?: number        // bitlist of the current selections
}, {} > {

  callOnChangeFn = (value: string, set: boolean) => {
    requestAnimationFrame(() =>{
      this.props.onChangeFn(value, set);
    });
  }

  // call onChange with toggle param 'true'
  toggleType = (value: string) => {
    this.callOnChangeFn(value, true);
  }

  // call onChange with toggle param 'false'
  setType = (value: string) => {
    this.callOnChangeFn(value, false);
  }

  render() {

    const typeIconAreaSize = this.props.size;

    const styles = StyleSheet.create({
      typeControls: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
    });

    return(
      <View style={[styles.typeControls, this.props.style || {}]}>
        <SvgButton 
          value="Walk"
          onPressFn={this.toggleType}
          onLongPressFn={this.setType}
          size={typeIconAreaSize}
          fill={TREK_TYPE_COLORS_OBJ.Walk}
          style={{borderColor: "transparent"}}
          path={APP_ICONS["Walk"]}
          highlight={(this.props.selected & TREK_SELECT_BITS['Walk']) !== 0}
        />
        <SvgButton 
          value="Run"
          onPressFn={this.toggleType}
          onLongPressFn={this.setType}
          size={typeIconAreaSize}
          style={{borderColor: "transparent"}}
          fill={TREK_TYPE_COLORS_OBJ.Run}
          path={APP_ICONS["Run"]}
          highlight={(this.props.selected & TREK_SELECT_BITS['Run']) !== 0}
        />
        <SvgButton 
          value="Bike"
          onPressFn={this.toggleType}
          onLongPressFn={this.setType}
          size={typeIconAreaSize}
          style={{borderColor: "transparent"}}
          fill={TREK_TYPE_COLORS_OBJ.Bike}
          path={APP_ICONS["Bike"]}
          highlight={(this.props.selected & TREK_SELECT_BITS['Bike']) !== 0}
          svgWidthAdj={4}
        />
        <SvgButton 
          value="Hike"
          onPressFn={this.toggleType}
          onLongPressFn={this.setType}
          size={typeIconAreaSize}
          style={{borderColor: "transparent"}}
          fill={TREK_TYPE_COLORS_OBJ.Hike}
          path={APP_ICONS["Hike"]}
          highlight={(this.props.selected & TREK_SELECT_BITS['Hike']) !== 0}
        />
      </View>
    )
  }

}

export default TrekTypeSelect;