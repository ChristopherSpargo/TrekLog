import React from 'react'
import { View, FlatList, TouchableNativeFeedback, StyleSheet, Text } from 'react-native'
// import { observable } from 'mobx'
import LinearGradient from 'react-native-linear-gradient';
import { observer, inject } from 'mobx-react'

import { APP_ICONS } from './SvgImages';
import { TREK_TYPE_COLORS_OBJ } from './App'
import {  BarData } from './FilterService';
import { TrekInfo, NumericRange } from './TrekInfoModel';
import SvgIcon from './SvgIconComponent';

@inject('uiTheme')
// @observer
class BarItem extends React.PureComponent <{
  item : BarData, 
  index : number, 
  range : NumericRange, 
  maxHt : number, 
  lastItem : boolean,
  selected : number,
  barWidth : number,
  style : any,
  pressed : Function,
  uiTheme ?: any,
}, {} > {

  barPressed = (idx: number, bar: number) => {
    requestAnimationFrame(() => {
      this.props.pressed(idx, bar);
    })
  }

  render () {
    const { highTextColor, dividerColor, itemSelectedColor, itemMeetsGoal, itemMissesGoal,
      itemNotSelected } = this.props.uiTheme.palette;
    const iconPaths = APP_ICONS[this.props.item.type];
    const newVal = this.props.range.max - this.props.item.value;
    const rangePct = (this.props.range.range / this.props.range.max);
    const newRange = rangePct < .25 ? (this.props.range.max * .25) : this.props.range.range;
    const pct = rangePct > .005 ? ((newRange - newVal) / newRange) : .5;
    const itemHeight = (pct * (this.props.maxHt - 25)) + 25;
    const idx = this.props.item.index !== undefined ? this.props.item.index : this.props.index;
    const selItem = this.props.selected === this.props.index;
    let goalGrad = itemNotSelected;
    if(this.props.item.indicatorFill){
        goalGrad = this.props.item.indicatorFill === 'red' ? itemMissesGoal : itemMeetsGoal;
    }
    const barGradientStart = (selItem  && !this.props.item.indicatorFill) ? itemSelectedColor : goalGrad; 
    const barGradientEnd = 'white';
    const styles = StyleSheet.create({
      itemArea: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderColor: dividerColor,
        borderStyle: "solid",
        width: this.props.barWidth,
        height: this.props.style.height,
        paddingTop: 5,
        backgroundColor: "white",
      },
      bdrRt: {
        borderRightWidth: 1,
      },
      areaAbove: {
        flex: 1,
        width: this.props.barWidth,
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 3,
      },
      areaBelow: {
        width: this.props.barWidth,
        alignItems: "center",
        paddingTop: 5,
      },
      indicator: {
        fontSize: 12 ,
        fontWeight: '400',
      },
      indicatorSel: {
        fontSize: 14,
        color: highTextColor,
        fontWeight: 'bold',
      },
      value: {
        fontSize: 11,
        color: highTextColor,
      },
      valueSel: {
        fontSize: 14,
        color: highTextColor,
        fontWeight: 'bold',
      }
    })
  
    return (
      <View style={[styles.itemArea, this.props.lastItem ? styles.bdrRt : {}]}>
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
          onPress={this.props.item.noPress ? undefined : () => this.barPressed(idx, this.props.index)}
        >
        <View>
          <View style={styles.areaAbove}>
            <Text style={selItem ? styles.indicatorSel : styles.indicator}>{this.props.item.indicator}</Text>
            {this.props.item.type && 
              <SvgIcon
                paths={iconPaths}
                fill={TREK_TYPE_COLORS_OBJ[this.props.item.type]}
                size={20}
              />
            }
          </View>
          <LinearGradient colors={[barGradientStart, barGradientEnd]} style={[styles.areaBelow,{height: itemHeight}]}>
            <Text style={selItem ? styles.valueSel : styles.value}>{this.props.item.label1}</Text>
          </LinearGradient>
        </View>
        </TouchableNativeFeedback>
      </View>
    )
    }
}


@inject('trekInfo')
@observer
class BarDisplay extends React.Component <{
  trekInfo ?: TrekInfo,
  selectFn ?: Function,
  selected ?: number,
  style : any,
  barWidth : number,
  maxBarHeight: number,
  data : BarData[],         // object with information for the graph bars
  dataRange: any,           // range of values in the data {max,min,range}
  scrollToBar ?: number,    // index of bar to scroll to (just to update the display)
}, {} > {

  scrollRef;
  selectedBar = 0;

  shouldComponentUpdate() {
    return this.props.trekInfo.updateGraph || (this.selectedBar !== this.props.selected);
  }

  componentDidUpdate(){
    if(this.props.scrollToBar !== undefined) { 
      this.moveScrollPos(this.props.scrollToBar >= 0 ? this.props.scrollToBar : 0);}
    if (this.selectedBar !== this.props.selected){
        this.selectedBar = this.props.selected;
        if (this.selectedBar >= 0){
            this.moveScrollPos(this.props.selected);
        }
    }
  }

  moveScrollPos = (barNum: number) => {
    this.scrollRef.scrollToOffset({offset: (barNum - 2) * this.props.barWidth, animated: true});
  }
      
  barPressed = (val: any, bar: number) => {
      this.selectedBar = bar;
      this.props.selectFn(val)
  }

  render() {
    this.props.trekInfo.setUpdateGraph(false);
    const lastIndex = this.props.data.length ? this.props.data.length - 1 : 0;


    const _keyExtractor = (_item, index) => index.toString();

    const _renderItem = ({item, index}) => (
          <BarItem 
            item={item}
            index={index}
            range={this.props.dataRange}
            maxHt={this.props.maxBarHeight}
            lastItem={index === lastIndex}
            selected={this.props.selected}
            barWidth={this.props.barWidth}
            style={this.props.style}
            pressed={this.barPressed}
          />
        );

    return (
      <FlatList
        ref={e => this.scrollRef = e}
        data={this.props.data}
        keyExtractor={_keyExtractor}
        extraData={this.props.selected}
        initialNumToRender={10}
        horizontal
        renderItem={_renderItem}
      />
    )
  }

}

export default BarDisplay