import React, { useContext, useEffect, useRef } from "react";
import { View, Text, StyleSheet, DrawerLayoutAndroid, ScrollView } from "react-native";
import { RectButton } from 'react-native-gesture-handler'
import { useObserver } from 'mobx-react-lite';

import { UiThemeContext, TrekInfoContext } from "./App";
import SvgIcon from "./SvgIconComponent";
import { APP_ICONS } from "./SvgImages";
import { TrekInfo, CURRENT_TREKLOG_VERSION } from './TrekInfoModel';

export interface NavMenuItem {
  icon?:      string,             // icon to display to left of label
  color?:     string,             // optional color for the icon
  label:      string,             // label to describe item
  value?:     string,             // value to return if item selected
  disabled?:  boolean,            // true if item is not selectable
  submenu?: NavMenuItem[]         // items for a submenu, label is submenu title
}

function NavMenu({
  open,
  locked=undefined,
  items,
  selectFn,
  setOpenFn,      // call this function to affect the open flag in the caller
  children
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const tInfo: TrekInfo = useContext(TrekInfoContext);
  const navRef = useRef<DrawerLayoutAndroid>();
  const isOpen = useRef(false);

  useEffect(() => {                       // componentDidUpdate
    if (isOpen.current !== open) {
      open ? openIt() : closeIt();
    }
  },[open]);

  function openIt(){
    if(navRef.current){
      navRef.current.openDrawer();
    }
  }

  function closeIt(){
    if(navRef.current){
      navRef.current.closeDrawer();
    }
  }

  function drawerWasClosed(){
    isOpen.current = false;
    setOpenFn(false);
  }

  function drawerWasOpened(){
    isOpen.current = true;
    setOpenFn(true);
  }

  function callSelectFn(value: string){
    setTimeout(() => {      
      selectFn(value);
      closeIt();
    }, 300);
  }

  const { navMenuRippleColor, navMenuIconColor, navMenuTextColor, navMenuBackgroundColor,
          primaryColor, navMenuTitleTextColor, navMenuDividerColor, menuItemDisabledColor
        } = uiTheme.palette[tInfo.colorTheme];
  const { fontRegular, fontBold
        } = uiTheme;
  const menuIconSize = 20;
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    menuArea: {
      flexDirection: "column",
      // paddingHorizontal: 10,
      backgroundColor: navMenuBackgroundColor,
    },
    menuTitle: {
      height: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primaryColor,
      borderBottomWidth: 1,
      borderStyle: "solid",
      borderColor: navMenuDividerColor,
    },
    menuTitleText: {
      fontFamily: fontBold,
      fontSize: 24,
      color: navMenuTitleTextColor,
    },
    menuVersionText: {
      marginLeft: 15,
      marginTop: 5,
      fontFamily: fontRegular,
      fontSize: 18,
      color: navMenuTitleTextColor,
    },
    menuButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingRight: 10,
    },
    menuButtonText: {
      fontFamily: fontRegular,
      fontSize: 18,
      color: navMenuTextColor,
      flex: 1,
    },
    menuButtonIcon: {
      width: menuIconSize,
      height: menuIconSize,
      backgroundColor: "transparent",
      marginRight: 10,
    },
    submenuHeading: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
      paddingLeft: 10,
    },
    submenuHeadingText: {
      fontFamily: fontBold,
      fontSize: 18,
      color: navMenuTextColor,
      flex: 1,
    },
    subMenuItems: {
      paddingLeft: 15,
    },
    divider: {
      flex: 1,
      marginHorizontal: 10,
      borderBottomWidth: 1,
      borderStyle: "solid",
      borderColor: navMenuDividerColor,
    },
    menuFooter: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primaryColor,
      borderTopWidth: 1,
      borderStyle: "solid",
      borderColor: navMenuDividerColor,
    },
    footerDateText: {
      fontFamily: fontRegular,
      fontSize: 16,
      color: navMenuTitleTextColor,
    },
    footerTimeText: {
      fontFamily: fontBold,
      fontSize: 22,
      color: navMenuTitleTextColor,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },
})

  const MenuButton = ({item, padLeft}) => {
    return (
        <RectButton
          rippleColor={navMenuRippleColor}
          // style={{flex: 1}}
          onPress={item.disabled ? undefined : () => callSelectFn(item.value)}
        >
        <View style={[styles.menuButton, {paddingLeft: padLeft}]}>
          <SvgIcon
            style={styles.menuButtonIcon}
            size={menuIconSize}
            paths={APP_ICONS[item.icon]}
            fill={item.disabled ? menuItemDisabledColor : (item.color || navMenuIconColor)}
          />
          <Text style={[styles.menuButtonText, item.disabled ? 
                        {color: menuItemDisabledColor} : {}]}>{item.label}</Text>
        </View>
      </RectButton>
    )
  }
  const navigationView =
    useObserver(() => ( 
      <View style={styles.container}>
        <View style={styles.menuTitle}>
          <Text style={styles.menuTitleText}>TrekLog</Text>
          <Text style={styles.menuVersionText}>{'v' + CURRENT_TREKLOG_VERSION }</Text>
        </View>
        <ScrollView>
          <View style={styles.menuArea}>
            {items.map((item: NavMenuItem) =>
                <View>
                  {item.submenu &&
                    <View>
                      <View style={styles.submenuHeading}>
                        {item.icon &&
                          <SvgIcon
                            style={styles.menuButtonIcon}
                            size={menuIconSize}
                            paths={APP_ICONS[item.icon]}
                            fill={item.color || navMenuIconColor}
                          />
                        }
                        <Text style={styles.submenuHeadingText}>{item.label}</Text>
                      </View>
                      <View>
                        {item.submenu.map((subItem) =>
                          <MenuButton item={subItem} padLeft={25}/>
                          )
                        }
                      </View>
                      <View style={styles.divider}/>
                    </View>
                  }
                  {!item.submenu &&
                    <MenuButton item={item} padLeft={10}/>
                  }
                </View>
              )
            }
          </View>
        </ScrollView>
        <View style={styles.menuFooter}>
          <Text style={styles.footerDateText}>{tInfo.currentDate}</Text>
          <Text style={styles.footerTimeText}>{tInfo.currentTime}</Text>
        </View>
      </View>
    ));

    return useObserver(() => (
      <DrawerLayoutAndroid
      ref={nav => navRef.current = nav} 
      drawerWidth={200}
      drawerLockMode={locked ? 'locked-closed' : 'unlocked'}
      onDrawerClose={drawerWasClosed}
      onDrawerOpen={drawerWasOpened}
        // @ts-ignore
      drawerPosition={DrawerLayoutAndroid.positions.Left}
      renderNavigationView={() => navigationView}>
        {children}
      </DrawerLayoutAndroid>
    ));
  }
export default NavMenu;


