import React from "react";
import { Component } from "react";
import { View, StyleSheet, Text } from "react-native";
import { observer, inject } from "mobx-react";

import { TrekInfo } from "./TrekInfoModel";
import { HEADER_HEIGHT, HEADER_ICON_SIZE, BACK_BUTTON_SIZE, HEADER_Z_INDEX,
         MENUTRIGGER_AREA, MENUTRIGGER_SIZE } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import IconButton from "./IconButtonComponent";
import SvgButton from "./SvgButtonComponent";

@inject("trekInfo", "uiTheme")
@observer
class TrekLogHeader extends Component<
  {
    icon?: string,
    iconColor?: string,
    titleText?: string,
    backButtonFn?: Function,
    actionButtons?: any[];
    logo?: boolean,           // true if show TrekLog logo
    group?: string,             // show specified group in header
    setGroupFn?: Function,      // function to call when use button pressed
    groupTextColor?: string,    // color to give the group item
    backgroundColor?: string,
    textColor?: string;       // color to use for header text
    borderBottomColor?: string; // set for bottom Border
    position?: string;        // set to absolute or not (relative)
    openMenuFn?: Function;    // show menu icon at right end of header if present
    disableMenu?: boolean;    // show menu icon as disabled and don't call openMenuFn if pressed
    uiTheme?: any;
    trekInfo?: TrekInfo;
    navigation?: any;
  },
  {}
> {

  callOpenMenuFn = () => {
    if(!this.props.disableMenu){
      this.props.openMenuFn();
    }
  }

  render() {
    const {
      headerBackgroundColor,
      headerBorderColor,
      headerTextColor,
      disabledHeaderTextColor,
      headerRippleColor
    } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { navIcon, fontRegular } = this.props.uiTheme;
    const iconName = this.props.icon || this.props.trekInfo.type;
    const backFn = this.props.backButtonFn !== undefined;
    const actions = this.props.actionButtons !== undefined;
    const textML = iconName === "*" ? (backFn ? 0 : 16) : 10;
    const iconML = backFn ? 0 : 16;
    const headerButtonAreaSize = HEADER_ICON_SIZE + 8;
    const iconAraSize = HEADER_ICON_SIZE + 8;
    const iconWithLogoSize = HEADER_ICON_SIZE + 6;
    const htColor = this.props.textColor || headerTextColor;
    const groupTextColor = this.props.groupTextColor || htColor;
    const bgColor = this.props.backgroundColor || headerBackgroundColor;
    const bdrColor = this.props.borderBottomColor || headerBorderColor;
    const groupIconSize = 18;

    const styles = StyleSheet.create({
      header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: bgColor,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: bdrColor,
        zIndex: HEADER_Z_INDEX,
        elevation: 4
      },
      posAbsolute: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        elevation: 0
      },
      iconArea: {
        width: iconAraSize,
        height: iconAraSize,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: iconAraSize / 2
      },
      icon: {
        width: this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE,
        height: this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE,
        marginLeft: iconML,
        backgroundColor: "transparent"
      },
      text: {
        fontSize: 22,
        fontFamily: fontRegular,
        color: htColor,
        marginRight: 8,
        marginLeft: textML
      },
      headerRight: {
        flex: 1,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between"
      },
      headerRightButton: {
        height: headerButtonAreaSize,
        width: headerButtonAreaSize,
        backgroundColor: "transparent",
        borderRadius: headerButtonAreaSize / 2,
      },
      logoText: {
        color: htColor,
        fontFamily: fontRegular,
        fontSize: 38
      },
      logo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: textML,
        marginRight: 20,
      },
      backButtonArea: {
        width: 56,
        height: 56,
        justifyContent: "center",
        alignItems: "center"
      },
      backButtonTarget: {
        width: HEADER_ICON_SIZE + 5,
        height: HEADER_ICON_SIZE + 5,
        borderRadius: (HEADER_ICON_SIZE + 5) / 2,
        alignItems: "center",
        justifyContent: "center",
      },
      groupArea: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginRight: 8,
        padding: 8,
        height: HEADER_HEIGHT
      },
      groupIcon: {
        width: groupIconSize,
        height: groupIconSize,
        marginRight: 4,
        marginBottom: 3,
        backgroundColor: "transparent"
      },
      flexWrap: {
        flexWrap: "wrap",
        // marginRight: 8,
      },
      groupText: {
        fontSize: 18,
        fontFamily: fontRegular,
        color: groupTextColor
      },
      menuArea: {
        justifyContent: "center",
        alignItems: "center",
        width: MENUTRIGGER_AREA,
        height: MENUTRIGGER_AREA,
        marginRight: 10,
      }
    });

    return (
      <View
        style={[
          styles.header,
          this.props.position === "absolute" ? styles.posAbsolute : {}
        ]}
      >
        {backFn && (
          <View style={styles.backButtonArea}>
            <SvgButton
              style={styles.backButtonTarget}
              onPressFn={() => this.props.backButtonFn()}
              borderWidth={0}
              size={BACK_BUTTON_SIZE}
              fill={htColor}
              path={APP_ICONS.ArrowBack}
            />
          </View>
        )}
        {iconName !== "*" && (
          <SvgIcon
            style={styles.icon}
            size={this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE}
            paths={APP_ICONS[iconName]}
            fill={this.props.iconColor || htColor}
          />
        )}
        <View style={styles.headerRight}>
          {this.props.logo && (
            <View style={styles.logo}>
              <Text style={[styles.logoText]}>TrekLog</Text>
            </View>
          )}
          {!this.props.logo && this.props.titleText && (
            <Text style={styles.text}>{this.props.titleText}</Text>
          )}
          {actions && 
            this.props.actionButtons.map((item, index) => (           
                <View style={item.style} key={index}>
                  <IconButton
                    rippleColor={headerRippleColor}
                    iconSize={HEADER_ICON_SIZE}
                    icon={item.icon}
                    style={styles.headerRightButton}
                    iconStyle={navIcon}
                    color={item.iconColor || headerTextColor}
                    borderColor="transparent"
                    onPressFn={item.actionFn}
                  />
                </View>
              )
          )}
          {this.props.openMenuFn &&
            <View style={styles.menuArea}>
              <SvgButton
                rippleColor={headerRippleColor}
                onPressFn={this.callOpenMenuFn}
                borderWidth={0}
                areaOffset={0}
                size={MENUTRIGGER_SIZE}
                fill={this.props.disableMenu ? disabledHeaderTextColor : htColor}
                path={ APP_ICONS.Menu }
              />
            </View>
          }
        </View>
      </View>
    );
  }
}

export default TrekLogHeader;
