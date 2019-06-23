import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { BorderlessButton } from 'react-native-gesture-handler'
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';

import { SPEED_DIAL_Z_INDEX } from './App';
import SlideUpView from './SlideUpComponent';
import SlideLeftView from './SlideLeftComponent';
import SvgIcon from './SvgIconComponent';
import IconButton from './IconButtonComponent';
import FadeInTemp from './FadeInTempComponent';
import { APP_ICONS } from './SvgImages';
import { TrekInfo } from './TrekInfoModel';

export interface SpeedDialItem  {
  label: string,
  icon: string,
  value: string,
  bColor ?: string
}

@inject('uiTheme', 'trekInfo')
@observer
class SpeedDial extends Component<{ 
  top ?: number,              // top of speedDial trigger (if present)
  bottom ?: number,           // bottom of speedDial trigger (if 'top' not present)
  icon ?: string,             // icon for the trigger
  iconColor ?: string,
  iconSize ?: string,         // size of item icons
  itemSize ?: string,         // size of slide-out menu items
  raised ?: boolean,          // elevate trigger if true
  triggerHeight ?: number,
  triggerValue ?: string,     // value to return for trigger pressed with no items menu
  style ?: any,
  menuColor ?: string,        // background color for the slideout menu
  items ?: SpeedDialItem[],
  itemIconsStyle ?: any,       // style for the menu item icons
  itemIconsColor ?: string,   // fill color for the menu item icons
  sdIndex ?: number,          // value to include with any argument to selectFn
  selectFn : Function,
  horizontal ?: boolean,      // true if slide-out goes to left, false if goes up
  autoClose ?: number,        // milliseconds to wait before closing
  fadeOut ?: number,          // if present and not 0, number of milliseconds before fading out trigger
  trekInfo ?: TrekInfo,
  uiTheme ?: any
}, {} > {

  @observable zValue;
  @observable open;

  openTimerID : number;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.zValue = -1;
    this.open = false;
  }

  @action
  setZValue = (val: number) => {
    this.zValue = val;
  }

  setVisible = () => {
    this.setZValue(4);
  }

  setNotVisible = () => {
    this.setZValue(-1);
  }

  itemSelected = (value: string) => {
    requestAnimationFrame(() => {
      this.setOpen(!this.open);
      requestAnimationFrame(() => {
        this.props.selectFn(value, this.props.sdIndex);
      });
    })
  }

  @action
  setOpen = (status: boolean) => {
    this.open = status;
    if(status === true){
      this.openTimerID = window.setTimeout(() => {
        this.setOpen(false);
      }, this.props.autoClose || 3000); // automatically close after a while if not closed
    }
    else {
      if(this.openTimerID !== undefined){
        window.clearTimeout(this.openTimerID);
        this.openTimerID = undefined;
      }
    }
  }

  @action
  toggleSpeedDial = () => {
    requestAnimationFrame(() => {
      if (this.props.items !== undefined){
        this.setOpen(!this.open);
      }
      else {
        this.props.selectFn(this.props.triggerValue);
      }
    });
  }

  render() {

    const propBot = this.props.bottom || 0;
    const smallIcons = this.props.iconSize === "Small";
    const bigItems = this.props.itemSize === "Big";
    const triggerIconSize = smallIcons ? 24 : 30;
    const triggerIconArea = smallIcons ? 40 : 56;
    const itemIconSize = !bigItems ? 16 : 24;
    const itemIconArea = smallIcons ? 24 : 36;
    const SD_ITEM_SIZE = bigItems ? 64 : 50;
    const SD_TRIGGER_HEIGHT = this.props.triggerHeight || 56;
    const SD_MENU_WIDTH = smallIcons ? 50 : 64;
    const labelAdj = bigItems ? -16 : -12;
    const { highTextColor, textOnSecondaryColor, secondaryColor, primaryColor, rippleColor, navItemBorderColor,
            matchingMask_7 } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const numItems = this.props.items ? this.props.items.length : undefined;
    const menuSize = numItems * SD_ITEM_SIZE + 5;
    const triggerIcon = this.props.icon || "Location"
    const propStyle = this.props.style || {};
    const slideoutBg = this.props.menuColor ? this.props.menuColor : matchingMask_7;
    const triggerFill = this.props.iconColor === undefined ? textOnSecondaryColor : this.props.iconColor;
    const vMenuTop = this.props.top !== undefined 
            ? this.props.top + SD_TRIGGER_HEIGHT : undefined;
    const vMenuBottom = this.props.top === undefined 
            ? propBot + SD_TRIGGER_HEIGHT + (this.props.iconSize === "Small" ? 0 : 15) : undefined;
    const hMenuTop = this.props.top !== undefined 
            ? this.props.top : undefined;
    const hMenuBottom = this.props.top === undefined 
            ? propBot + 0 : undefined;
    const raise = this.props.raised ? 2 : 0;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      triggerArea: {
        position: "absolute",
        top: this.props.top,
        bottom: (this.props.top !== undefined) ? undefined : propBot,
        right: ((SD_MENU_WIDTH - triggerIconArea) / 2) + 5,
        width: triggerIconArea + 10,
        height: triggerIconArea + 10,
        alignItems: "center",
        justifyContent: "center",
        zIndex: SPEED_DIAL_Z_INDEX,
      },
      shadowArea: {
        width: triggerIconArea,
        height: triggerIconArea,
        borderRadius: triggerIconArea / 2,        
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent"
      },
      triggerIcon: {
        width: triggerIconArea,
        height: triggerIconArea,
        borderRadius: triggerIconArea / 2,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: navItemBorderColor,
        elevation: raise,
        alignItems: "center",
        justifyContent: "center",
      },
      itemIcon: {
        width: itemIconArea,
        height: itemIconArea,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: secondaryColor,
        borderRadius: itemIconArea/2,
        alignItems: "center",
        justifyContent: "center",
      },
      vMenuArea: {
        flexDirection: "column",
        width: SD_MENU_WIDTH,
        height: menuSize,
        zIndex: this.zValue,
        position: "absolute",
        right: 10,
        top: vMenuTop,
        bottom: vMenuBottom,
        overflow: "hidden",
        borderRadius: SD_MENU_WIDTH / 2,
      },
      hMenuArea: {
        flexDirection: "row",
        width: menuSize,
        height: SD_MENU_WIDTH,
        zIndex: this.zValue,
        position: "absolute",
        right: 10 + triggerIconArea + 1,
        top: hMenuTop,
        bottom: hMenuBottom,
        overflow: "hidden",
        borderRadius: SD_MENU_WIDTH / 2,
      },
      vBar: {
        height: SD_ITEM_SIZE,
        paddingLeft:  smallIcons ? 5 : 5,
        paddingRight: smallIcons ? 5 : 5,
        paddingTop: 5,
        paddingBottom: 5,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: slideoutBg,
      },
      hBar: {
        width: SD_ITEM_SIZE,
        paddingTop:    smallIcons ? 3 : 3,
        paddingBottom: smallIcons ? 5 : 8,
        paddingLeft: 5,
        paddingRight: 5,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: slideoutBg,
      },
      label: {
        color: highTextColor,
        fontSize: 12,
        marginTop: labelAdj,
        // fontWeight: "300",
        // textAlign: "center"
      },
      firstVItem: {
        paddingTop: 10,
      },
      lastVItem: {
        height: SD_ITEM_SIZE + 5,
        paddingBottom: 10,
      },
      firstHItem: {
        paddingLeft: 10,
      },
      lastHItem: {
        width: SD_ITEM_SIZE + 5,
        paddingRight: 10,
      },
      sdMenuButton: {
        backgroundColor: "transparent",
        width: this.props.horizontal ? SD_ITEM_SIZE : SD_MENU_WIDTH,
        height: this.props.horizontal ? SD_MENU_WIDTH : SD_ITEM_SIZE,
      }
    });

    return (
      <View style={styles.container}>
        {(numItems && !this.props.horizontal) &&
          <View style={styles.vMenuArea}>
            <SlideUpView 
              bgColor={slideoutBg}
              startValue={menuSize}
              endValue={0}
              open={this.open}
              beforeOpenFn={this.setVisible}
              afterCloseFn={this.setNotVisible}
            >
              {this.props.items.map((item, index) =>
                <View key={item.label}
                      style={[styles.vBar, (index === 0) ? styles.firstVItem : {},
                                          (index === this.props.items.length-1) ? styles.lastVItem : {}]}>
                  <IconButton 
                    iconSize={itemIconSize}
                    icon={item.icon}
                    iconStyle={[styles.itemIcon, this.props.itemIconsStyle || {}, 
                                item.bColor ? {borderColor: item.bColor} : {}]}
                    style={styles.sdMenuButton}
                    color={this.props.itemIconsColor || primaryColor}
                    onPressFn={this.itemSelected}
                    onPressArg={item.value}
                    label={item.label}
                    labelStyle={styles.label}
                  />
                </View>
                )
              }
            </SlideUpView>
          </View>
        }
        {(numItems && this.props.horizontal) &&
            <View style={styles.hMenuArea}>
              <SlideLeftView 
              bgColor={slideoutBg}
              startValue={menuSize}
              endValue={0}
              open={this.open}
              beforeOpenFn={this.setVisible}
              afterCloseFn={this.setNotVisible}
            >
              <View style={{flexDirection: "row"}}>
                {this.props.items.map((item, index) =>
                  <View key={item.label}
                        style={[styles.hBar, (index === 0) ? styles.firstHItem : {},
                                            (index === this.props.items.length-1) ? styles.lastHItem : {}]}>
                    <IconButton 
                      iconSize={itemIconSize}
                      icon={item.icon}
                      iconStyle={[styles.itemIcon, this.props.itemIconsStyle || {}, 
                                  item.bColor ? {borderColor: item.bColor} : {}]}
                      style={styles.sdMenuButton}
                      color={this.props.itemIconsColor || primaryColor}
                      onPressFn={this.itemSelected}
                      onPressArg={item.value}
                      label={item.label}
                      labelStyle={styles.label}
                    />
                  </View>
                  )
                }
              </View>
            </SlideLeftView>
          </View>
        }
        <View style={styles.triggerArea}>
          {this.props.fadeOut !== undefined &&
            <FadeInTemp onPressFn={this.toggleSpeedDial} 
                        viewTime={this.props.fadeOut} useFirstTouch>
              <View style={styles.shadowArea}>
                <SvgIcon
                  paths={APP_ICONS[triggerIcon]}
                  size={triggerIconSize}
                  fill={triggerFill}
                  style={[styles.triggerIcon, propStyle]}
                />
              </View>
            </FadeInTemp>
          }
          {this.props.fadeOut === undefined && 
            <BorderlessButton
              borderless={true}
              rippleColor={rippleColor}
              onPress={this.toggleSpeedDial}>
              <View style={styles.shadowArea}>
                <SvgIcon
                  paths={APP_ICONS[triggerIcon]}
                  size={triggerIconSize}
                  fill={triggerFill}
                  style={[styles.triggerIcon, propStyle]}
                />
              </View>
            </BorderlessButton>
          }
        </View>
      </View>
    )
  }
}

export default SpeedDial;