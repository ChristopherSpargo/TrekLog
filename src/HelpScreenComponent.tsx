import React, { Component } from 'react';
import { NavigationActions } from 'react-navigation';
import { View, StyleSheet, BackHandler, ScrollView } from 'react-native'
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import TrekLogHeader from './TreklogHeaderComponent'
import TextInputField from './TextInputFieldComponent';
import SvgButton from './SvgButtonComponent';
import { APP_ICONS } from './SvgImages';
import { MainSvc } from './MainSvc';

import { HelpSvc, HELP_HOME, HELP_TREK_TYPES, HELP_USE_GROUPS, HELP_LOGGING_A_TREK,
         HELP_CHALLENGE_COURSE, HELP_LIMIT_BY_DIST, HELP_LIMIT_BY_TIME, HELP_SEARCH_MENU, 
         HELP_LOG_STAT_VIEW
       } from './HelpService';
import HelpSearchMenu from './HelpSearchMenu';
import HelpHome from './HelpHome';
import HelpLogStatView from './HelpLogStatView';
import HelpTrekTypes from './HelpTrekTypes';
import HelpLoggingTrek from './HelpLoggingTrek';
import HelpUseGroups from './HelpUseGroups';
import HelpChallengeCourse from './HelpChallengeCourse';
import HelpLimitTime from './HelpLimitTime';
import HelpLimitDist from './HelpLimitDist';

const goBack = NavigationActions.back() ;

@inject("mainSvc", "uiTheme", "helpSvc")
@observer
class HelpScreen extends Component<{
  uiTheme?: any,
  mainSvc?: MainSvc,
  helpSvc?: HelpSvc,
  navigation?: any
}, {} > {

  @observable searchText: string;
  @observable showSearchWidgit: boolean;

  @observable searchResults;

  hS = this.props.helpSvc;

  _didFocusSubscription;
  _willBlurSubscription;
 
  constructor(props) {
    super(props);
    this.setSearchValue('');
    this.setSearchResults(undefined);
    this.setShowSearchWidgit(false);
    this._didFocusSubscription = props.navigation.addListener('didFocus', () => {
      // now add a listener for the back button while this is the active route
      BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPressAndroid)});  
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener('willBlur', () =>
      BackHandler.removeEventListener('hardwareBackPress', this.onBackButtonPressAndroid))
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.props.helpSvc.resetHelpStack();
  }

  checkBackButton = () => {
    requestAnimationFrame(() =>{
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  }

  onBackButtonPressAndroid = () => {
    if(this.hS.atEntryPoint()) {
      return false;
    } 
    this.props.helpSvc.popHelp();
      return true;
  };

  showSearch = () => {
    this.setSearchResults(undefined);
    this.setShowSearchWidgit(true);
  }

  @action
  setShowSearchWidgit = (status: boolean) => {
    this.showSearchWidgit = status;
  }

  @action 
  setSearchResults = (results) => {
    this.searchResults = results;
  }

  closeHelp = () => {
    this.props.navigation.dispatch(goBack)
  }

  popHelp = () => {
    if(this.props.helpSvc.helpLength === 1) {
      this.closeHelp();
    } else {
      this.props.helpSvc.popHelp();
    }
  }

  // update the value of the search text
  @action
  setSearchValue = (text: string) => {
    this.searchText = text;
    this.searchHelp()
  }

  searchHelp = () => {
    if(this.searchText !== ''){
      this.props.helpSvc.searchOptions.minMatchCharLength = 
                this.searchText.length < 4 ? this.searchText.length : 4;
      this.setSearchResults(this.props.helpSvc.searchForHelp(this.searchText));
      // alert(JSON.stringify(this.searchResults,null,2))
      this.setShowSearchWidgit(false);
      this.props.helpSvc.removeHelpStackItem(HELP_SEARCH_MENU);
      // if(this.props.helpSvc.helpContext !== HELP_SEARCH_MENU){
        this.props.helpSvc.pushHelp(HELP_SEARCH_MENU);
      // }
    }
  }

  render() {
    const { pageBackground, headerTextColor, trekLogRed, altCardBackground, disabledTextColor
          } = this.props.uiTheme.palette[this.props.mainSvc.colorTheme];
    const textInputWidth = 250;
    const context = this.props.helpSvc.helpContext;
    const styles = StyleSheet.create({
        container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
        helpScreen: {
          padding: context === HELP_SEARCH_MENU ? 0 : 8,
        },
        searchWidgit: {
          padding: 8,
          marginTop: 10,
          marginBottom: 10,
          marginRight: 15,
          marginLeft: 15,
          backgroundColor: altCardBackground,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
        },
        addIconArea: {
          marginLeft: 10,
        },
      })
    const actions = [{ icon: 'Search', iconColor: headerTextColor, 
                       style: {marginTop: 0}, actionFn: this.showSearch},
                       { icon: 'CloseCircleOutline', iconColor: headerTextColor, 
                       style: {marginTop: 0}, actionFn: this.closeHelp}];

    return (
        <View style={styles.container}>
          <TrekLogHeader
            icon="*"
            actionButtons={actions}
            titleText={"Help: " + this.props.helpSvc.getHelpDescription(context)}
            backButtonFn={this.checkBackButton}
          />
          {this.showSearchWidgit && 
            <View style={styles.searchWidgit}>
              <View style={{width: textInputWidth}}>
                <TextInputField
                  inputWidth={textInputWidth}
                  onChangeFn={(text : string) => this.setSearchValue(text)}
                  kbType='default'
                  placeholderValue={this.searchText || 'Search Help'}
                  pvTextColor={disabledTextColor}
                /> 
              </View>
              <View style={styles.addIconArea}>
                <SvgButton
                  onPressFn={() => this.setShowSearchWidgit(false)}
                  size={24}
                  fill={trekLogRed}
                  path={APP_ICONS.Close}
                />
              </View>
            </View>
          }
          <ScrollView>
            <View style={styles.helpScreen}>
              {context === HELP_SEARCH_MENU &&
                <HelpSearchMenu searchText={this.searchText} itemList={this.searchResults}/>
              }
              {context === HELP_HOME &&
                <HelpHome/>
              }
              {context === HELP_LOG_STAT_VIEW &&
                <HelpLogStatView/>
              }
              {context === HELP_TREK_TYPES &&
                <HelpTrekTypes/>
              }
              {context === HELP_USE_GROUPS &&
                <HelpUseGroups/>
              }
              {context === HELP_LOGGING_A_TREK &&
                <HelpLoggingTrek/>
              }
              {context === HELP_CHALLENGE_COURSE &&
                <HelpChallengeCourse/>
              }
              {context === HELP_LIMIT_BY_TIME &&
                <HelpLimitTime/>
              }
              {context === HELP_LIMIT_BY_DIST &&
                <HelpLimitDist/>
              }
            </View>
          </ScrollView>
        </View>
    )
  }
}

export default HelpScreen;


