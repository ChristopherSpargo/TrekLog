import React from 'react';
import { Platform, UIManager, View, StyleSheet, StatusBar, Dimensions } from 'react-native';
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
import { SummarySvc } from './SummarySvc';
import Courses from './CoursesComponent';
import CourseDetails from './CourseDetailsComponent';
import { HelpSvc } from './HelpService';
import HelpScreen from './HelpScreenComponent';
import HomeScreen from './HomeScreenComponent';
import { ImageSvc } from './ImageService';
import { MainSvc } from './MainSvc';
import { TrekSvc } from './TrekSvc';
import { LogState } from './LogStateModel';

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
export const WHITEISH = "#F5F5F5";
export const REDISH = "rgb(211, 47, 47)";
export const TL_BLUE    = "rgb(33, 150, 243)";
export const TL_ORANGE  = "rgb(255, 153, 0)"; //"rgb(255, 167, 38)";
export const TL_YELLOW  = "rgb(255, 193, 7)"; 
export const TL_RED  = "rgb(211, 47, 47)";
export const TL_GREEN   = "rgb(67, 160, 71)";
export const TL_PURPLE = "rgb(149, 117, 205)";
export const TL_BLUE_DIM  = "rgba(33, 150, 243, .4)";
export const TL_ORANGE_DIM  = "rgba(255, 153, 0, .4)"; //"rgb(255, 167, 38)";
export const TL_YELLOW_DIM  = "rgba(255, 193, 7, .4)"; 
export const TL_RED_DIM  = "rgba(211, 47, 47, .4)";
export const TL_GREEN_DIM   = "rgba(67, 160, 71, .4)";
export const TL_PURPLE_DIM = "rgba(149, 117, 205, .4)";
export const TREK_TYPE_COLORS_ARRAY = [ TL_BLUE, TL_YELLOW, TL_RED, TL_GREEN ];
export const TREK_TYPE_COLORS_OBJ = { Walk: TL_BLUE, Run: TL_YELLOW, Bike: TL_RED, 
                                      Hike: TL_GREEN, Board: TL_ORANGE, Drive: TL_PURPLE };
export const TREK_TYPE_DIM_COLORS_OBJ = { Walk: TL_BLUE_DIM, Run: TL_YELLOW_DIM, Bike: TL_RED_DIM, 
                                      Hike: TL_GREEN_DIM, Board: TL_ORANGE_DIM, Drive: TL_PURPLE_DIM };
export const PROGRESS_COLORS = [TL_RED, TL_YELLOW, TL_GREEN];
export const primaryColor = "#006845"; //"#388e3c";
export const primaryDarker = "#003322"; //"#00600f";
export const linkActive = "#0275D8";
export const semitransWhite_2 = "rgba(255, 255, 255, .2)";
export const semitransWhite_3 = "rgba(255, 255, 255, .3)";
export const semitransWhite_4 = "rgba(255,255,255,.40)"
export const semitransWhite_5 = "rgba(255, 255, 255, .5)";
export const semitransWhite_6 = "rgba(255,255,255,.60)"
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
export const SMALL_IMAGE_HEIGHT = 60;
export const FOCUS_IMAGE_HEIGHT = 80;
export const LARGE_IMAGE_HEIGHT = 140;

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
export const IMAGE_ROW_Z_INDEX = 6;
export const NUMBERS_BAR_Z_INDEX = 7;
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

export const APP_VIEW_WIDTH = Dimensions.get('window').width;
export const APP_VIEW_HEIGHT = Dimensions.get('window').height;

export const _2D_CAMERA_PITCH = 0;
export const _3D_CAMERA_PITCH = 80;
export const MAP_VIEW_PITCH_VALUES = {
  "2D": _2D_CAMERA_PITCH,
  "3D": _3D_CAMERA_PITCH
}
export const _2D_CAMERA_PITCH_STR = "2D";
export const _3D_CAMERA_PITCH_STR = "3D";
export type MapViewPitchType = "2D" | "3D";

export const uiTheme = {
  palette: { 
    light: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: "#009966",
      secondaryColor: "rgb(156, 39, 176)", 
      secondaryColorDim: "rgba(156, 39, 176,.5)",
      textOnSecondaryColor: "white",
      tertiaryColor: '#d795e9',
      accentColor: "#00665c",
      accentDarker: "#7da453",
      accentLighter: "#d2f7a4",
      rippleColor:  "rgba(0,0,0,.2)",
      lowTextColor: "rgba(0,0,0,.48)",
      mediumTextColor: "rgba(0,0,0,.60)",
      highTextColor: "rgba(0,0,0,.87)",
      boldTextColor: "black",
      disabledTextColor: "rgba(0,0,0,.38)",
      dividerColor: semitransBlack_12,
      headerBackgroundColor: primaryColor,
      trackingStatsBackgroundHeader: "white",
      headerBorderColor: semitransBlack_12,
      headerTextColor: "white",
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
      headerRippleColor:  semitransWhite_4,
      textOnPrimaryColor: "white",
      highlightedItemColor: "#e2e6e9",
      helpBackgroundColor: "white",
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
      pageBackgroundFilm: semitransWhite_4,
      selectOnFilm: "#6600cc",
      selectOnTheme: TL_BLUE,
      controlsBackground: "white",
      textOnTheme: "rgba(0,0,0,.60)",
      textOffTheme: "white",
      linkActive: linkActive,
      helpLink: linkActive,
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
      infoConfirmHeaderBackgroundColor: '#808080',
      infoConfirmHeaderTextColor: "white",
      infoConfirmBodyBackgroundColor: "white",
      infoConfirmBodyTextColor: "rgba(0,0,0,.87)",
      infoConfirmDividerColor: semitransBlack_12,
      infoConfirmBackgroundMask: semitransBlack_2,
      infoConfirmRippleColor:  "rgba(0,0,0,.2)",
      warningConfirmColor: TL_RED, //"#fae89e",
      warningConfirmTextColor: "white",
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
      cardItemTitleColor: "#008055",
      navMenuIconColor: "black",
      navMenuTextColor: "black",
      navMenuBackgroundColor: "white",
      navMenuTitleTextColor: "white",
      navMenuRippleColor:  "rgba(0,0,0,.2)",
      navMenuDividerColor: "gray",
      menuItemDisabledColor: "gray",
      barGraphValueColor: "rgba(0,0,0,.87)",
      footerTextColor: "rgb(156, 39, 176)",
      footerButtonText: {
        color: "rgb(156, 39, 176)",
        fontFamily: fontFamilyBold,
        fontSize: 18,
      },
      topBorder: {
        borderTopWidth: 1,
        borderStyle: "solid",
        borderColor: semitransBlack_12,
      },
      bottomBorder: {
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: semitransBlack_12,
      },
      shadow1: {
        borderStyle: "solid",
        borderColor: semitransBlack_12,
        marginTop: 2,
        borderBottomWidth: 1,
      },
      shadow2: {
        borderStyle: "solid",
        borderColor: semitransBlack_12,
        marginTop: 2,
        borderBottomWidth: 2,
      },
      summarySectionTitle: {
        borderBottomWidth: 1,
      }
    },
    dark: {
      primaryColor: primaryColor,
      primaryDarker: primaryDarker,
      primaryLighter: "#00b377",
      secondaryColor: "#ffff00", 
      secondaryColorDim: "rgba(255,255,0,.5)",
      textOnSecondaryColor: "rgba(0,0,0,.87)",
      tertiaryColor: '#d795e9',
      accentColor: "#00665c",
      accentDarker: "#7da453",
      accentLighter: "#d2f7a4",
      rippleColor:  "rgba(255,255,255,.4)",
      lowTextColor: "rgba(255,255,255,.48)",
      mediumTextColor: semitransWhite_6,
      highTextColor: 'white',
      boldTextColor: 'white',
      disabledTextColor: "rgba(255,255,255,.42)",
      dividerColor: semitransWhite_2,
      headerBackgroundColor: primaryColor, //"#262626",
      trackingStatsBackgroundHeader: "black",
      headerBorderColor: semitransWhite_2,
      headerTextColor: semitransWhite_7,
      disabledHeaderTextColor: "rgba(255,255,255,.42)",
      headerRippleColor:  semitransWhite_4,
      textOnPrimaryColor: semitransWhite_8,
      highlightedItemColor: "#595959",
      helpBackgroundColor: "black",
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
      textOnTheme: semitransWhite_6,
      textOffTheme: "black",
      linkActive: "#81c3fd",
      helpLink: "#81c3fd",
      navIconColor: semitransWhite_6,
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
      infoConfirmHeaderBackgroundColor: '#262626',
      infoConfirmHeaderTextColor: "white",
      infoConfirmBodyBackgroundColor: "white",
      infoConfirmBodyTextColor: "rgba(0,0,0,.87)",
      infoConfirmDividerColor: semitransBlack_12,
      infoConfirmBackgroundMask: semitransWhite_3,
      infoConfirmRippleColor:  "rgba(0,0,0,.2)",
      warningConfirmColor: TL_RED, //"#fae89e",
      warningConfirmTextColor: "white",
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
      cardItemTitleColor: "#00b377",
      navMenuIconColor: "black",
      navMenuTextColor: "black",
      navMenuBackgroundColor: "white",
      navMenuTitleTextColor: "white",
      navMenuRippleColor:  "rgba(0,0,0,.2)",
      navMenuDividerColor: "gray",
      menuItemDisabledColor: "gray",
      barGraphValueColor: "rgba(0,0,0,.87)",
      footerTextColor: "#ffff00",
      footerButtonText: {
        color: "#ffff00",
        fontFamily: fontFamilyBold,
        fontSize: 18,
      },
      topBorder: {
        borderTopWidth: 1,
        borderStyle: "solid",
        borderColor: semitransWhite_2,
      },
      bottomBorder: {
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: semitransWhite_2,
        },
      shadow1: {
        borderStyle: "solid",
        borderColor: semitransWhite_2,
        marginTop: 2,
        borderTopWidth: 1,
      },
      shadow2: {
        borderStyle: "solid",
        borderColor: semitransWhite_2,
        marginTop: 3,
        borderTopWidth: 1,
      },
      summarySectionTitle: {
        borderBottomWidth: 0,
      }
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
    borderColor: semitransBlack_12,
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
  trekImageRow: {
    position: "absolute",
    marginLeft: 5,
    marginRight: 5,
    bottom: 3,
    maxWidth: APP_VIEW_WIDTH - 10,
    height: FOCUS_IMAGE_HEIGHT + 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: IMAGE_ROW_Z_INDEX,
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
    HomeScreen: HomeScreen,
    LogTrek: LogTrek,
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
    CourseDetails: CourseDetails,
    ShowHelp: HelpScreen
  },
  {
    initialRouteName: "HomeScreen",
    initialRouteKey: "Key-HomeScreen",
    navigationOptions: {
      header: null //<TrekLogHeader/>
    }
  }
);

const toastSvc = new ToastModel();
export const ToastSvcContext = React.createContext(toastSvc);

const helpSvc = new HelpSvc();
export const HelpSvcContext = React.createContext(helpSvc);

const modalSvc = new ModalModel();
export const ModalSvcContext = React.createContext(modalSvc);

export const UiThemeContext = React.createContext(uiTheme);

const utilsSvc = new UtilsSvc();
export const UtilsSvcContext = React.createContext(utilsSvc);

const storageSvc = new StorageSvc(utilsSvc);
export const StorageSvcContext = React.createContext(storageSvc);

const imageSvc = new ImageSvc(utilsSvc, storageSvc);
export const ImageSvcContext = React.createContext(imageSvc);

const groupSvc = new GroupSvc(modalSvc, storageSvc);
// export const GroupSvcContext = React.createContext(groupSvc);

const mainSvc = new MainSvc(utilsSvc, storageSvc, modalSvc, groupSvc, imageSvc);
export const MainSvcContext = React.createContext(mainSvc);

const trekSvc = new TrekSvc(mainSvc, utilsSvc, storageSvc, imageSvc);
export const TrekSvcContext = React.createContext(trekSvc);

const loggingState = new LogState(new TrekInfo(), mainSvc, utilsSvc);
// export const LoggingStateContext = React.createContext(loggingState);

const locationSvc = new LocationSvc(loggingState, storageSvc);
export const LocationSvcContext = React.createContext(locationSvc);

const courseSvc = new CourseSvc(mainSvc, trekSvc, utilsSvc, locationSvc, storageSvc, modalSvc, toastSvc);
// export const CourseSvcContext = React.createContext(courseSvc);

const weatherSvc = new WeatherSvc(toastSvc);
export const WeatherSvcContext = React.createContext(weatherSvc);

const loggingSvc = new LoggingSvc(loggingState, mainSvc, utilsSvc, trekSvc, locationSvc, courseSvc, 
                  modalSvc, toastSvc);
export const LoggingSvcContext = React.createContext(loggingSvc);

const intervalSvc = new IntervalSvc(mainSvc, utilsSvc, trekSvc, loggingSvc);
// export const IntervalSvcContext = React.createContext(intervalSvc);

const goalsSvc = new GoalsSvc(mainSvc, utilsSvc, toastSvc, storageSvc);
export const GoalsSvcContext = React.createContext(goalsSvc);

const filterSvc = new FilterSvc(mainSvc, utilsSvc, trekSvc, toastSvc);
export const FilterSvcContext = React.createContext(filterSvc);

const summarySvc = new SummarySvc(mainSvc, utilsSvc, filterSvc);
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
          mainSvc={mainSvc}
          trekSvc={trekSvc}
          uiTheme={uiTheme}
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
          helpSvc={helpSvc}
          imageSvc={imageSvc}
        >
          <View style={styles.container}>
            <NavStack/>
            <Toast toastOpen={toastSvc.toastIsOpen}/>
            <ConfirmationModal confirmOpen={modalSvc.simpleIsOpen}/>
            <GoalsAchievedModal goalsMetOpen={modalSvc.goalNoticeIsOpen}/>
            <TrekLabelForm open={modalSvc.labelFormOpen}/>
          </View>
        </Provider>
      
      )
  }
}
export default TrekLog

