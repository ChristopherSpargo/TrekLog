import React, { Component } from 'react';
import { NavigationActions, StackActions } from 'react-navigation';
import { View, StyleSheet, Text } from 'react-native'
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import TrekLogHeader from './TreklogHeaderComponent'
import Conditions from './ConditionsComponent';
import { TrekInfo } from "./TrekInfoModel";
import NavMenu, { NavMenuItem } from './NavMenuComponent';
import NavMenuTrigger from './NavMenuTriggerComponent'

const goBack = NavigationActions.back() ;

@inject("trekInfo", "uiTheme")
@observer
class ShowConditions extends Component<{
  uiTheme?: any;
  trekInfo?: TrekInfo;
  navigation?: any}, {} > {

  @observable openNavMenu : boolean;

  constructor(props) {
    super(props);
    this.setOpenNavMenu(false);
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  setActiveNav = (val: string) => {
    requestAnimationFrame(() => {
      switch (val) {
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Summary":
        case "Courses":
        case "Goals":
        case "Settings":
        const resetAction = StackActions.reset({
                index: 1,
                actions: [
                  NavigationActions.navigate({ routeName: 'Log', key: 'Home' }),
                  NavigationActions.navigate({ routeName: val, key: 'Key-' + val }),
                ],
              });
          this.props.navigation.dispatch(resetAction);          
          break;
        default:
      }
    })
  }
  
  render() {
    const { pageBackground, highTextColor
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const { cardLayout, pageTitle 
          } = this.props.uiTheme;
    const styles = StyleSheet.create({
        container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      })
    let navMenuItems : NavMenuItem[] = 
    [ 
        {icon: 'Home', label: 'Home', value: 'Home'},
        {icon: 'Pie', label: 'Activity', value: 'Summary'},
        {icon: 'Course', label: 'Courses', value: 'Courses'},
        {icon: 'Target', label: 'Goals', value: 'Goals'},
        {icon: 'Settings', label: 'Settings', value: 'Settings'}]  
    

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}
      > 
        <View style={styles.container}>
          <TrekLogHeader
            icon="*"
            titleText="Conditions"
            backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
          />
          <View style={[cardLayout, {marginBottom: 0, paddingBottom: 15}]}>
            <NavMenuTrigger openMenuFn={this.openMenu}/>
            <Text style={[pageTitle, {color: highTextColor}]}>At Your Location</Text>
          </View>
          <Conditions/>
        </View>
      </NavMenu>
    )
  }
}

export default ShowConditions;


