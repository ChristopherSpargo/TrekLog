import React, { Component } from 'react';
import { NavigationActions, StackActions } from 'react-navigation';
import { View, StyleSheet } from 'react-native'
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import TrekLogHeader from './TreklogHeaderComponent'
import Conditions from './ConditionsComponent';
import NavMenu, { NavMenuItem } from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import { MainSvc } from './MainSvc';

const goBack = NavigationActions.back() ;

@inject("mainSvc", "uiTheme")
@observer
class ShowConditions extends Component<{
  uiTheme?: any;
  mainSvc?: MainSvc;
  navigation?: any}, {} > {

  @observable openNavMenu : boolean;
  headerActions = [];

  constructor(props) {
    super(props);
    this.setOpenNavMenu(false);
    this.setHeaderActions();
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
        default:
      }
    })
  }
  
  setHeaderActions = () => {
    this.headerActions.push(
      {icon: 'YinYang', style: {marginTop: 0}, actionFn: this.props.mainSvc.swapColorTheme});
  }

  render() {
    const { pageBackground
          } = this.props.uiTheme.palette[this.props.mainSvc.colorTheme];
    const { cardLayout
          } = this.props.uiTheme;
    const styles = StyleSheet.create({
        container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      })
    let navMenuItems : NavMenuItem[] = 
    [ 
        {icon: 'Home', label: 'Home', value: 'Home'},
    ]  
    

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
            actionButtons={this.headerActions}
            backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
            openMenuFn={this.openMenu}
          />
          <View style={[cardLayout, {marginBottom: 0, paddingBottom: 15}]}>
            <PageTitle titleText="At Your Location" style={{paddingLeft: 0}}
                        colorTheme={this.props.mainSvc.colorTheme}
            />
          </View>
          <Conditions/>
        </View>
      </NavMenu>
    )
  }
}

export default ShowConditions;


