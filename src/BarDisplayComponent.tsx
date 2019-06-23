import React, { useContext, useEffect, useRef, MutableRefObject } from 'react'
import { View, FlatList, StyleSheet, Text } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient';
import { useObserver } from "mobx-react-lite";

import { APP_ICONS } from './SvgImages';
import { TREK_TYPE_COLORS_OBJ, UiThemeContext, TrekInfoContext } from './App'
import SvgIcon from './SvgIconComponent';
import { TrekInfo } from './TrekInfoModel';
import ExpandView from './ExpandComponent';

function BarItem({
  item, 
  index, 
  range, 
  maxHt, 
  lastItem,
  selected,
  barWidth,
  style,
  pressed,
  open
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);

  function barPressed (idx: number, bar: number) {
      pressed(idx, bar);
  }

    const { highTextColor, dividerColor, itemSelectedColor, itemMeetsGoal, itemMissesGoal,
            itemNotSelected, pageBackground, rippleColor, mediumTextColor } = uiTheme.palette[trekInfo.colorTheme];
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
    const barGradientEnd = pageBackground;
    const styles = StyleSheet.create({
      itemArea: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderColor: dividerColor,
        borderStyle: "solid",
        width: barWidth,
        height: style.height,
        paddingTop: 5,
        backgroundColor: pageBackground,
      },
      bdrRt: {
        width: barWidth +1,
        borderRightWidth: 1,
      },
      areaAbove: {
        flex: 1,
        width: barWidth,
        justifyContent: "space-between",
        alignItems: "center",
      },
      typeAndImages: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: 3,
      },
      areaBelow: {
        width: barWidth,
        overflow: "hidden",
        alignItems: "center",
        paddingTop: 5,
      },
      gradientArea: {
        width: barWidth,
        height: itemHeight,
        alignItems: "center",
        paddingTop: 5,
      },
      indicator: {
        fontSize: 12 ,
        fontWeight: '400',
        color: mediumTextColor
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
  
    return useObserver(() => (
      <View style={[styles.itemArea, lastItem ? styles.bdrRt : {}]}>
        <RectButton
          rippleColor={rippleColor}
          onPress={item.noPress ? undefined : () => barPressed(idx, index)}
        >
          <View>
            <View style={styles.areaAbove}>
              <Text style={selItem ? styles.indicatorSel : styles.indicator}>{item.indicator}</Text>
            </View>
            {index < 6 &&
              <ExpandView startValue={itemHeight + 1} endValue={0} open={open} duration={500}>
                <View style={styles.areaBelow}>
                  {item.type && 
                    <View style={styles.typeAndImages}>
                      <SvgIcon
                        paths={iconPaths}
                        fill={TREK_TYPE_COLORS_OBJ[item.type]}
                        size={20}
                      />
                      {item.images && 
                        <SvgIcon
                          style={{marginLeft: 2}}
                          paths={APP_ICONS.Camera}
                          fill={highTextColor}
                          size={12}
                        />
                      }
                    </View>
                  }
                  <LinearGradient colors={[barGradientStart, barGradientEnd]} style={styles.gradientArea}>
                    <Text style={selItem ? styles.valueSel : styles.value}>{item.label1}</Text>
                  </LinearGradient>
                </View>
              </ExpandView>
            }
            {index >= 6 &&
              <View style={styles.areaBelow}>
                {item.type && 
                  <View style={styles.typeAndImages}>
                    <SvgIcon
                      paths={iconPaths}
                      fill={TREK_TYPE_COLORS_OBJ[item.type]}
                      size={20}
                    />
                    {item.images && 
                      <SvgIcon
                        style={{marginLeft: 2}}
                        paths={APP_ICONS.Camera}
                        fill={highTextColor}
                        size={12}
                      />
                    }
                  </View>
                }
                <LinearGradient colors={[barGradientStart, barGradientEnd]} style={styles.gradientArea}>
                  <Text style={selItem ? styles.valueSel : styles.value}>{item.label1}</Text>
                </LinearGradient>
              </View>
            }
          </View>
        </RectButton>
      </View>
    ))
}


function BarDisplay({
  selectFn = undefined,
  selected = undefined,
  style,
  barWidth,
  maxBarHeight,
  openFlag=undefined,      // flag to control the animation of the graph bars
  data,         // object with information for the graph bars
  dataRange,           // range of values in the data {max,min,range}
  scrollToBar = undefined,    // index of bar to scroll to (just to update the display)
}) {
  const trekInfo: TrekInfo = useContext(TrekInfoContext);

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
            open={openFlag}
          />
        );

    return useObserver(() => (
      <FlatList
        ref={scrollRef}
        data={data}
        keyExtractor={_keyExtractor}
        extraData={{item1: selected, item2: openFlag}}
        initialNumToRender={7}
        horizontal
        renderItem={_renderItem}
      />
    ))
}

export default BarDisplay;
