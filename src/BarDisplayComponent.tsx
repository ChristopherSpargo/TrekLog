import React, { useContext, useEffect, useRef, MutableRefObject } from 'react'
import { View, FlatList, StyleSheet, Text } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient';
import { useObserver } from "mobx-react-lite";
import SvgGraphLabel from './SvgGraphLabelsComponent';

import { APP_ICONS } from './SvgImages';
import { TREK_TYPE_COLORS_OBJ, TREK_TYPE_DIM_COLORS_OBJ, UiThemeContext, MainSvcContext } from './App'
import SvgIcon from './SvgIconComponent';
import { NumericRange } from './TrekInfoModel';
import ExpandViewY from './ExpandYComponent';
import { MainSvc } from './MainSvc';

export interface BarData  {
  value: any,         // value that determines the size (height) of the bar
  label1: string,     // line 1 of bar label
  label2: string,     // line 2 (if any) of bar label
  type?: string,      // type of trek this is for
  typeSelected?: boolean, // true if this type is selected (eg in Activity Summary)
  icon?: string,      // icon to show if different types in graph
  images?: boolean,   // true if trek has any images
  extraIcon?: string, // name of an icon to display after type/images icon
  indicator: string,   // label shown below bars, like an X axis, that also indicates which bar is in focus 
                      // (currently Trek date - blue and bold if focused, black and normal if not) 
  indicatorFill: string, // color for indicator text
  index?: number,     // index in the source data array for this bar
  noPress?: boolean,  // true if bar should not be pressed
  showEmpty?: boolean, // if true, show bar as empty (just a border?)
  label?: string,
}

export interface BarGraphInfo {
  items: BarData[],
  title?: string,
  range: NumericRange
}

function BarItem({
  item, 
  index, 
  range, 
  maxHt, 
  minHt,
  graphHt,
  lastItem,
  selected,
  style,
  pressed,
  animationDuration,
  open,
  animate,
  iAngle,
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  function barPressed (idx: number, itemNumber: number) {
      pressed(idx, itemNumber);
  }

    const { highTextColor, dividerColor, itemSelectedColor, itemMeetsGoal, itemMissesGoal,
            itemNotSelected, rippleColor, mediumTextColor, gradientEndColor, gradientEndSelected,
            itemMissesGoalEnd, itemMeetsGoalEnd, itemMissesGoalText, itemMeetsGoalText,
            barGraphValueColor
          } = uiTheme.palette[mainSvc.colorTheme];
    const { fontRegular, fontBold } = uiTheme
    const iconPaths = item.icon ? APP_ICONS[item.icon] : undefined;
    const barWidth = style.width;
    const graphLabelHt = graphHt - maxHt - 5;
    const newVal = range.max - item.value;
    const rangePct = (range.range / range.max);
    const newRange = rangePct < .25 ? (range.max * .25) : range.range;
    const pct = rangePct > .005 ? ((newRange - newVal) / newRange) : .5;
    const itemHeight = (range.range === 0 && range.max === 0) ? minHt : (pct * (maxHt - minHt)) + minHt;
    const idx = item.index !== undefined ? item.index : index;
    const selItem = selected === index;
    const animDur = animationDuration !== undefined ? animationDuration : 500;
    let barGradientStart, barGradientEnd, valueColor;
    if(item.indicatorFill){
        barGradientStart = item.indicatorFill === 'red' ? itemMissesGoal : itemMeetsGoal;
        barGradientEnd = item.indicatorFill === 'red' ? itemMissesGoalEnd : itemMeetsGoalEnd;
        valueColor = item.indicatorFill === 'red' ? itemMissesGoalText : itemMeetsGoalText;
    } else {
      barGradientStart = selItem ? itemSelectedColor : itemNotSelected;
      barGradientEnd = selItem ? gradientEndSelected : gradientEndColor;
      valueColor = barGraphValueColor;
    }
    const useDimColor = item.typeSelected !== undefined && item.typeSelected === false;
    const barPad = style.paddingHorizontal || 0;

    const styles = StyleSheet.create({
      itemArea: {
        alignItems: "center",
        borderLeftWidth: 1,
        borderColor: dividerColor,
        borderStyle: "solid",
        width: barWidth,
        paddingTop: 5,
      },
      bdrRt: {
        width: barWidth + 1,
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
        width: barWidth - (barPad * 2),
        height: itemHeight,
        alignItems: "center",
        paddingTop: item.showEmpty ? 0 : 3,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
      },
      indicatorArea: {
        alignItems: "center",
        justifyContent: "center",
      },
      indicatorText: {
        fontSize: 13,
        fontFamily: selItem ? fontBold : fontRegular,
        color: selItem ? highTextColor : mediumTextColor
      },
      value: {
        marginTop: item.showEmpty ? -3 : 0,
        color: valueColor,
        fontSize: 13,
        fontFamily: fontBold,
      },
      smallImages: {
        justifyContent: "flex-end",
      }
    })
  
    return useObserver(() => (
      <View style={{...styles.itemArea, ...style, ...(lastItem ? styles.bdrRt : {})}}>
        <RectButton
          rippleColor={rippleColor}
          onPress={item.noPress ? undefined : () => barPressed(idx, index)}
        >
          <View>
            <View style={styles.areaAbove}>
              <SvgGraphLabel
                width={barWidth}
                height={graphLabelHt}
                labelAngle={iAngle}
                labelStyle={styles.indicatorText}
                labelText={item.indicator}
              />
            </View>
            {(animate > 0) &&
              <ExpandViewY startValue={itemHeight + 1} endValue={0} open={open} duration={animDur}>
                <View style={styles.areaBelow}>
                  {item.type && 
                    <View style={styles.typeAndImages}>
                      {item.icon &&
                        <SvgIcon
                          paths={iconPaths}
                          fill={useDimColor ? TREK_TYPE_DIM_COLORS_OBJ[item.type] : TREK_TYPE_COLORS_OBJ[item.type]}
                          size={20}
                        />
                      }
                      {(item.images || item.extraIcon) && 
                        <View style={styles.smallImages}>
                          {item.images && 
                            <SvgIcon
                              style={{marginLeft: 2}}
                              paths={APP_ICONS.Camera}
                              fill={highTextColor}
                              size={10}
                            />
                          }
                          {item.extraIcon && 
                            <SvgIcon
                              style={{marginLeft: 2}}
                              paths={APP_ICONS[item.extraIcon]}
                              fill={highTextColor}
                              size={10}
                            />
                          }
                        </View>
                      }
                    </View>
                  }
                  <LinearGradient colors={[barGradientStart, barGradientEnd]}
                        style={styles.gradientArea}>
                    <Text style={styles.value}>{item.label1}</Text>
                  </LinearGradient>
                </View>
              </ExpandViewY>
            }
            {(animate <= 0) &&
              <View style={styles.areaBelow}>
                {item.type && 
                  <View style={styles.typeAndImages}>
                    {item.icon &&
                      <SvgIcon
                        paths={iconPaths}
                        fill={TREK_TYPE_COLORS_OBJ[item.type]}
                        size={20}
                      />
                    }
                    {(item.images || item.extraIcon) && 
                      <View style={styles.smallImages}>
                        {item.images && 
                          <SvgIcon
                            paths={APP_ICONS.Camera}
                            fill={highTextColor}
                            size={10}
                          />
                        }
                        {item.extraIcon && 
                          <SvgIcon
                            paths={APP_ICONS[item.extraIcon]}
                            fill={highTextColor}
                            size={10}
                          />
                        }
                      </View>
                    }
                  </View>
                }
                <LinearGradient colors={[barGradientStart, barGradientEnd]}
                        style={styles.gradientArea}>
                  <Text style={styles.value}>{item.label1}</Text>
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
  style,                      // styling for the graph, must contain height
  barStyle,                   // styling for the bars
  maxBarHeight,
  minBarHeight = undefined,   // height for zero-value bars
  openFlag=undefined,         // flag to control the animation of the graph bars
  data,                       // object with information for the graph bars
  dataRange,                  // range of values in the data {max,min,range}
  allowEmptyBars = true,      // don't render empty bars if false
  scrollToBar = undefined,    // index of bar to scroll to (just to update the display)
  hideScrollBar = undefined,  // if true, don't show the scrollbar on the flatlist 
  animationDuration = undefined, // duration for the ExpandViewY component used for bars
  labelAngle = undefined,     // rotation angle for indicator
}) {

  const scrollRef : MutableRefObject<FlatList<any>> = useRef();
  const selectedBar = useRef(0);
  const renderCount = useRef(0);
  const graphHeight = style.height;
  const barWidth = barStyle.width;
  const barsPerView = style.width ? Math.round(style.width / barWidth) : 8;
  const maxRender = barsPerView + 2;
  const initRender = Math.min(data.length + 1, maxRender)
  const minHt = minBarHeight || 25;
  const iAngle = labelAngle || 0;

  useEffect(() => {
    if(scrollToBar !== undefined) { 
      moveScrollPos(scrollToBar > 0 ? scrollToBar : 0);
    } else {
      if(selected !== selectedBar.current) {
        if (allowEmptyBars || selected < 0) {
          moveScrollPos(selected < 0 ? 0 : selected);
        } else {
          let bar = 0, item = 0;
          while(item < selected) {
            if (!data[item].showEmpty) { 
              bar++; 
            }
            item++;
          }
          moveScrollPos(bar);
        }
      }
    }
  },[scrollToBar, selected])

  function moveScrollPos (barNum: number) {
    let bar = Math.max(Math.trunc(barNum - (barsPerView/2)), 0);
    scrollRef.current.scrollToOffset({offset: bar * barWidth, animated: true});
  }
      
  function barPressed (val: any, bar: number) {
      selectedBar.current = bar;
      if (selectFn) {
        selectFn(val);
      }
  }

  const lastIndex = data.length ? data.length - 1 : 0;

  const _keyExtractor = (_item, index) => index.toString();

  const _renderItem = ({item, index}) =>
        { if (!item.showEmpty || allowEmptyBars) {
          if(renderCount.current > 0) {renderCount.current--;}
          return (
            <BarItem 
              item={item}
              index={index}
              range={dataRange}
              maxHt={maxBarHeight}
              minHt={minHt}
              graphHt={graphHeight}
              lastItem={index === lastIndex}
              selected={selected}
              style={barStyle}
              animationDuration={animationDuration}
              pressed={barPressed}
              open={openFlag}
              animate={renderCount.current}
              iAngle={iAngle}
            />
          )
        } else {
          return null;
      }
    };
  renderCount.current = initRender;
  return useObserver(() => (
        <FlatList
          ref={scrollRef}
          data={data}
          keyExtractor={_keyExtractor}
          extraData={{item1: selected, item2: openFlag}}
          initialNumToRender={initRender}     // this must be integer
          horizontal
          showsHorizontalScrollIndicator={hideScrollBar ? false : true}
          showsVerticalScrollIndicator={hideScrollBar ? false : true}
          renderItem={_renderItem}
        />
  ))
}

export default React.memo(BarDisplay);
