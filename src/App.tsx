import React from 'react';
import { Platform, UIManager, View, StyleSheet, StatusBar } from 'react-native';
import { Provider } from 'mobx-react';
import { configure } from "mobx";
import { createStackNavigator } from 'react-navigation';
import { TrekInfo } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel';
import { ToastModel } from './ToastModel';
import SummaryScreen from './SummaryScreenComponent';
import ShowConditions from './ShowConditionsComponent';
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
import { FilterSvc } from './FilterService';
import { GoalsSvc } from './GoalsService';
import { StorageSvc } from './StorageService';
import { WeatherSvc } from './WeatherSvc';
import { LoggingSvc } from './LoggingService';
import { LocationSvc } from './LocationService';
import { GroupSvc } from './GroupService';
import { IntervalSvc } from './IntervalSvc';

configure({
  enforceActions: "always"
});

// define some constants used by the app
export const FADE_IN_DURATION = 600;
export const SCROLL_DOWN_DURATION = 300;
export const COLOR_THEME_LIGHT = 'light';
export const COLOR_THEME_DARK = 'dark';
export type ThemeType = "light" | "dark";
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
export const linkActive = "#0275D8";
export const semitransWhite_2 = "rgba(255, 255, 255, .2)";
export const semitransWhite_3 = "rgba(255, 255, 255, .3)";
export const semitransWhite_5 = "rgba(255, 255, 255, .5)";
export const semitransWhite_7 = "rgba(255, 255, 255, .7)";
export const semitransWhite_8 = "rgba(255, 255, 255, .8)";
export const semitransWhite_9 = "rgba(255, 255, 255, .95)";
export const semitransBlack_12 = "rgba(0, 0, 0, .12)";
export const semitransBlack_2 = "rgba(0, 0, 0, .2)";
export const semitransBlack_3 = "rgba(0, 0, 0, .3)";
export const semitransBlack_5 = "rgba(0, 0, 0, .5)";
export const semitransBlack_7 = "rgba(0, 0, 0, .7)";
export const semitransBlack_9 = "rgba(0, 0, 0, .9)";
export const PAGE_TITLE_HEIGHT = 28;
export const HEADER_ICON_SIZE = 24;
export const BACK_BUTTON_SIZE = 40;
export const HEADER_HEIGHT = 56;
export const CONTROLS_HEIGHT = 70;
export const SHORT_CONTROLS_HEIGHT = 70;
export const NAV_ITEM_SIZE = CONTROLS_HEIGHT - 15;
export const NAV_ITEM_PADDING = 13;
export const NAV_ICON_SIZE = 28;

export const TREKLOG_GROUPS_DIRECTORY = 'Groups';
export const TREKLOG_GROUPS_FILENAME = 'Groups.txt';
export const TREKLOG_SETTINGS_FILENAME = 'Settings.txt';
export const TREKLOG_GOALS_FILENAME = 'Goals.txt';
export const TREKLOG_FILE_EXT = '.txt';
export const TREKLOG_FILE_FORMAT = 'utf8';
export const TREKLOG_PICTURES_DIRECTORY = "TrekLog";

export const TREKLOG_LOG_KEY = '#Treklog#';
export const TREKLOG_USERS_KEY = '#Users';
export const TREKLOG_SETTINGS_KEY = '#Settings#';
export const SETTINGS_KEY_REGEX = /^#Settings#/i;
export const TREKLOG_GOALS_KEY = '#GOALS#';
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
export const HEADER_Z_INDEX = 10;
export const BACKDROP_Z_INDEX = 99;
export const LABEL_FORM_Z_INDEX = 100;
export const CONFIRM_Z_INDEX = 100;
export const TOAST_Z_INDEX = 100;
export const WAITING_Z_INDEX = 102;

export const uiTheme = {
  palette: { 
    light: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: "#a5d6a7",
      secondaryColor: "rgb(156, 39, 176)", 
      secondaryColorTrans: "rgba(156, 39, 176,.6)",
      textOnSecondaryColor: "white",
      tertiaryColor: '#d795e9',
      accentColor: "#00665c",
      accentDarker: "#7da453",
      accentLighter: "#d2f7a4",
      rippleColor:  "rgba(0,0,0,.2)",
      lowTextColor: "rgba(0,0,0,.48)",
      mediumTextColor: "rgba(0,0,0,.60)",
      highTextColor: "rgba(0,0,0,.87)",
      disabledTextColor: "rgba(0,0,0,.38)",
      dividerColor: semitransBlack_12,
      headerBackgroundColor: primaryColor,
      headerTextColor: "white",
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
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
      pageBackground: "white",
      pageBackgroundFilm: "rgba(255,255,255,.4)",
      selectOnFilm: "#6600cc",
      controlsBackground: "white",
      textOnTheme: "rgba(0,0,0,.60)",
      textOffTheme: "white",
      linkActive: linkActive,
      navIconColor: "rgba(0,0,0,.60)",
      navItemBorderColor: semitransBlack_12,
      listIconColor: "rgba(0,0,0,.87)",
      highlightColor: "rgba(118, 189, 213,1)",
      pathColor: "#0066ff",
      locationRadiusBorder: "#ffff00",
      intervalMarkerBorderColor: "black",
      intervalMarkerBackgroundColor: semitransBlack_5,
      goalGold: "#e6c300",
      cancelColor: "gray",
      dangerColor: "rgba(178, 34, 34, 1.0)",
      okChoiceColor: "#2196f3",
      infoConfirmColor: TL_BLUE, //'#c4e4ed',
      infoConfirmTextColor: "white",
      warningConfirmColor: TL_YELLOW, //"#fae89e",
      warningConfirmTextColor: "rgba(0,0,0,.87)",
      itemNotSelected: '#e7c0f2',
      itemSelectedColor: '#c4e3ed',
      itemMeetsGoal: '#1aff66',
      itemMissesGoal: '#ff1a1a',
      matchingMask_3: semitransWhite_3,
      matchingMask_5: semitransWhite_5,
      matchingMask_7: semitransWhite_7,
      matchingMask_9: semitransWhite_9,
      contrastingMask_2: semitransBlack_2,
      contrastingMask_3: semitransBlack_3,
      contrastingMask_5: semitransBlack_5,
      contrastingMask_7: semitransBlack_7,
      contrastingMask_9: semitransBlack_9,
    },
    dark: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: "#a5d6a7",
      secondaryColor: "#ffff00", 
      secondaryColorTrans: "rgba(255,255,0,.6)",
      textOnSecondaryColor: "rgba(0,0,0,.87)",
      tertiaryColor: '#d795e9',
      accentColor: "#00665c",
      accentDarker: "#7da453",
      accentLighter: "#d2f7a4",
      rippleColor:  "rgba(255,255,255,.4)",
      lowTextColor: "rgba(255,255,255,.48)",
      mediumTextColor: "rgba(255,255,255,.60)",
      highTextColor: 'white',
      disabledTextColor: "rgba(255,255,255,.42)",
      dividerColor: "rgba(255,255,255,.20)" ,
      headerBackgroundColor: primaryColor,
      headerTextColor: "rgba(255,255,255,.70)",
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
      textOnPrimaryColor: "rgba(255,255,255,.60)",
      highlightedItemColor: "#333333",
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
      pageBackground: "black",
      pageBackgroundFilm: "rgba(0,0,0,.4)",
      selectOnFilm: TL_BLUE,
      controlsBackground: "black",
      textOnTheme: "rgba(255,255,255,.60)",
      textOffTheme: "black",
      linkActive: linkActive,
      navIconColor: "rgba(255,255,255,.60)",
      pathColor: "#0066ff",//"#0040ff",
      locationRadiusBorder: "#ffff00",
      intervalMarkerBorderColor: "black",
      intervalMarkerBackgroundColor: semitransBlack_5,
      navItemBorderColor: semitransWhite_3,
      listIconColor: "white",
      highlightColor: "rgba(118, 189, 213,1)",
      goalGold: "#e6c300",
      cancelColor: "gray",
      dangerColor: "rgba(178, 34, 34, 1.0)",
      okChoiceColor: "#2196f3",
      infoConfirmColor: TL_BLUE, //'#c4e4ed',
      infoConfirmTextColor: "white",
      warningConfirmColor: TL_YELLOW, //"#fae89e",
      warningConfirmTextColor: "rgba(0,0,0,.87)",
      itemNotSelected: '#e7c0f2',
      itemSelectedColor: '#c4e3ed',
      itemMeetsGoal: '#1aff66',
      itemMissesGoal: '#ff1a1a',
      matchingMask_3: semitransBlack_3,
      matchingMask_5: semitransBlack_5,
      matchingMask_7: semitransBlack_7,
      matchingMask_9: semitransBlack_9,
      contrastingMask_2: semitransWhite_2,
      contrastingMask_3: semitransWhite_3,
      contrastingMask_5: semitransWhite_5,
      contrastingMask_7: semitransWhite_7,
      contrastingMask_9: semitransWhite_9,
    }
  },
  toolbar: {
      container: {
          height: 60,
      },
  },
  cardLayout: {
    borderStyle: "solid",
    backgroundColor: "transparent",
    marginTop: 5,
    marginBottom: 5,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: "column",
  },
  roundedTop: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  roundedBottom: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
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
    backgroundColor: "transparent",
    zIndex: CONTROLS_Z_INDEX,
  },
  navItem: {
    height: NAV_ITEM_SIZE,
    width: NAV_ITEM_SIZE,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: NAV_ITEM_SIZE / 2,
  },
  navIcon: {
    backgroundColor: "transparent",
  },
  navLabel: {
    color: "rgba(0,0,0,.87)",
    fontSize: 14,
  },
  footerButton: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  footerButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  pageTitle: {
    fontSize: 20,
    height: PAGE_TITLE_HEIGHT,
    fontWeight: "bold"
  },
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
    Images: TrekImages,
    Conditions: ShowConditions
  },
  {
    initialRouteName: "Log",
    navigationOptions: {
      header: null //<TrekLogHeader/>
    }
  }
);

const modalSvc = new ModalModel();
export const ModalSvcContext = React.createContext(modalSvc);

export const UiThemeContext = React.createContext(uiTheme);

const toastSvc = new ToastModel();
export const ToastSvcContext = React.createContext(toastSvc);

const utilsSvc = new UtilsSvc();
export const UtilsSvcContext = React.createContext(utilsSvc);

const storageSvc = new StorageSvc(utilsSvc);
export const StorageSvcContext = React.createContext(storageSvc);

const groupSvc = new GroupSvc(modalSvc, storageSvc);
// export const SettingsSvcContext = React.createContext(groupSvc);

const trekInfo = new TrekInfo(utilsSvc, storageSvc, modalSvc, groupSvc);
export const TrekInfoContext = React.createContext(trekInfo);

const intervalSvc = new IntervalSvc(utilsSvc, trekInfo);
// export const IntervalSvcContext = React.createContext(intervalSvc);

const weatherSvc = new WeatherSvc(toastSvc);
export const WeatherSvcContext = React.createContext(weatherSvc);

const locationSvc = new LocationSvc( trekInfo, storageSvc);
export const LocationSvcContext = React.createContext(locationSvc);

const loggingSvc = new LoggingSvc(utilsSvc, trekInfo, locationSvc, modalSvc, toastSvc);
// export const LoggingSvcContext = React.createContext(loggingSvc);

const goalsSvc = new GoalsSvc(utilsSvc, trekInfo, toastSvc, storageSvc);
// export const GoalsSvcContext = React.createContext(goalsSvc);

const filterSvc = new FilterSvc(utilsSvc, trekInfo, toastSvc);
// export const FilterSvcContext = React.createContext(filterSvc);

class TrekLog extends React.Component {

  componentDidMount() {

    configure({
      enforceActions: "always"        // strict mode for Mobx
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
          trekInfo={trekInfo}
          modalSvc={modalSvc}
          toastSvc={toastSvc}
          utilsSvc={utilsSvc}
          filterSvc={filterSvc}
          goalsSvc={goalsSvc}
          weatherSvc={weatherSvc}
          storageSvc={storageSvc}
          locationSvc={locationSvc}
          loggingSvc={loggingSvc}
          groupSvc={groupSvc}
          intervalSvc={intervalSvc}
        >
          <View style={styles.container}>
            <NavStack/>
            <Toast/>
            <ConfirmationModal/>
            <GoalsAchievedModal/>
            <TrekLabelForm/>
          </View>
        </Provider>
      
      )
  }
}
export default TrekLog

