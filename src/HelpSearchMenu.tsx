import React, { useContext } from "react";
import { RectButton } from 'react-native-gesture-handler';

import {
  View,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { HELP_ID_ICONS, helpContextDescriptions } from './HelpService';
import { APP_ICONS } from "./SvgImages";
import SvgIcon from "./SvgIconComponent";
import {
  UiThemeContext,
  MainSvcContext,
  HelpSvcContext,
  HEADER_HEIGHT
} from "./App";
import { HelpSvc } from './HelpService';
import { MainSvc } from "./MainSvc";

function HelpSearchMenu({searchText, itemList}) {

  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const helpSvc: HelpSvc = useContext(HelpSvcContext);

  function setHelp(helpId: string) {
    requestAnimationFrame(() => {
      helpSvc.pushHelp(helpId);
    })
  }

  function getRefInfo(helpItem) {
    let refs = 0;
    helpItem.matches.forEach((match) => {
      refs += match.indices.length || 1;
    })
      
    return refs + ' reference' + (refs === 1 ? '' : 's');
  }

  const {
    highTextColor,
    listIconColor,
    rippleColor,
    pageBackground,
    altCardBackground,
    mediumTextColor,
    trekLogBlue,
    shadow1
  } = uiTheme.palette[mainSvc.colorTheme];
  const { cardLayout, fontRegular } = uiTheme;
  const sortIconSize = 24;
  const helpButtonHeight = 70;
  // alert(JSON.stringify(itemList,null,2))

  const styles = StyleSheet.create({
    container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground, top: HEADER_HEIGHT },
    card: {
      ...cardLayout,
      marginLeft: 0, 
      marginRight: 0, 
      paddingLeft: 0, 
      paddingRight: 0,
      paddingTop: 20
    },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 10,
    },
    helpButton: {
      minHeight: helpButtonHeight,
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      backgroundColor: "transparent",
      ...shadow1,
      marginTop: 0
    },
    helpButtonIcon: {
      width: sortIconSize,
      height: sortIconSize,
      marginLeft: 10,
      marginRight: 10,
      backgroundColor: "transparent",
    },
    helpButtonText: {
      fontSize: 22,
      color: highTextColor,
      fontFamily: fontRegular,
    },
    helpButtonValue: {
      fontSize: 20,
      marginLeft: 50,
      color: highTextColor,
      fontFamily: fontRegular,
    },
    selectable: {
      color: trekLogBlue,
    },
    searchFor: {
      fontSize: 22,
      fontFamily: fontRegular,
      color: highTextColor,
    },
    searchText: {
      fontSize: 30,
      fontFamily: fontRegular,
      color: mediumTextColor,
    },
  })

  const HelpMenuItem = ({item, indx}) => {

    return (  
      <View key={indx} style={{flexDirection: 'row'}}>
        <RectButton           
          rippleColor={rippleColor}
          style={[shadow1, {flex: 1, backgroundColor: altCardBackground}]}
          onPress={() => setHelp(item.item)}>
          <View style={styles.helpButton}>
            <View style={styles.rowLayout}>
              <SvgIcon
                style={styles.helpButtonIcon}
                size={sortIconSize}
                paths={APP_ICONS[HELP_ID_ICONS[item.item].icon]}
                fill={HELP_ID_ICONS[item.item].color || listIconColor}
              />
              <Text style={styles.helpButtonText}>{helpContextDescriptions[item.item]}</Text>
            </View>
            <View style={styles.rowLayout}>
              <Text style={styles.helpButtonValue}>{getRefInfo(item)}</Text>
            </View>
          </View>
        </RectButton>
      </View>
    )
  }

  return  (
    <View>
      {itemList && 
        <ScrollView>
          <View style={styles.card}>
            <View style={[styles.helpButton, 
                        {flexDirection: "column", alignItems: "center", 
                        borderBottomWidth: 0, borderTopWidth: 0}]}>
                <Text style={styles.searchFor}>Find help references for:</Text>
                <Text style={styles.searchText}>{searchText}</Text>
            </View>
            {!itemList.length &&
              <View style={[styles.helpButton, 
                          {flexDirection: "column", alignItems: "center", borderTopWidth: 0}]}>
                  <Text style={[styles.searchText, {marginTop: 50}]}>No references found</Text>
              </View>
            }
            {itemList.map((item, indx) => (
                <HelpMenuItem item={item} indx={indx} />
                ))
            }
          </View>
        </ScrollView>
      }
  </View>
  )

}

export default HelpSearchMenu;