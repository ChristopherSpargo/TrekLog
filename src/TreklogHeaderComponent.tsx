import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text, TouchableNativeFeedback } from 'react-native';
import { observer, inject } from 'mobx-react';

import { TrekInfo } from './TrekInfoModel';
import { HEADER_HEIGHT, HEADER_ICON_SIZE } from './App';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import IconButton from './IconButtonComponent';

@inject('trekInfo', 'uiTheme')
@observer
class TrekLogHeader extends Component<{
  icon ?: string,
  iconColor ?: string,
  titleText ?: string,
  backButtonFn ?: Function,
  headerRightIcon ?: string,
  headerRightFn ?: Function,
  headerRightLabel ?: string,
  logo ?: boolean,                // true if show TrekLog logo
  use ?: string,                  // show specified use in header
  backgroundColor ?: string,
  position ?: string,             // set to absolute or not (relative)
  uiTheme ?: any,
  trekInfo ?: TrekInfo,
  navigation ?: any
}, {} > {

  render() {
    const {  navIconColor, headerBackgroundColor, headerTextColor } = this.props.uiTheme.palette;
    const { navIcon, navItem } = this.props.uiTheme;
    const iconName = this.props.icon || this.props.trekInfo.type;
    const backFn = this.props.backButtonFn !== undefined;
    const headerRt = this.props.headerRightFn !== undefined;
    const textML = iconName === "*" ? (backFn ? 0 : 16) : 10;
    const iconML = backFn ? 0 : 16;
    const headerButtonAreaSize = HEADER_ICON_SIZE + 20;
    const iconAraSize = HEADER_ICON_SIZE + 8;
    const iconWithLogoSize = HEADER_ICON_SIZE + 6;
    const bgColor = this.props.backgroundColor || headerBackgroundColor;
    const useIconSize = 18;

    const styles = StyleSheet.create({
      header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: bgColor,
        elevation: 4,
      },
      posAbsolute: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        elevation: 0,
      },
      iconArea: {
        width: iconAraSize,
        height: iconAraSize,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white", 
        borderRadius: iconAraSize / 2,
      },
      icon: {
        width: this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE,
        height: this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE,
        marginLeft: iconML,
        backgroundColor: "transparent",
      },
      text: {
        fontSize: 22,
        fontWeight: "300",
        color: headerTextColor,
        marginRight: 8,
        marginLeft: textML,
      },
      headerRight: {
        flex: 1,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
      },
      headerRightButton: {
        minHeight: headerButtonAreaSize,
        minWidth: headerButtonAreaSize,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: navItem.borderColor,
        borderStyle: "solid",
        borderRadius: headerButtonAreaSize / 2,
        padding: 9,
      },
      logoText: {
        color: "white",
        fontSize: 34,
      },
      logo: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: textML,
      },
      backButtonArea: {
        width: 56, 
        height: 56, 
        justifyContent: "center", 
        alignItems: "center",
      },
      useArea: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginRight: 16,
        height: HEADER_HEIGHT,
      },
      useIcon: {
        width: useIconSize,
        height: useIconSize,
        marginRight: 4,
        marginBottom: 3,
        backgroundColor: "transparent"
      },
      useText: {
        fontSize: 18,
        color: headerTextColor,
      },
    })

    return (
     <View style={[styles.header, this.props.position === 'absolute' ? styles.posAbsolute : {}]}>
      {backFn &&
        <TouchableNativeFeedback 
            background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
            onPress={() => this.props.backButtonFn()}
          >
          <View style={styles.backButtonArea}>
            <SvgIcon 
                size={32}
                widthAdj={0}
                fill={headerTextColor}
                paths={APP_ICONS.ArrowBack}
            />
          </View>
        </TouchableNativeFeedback>
      }
      {(iconName !== '*') &&
          // <View style={styles.iconArea}>
            <SvgIcon
              style={styles.icon}
              size={this.props.logo ? iconWithLogoSize : HEADER_ICON_SIZE}
              paths={APP_ICONS[iconName]}
              fill="white"
            />
          // </View>
      }
      <View style={styles.headerRight}>
        {this.props.logo && 
          <View style={styles.logo}>
            <Text style={[styles.logoText]}>TrekLog</Text>
          </View>
        }
        {!this.props.logo && 
          <Text style={styles.text}>{this.props.titleText}</Text>
        }
        {headerRt && 
          <View style={{marginRight: 16}}>
            <IconButton 
              iconSize={HEADER_ICON_SIZE}
              icon={this.props.headerRightIcon}
              style={[styles.headerRightButton]}
              iconStyle={navIcon}
              color={navIconColor}
              buttonSize={headerButtonAreaSize}
              raised
              // label={this.props.headerRightLabel}
              // labelStyle={[navLabel, {marginTop: -4, fontSize: 13}]}
              onPressFn={this.props.headerRightFn}
            />
          </View>
        }
        { this.props.use &&
          <View style={styles.useArea}>
            <SvgIcon
              style={styles.useIcon}
              size={useIconSize}
              paths={APP_ICONS.AccountCircle}
              fill={headerTextColor}
            />
            <Text style={styles.useText}>{this.props.use}</Text>
          </View>
        }
      </View>
     </View> 
    )
  }

}

export default TrekLogHeader;


