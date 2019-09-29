import React from 'react';
import { Platform, UIManager, View, StyleSheet, StatusBar } from 'react-native';
import { Provider, observer } from 'mobx-react';
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
import { CourseSvc } from './CourseService';
import { SummaryModel } from './SummaryModel';
import Courses from './CoursesComponent';
import CourseDetails from './CourseDetailsComponent';

configure({
  enforceActions: "always"
});

// define some constants used by the app
export const fontFamilyThin = "Roboto-Thin";
export const fontFamilyLight = "RobotoCondensed-Light";
export const fontFamilyRegular = "RobotoCondensed-Regular";
export const fontFamilyBold = "RobotoCondensed-Bold";
export const fontFamilyItalic = "RobotoCondensed-Italic";
export const fontFamilyLightItalic = "RobotoCondensed-LightItalic";
export const FADE_IN_DURATION = 400;
export const SCROLL_DOWN_DURATION = 400;
export const COLOR_THEME_LIGHT = 'light';
export const COLOR_THEME_DARK = 'dark';
export type ThemeType = "light" | "dark";
export const BLACKISH = '#222222';
export const REDISH = "rgb(211, 47, 47)";
export const TL_BLUE    = "rgb(33, 150, 243)";
export const TL_ORANGE  = "rgb(255, 153, 0)"; //"rgb(255, 167, 38)";
export const TL_YELLOW  = "rgb(255, 193, 7)"; 
export const TL_RED  = "rgb(211, 47, 47)";
export const TL_GREEN   = "rgb(67, 160, 71)";
export const TL_PURPLE = "rgb(149, 117, 205)";
export const TL_BLUE_DIM  = "rgba(33, 150, 243, .35)";
export const TL_ORANGE_DIM  = "rgba(255, 153, 0, .35)"; //"rgb(255, 167, 38)";
export const TL_YELLOW_DIM  = "rgba(255, 193, 7, .35)"; 
export const TL_RED_DIM  = "rgba(211, 47, 47, .35)";
export const TL_GREEN_DIM   = "rgba(67, 160, 71, .35)";
export const TL_PURPLE_DIM = "rgba(149, 117, 205, .35)";
export const TREK_TYPE_COLORS_ARRAY = [ TL_BLUE, TL_YELLOW, TL_RED, TL_GREEN ];
export const TREK_TYPE_COLORS_OBJ = { Walk: TL_BLUE, Run: TL_YELLOW, Bike: TL_RED, 
                                      Hike: TL_GREEN, Board: TL_ORANGE, Drive: TL_PURPLE };
export const TREK_TYPE_DIM_COLORS_OBJ = { Walk: TL_BLUE_DIM, Run: TL_YELLOW_DIM, Bike: TL_RED_DIM, 
                                      Hike: TL_GREEN_DIM, Board: TL_ORANGE_DIM, Drive: TL_PURPLE_DIM };
export const PROGRESS_COLORS = [TL_RED, TL_YELLOW, TL_GREEN];
export const primaryColor = "#006845"; //"#388e3c";
export const primaryDarker = "#003322"; //"#00600f";
export const primaryLighter = "#009966";
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
export const semitransBlack_8 = "rgba(0, 0, 0, .8)";
export const semitransBlack_9 = "rgba(0, 0, 0, .9)";
export const PAGE_TITLE_HEIGHT = 28;
export const HEADER_ICON_SIZE = 24;
export const BACK_BUTTON_SIZE = 40;
export const HEADER_HEIGHT = 56;
export const BIG_CONTROLS_HEIGHT = 100;
export const BIG_NAV_ITEM_SIZE = BIG_CONTROLS_HEIGHT - 20;
export const CONTROLS_HEIGHT = 60;
export const SHORT_CONTROLS_HEIGHT = 60;
export const NAV_ITEM_SIZE = CONTROLS_HEIGHT - 10;
export const NAV_ICON_SIZE = 34;
export const BIG_NAV_ICON_SIZE = 56;
export const FORMHEADER_HEIGHT = 40;
export const FOOTER_HEIGHT = 50;
export const FOOTER_BUTTON_HEIGHT = 50;
export const MENUTRIGGER_SIZE = 24;
export const MENUTRIGGER_AREA = 30;
export const TRACKING_STATUS_BAR_HEIGHT = 85;

export const TREKLOG_GROUPS_DIRECTORY = 'Groups';
export const TREKLOG_GROUPS_FILENAME = 'Groups.txt';
export const TREKLOG_SETTINGS_FILENAME = 'Settings.txt';
export const TREKLOG_GOALS_FILENAME = 'Goals.txt';
export const TREKLOG_FILE_EXT = '.txt';
export const TREKLOG_FILE_FORMAT = 'utf8';
export const TREKLOG_PICTURES_DIRECTORY = "TrekLog";
export const TREKLOG_COURSES_DIRECTORY = 'Courses';
export const TREKLOG_COURSES_FILENAME = 'CourseList.txt';
export const TREKLOG_FILENAME_REGEX = /^[a-z,A-Z,0-9]*$/;

export const TREKLOG_LOG_KEY = '#Treklog#';
export const TREKLOG_USERS_KEY = '#Users';
export const TREKLOG_SETTINGS_KEY = '#Settings#';
export const SETTINGS_KEY_REGEX = /^#Settings#/i;
export const TREKLOG_GOALS_KEY = '#GOALS#';

export const INVISIBLE_Z_INDEX = -1;
export const INITIAL_POS_MARKER_Z_INDEX = 1;
export const INTERVAL_MARKER_Z_INDEX = 3;
export const MAIN_PATH_Z_INDEX = 3;
export const INTERVAL_GRAPH_Z_INDEX = 4;
export const ICON_BUTTON_Z_INDEX = 4;
export const SPEED_DIAL_Z_INDEX = 5;
export const NUMBERS_BAR_Z_INDEX = 6;
export const LIMITS_Z_INDEX = 8;
export const CONTROLS_Z_INDEX = 10;
export const HEADER_Z_INDEX = 10;
export const LIMITS_FORM_Z_INDEX = 11;
export const TRACKING_POS_MARKER_Z_INDEX = 12;
export const CURRENT_POS_MARKER_Z_INDEX = 13;
export const PICTURE_MARKER_Z_INDEX = 25;
export const NAVMENU_TRIGGER_Z_INDEX = 50;
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
      primaryLighter: primaryLighter,
      secondaryColor: "rgb(156, 39, 176)", 
      secondaryColorTrans: "rgba(156, 39, 176,.7)",
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
      trackingStatsBackgroundHeader: "white",
      headerBorderColor: semitransBlack_12,
      headerTextColor: "white",
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
      headerRippleColor:  "rgba(255,255,255,.4)",
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
      selectOnTheme: TL_BLUE,
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
      trackingMarkerRadiusBorder: TL_RED,
      trackingMarkerPathColor: "rgba(64,64,64,.7)",
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
      itemNotSelected: '#d795ea',
      gradientEndColor: '#efd4f7',//"#f2f2f2",
      itemSelectedColor: '#b1dae7',
      gradientEndSelected: '#d8ecf3',
      itemMeetsGoal: '#00ff55',
      itemMeetsGoalEnd: '#66ff99',
      itemMeetsGoalText: 'black',
      itemMissesGoal: '#ff1a1a',
      itemMissesGoalEnd: '#ff6666',
      itemMissesGoalText: 'white',
      statsBackgroundColor: semitransWhite_9,
      matchingMask_3: semitransWhite_3,
      matchingMask_5: semitransWhite_5,
      matchingMask_7: semitransWhite_7,
      matchingMask_8: semitransWhite_8,
      matchingMask_9: semitransWhite_9,
      contrastingMask_2: semitransBlack_2,
      contrastingMask_3: semitransBlack_3,
      contrastingMask_5: semitransBlack_5,
      contrastingMask_7: semitransBlack_7,
      contrastingMask_9: semitransBlack_9,
      trackingColorPlus: "green",
      trackingColorMinus: "#ff3333",
      almostTransparent: "rgba(255,255,255,.01)",
      altCardBackground: "#f2f2f2",
      progressBackground: "rgba(0,0,0,.05)",
      cardItemTitleColor: primaryLighter,
      navMenuIconColor: "black",
      navMenuTextColor: "black",
      navMenuBackgroundColor: "white",
      navMenuTitleTextColor: "white",
      navMenuRippleColor:  "rgba(0,0,0,.2)",
      navMenuDividerColor: "gray",
      menuItemDisabledColor: "gray",
      topBorder: {
        borderTopWidth: 1,
        borderStyle: "solid",
        borderColor: semitransBlack_12,
      },
    },
    dark: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: primaryLighter,
      secondaryColor: "#ffff00", 
      secondaryColorTrans: "rgba(255,255,0,.7)",
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
      dividerColor: "rgba(255,255,255,.20)",
      headerBackgroundColor: primaryColor, //"#262626",
      trackingStatsBackgroundHeader: "black",
      headerBorderColor: "rgba(255,255,255,.20)",
      headerTextColor: "rgba(255,255,255,.70)",
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
      headerRippleColor:  "rgba(255,255,255,.4)",
      textOnPrimaryColor: "rgba(255,255,255,.80)",
      highlightedItemColor: "#595959",
      trekLogBlue: TL_BLUE,
      trekLogOrange: TL_ORANGE,
      trekLogRed: TL_RED,
      trekLogGreen: TL_GREEN,
      trekLogYellow: TL_YELLOW,
      trekLogBrown: "#a1887f",
      trekLogPurple: "#b7a1dd", //"#9575cd",
      trekLogBlueGrey: "#90a4ae",
      trekLogLightBlue: "#4fc3f7",
      trekLogIndigo: "#7986cb",
      trekLogLightGreen: "#81c784",
      trekLogAmber: "#ffd54f",
      warningColor: "firebrick",
      pageBackground: "black",
      pageBackgroundFilm: "rgba(0,0,0,.4)",
      selectOnFilm: TL_BLUE,
      selectOnTheme: TL_BLUE,
      controlsBackground: "black",
      textOnTheme: "rgba(255,255,255,.60)",
      textOffTheme: "black",
      linkActive: linkActive,
      navIconColor: "rgba(255,255,255,.60)",
      pathColor: "#0066ff",//"#0040ff",
      trackingMarkerPathColor: "rgba(64,64,64,.7)",
      locationRadiusBorder: "#ffff00",
      trackingMarkerRadiusBorder: TL_RED,
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
      itemNotSelected: '#d795ea',
      gradientEndColor: "#efd4f7",
      itemSelectedColor: '#b1dae7',
      gradientEndSelected: '#d8ecf3',
      itemMeetsGoal: '#00ff55',
      itemMeetsGoalEnd: '#66ff99',
      itemMeetsGoalText: 'black',
      itemMissesGoal: '#ff1a1a',
      itemMissesGoalEnd: '#ff6666',
      itemMissesGoalText: 'white',
      statsBackgroundColor: semitransBlack_8,
      matchingMask_3: semitransBlack_3,
      matchingMask_5: semitransBlack_5,
      matchingMask_7: semitransBlack_7,
      matchingMask_8: semitransBlack_8,
      matchingMask_9: semitransBlack_9,
      contrastingMask_2: semitransWhite_2,
      contrastingMask_3: semitransWhite_3,
      contrastingMask_5: semitransWhite_5,
      contrastingMask_7: semitransWhite_7,
      contrastingMask_9: semitransWhite_9,
      trackingColorPlus: "#00cc00",
      trackingColorMinus: "#ff3333",
      almostTransparent: "rgba(0,0,0,.01)",
      altCardBackground: "#262626",
      progressBackground: "rgba(255,255,255,.15)",
      cardItemTitleColor: primaryLighter,
      navMenuIconColor: "black",
      navMenuTextColor: "black",
      navMenuBackgroundColor: "white",
      navMenuTitleTextColor: "white",
      navMenuRippleColor:  "rgba(0,0,0,.2)",
      navMenuDividerColor: "gray",
      menuItemDisabledColor: "gray",
      topBorder: {
        borderTopWidth: 1,
        borderStyle: "solid",
        borderColor: semitransWhite_2,
      },
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
  roundedRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  roundedLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  roundedCard: {
   borderRadius: 8, 
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
    // borderWidth: 1,
    borderStyle: "solid",
    borderRadius: NAV_ITEM_SIZE / 2,
  },
  navItemWithLabel: {
    height: NAV_ITEM_SIZE - 5,
    width: NAV_ITEM_SIZE - 5,
    borderStyle: "solid",
    borderRadius: (NAV_ITEM_SIZE - 5) / 2,
  },
  bigNavItemWithLabel: {
    height: BIG_NAV_ITEM_SIZE - 5,
    width: BIG_NAV_ITEM_SIZE - 5,
    borderStyle: "solid",
    borderRadius: (BIG_NAV_ITEM_SIZE - 5) / 2,
  },
  navItemLabel: {
    fontSize: 16,
    fontFamily: fontFamilyLight,
    marginTop: -6,
  },
  navIcon: {
    backgroundColor: "transparent",
  },
  formHeader: {
    height: FORMHEADER_HEIGHT,
    paddingLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    borderStyle: "solid",
    borderBottomWidth: 1,
    backgroundColor: primaryColor,
  },
  formHeaderText: {
    fontFamily: fontFamilyLight,
    fontSize: 22
  },
  formBody: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  formBodyText: {
    fontSize: 20,
    fontFamily: fontFamilyLight,
  },
  formTextInput: {
    height: 45,
    width: 200,
    borderWidth: 0,
    fontFamily: fontFamilyRegular,
    fontSize: 22,
  },
  formNumberInput: {
    width: 75,
  },
  footer: {
    height: FOOTER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderStyle: "solid",
    borderTopColor: semitransBlack_12,
    borderTopWidth: 1,
    backgroundColor: "transparent"
  },
  footerButton: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    // flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    
  },
  footerButtonText: {
    color: primaryColor,
    fontFamily: fontFamilyBold,
    fontSize: 18,
  },
  dateInputText: {
    color: TL_BLUE,
    fontSize: 22,
    fontFamily: fontFamilyRegular,
    height: 25,
  },
  pageTitle: {
    height: PAGE_TITLE_HEIGHT,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 20,
    fontFamily: fontFamilyRegular,
    marginRight: 10,
  },
  navMenuTriggerArea: {
    position: "absolute",
    top: 5,
    right: 10,
    justifyContent: "center",
    alignItems: "center",
    width: MENUTRIGGER_AREA,
    height: MENUTRIGGER_AREA,
    zIndex: NAVMENU_TRIGGER_Z_INDEX,
    borderRadius: (MENUTRIGGER_AREA / 2),
  },
  fontThin:  fontFamilyThin,
  fontLight: fontFamilyLight,
  fontRegular: fontFamilyLight,
  fontBold: fontFamilyRegular,
  fontItalic: fontFamilyItalic,
  fontLightItalic: fontFamilyLightItalic,
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
    Conditions: ShowConditions,
    Courses: Courses,
    CourseDetails: CourseDetails
  },
  {
    initialRouteName: "Log",
    initialRouteKey: "Key-Home",
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

const locationSvc = new LocationSvc( trekInfo, storageSvc);
export const LocationSvcContext = React.createContext(locationSvc);

const courseSvc = new CourseSvc(utilsSvc, trekInfo, locationSvc, intervalSvc, storageSvc, modalSvc, toastSvc);
// export const CourseSvcContext = React.createContext(courseSvc);

const weatherSvc = new WeatherSvc(toastSvc);
export const WeatherSvcContext = React.createContext(weatherSvc);

const loggingSvc = new LoggingSvc(utilsSvc, trekInfo, locationSvc, courseSvc, modalSvc, toastSvc);
// export const LoggingSvcContext = React.createContext(loggingSvc);

const goalsSvc = new GoalsSvc(utilsSvc, trekInfo, toastSvc, storageSvc);
export const GoalsSvcContext = React.createContext(goalsSvc);

const filterSvc = new FilterSvc(utilsSvc, trekInfo, toastSvc);
// export const FilterSvcContext = React.createContext(filterSvc);

const summarySvc = new SummaryModel(utilsSvc, trekInfo, filterSvc);
export const SummarySvcContext = React.createContext(summarySvc);

@observer
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
          courseSvc={courseSvc}
          summarySvc={summarySvc}
        >
          <View style={styles.container}>
            <NavStack/>
            <Toast toastOpen={toastSvc.toastIsOpen}/>
            <ConfirmationModal confirmOpen={modalSvc.simpleIsOpen}/>
            <GoalsAchievedModal goalsMetOpen={modalSvc.goalNoticeIsOpen}/>
            <TrekLabelForm/>
          </View>
        </Provider>
      
      )
  }
}
export default TrekLog

