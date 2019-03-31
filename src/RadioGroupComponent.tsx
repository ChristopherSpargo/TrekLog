import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableNativeFeedback } from 'react-native';
import { observer, inject } from 'mobx-react';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';

@inject('uiTheme')
@observer
class RadioGroup extends Component<{
  uiTheme ?: any,
  onChangeFn ?:  Function,  // call this when value of radio changes
  selected ?: string,       // value of the current selection
  labels ?:   string[],     // label for each radio choice
  itemHeight ?: number,     // height for items
  align ?: string,          // style to apply to each item container
  itemStyle ?: any,         // style object for items
  labelStyle ?: any,        // style object for labels
  justify ?: string,        // how to justify buttons
  values ?:   string[],     // value for each radio choice
  icons ?: string[],        // icons to use in place of standard radio button
  iconAreaStyle ?: any,     // style object for the icon area when icons present
  colors ?: string[],       // color for each icon
  inline ?:   boolean,      // if true, labels should be inline with icons (otherwise above or below the icons)
  radioFirst ?: boolean     // if true, labels are after (or below) the icons
  vertical ?: boolean,      // if true, arrange group vertically
}, {} > {

  valueChange = (indx: number) => {
    requestAnimationFrame(() =>{
      this.props.onChangeFn(this.props.values[indx]);
    });
  }

  render() {

    const validProps = this.props.values && 
                      (this.props.labels || this.props.icons);
    const selectedIndx = this.props.values.indexOf(this.props.selected);
    const vertical = this.props.vertical;
    const defHeight = 30;
    const itemHeight = this.props.itemHeight || defHeight;
    const iconSize = 40;
    const justify = this.props.justify === 'start' ? "flex-start" : "center";
    const align = this.props.align === 'start' ? "flex-start" : "center";
    const { secondaryColor, highlightColor, highTextColor } = this.props.uiTheme.palette;
    const labelStyle = this.props.labelStyle || {};
    const iaStyleProp = this.props.iconAreaStyle || {};
    const itemStyle = this.props.itemStyle || {};

    const styles = StyleSheet.create({
      container: {
        flexDirection: vertical ? "column" : "row",
        justifyContent: justify,
        alignItems: align,
        flexWrap: vertical ? "nowrap" : "wrap",
      },
      item: {
        marginRight: vertical ? 0 : 15,
        height: itemHeight,
        flexDirection: this.props.inline ? "row" : "column",
        alignItems: "center",
        justifyContent: this.props.inline ? "flex-start" : "center",
      },
      label: {
        fontSize: 16,
        paddingLeft: (this.props.inline && this.props.radioFirst) ? 3 : 0,
        color: highTextColor,
      },
      typeIconArea: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 15,
        marginRight: 8,
        width: itemHeight - 10,
        height: itemHeight - 10,
        borderBottomWidth: 2,
        borderStyle: "solid",
        borderColor: "transparent",
      },
      iconHighlight: {
        borderColor: highlightColor,
      },
      statHeadingArea: {
        marginTop: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
      },
      typeIcon: {
        marginRight: 5,
        width: iconSize,
        height: iconSize,
        backgroundColor: "transparent",
      },
    });

    return(
      <View>
        {(validProps && this.props.selected !== undefined) &&
          <View style={styles.container}>
          {!this.props.icons && 
            this.props.labels.map((item, indx) => 
                  <TouchableNativeFeedback  key={indx}
                    // background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                    onPress={() => this.valueChange(indx)}>
                    <View style={[styles.item, itemStyle]}>
                      {!this.props.radioFirst &&
                        <Text style={[styles.label, labelStyle]}>{item}</Text>
                      }
                      <SvgIcon 
                          size={24}
                          widthAdj={0}
                          fill={selectedIndx === indx ? secondaryColor : "black"}
                          paths={APP_ICONS[selectedIndx === indx ? 'RadioButtonChecked' : 'RadioButtonUnchecked']}
                      />
                      {this.props.radioFirst &&
                        <Text style={[styles.label, labelStyle]}>{item}</Text>
                      }
                    </View>
                  </TouchableNativeFeedback>
            )
          }
          {this.props.icons && 
            this.props.icons.map((item, indx) => 
              <TouchableNativeFeedback key={indx} 
                background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                onPress={() => this.valueChange(indx)}>
                <View style={[styles.typeIconArea, iaStyleProp, selectedIndx === indx ? styles.iconHighlight : {}]}>
                  <SvgIcon 
                      style={styles.typeIcon}
                      size={iconSize}
                      widthAdj={0}
                      fill={this.props.colors[indx]}
                      paths={APP_ICONS[item]}
                  />
                </View>
              </TouchableNativeFeedback>
              )
          }
          </View>
        }
      </View>
    )
  }

}

export default RadioGroup;