// This component allows the review of past treks.  Treks can be filtered and sorted using various criteria.

import React, { Component } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions } from "react-native";
import { observer, inject } from "mobx-react";
import { action, observable } from "mobx";
import { NavigationActions, StackActions } from "react-navigation";

import { FilterSvc, SORTDIRECTION_ASCEND } from "./FilterService";
import { TrekInfo, TrekObj, RESP_CANCEL, MSG_HAS_LINK, RESP_OK, MSG_LINK_ADDED,
          SortByTypes,
          MSG_NO_LIST, MSG_NEW_COURSE_RECORD, MSG_NEW_COURSE } from "./TrekInfoModel";
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


const goBack = NavigationActions.back();

@inject(
  "trekInfo",
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
    trekInfo?: TrekInfo; // object with all non-gps information about the Trek
  },
  {}
> {

  @observable openItems;
  @observable headerTitle;
  @observable checkboxPickerOpen;
  @observable coursePickerOpen;
  @observable updateView;
  @observable openNavMenu : boolean;

  tInfo = this.props.trekInfo;
  fS = this.props.filterSvc;
  courseSvc = this.props.courseSvc;

  activeNav: string = "";
  AFFIndex: number;


  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentWillMount() {
    this.setOpenItems(false);
    this.AFFIndex = this.fS.setAfterFilterFn(this.runAfterFilterTreks);
    this.fS.setDateMax(this.tInfo.dtMax, "None");
    this.fS.setDateMin(this.tInfo.dtMin, "None");
    this.fS.setTimeframe(this.tInfo.timeframe);   // 
    this.fS.buildAfterFilter();
  }

  componentDidMount() {
    this.setUpdateView(true);
  }

  componentWillUnmount() {
    this.fS.removeAfterFilterFn(this.AFFIndex - 1);
    this.tInfo.clearTrek();
    this.fS.setSelectedTrekIndex(-1);
    this.fS.setDataReady(false);
    this.tInfo.restoreCurrentGroupSettings();
    this.props.loggingSvc.stopTrackingMarker();
    // this.tInfo.badPointList = [];                    // **Debug
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setHeaderTitle('Scanning...')
    this.setOpenItems(true);
    this.setUpdateView(false);
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
  showTrekMap = (indx: number) => {
    if (this.fS.filteredTreks.length) {
      let trek = this.tInfo.allTreks[this.fS.filteredTreks[indx]];
      this.tInfo.setShowMapControls(true);
      this.props.courseSvc.clearTrackingSnapshot();
      this.props.navigation.navigate({ 
          routeName: "SelectedTrek", 
          params: {
            title: this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) + "  " + trek.startTime,
            icon: this.tInfo.type,
            iconColor: TREK_TYPE_COLORS_OBJ[this.tInfo.type],
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
      trek = this.tInfo.allTreks[this.fS.filteredTreks[indx]];
      this.fS.trekSelected(indx);
      resolve(
        this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
        "  " +
        trek.startTime
      );
    })
  };

  // delete the trek (after confirmation) at 'index' in the filteredTreks list
  deleteTrek = (index: number) => {
    let trek = this.tInfo.allTreks[this.fS.filteredTreks[index]];
    let content =
      "Delete " +
      trek.type +
      " from:\n" +
      trek.date +
      " " +
      trek.startTime +
      "\n" +
      this.tInfo.getTrekLabel();
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
        this.tInfo.setWaitingForSomething("NoMsg");
        this.tInfo
          .deleteTrek(trek)
          .then(() => {
            this.tInfo.setWaitingForSomething();
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: trek.type + " has been deleted."
            });
            this.callFilterTreks();
            this.fS.trekSelected(index ? index - 1 : 0)
          })
          .catch(() => {
            this.tInfo.setWaitingForSomething();
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
        case "Filter":
          this.props.navigation.navigate({routeName: "ExtraFilters", params: {
            title: this.fS.formatTitleMessage("Filter:"),
            existingFilter: this.fS.getFilterSettingsObj(false),
            mode: "Review"
            }, key: "Key-ExtraFilters"});
          break;
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
          this.props.storageSvc.writeTrekToMongoDb(this.tInfo.getSaveObj())
          .then(() => {
            this.props.toastSvc.toastOpen({
              tType: "Success",
              content: 'Trek uploaded for ' + this.tInfo.group,
            })
          })
          .catch(() => {
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: 'Trek not uploaded for ' + this.tInfo.group,
            });
          })
          break;
        case "GoBack":
          this.props.navigation.dispatch(goBack);
          break;
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Courses":
        case "Goals":
        case "Settings":
        case "Conditions":
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
      let trek = this.tInfo.allTreks[this.fS.filteredTreks[this.fS.selectedTrekIndex]];
      if(!trek.course || !this.courseSvc.isCourse(trek.course)) {
        this.courseSvc.newCourseOrEffort(trek, this.setCoursePickerOpen)
        .then((sel) => {
          switch(sel.resp){
            case RESP_CANCEL:
              break;
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
                content: MSG_LINK_ADDED + trek.type + " linked with course\n" + sel.name,
              });
              break;
            case MSG_NEW_COURSE:
              this.props.navigation.navigate("SelectedTrek", {
                title:
                  this.props.utilsSvc.formattedLocaleDateAbbrDay(trek.date) +
                  "  " +
                  trek.startTime,
                icon: this.tInfo.type,
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
          content: MSG_HAS_LINK + 'This ' + trek.type + ' is already\nlinked to ' + trek.course,
        });
      }
    }
  }

  // switch measurements system then update the bar graph
  switchMeasurementSystem = () => {
    this.tInfo.switchMeasurementSystem();
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
    requestAnimationFrame(() => {
      this.fS.setSortBy(value);
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
        this.tInfo.readAllTreks(this.fS.groupList)
        .then(() => {
          this.fS.setDataReady(false);
          if(this.tInfo.timeframe !== 'All'){
            this.fS.findActiveTimeframe(this.tInfo.timeframe);
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
    let title = this.tInfo.formatImageTitle(set, image);
    this.props.navigation.navigate('Images', {cmd: 'show', setIndex: set, imageIndex: image, title: title});
  }

  // Display the map for the effort at the given index in trekList
  showCourseEffort = () => {
      let trek = this.tInfo.getSaveObj();
      this.props.courseSvc.getCourse(trek.course)
      .then((course) => {
        let effort = this.props.courseSvc.getTrekEffort(course, trek);
        this.tInfo.setTrackingMethod(effort.subject.method);
        this.tInfo.setTrackingValue(effort.subject.goalValue);      
        this.tInfo.setShowMapControls(true)
        this.props.courseSvc.initCourseTrackingSnapshot(course, trek, effort)
        .then(() => {        
          // alert(JSON.stringify({...this.cS.trackingSnapshot, ...{coursePath: undefined, trekPath: undefined}},null,2))
          this.props.navigation.navigate("SelectedTrek", {
            title: this.props.utilsSvc.formatTrekDateAndTime(trek.date, trek.startTime),
            icon: this.tInfo.type,
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
    const extraFilters = this.fS.extraFilterSet();
    const pageTitleSpacing = 20;
    const statusBarHt = 0;
    const sortControlsHt = 30;
    const areaHt = height - (statusBarHt + pageTitleSpacing + HEADER_HEIGHT + PAGE_TITLE_HEIGHT);
    const { cardLayout } = this.props.uiTheme;
    const {
      disabledTextColor,
      pageBackground,
      trekLogBlue,
      mediumTextColor,
      dividerColor
    } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const gotTreks = this.fS.dataReady && !this.fS.filteredTreksEmpty();
    const graphBgColor = pageBackground;
    const graphHeight = 210;
    const maxBarHeight = 160;
    const graphAreaWidth = width;
    const yAxisWidth = 60;
    const graphWidth = graphAreaWidth - yAxisWidth - 10;
    const sortAsc = this.fS.sortDirection === SORTDIRECTION_ASCEND;
    const hasNoCourse = !this.tInfo.course || !this.props.courseSvc.isCourse(this.tInfo.course);
    let navMenuItems = 
    [ gotTreks ? 
        {label: 'Review Options', 
         submenu: [
          {icon: 'Delete', label: 'Delete', value: 'Delete'},
          {icon: extraFilters ? 'FilterRemove' : 'Filter', label: 'Edit Filters', value: 'Filter'},
          {icon: 'Map', label: 'View Map', value: 'Map'},
          // {icon: 'Upload', label: 'Upload Trek', value: 'Upload'},
        ]} :
        {label: 'Review Options', 
         submenu: [
          {icon: extraFilters ? 'FilterRemove' : 'Filter', label: 'Edit Filters', value: 'Filter'},
        ]},
        {icon: 'Home', label: 'Home', value: 'Home'},
        {icon: 'Pie', label: 'Activity', value: 'GoBack'},
        {icon: 'Course', label: 'Courses', value: 'Courses'},
        {icon: 'Target', label: 'Goals', value: 'Goals'},
        {icon: 'Settings', label: 'Settings', value: 'Settings'},
        {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}]  

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
        marginBottom: 5,
        marginRight: 10,
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
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "center",
        marginHorizontal: 5,
        height: sortControlsHt,
      },
      scrollArea: {
        flexDirection: "column",
        justifyContent: "flex-start",
        paddingTop: 0,
        height: areaHt,
      },
      graphStyle: {
        height: graphHeight
      },
      barStyle: { 
        height: graphHeight, 
        width: 40,
        borderColor: "transparent",
        backgroundColor: "transparent",
      },
      pageTitleAdj: {
        marginBottom: 5,
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
                backButtonFn={() => this.props.navigation.dispatch(goBack)}
                openMenuFn={this.openMenu}
              />
              <RadioPicker pickerOpen={this.coursePickerOpen} />
              <View style={[cardLayout, styles.noPadding, {paddingTop: 10, marginBottom: 0}]}>
                <PageTitle 
                  titleText="Trek Review"
                  groupName={this.fS.groupList.length === 1 ? this.fS.groupList[0] : "Multiple"}
                  style={styles.pageTitleAdj}
                />
                {gotTreks && 
                  <View style={styles.scrollArea}>
                    <ScrollView>
                      <View style={[cardLayout, styles.noPadding, {marginTop: 0}]}>
                        <View style={styles.sortCtrls}>
                          {this.fS.sortByDate && (
                            <SvgButton
                              onPressFn={this.fS.toggleSort}
                              borderWidth={0}
                              areaOffset={0}
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
                              borderWidth={0}
                              areaOffset={0}
                              size={30}
                              fill={trekLogBlue}
                              path={
                                APP_ICONS.Sort
                              }
                            />
                          )}
                        </View>
                        <View style={styles.graphAndStats}>
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
                                color={dividerColor}
                                maxBarHeight={maxBarHeight}
                                minBarHeight={20}
                              />
                              <BarDisplay
                                data={this.fS.barGraphData.items}
                                dataRange={this.fS.barGraphData.range}
                                selected={this.fS.selectedTrekIndex}
                                selectFn={this.callTrekSelected}
                                openFlag={this.openItems}
                                maxBarHeight={maxBarHeight}
                                style={styles.graphStyle}
                                barStyle={styles.barStyle}
                                labelAngle={0}
                                minBarHeight={20}
                                scrollToBar={this.fS.scrollToBar}
                              />
                            </View>
                          </View>
                        </View>
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
                        />
                      </View>
                    </ScrollView>
                  </View>
                }
              </View>
              {!gotTreks && this.tInfo.typeSelections !== 0 && (
                <View style={styles.emptyGraphArea}>
                  <Text style={styles.noMatches}>Nothing To Display</Text>
                </View>
              )}
              {!gotTreks && this.tInfo.typeSelections === 0 && (
                <View style={styles.emptyGraphArea}>
                  <Text style={styles.noMatches}>No Trek Type Selected</Text>
                </View>
              )}
            </View>
          )}
          {this.tInfo.waitingForSomething && <Waiting />}
        </View>
      </NavMenu>
    );
  }
}
export default ReviewTreks;
