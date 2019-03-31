import React from 'react';
import { Platform, UIManager, View, StyleSheet, StatusBar } from 'react-native';
import { Provider } from 'mobx-react';
import { configure } from "mobx";
import { createStackNavigator } from 'react-navigation';

import { TrekInfo } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel';
import { ToastModel } from './ToastModel';
import TrekLogHeader from './TreklogHeaderComponent';
import SummaryScreen from './SummaryScreenComponent';
import LogTrek from './LogTrekComponent';
import LogTrekMap from './LogTrekMapComponent';
import Settings from './SettingsComponent';
import TrekImages from './TrekImagesComponent';
import ReviewTreks from './ReviewComponent';
import SelectedTrek from './SelectedTrekComponent';
import Goals from './GoalsComponent';
import GoalEditor from './GoalEditorComponent';
import GoalDetail from './GoalDetailsComponent';
import ExtraFilters from './ExtraFiltersComponent';
import Toast from './ToastComponent';
import ConfirmationModal from './ConfirmationModalComponent';
import GoalsAchievedModal from './GoalAchievedModalComponent';
import TrekLabelForm from './TrekLabelComponent';
import RadioPicker from './RadioPickerComponent';
import { FilterSvc } from './FilterService';
import { GoalsSvc } from './GoalsService';
import { StorageSvc } from './StorageService';
import { WeatherSvc } from './WeatherSvc';
import { LoggingSvc } from './LoggingService';
import { LocationSvc } from './LocationService';

configure({
  enforceActions: "strict"
});

// define some constants used by the app
export const TL_BLUE    = "rgb(33, 150, 243)";
export const TL_ORANGE  = "rgb(255, 167, 38)";
export const TL_YELLOW  = "rgb(255, 193, 7)"; 
export const TL_RED  = "rgb(211, 47, 47)";
export const TL_GREEN   = "rgb(67, 160, 71)";
export const TREK_TYPE_COLORS_ARRAY = [ TL_BLUE, TL_YELLOW, TL_RED, TL_GREEN ];
export const TREK_TYPE_COLORS_OBJ = { Walk: TL_BLUE, Run: TL_YELLOW, Bike: TL_RED, Hike: TL_GREEN };
export const primaryColor = "#388e3c";
export const primaryDarker = "#00600f";
export const secondaryColor = "#9c27b0";
export const pageBackground = "white";
export const controlsBackground = "white";
export const disabledTextColor = "rgba(0,0,0,.38)";
export const dividerColor = "rgba(0,0,0,.12)";
export const lowTextColor = "rgba(0,0,0,.48)";
export const mediumTextColor = "rgba(0,0,0,.60)";
export const highTextColor = "rgba(0,0,0,.87)";
export const linkActive = "#0275D8";
export const FAB_SIZE = 56;
export const HEADER_ICON_SIZE = 24;
export const HEADER_HEIGHT = 56;
export const CONTROLS_HEIGHT = 90;
export const NAV_ITEM_SIZE = CONTROLS_HEIGHT - 40;
export const NAV_ICON_SIZE = 24;
export const TREKLOG_LOG_KEY = '#Treklog#';
export const TREKLOG_USERS_KEY = '#Users';
export const TREKLOG_SETTINGS_KEY = '#Settings#';
export const SETTINGS_KEY_REGEX = /^#Settings#/i;
export const TREKLOG_GOALS_KEY = '#GOALS#';
export const navItemAreaSize = CONTROLS_HEIGHT - 40;
export const FOOTER_BUTTON_HEIGHT = 45;
export const INVISIBLE_Z_INDEX = -1;
export const INITIAL_POS_MARKER_Z_INDEX = 1;
export const CURRENT_POS_MARKER_Z_INDEX = 2;
export const INTERVAL_MARKER_Z_INDEX = 3;
export const PICTURE_MARKER_Z_INDEX = 25;
export const INTERVAL_GRAPH_Z_INDEX = 4;
export const ICON_BUTTON_Z_INDEX = 5;
export const SPEED_DIAL_Z_INDEX = 5;
export const NUMBERS_BAR_Z_INDEX = 6;
export const LIMITS_Z_INDEX = 8;
export const CONTROLS_Z_INDEX = 10;
export const BACKDROP_Z_INDEX = 99;
export const LABEL_FORM_Z_INDEX = 100;
export const CONFIRM_Z_INDEX = 100;
export const TOAST_Z_INDEX = 100;
export const WAITING_Z_INDEX = 102;


export const uiTheme = {
  palette: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: "#a5d6a7",
      secondaryColor: secondaryColor, 
      tertiaryColor: '#d795e9',
      accentColor: "#00665c",
      accentDarker: "#7da453",
      accentLighter: "#d2f7a4",
      lowTextColor: lowTextColor,
      mediumTextColor: mediumTextColor,
      highTextColor: highTextColor,
      disabledTextColor: disabledTextColor,
      dividerColor: dividerColor ,
      headerBackgroundColor: primaryColor,
      headerTextColor: "white",
      textOnPrimaryColor: "white",
      highlightedItemColor: "#eceff1",
      trekLogBlue: TL_BLUE,
      trekLogOrange: TL_ORANGE,
      trekLogRed: TL_RED,
      trekLogGreen: TL_GREEN,
      trekLogYellow: TL_YELLOW,
      trekLogBrown: "#a1887f",
      trekLogPurple: "#9575cd",
      trekLogBlueGrey: "#90a4ae",
      trekLogLightBlue: "#4fc3f7",
      trekLogIndigo: "#7986cb",
      trekLogLightGreen: "#81c784",
      trekLogAmber: "#ffd54f",
      warningColor: "firebrick",
      pageBackground: pageBackground,
      controlsBackground: controlsBackground,
      linkActive: linkActive,
      navIconColor: mediumTextColor,
      listIconColor: highTextColor,
      highlightColor: "rgba(118, 189, 213,1)",
      goalGold: "#e6c300",
      cancelColor: "gray",
      dangerColor: "rgba(178, 34, 34, 1.0)",
      okChoiceColor: "#2196f3",
      infoConfirmColor: TL_BLUE, //'#c4e4ed',
      infoConfirmTextColor: "white",
      warningConfirmColor: TL_YELLOW, //"#fae89e",
      warningConfirmTextColor: highTextColor,
      itemNotSelected: '#e7c0f2',
      itemSelectedColor: '#c4e3ed',
      itemMeetsGoal: '#1aff66',
      itemMissesGoal: '#ff1a1a',
  },
  toolbar: {
      container: {
          height: 60,
      },
  },
  cardLayout: {
    borderColor: "rgba(0,0,0,.12)",
    borderStyle: "solid",
    backgroundColor: "white",
    marginTop: 5,
    marginBottom: 5,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: "column",
  },
  roundedTop: {
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderTopRightRadius: 6,
    borderTopLeftRadius: 6,
    borderColor: mediumTextColor,
  },
  controlsArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: CONTROLS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: controlsBackground,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderStyle: "solid",
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0,
    borderColor: mediumTextColor,
    zIndex: CONFIRM_Z_INDEX,
  },
  navItem: {
    minHight: navItemAreaSize,
    minWidth: navItemAreaSize,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: dividerColor,
    borderStyle: "solid",
    borderRadius: navItemAreaSize / 2,
    padding: 11,
  },
  navIcon: {
    backgroundColor: "transparent",
  },
  navLabel: {
    color: highTextColor,
    fontSize: 14,
  },
  footerButton: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  footerButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  }
};

// create the navigation stack
const NavStack = createStackNavigator(
  {
    Log: {
      screen: LogTrek
    },
    Summary:  SummaryScreen,
    LogTrekMap: LogTrekMap,
    Settings: Settings,
    Review: ReviewTreks,
    SelectedTrek: SelectedTrek,
    Goals: Goals,
    GoalEditor: GoalEditor,
    GoalDetail: GoalDetail,
    ExtraFilters: ExtraFilters,
    Images: TrekImages
  },
  {
    initialRouteName: "Log",
    navigationOptions: {
      header: <TrekLogHeader/>
    }
  }
);

export const HEADER_TEXT_COLOR = uiTheme.palette.headerTextColor;

class TrekLog extends React.Component {
  utilsSvc = new UtilsSvc();
  modalSvc = new ModalModel();
  toastSvc = new ToastModel();
  weatherSvc = new WeatherSvc(this.toastSvc);
  storageSvc = new StorageSvc(this.utilsSvc);
  trekInfo = new TrekInfo(this.utilsSvc, this.storageSvc, this.modalSvc);
  locationSvc = new LocationSvc( this.trekInfo, this.storageSvc);
  loggingSvc = new LoggingSvc(this.utilsSvc, this.trekInfo, this.locationSvc, this.modalSvc, this.toastSvc);
  goalsSvc = new GoalsSvc(this.utilsSvc, this.trekInfo, this.toastSvc, this.storageSvc);
  filterSvc = new FilterSvc(this.utilsSvc, this.trekInfo, this.toastSvc);

  componentDidMount() {

    configure({
      enforceActions: "strict"        // strict mode for Mobx
    });
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental(true);
      StatusBar.setBackgroundColor(primaryDarker);
    }
  }

  render() {

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject }
    });

    return (
        <Provider 
          uiTheme={uiTheme}
          trekInfo={this.trekInfo}
          modalSvc={this.modalSvc}
          toastSvc={this.toastSvc}
          utilsSvc={this.utilsSvc}
          filterSvc={this.filterSvc}
          goalsSvc={this.goalsSvc}
          weatherSvc={this.weatherSvc}
          storageSvc={this.storageSvc}
          locationSvc={this.locationSvc}
          loggingSvc={this.loggingSvc}
        >
          <View style={styles.container}>
            <NavStack/>
            <Toast/>
            <ConfirmationModal/>
            <GoalsAchievedModal/>
            <TrekLabelForm/>
            <RadioPicker/>
          </View>
        </Provider>
      
      )
  }
}
export default TrekLog

