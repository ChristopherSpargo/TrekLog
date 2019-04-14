import React, { useContext, useEffect, useRef, MutableRefObject } from 'react'
import { View, FlatList, TouchableNativeFeedback, StyleSheet, Text } from 'react-native'
import LinearGradient from 'react-native-linear-gradient';
import { useObserver } from "mobx-react-lite";

import { APP_ICONS } from './SvgImages';
import { TREK_TYPE_COLORS_OBJ, UiThemeContext, TrekInfoContext } from './App'
import SvgIcon from './SvgIconComponent';

function BarItem({
  item, 
  index, 
  range, 
  maxHt, 
  lastItem,
  selected,
  barWidth,
  style,
  pressed
}) {
  const uiTheme: any = useContext(UiThemeContext);

  function barPressed (idx: number, bar: number) {
    requestAnimationFrame(() => {
      pressed(idx, bar);
    })
  }

    const { highTextColor, dividerColor, itemSelectedColor, itemMeetsGoal, itemMissesGoal,
            itemNotSelected } = uiTheme.palette;
    const iconPaths = APP_ICONS[item.type];
    const newVal = range.max - item.value;
    const rangePct = (range.range / range.max);
    const newRange = rangePct < .25 ? (range.max * .25) : range.range;
    const pct = rangePct > .005 ? ((newRange - newVal) / newRange) : .5;
    const itemHeight = (pct * (maxHt - 25)) + 25;
    const idx = item.index !== undefined ? item.index : index;
    const selItem = selected === index;
    let goalGrad = itemNotSelected;
    if(item.indicatorFill){
        goalGrad = item.indicatorFill === 'red' ? itemMissesGoal : itemMeetsGoal;
    }
    const barGradientStart = (selItem  && !item.indicatorFill) ? itemSelectedColor : goalGrad; 
    const barGradientEnd = 'white';
    const styles = StyleSheet.create({
      itemArea: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderColor: dividerColor,
        borderStyle: "solid",
        width: barWidth,
        height: style.height,
        paddingTop: 5,
        backgroundColor: "white",
      },
      bdrRt: {
        borderRightWidth: 1,
      },
      areaAbove: {
        flex: 1,
        width: barWidth,
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 3,
      },
      areaBelow: {
        width: barWidth,
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
      <View style={[styles.itemArea, lastItem ? styles.bdrRt : {}]}>
        <TouchableNativeFeedback
          background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
          onPress={item.noPress ? undefined : () => barPressed(idx, index)}
        >
        <View>
          <View style={styles.areaAbove}>
            <Text style={selItem ? styles.indicatorSel : styles.indicator}>{item.indicator}</Text>
            {item.type && 
              <SvgIcon
                paths={iconPaths}
                fill={TREK_TYPE_COLORS_OBJ[item.type]}
                size={20}
              />
            }
          </View>
          <LinearGradient colors={[barGradientStart, barGradientEnd]} style={[styles.areaBelow,{height: itemHeight}]}>
            <Text style={selItem ? styles.valueSel : styles.value}>{item.label1}</Text>
          </LinearGradient>
        </View>
        </TouchableNativeFeedback>
      </View>
    )
}


function BarDisplay({
  selectFn = undefined,
  selected = undefined,
  style,
  barWidth,
  maxBarHeight,
  data,         // object with information for the graph bars
  dataRange,           // range of values in the data {max,min,range}
  scrollToBar = undefined,    // index of bar to scroll to (just to update the display)
}) {
  const trekInfo: any = useContext(TrekInfoContext);

  const scrollRef : MutableRefObject<FlatList<View>> = useRef();
  const selectedBar = useRef(0);

  useEffect(() => {
    if(scrollToBar !== undefined) { 
      moveScrollPos(scrollToBar >= 0 ? scrollToBar : 0);}
    if (selectedBar !== selected){
        selectedBar.current = selected;
        if (selectedBar.current >= 0){
            moveScrollPos(selected);
        }
    }
  })

  function moveScrollPos (barNum: number) {
    scrollRef.current.scrollToOffset({offset: (barNum - 2) * barWidth, animated: true});
  }
      
  function barPressed (val: any, bar: number) {
      selectedBar.current = bar;
      selectFn(val)
  }

    trekInfo.setUpdateGraph(false);
    const lastIndex = data.length ? data.length - 1 : 0;


    const _keyExtractor = (_item, index) => index.toString();

    const _renderItem = ({item, index}) => (
          <BarItem 
            item={item}
            index={index}
            range={dataRange}
            maxHt={maxBarHeight}
            lastItem={index === lastIndex}
            selected={selected}
            barWidth={barWidth}
            style={style}
            pressed={barPressed}
          />
        );

    return useObserver(() => (
      <FlatList
        ref={scrollRef}
        data={data}
        keyExtractor={_keyExtractor}
        extraData={selected}
        initialNumToRender={10}
        horizontal
        renderItem={_renderItem}
      />
    ))
}

export default BarDisplay;
