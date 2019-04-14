import React, { Component } from 'react';
import { View, StyleSheet, TouchableNativeFeedback } from 'react-native';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';

import { SPEED_DIAL_Z_INDEX } from './App';
import SlideUpView from './SlideUpComponent';
import SlideLeftView from './SlideLeftComponent';
import SvgIcon from './SvgIconComponent';
import IconButton from './IconButtonComponent';
import { APP_ICONS } from './SvgImages';

export interface SpeedDialItem  {
  label: string,
  icon: string,
  value: string,
  bColor ?: string
}

@inject('uiTheme')
@observer
class SpeedDial extends Component<{ 
  top ?: number,              // top of speedDial trigger (if present)
  bottom ?: number,           // bottom of speedDial trigger (if 'top' not present)
  icon ?: string,             // icon for the trigger
  iconColor ?: string,
  iconSize ?: string,
  itemSize ?: string,         // size of slide-out menu items
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

    const triggerIconSize = this.props.iconSize === "Small" ? 24 : 30;
    const triggerIconArea = this.props.iconSize === "Small" ? 40 : 56;
    const SD_ITEM_SIZE = this.props.itemSize === "Big" ? 65 : 54;
    const SD_TRIGGER_HEIGHT = this.props.triggerHeight || 56;
    const SD_MENU_WIDTH = this.props.iconSize === "Small" ? 46 : 60;
    const {mediumTextColor, textOnPrimaryColor, secondaryColor, primaryColor,
            } = this.props.uiTheme.palette;
    const numItems = this.props.items ? this.props.items.length : undefined;
    const menuSize = numItems * SD_ITEM_SIZE + 5;
    const itemIconSize = this.props.iconSize === "Small" ? 16 : 24;
    const itemIconArea = this.props.iconSize === "Small" ? 24 : 35;
    const triggerIcon = this.props.icon || "Location"
    const propStyle = this.props.style || {};
    const slideoutBg = this.props.menuColor ? this.props.menuColor : "rgba(255,255,255,.85)";
    const triggerFill = this.props.iconColor === undefined ? textOnPrimaryColor : this.props.iconColor;
    const vMenuTop = this.props.top !== undefined 
            ? this.props.top + SD_TRIGGER_HEIGHT : undefined;
    const vMenuBottom = this.props.top === undefined 
            ? this.props.bottom + SD_TRIGGER_HEIGHT + (this.props.iconSize === "Small" ? 0 : 15) : undefined;
    const hMenuTop = this.props.top !== undefined 
            ? this.props.top : undefined;
    const hMenuBottom = this.props.top === undefined 
            ? this.props.bottom + (this.props.iconSize === "Small" ? 11 : 5) : undefined;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      triggerArea: {
        position: "absolute",
        top: this.props.top,
        bottom: (this.props.top !== undefined) ? undefined : this.props.bottom,
        right: ((SD_MENU_WIDTH - triggerIconArea) / 2) + 5,
        width: triggerIconArea + 10,
        height: triggerIconArea + 10,
        borderRadius: (triggerIconArea + 10) / 2,
        alignItems: "center",
        justifyContent: "center",
        zIndex: SPEED_DIAL_Z_INDEX,
      },
      shadowArea: {
        width: triggerIconArea + 10,
        height: triggerIconArea + 10,
        borderRadius: (triggerIconArea + 10) / 2,        
        alignItems: "center",
        justifyContent: "center",
      },
      triggerIcon: {
        width: triggerIconArea,
        height: triggerIconArea,
        borderRadius: triggerIconArea / 2,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "transparent",
        elevation: 4,
        alignItems: "center",
        justifyContent: "center",
      },
      itemIcon: {
        width: itemIconArea,
        height: itemIconArea,
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
        paddingLeft: this.props.iconSize === "Small" ? 5 : 10,
        paddingRight: this.props.iconSize === "Small" ? 5 : 10,
        paddingTop: 5,
        paddingBottom: 5,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: slideoutBg,
      },
      hBar: {
        width: SD_ITEM_SIZE,
        paddingTop: this.props.iconSize === "Small" ? 5 : 10,
        paddingBottom: this.props.iconSize === "Small" ? 5 : 10,
        paddingLeft: 5,
        paddingRight: 5,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: slideoutBg,
      },
      label: {
        color: mediumTextColor,
        fontSize: 12,
        fontWeight: "300",
        textAlign: "center"
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
                      // style={navItem}
                      iconStyle={[styles.itemIcon, this.props.itemIconsStyle || {}, 
                                  item.bColor ? {borderColor: item.bColor} : {}]}
                      color={this.props.itemIconsColor || primaryColor}
                      // raised
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
          <TouchableNativeFeedback
            background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
            onPress={this.toggleSpeedDial}>
            <View style={styles.shadowArea}>
              <SvgIcon
                paths={APP_ICONS[triggerIcon]}
                size={triggerIconSize}
                fill={triggerFill}
                style={[styles.triggerIcon, propStyle]}
              />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    );
  }
}

export default SpeedDial;