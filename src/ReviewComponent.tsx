// This component allows the review of past treks.  Treks can be filtered and sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions, BackHandler } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions, StackActions } from "react-navigation";

import { FilterSvc, SORTDIRECTION_ASCEND } from "./FilterService";
import { TrekObj, TrekPoint } from './TrekInfoModel';
import {  MainSvc, RESP_CANCEL, MSG_HAS_LINK, RESP_OK, MSG_LINK_ADDED,
          SortByTypes,
          MSG_NO_LIST, MSG_NEW_COURSE_RECORD, MSG_NEW_COURSE, MSG_NONE_NEARBY } from "./MainSvc";
import { UtilsSvc } from "./UtilsService";
import { ModalModel } from "./ModalModel";
import { HEADER_HEIGHT, PAGE_TITLE_HEIGHT, TREK_TYPE_COLORS_OBJ } from "./App";
import { ToastModel } from "./ToastModel";
import SvgButton from "./SvgButtonComponent";
import Waiting from "./WaitingComponent";
import { APP_ICONS } from "./SvgImages";
import BarDisplay from "./BarDisplayComponent";
import { TrekDetails } from "./TrekDetailsComponent";
import TrekLogHeader from "./TreklogHeaderComponent";
import { LoggingSvc } from "./LoggingService";
import { GroupSvc } from "./GroupService";
import CheckboxPicker from "./CheckboxPickerComponent";
import RadioPicker from "./RadioPickerComponent";
import { StorageSvc } from "./StorageService";
import { CourseSvc } from "./CourseService";
import SvgYAxis, { YAXIS_TYPE_MAP } from './SvgYAxisComponent';
import SvgGrid from './SvgGridComponent';
import NavMenu from './NavMenuComponent';
import PageTitle from './PageTitleComponent';
import { TrekSvc } from "./TrekSvc";

const pageTitleFormat = {marginBottom: 5};

const goBack = NavigationActions.back();

@inject(
  "mainSvc",
  "trekSvc",
  "utilsSvc",
  "uiTheme",
  "modalSvc",
  "toastSvc",
  "filterSvc",
  "loggingSvc",
  "storageSvc",
  "courseSvc",
  "groupSvc"
)
@observer
class ReviewTreks extends Component<
  {
    filterSvc?: FilterSvc;
    utilsSvc?: UtilsSvc;
    modalSvc?: ModalModel;
    toastSvc?: ToastModel;
    loggingSvc?: LoggingSvc;
    storageSvc?: StorageSvc;
    courseSvc?: CourseSvc;
    groupSvc?: GroupSvc;
    uiTheme?: any;
    navigation?: any;
    trekSvc?: TrekSvc; // object with all non-gps information about the Trek
    mainSvc?: MainSvc;
  },
  {}
> {

  @observable openItems;
  @observable headerTitle;
  @observable checkboxPickerOpen;
  @observable coursePickerOpen;
  @observable updateView;
  @observable openNavMenu : boolean;

  mS = this.props.mainSvc;
  tS = this.props.trekSvc;
  fS = this.props.filterSvc;
  lS = this.props.loggingSvc;
  courseSvc = this.props.courseSvc;

  activeNav: string = "";
  AFFIndex: number;

  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        );
      }
    );
    this.initializeObservables();
  }

  @action
  componentWillMount() {
    this.setOpenItems(false);
    this.AFFIndex = this.fS.setAfterFilterFn(this.runAfterFilterTreks);
    this.fS.setDateMax(this.mS.dtMax, "None");
    this.fS.setDateMin(this.mS.dtMin, "None");
    this.fS.setTimeframe(this.fS.timeframe);   // 
    this.fS.buildAfterFilter();
  }

  componentDidMount() {
    this.setUpdateView(true);
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  @action
  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.fS.setSelectedTrekIndex(-1);
  }

  checkBackButton = () => {
    if (!this.onBackButtonPressAndroid()) {
      this.props.navigation.dispatch(goBack);
    }
  };

  onBackButtonPressAndroid = () => {
    return false;
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setHeaderTitle('Scanning...')
    this.setOpenItems(true);
    this.setUpdateView(true);
    this.setCheckboxPickerOpen(false);
    this.setCoursePickerOpen(false);
    this.setOpenNavMenu(false);
  };

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  @action
  setUpdateView = (status: boolean) => {
    this.updateView = status;
  }

  // set the open status of the checkboxPickerOpen component
  @action
  setCheckboxPickerOpen = (status: boolean) => {
    this.checkboxPickerOpen = status;
  };

  // set the open status of the coursePickerOpen component
  @action
  setCoursePickerOpen = (status: boolean) => {
    this.coursePickerOpen = status;
  };

  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // call the filterTreks function and manage the message in the header
  @action
  callFilterTreks = () => {
    this.setHeaderTitle("Scanning...");
    this.fS.filterTreks();
    this.fS.buildAfterFilter();
  };

  // Set the title in the header
  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  };

  // Display the map for the Trek at the given index in filteredTreks
  @action
  showTrekMap = (indx: number) => {
    // let count = 0;
    // interface ReportItem  {pt: number, time: number, iSpd: number,
    //                        dDist: number, dTime: number, sp1: number, sp2: number};
    // let repItems : ReportItem[] = [];
    // let repItem : ReportItem;
    // let skipNext = false;
    // let bad;
    // let newPts: TrekPoint[] = [];
    // let oldPts: TrekPoint[];
    // let iSpd: number;

    if (this.fS.filteredTreks.length) {
      let trek = this.mS.allTreks[this.fS.filteredTreks[indx]];
      // this.mS.badPoints = [];
      // oldPts = this.props.utilsSvc.copyObj(trek.pointList);
      // oldPts = this.lS.smooth(trek.pointList, 1.7, MIN_SIG_SPEED[this.fS.tInfo.type]);
      // this.props.utilsSvc.setPointDistances(oldPts);
      // for(let i=0, j=-1; i<oldPts.length-1; i++){
      //   if(skipNext){
      //     bad = true;
      //     skipNext = false;
      //   }
      //   else {
      //     if (j === -1){
      //       // check for distance too far for 2nd point speed

      //       iSpd = this.props.utilsSvc.computeImpliedSpeed(oldPts[i], oldPts[i+1]);
      //       bad = iSpd > Math.max(oldPts[i].s , oldPts[i+1].s);
      //       if (bad){        
      //         repItem = {pt: j, time: oldPts[i].t, iSpd: iSpd, dDist: oldPts[i+1].d - oldPts[i].d, 
      //           dTime: oldPts[i+1].t - oldPts[i].t, sp1: oldPts[i].s, sp2: oldPts[i+1].s}
      //       }
      //     } else {
      //       // check for distance too far based on current point speed or 2 zero-speed pts in a row
      //       iSpd = this.props.utilsSvc.computeImpliedSpeed(oldPts[i], newPts[j]) 
      //       bad = oldPts[i].s === 0 && newPts[j].s === 0;
      //       skipNext = !bad && iSpd > Math.max(oldPts[i].s , newPts[j].s) * 3;
      //       if (bad || skipNext){             
      //         repItem = {pt: j, time: newPts[j].t, iSpd: iSpd, dDist: oldPts[i].d - newPts[j].d, 
      //           dTime: oldPts[i].t - newPts[j].t, sp1: newPts[j].s, sp2: oldPts[i].s}
      //       }
      //     }
      //   }
      //   if (bad && !skipNext) {
      //     count++;
      //     repItems.push(this.props.utilsSvc.copyObj(repItem));
      //     this.mS.badPoints.push(oldPts[i]);
      //     // if(j !== -1 && oldPts[i].s === 0){//replace location
      //     //   newPts[j].l.a = oldPts[i].l.a;
      //     //   newPts[j].l.o = oldPts[i].l.o;
      //     // }
      //   } else {
      //     newPts.push(oldPts[i]);
      //     j++;
      //   }
      // }
      // newPts.push(oldPts[oldPts.length-1])
      // if(count){alert('Bad Points: ' + count + '\n' + JSON.stringify(repItems,null,2))};
      // this.props.utilsSvc.setPointDistances(newPts);
      // this.tS.setPointList(this.fS.tInfo, newPts);
      // this.tS.setTrekDist(this.fS.tInfo, newPts[newPts.length - 1].d);
      // alert(JSON.stringify({...trek, ...{pointList: undefined}},null,2))
      this.mS.setShowMapControls(true);
      this.props.courseSvc.clearTrackingSnapshot();
      this.props.navigation.navigate({ 
          routeName: "SelectedTrek", 
          params: {
            trek: this.fS.tInfo,
            title: this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) + 
                                                                  "  " + trek.startTime.toLowerCase(),
            icon: this.fS.tInfo.type,
            iconColor: TREK_TYPE_COLORS_OBJ[this.fS.tInfo.type],
            switchSysFn: this.switchMeasurementSystem,
            changeTrekFn: this.changeTrek,
            checkTrekChangeFn: this.checkTrekChange,
          }, 
          key: 'Key-SelectedTrek'
        });
    }
  };

  checkTrekChange = (dir: string) => {
    let indx = this.fS.selectedTrekIndex;
    if (dir === "Next" && indx !== this.fS.filteredTreks.length - 1) {
      indx++;
    } else {
      // Previous
      if (dir === "Prev" && indx !== 0) {
        indx--;
      }
    }
    return (indx === this.fS.selectedTrekIndex ? -1 : indx);
  }

  // Change to Next or Prev trek in the filteredTreks array.
  // Return the header label for the Trek.
  // Return '' if user can't change in the selected direction
  changeTrek = (dir: string) => {
    let indx = this.checkTrekChange(dir);
    let trek: TrekObj;

    return new Promise<any>((resolve) => {      
      if (indx === -1) {
        resolve("");
      }
      trek = this.mS.allTreks[this.fS.filteredTreks[indx]];
      this.fS.trekSelected(indx);
      resolve(
        this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
        "  " +
        trek.startTime.toLowerCase()
      );
    })
  };

  // delete the trek (after confirmation) at 'index' in the filteredTreks list
  deleteTrek = (index: number) => {
    let trek = this.mS.allTreks[this.fS.filteredTreks[index]];
    let labelLine = this.tS.trekHasLabel(this.fS.tInfo) ? 
                                ("\n" + "\"" + this.tS.getTrekLabel(this.fS.tInfo) + "\"") : '';
    let content =
      "Delete " +
      trek.type +
      " from:\n" +
      trek.date +
      " " +
      trek.startTime +
      labelLine;
    this.props.modalSvc
      .simpleOpen({
        heading: "Delete " + trek.type,
        content: content,
        cancelText: "CANCEL",
        deleteText: "DELETE",
        headingIcon: trek.type,
        allowOutsideCancel: true
      })
      .then(() => {
        this.mS.setWaitingForSomething("NoMsg");
        this.mS
          .deleteTrek(trek)
          .then(() => {
            this.mS.setWaitingForSomething();
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: trek.type + " has been deleted."
            });
            this.callFilterTreks();
            if(!this.fS.filteredTreksEmpty()){
              this.fS.trekSelected(index ? index - 1 : 0)
            }
          })
          .catch(() => {
            this.mS.setWaitingForSomething();
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: "Error: Trek NOT deleted."
            });
          });
      })
      .catch(() => {});
  };

  // respond to actions from the BottomNavigation components
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "Delete":
          this.deleteTrek(this.fS.selectedTrekIndex);
          break;
        case "Map":
          this.showTrekMap(this.fS.selectedTrekIndex);
          break;
        case 'Course':
          this.addCourseOrEffort();
          break;
        case 'Upload':
          this.props.storageSvc.writeTrekToMongoDb(this.fS.tInfo.getSaveObj())
          .then(() => {
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: 'Trek uploaded for ' + this.fS.tInfo.group,
            })
          })
          .catch(() => {
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: 'Trek not uploaded for ' + this.fS.tInfo.group,
            });
          })
          break;
        case "GoBack":
          this.props.navigation.dispatch(goBack);
          break;
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case 'Help':
        this.props.navigation.navigate({routeName: 'ShowHelp', key: 'Key-ShowHelp'});
        break;
        case 'None':
          break;
        default:
      }
    });
  };

  // bar has been touched, indicate active selection or show map
  callTrekSelected = (sel: number) => {
    if( sel === this.fS.selectedTrekIndex) {
      this.showTrekMap(this.fS.selectedTrekIndex);
    } else {
      this.fS.trekSelected(sel);
    }
  }

  // make this trek an effort of some course or use it to create a new course
  addCourseOrEffort = () => {
    if (this.fS.filteredTreks.length) {
      let tI = this.fS.tInfo
      if(!tI.course || !this.courseSvc.isCourse(tI.course)) {
        this.courseSvc.newCourseOrEffort(tI, this.setCoursePickerOpen)
        .then((sel) => {
          switch(sel.resp){
            case RESP_CANCEL:
              break;
              case MSG_NONE_NEARBY:
              case MSG_NO_LIST:
                this.props.toastSvc.toastOpen({
                  tType: "Error",
                  content: 'No matching courses found.',
                });
                break;
            case MSG_NEW_COURSE_RECORD:
                this.courseSvc.celebrateNewCourseRecord(sel.resp, sel.name, sel.info);
                break;
            case RESP_OK:
              this.props.toastSvc.toastOpen({
                tType: "Success",
                content: MSG_LINK_ADDED + tI.type + " linked with course\n" + sel.name,
              });
              break;
            case MSG_NEW_COURSE:
              this.props.navigation.navigate("SelectedTrek", {
                trek: tI,
                title:
                  this.props.utilsSvc.formattedLocaleDateAbbrDay(tI.date) +
                  "  " +
                  tI.startTime.toLowerCase(),
                icon: tI.type,
                mapDisplayMode: 'noSpeeds, noIntervals',
                takeSnapshotMode: 'New',
                takeSnapshotName: sel.name,
                takeSnapshotPrompt: "CREATE COURSE\n" + sel.name
              });
              break;
            default:
          }
        })
        .catch((err) => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: err,
          });
        })
      } else {
        this.props.toastSvc.toastOpen({
          tType: "Info",
          content: MSG_HAS_LINK + 'This ' + tI.type + ' is already\nlinked to ' + tI.course,
        });
      }
    }
  }

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.tS.switchMeasurementSystem(this.fS.tInfo, false, false)
    this.fS.buildGraphData(this.fS.filteredTreks);
    this.fS.getFilterDefaults(this.fS.filteredTreks);
    this.forceUpdate();
  };

  // This function will run after a new list of filteredTreks has been created.
  // This function must first be registered (usually in the componentDidMount hook)
  // with filterSvc via setAfterFilterFn(fn) method.
  runAfterFilterTreks = () => {
    this.setHeaderTitle(this.fS.formatTitleMessage("Review:"));
  };

  // request an animation frame then call fS.setSortBy()
  callSetSortBy = (value: SortByTypes) => {
    // this.setOpenItems(false);
    requestAnimationFrame(() => {
      this.fS.setSortBy(value);
      // this.setOpenItems(true);
    });
  };

  // toggle the selected falg and rebuild the graph
  toggleShowValue = (type: string) => {
    this.fS.toggleShowValue(type);
    if(type === this.fS.show){
      if(this.fS.show === 'Speed'){
        this.fS.toggleSortDirection();
      }
      this.fS.sortAndBuild();
    }
  }

  // process a touch on a switchable value, allow touch feedback first
  callSwitchFn = (id: string) => {
    requestAnimationFrame(() => {
      // allow touch feedback
      switch (id) {
        case "Dist":
          this.switchMeasurementSystem();
          break;
        default:
      }
    });
  };

  // change the group selections
  getDifferentGroups = () => {
    this.props.groupSvc
      .getGroupSelections(
        this.setCheckboxPickerOpen,
        this.fS.groupList,
        "Select Groups for Review"
      )
      .then(newGroups => {
        this.setOpenItems(false);
        this.fS.clearGroupList();
        newGroups.forEach((group) => this.fS.addGroupListItem(group));
        this.mS.readAllTreks(this.fS.groupList)
        .then(() => {
          this.fS.setDataReady(false);
          if(this.fS.timeframe !== 'All'){
            this.fS.findActiveTimeframe(this.fS.timeframe);
            this.fS.buildAfterFilter();
          } else {
            this.fS.filterTreks();
            this.fS.buildAfterFilter();
          }
          this.setOpenItems(true);
        })
        .catch(() => {
          this.setOpenItems(true);
        })
      })
      .catch(() => {});
  };

  // show the selected trek image
  showTrekImage = (set: number, image = 0) => {
    let title = this.tS.formatImageTitle(this.fS.tInfo, set, image);
    this.props.navigation.navigate({
      routeName: "Images", 
      params: {cmd: 'show', 
               setIndex: set, 
               imageIndex: image, 
               title: title,
               trek: this.fS.tInfo
      }, 
      key: 'Key-Images'
    });
  }

  // Display the map for the effort at the given index in trekList
  showCourseEffort = (trek: TrekObj) => {
      this.props.courseSvc.getCourse(trek.course)
      .then((course) => {
        let effort = this.props.courseSvc.getTrekEffort(course, trek);
        this.mS.setShowMapControls(true)
        this.props.courseSvc.initCourseTrackingSnapshot(course, trek, effort, 
                              effort.method, effort.goalValue)
        .then(() => {        
          this.props.navigation.navigate("SelectedTrek", {
            trek: this.fS.tInfo,
            title: this.props.utilsSvc.formatTrekDateAndTime(trek.date, trek.startTime),
            icon: trek.type,
            switchSysFn: this.switchMeasurementSystem,
          })
        })
        .catch(() => {})
      })
      .catch(() => {})
  };

  render() {
    if (!this.updateView) {
      return (
        <View
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        >
          <TrekLogHeader
            titleText={this.headerTitle}
            icon="*"
            backButtonFn={() => this.props.navigation.dispatch(goBack)}
          />
          <Waiting />
        </View>
      );
    }

    const {height, width} = Dimensions.get('window');
    const pageTitleSpacing = 20;
    const sortControlsHt = 30;
    const graphHeight = 210;
    const areaHt = height - (graphHeight + pageTitleSpacing + HEADER_HEIGHT + PAGE_TITLE_HEIGHT);
    const { cardLayout } = this.props.uiTheme;
    const {
      disabledTextColor,
      pageBackground,
      trekLogBlue,
      mediumTextColor,
      bottomBorder,
    } = this.props.uiTheme.palette[this.mS.colorTheme];
    const gotTreks = this.fS.dataReady && !this.fS.filteredTreksEmpty();
    const graphBgColor = pageBackground;
    const maxBarHeight = 160;
    const graphAreaWidth = width;
    const yAxisWidth = 60;
    const graphWidth = graphAreaWidth - yAxisWidth - 10;
    const sortAsc = this.fS.sortDirection === SORTDIRECTION_ASCEND;
    const hasNoCourse = !this.fS.tInfo.course || !this.props.courseSvc.isCourse(this.fS.tInfo.course);
    const multiGroup = this.fS.groupList.length > 1;
    let navMenuItems = 
    [ gotTreks ? 
        {label: 'Review Options', 
         submenu: [
          {icon: 'Delete', label: 'Delete', value: 'Delete'},
          {icon: 'Map', label: 'View Map', value: 'Map'},
          // {icon: 'Upload', label: 'Upload Trek', value: 'Upload'},
        ]} :
        {label: 'Review Options', 
         submenu: [
          {label: 'None', value: 'None'},
        ]},
        {icon: 'Home', label: 'Home', value: 'Home'},
        {icon: 'ArrowBack', label: 'Activity', value: 'GoBack'},
        {icon: 'InfoCircleOutline', label: 'Help', value: 'Help'}  
    ]  

    if(gotTreks && hasNoCourse){ 
      navMenuItems[0].submenu.push({icon: 'Course', label: 'Link to Course', value: 'Course'});
    }
    const graphLabelType = (this.fS.show === 'Speed' && !this.fS.showAvgSpeed)
                          ? YAXIS_TYPE_MAP['pace'] : YAXIS_TYPE_MAP[this.fS.show];

    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: pageBackground
      },
      center: {
        justifyContent: "center"
      },
      noPadding: {
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0
      },
      graphAndStats: {
        paddingBottom: 5,
        paddingRight: 10,
        height: graphHeight
      },
      graphArea: {
        backgroundColor: graphBgColor,
        marginLeft: 0
      },
      emptyGraphArea: {
        height: graphHeight,
        justifyContent: "center",
        paddingHorizontal: 3
      },
      graph: {
        marginLeft: yAxisWidth,
      },
      noMatches: {
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 22
      },
      labelText: {
        color: mediumTextColor,
        marginLeft: 15,
        marginTop: -5,
        fontSize: 22
      },
      button: {
        color: "white",
        fontSize: 16
      },
      sortCtrls: {
        position: "absolute",
        left: 5,
        top: 2,
        zIndex: 10,
        height: sortControlsHt,
      },
      scrollArea: {
        flexDirection: "column",
        justifyContent: "flex-start",
        paddingTop: 0,
        height: areaHt,
      },
      graphStyle: {
        height: graphHeight,
        width: graphWidth
      },
      barStyle: { 
        height: graphHeight, 
        width: 40,
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
    });

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          <CheckboxPicker pickerOpen={this.checkboxPickerOpen} />
          {this.fS.dataReady && (
            <View style={styles.container}>
              <TrekLogHeader
                titleText={this.headerTitle}
                icon="*"
                backButtonFn={this.checkBackButton}
                openMenuFn={this.openMenu}
              />
              <RadioPicker pickerOpen={this.coursePickerOpen} />
              <View style={[cardLayout, styles.noPadding, {paddingTop: 10, marginBottom: 0}]}>
                <PageTitle 
                  colorTheme={this.mS.colorTheme}
                  titleText="Trek Review"
                  groupName={multiGroup ? "Multiple" : this.fS.groupList[0]}
                  style={pageTitleFormat}
                />
                {gotTreks && 
                      <View style={[cardLayout, styles.noPadding, {marginTop: 0}]}>
                        <View style={[styles.graphAndStats, bottomBorder]}>
                          <View style={styles.sortCtrls}>
                            {this.fS.sortByDate && (
                              <SvgButton
                                onPressFn={this.fS.toggleSort}
                                size={30}
                                fill={trekLogBlue}
                                path={
                                  APP_ICONS[
                                    this.fS.sortDirection === "Descend"
                                      ? "CalendarSortNewest"
                                      : "CalendarSortOldest"
                                  ]
                                }
                              />
                            )}
                            {!this.fS.sortByDate && (
                              <SvgButton
                                onPressFn={this.fS.toggleSort}
                                style={sortAsc ? {transform: ([{ rotateX: "180deg" }])} : {}}
                                size={30}
                                fill={trekLogBlue}
                                path={
                                  APP_ICONS.Sort
                                }
                              />
                            )}
                          </View>
                          <View style={styles.graphArea}>
                            <SvgYAxis
                              graphHeight={graphHeight}
                              axisTop={maxBarHeight}
                              axisBottom={20}
                              axisWidth={yAxisWidth}
                              color={mediumTextColor}
                              lineWidth={1}
                              majorTics={5}
                              title={this.fS.barGraphData.title}
                              dataRange={this.fS.barGraphData.range}
                              dataType={graphLabelType}
                            />
                            <View style={styles.graph}>
                              <SvgGrid
                                graphHeight={graphHeight}
                                gridWidth={graphWidth}
                                lineCount={3}
                                colorTheme={this.mS.colorTheme}
                                maxBarHeight={maxBarHeight}
                              />
                              <BarDisplay
                                data={this.fS.barGraphData.items}
                                dataRange={this.fS.barGraphData.range}
                                selected={this.fS.selectedTrekIndex}
                                selectFn={this.callTrekSelected}
                                openFlag={this.openItems}
                                maxBarHeight={160}
                                style={styles.graphStyle}
                                barStyle={styles.barStyle}
                                labelAngle={0}
                                scrollToBar={this.fS.scrollToBar}
                              />
                            </View>
                          </View>
                        </View>
                        <View style={styles.scrollArea}>
                          <ScrollView>
                            <TrekDetails
                              selectable
                              sortBy={this.fS.sortBy}
                              sortByDate={this.fS.sortByDate}
                              selectFn={this.callSetSortBy}
                              switchSysFn={this.switchMeasurementSystem}
                              showImagesFn={this.showTrekImage}
                              selected={this.fS.selectedTrekIndex}
                              showCourseEffortFn={this.showCourseEffort}
                              toggleShowValueFn={this.toggleShowValue}
                              showGroup={multiGroup}
                            />
                          </ScrollView>
                        </View>
                      </View>
                }
              </View>
              {!gotTreks && this.fS.typeSelections !== 0 && (
                <View style={styles.emptyGraphArea}>
                  <Text style={styles.noMatches}>Nothing To Display</Text>
                </View>
              )}
              {!gotTreks && this.fS.typeSelections === 0 && (
                <View style={styles.emptyGraphArea}>
                  <Text style={styles.noMatches}>No Trek Type Selected</Text>
                </View>
              )}
            </View>
          )}
          {this.mS.waitingForSomething && <Waiting />}
        </View>
      </NavMenu>
    );
  }
}
export default ReviewTreks;
