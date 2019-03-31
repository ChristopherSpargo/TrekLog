import React, { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { observer, inject } from 'mobx-react'
import { NavigationActions } from 'react-navigation';

import { CONTROLS_HEIGHT } from './App';
import { TrekInfo, ALL_SELECT_BITS } from './TrekInfoModel';
import IconButton from './IconButtonComponent';
import DashBoard from './DashBoardComponent';
import { ToastModel } from './ToastModel';
import { StorageSvc } from './StorageService';
import { LocationSvc } from './LocationService';
import { FilterSvc } from './FilterService';
import TrekLogHeader from './TreklogHeaderComponent';

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'uiTheme', 'toastSvc', 'storageSvc', 'locationSvc', 'filterSvc')
@observer
class SummaryScreen extends Component<{
  navigation ?: any,
  toastSvc ?: ToastModel,
  storageSvc ?: StorageSvc,
  locationSvc ?: LocationSvc,
  filterSvc ?: FilterSvc,
  trekInfo ?: TrekInfo,
  uiTheme ?: any
}, {} > {

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  dashBoardRef;
  activeNav = '';

  static navigationOptions = ({ navigation }) => {
    return {
      header: <TrekLogHeader titleText="Summary"
                             icon="*"
                             backButtonFn={() =>  navigation.dispatch(goBack)}
              />
    };
  };  

  _didFocusSubscription;
  
  constructor(props) {
    super(props);
    this.dashBoardRef = React.createRef();
    this._didFocusSubscription = props.navigation.addListener('didFocus', () => this.init());
  }

  componentWillMount() {
    this.init();
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
  }

  init = () => {
    let typeSels;

    this.tInfo.updateDashboard = true;
    typeSels = this.tInfo.typeSelections;
    this.tInfo.setTypeSelections(ALL_SELECT_BITS);
    this.fS.filterAndSort();
    this.tInfo.setTypeSelections(typeSels);
    this.tInfo.clearTrek();
  }

  setActiveNav = (val) => {
    this.activeNav = val;
    requestAnimationFrame(() =>{
      switch(val){
        case 'Review':
          this.tInfo.updateDashboard = false;
          this.props.navigation.navigate(val);
          break;
        case 'ExtraFilters':
          let title = this.fS.formatTitleMessage('Filter:', ALL_SELECT_BITS);
          let filter = this.fS.getFilterSettingsObj(false);
          this.tInfo.updateDashboard = true;
          this.fS.filterMode = 'Dashboard';
          this.props.navigation.navigate('ExtraFilters', 
                  {title: title, existingFilter: filter});
          break;
        default:
      }
    })
  }

  render() {

    const { disabledTextColor, pageBackground, navIconColor } = this.props.uiTheme.palette;
    const { controlsArea, navItem, navIcon } = this.props.uiTheme;
    const navIconSize = 24;
    const extraFilters = this.fS.extraFilterSet();

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      caAdjust: {
        height: CONTROLS_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: controlsArea.backgroundColor,
        borderTopWidth: 1,
        borderStyle: "solid",
        borderTopRightRadius: 0,
        borderTopLeftRadius: 0,
        borderColor: controlsArea.borderColor,
        borderLeftWidth: 0,
        borderRightWidth: 0,
      },
      sloganArea: {
        alignItems: "center",
        marginBottom: 15,
        marginTop: 20,
      },
      slogan: {
        fontSize: 18,
        fontStyle: "italic",
        color: disabledTextColor
      },
      dashboardArea: {
        flex: 1,
        // position: "absolute",
        // bottom: CONTROLS_HEIGHT,
        // left: 0,
        // right: 0,
      }
    });

    return (
      
      <View style={styles.container}>
      {this.tInfo.appReady && 
        <View style={[styles.container, {justifyContent: "space-between"}]}>
          <View style={styles.sloganArea}>
            <Text style={styles.slogan}>"Information is strength ...</Text>
            <Text style={styles.slogan}>... Live strong, Live long "</Text>
          </View>
          {this.props.trekInfo.dataReady && 
            <View style={styles.dashboardArea}>
              <DashBoard
                navigation={this.props.navigation}
                trekCount={this.props.trekInfo.trekCount}
                ref={this.dashBoardRef} 
              />
            </View>
          }
          <View style={[styles.caAdjust]}>
            <IconButton 
              iconSize={navIconSize}
              icon={extraFilters ? "FilterRemove" : "Filter"}
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="ExtraFilters"
            />
            <IconButton 
              iconSize={navIconSize}
              icon="ViewList"
              style={navItem}
              iconStyle={navIcon}
              color={navIconColor}
              raised
              onPressFn={this.setActiveNav}
              onPressArg="Review"
            />
          </View>
      </View>
      }
      </View>
    );
  }

}

export default SummaryScreen;