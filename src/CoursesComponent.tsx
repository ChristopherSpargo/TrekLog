import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView, Image } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { action, observable } from 'mobx'
import { observer, inject } from 'mobx-react'
import { NavigationActions, StackActions } from 'react-navigation';

import { TrekInfo } from './TrekInfoModel'
import { ToastModel } from './ToastModel';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel';
import { CourseSvc } from './CourseService';
import SpeedDial, { SpeedDialItem } from './SpeedDialComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';
import NavMenu, { NavMenuItem } from './NavMenuComponent';
import NavMenuTrigger from './NavMenuTriggerComponent'

const goBack = NavigationActions.back() ;

@inject('trekInfo', 'toastSvc', 'uiTheme', 'utilsSvc', 'modalSvc', 'courseSvc')
@observer
class Courses extends Component<{ 
  utilsSvc ?: UtilsSvc,
  courseSvc ?: CourseSvc,
  navigation ?: any
  uiTheme ?: any,
  modalSvc ?: ModalModel,
  toastSvc ?: ToastModel,
  trekInfo ?: TrekInfo         // object with all non-gps information about the Trek
}, {} > {

  @observable openItems;
  @observable headerTitle;
  @observable openNavMenu : boolean;

  selectedCourse = -1;             // index of currently selected course list item (-1 if none)
  
  tI = this.props.trekInfo;
  cS = this.props.courseSvc;
  uSvc = this.props.utilsSvc;
  APCIndex = -1;

  renderCount = 0;

  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        this.setOpenItems(true)
        // this.tI.clearTrek();
      }
    );
    this.initializeObservables();
  }

  componentDidMount() {
    // requestAnimationFrame(() => {
    //   this.setOpenItems(true);
    //   })
    this.setTitleParam();
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        this.setOpenItems(false)
    );
  }

  componentWillMount() {
    // read the Course list from the database
    // this.tI.clearTrackingItems();
    // this.cS.getCourseList()
    // .then(() => {
      if (this.cS.courseList.length){
        // sort courses by lastEffort date (most recent first)
        this.cS.courseList.sort((a,b) => {
          return parseInt(b.lastEffort.subject.date) - parseInt(a.lastEffort.subject.date);
        })
        this.cS.setCourseListDisplayItems(this.tI.measurementSystem);
      }
      else {
      // Course List is there but empty
      this.props.toastSvc.toastOpen({tType: "Error", content: "Course list is empty."});
      }
    // })
    // .catch(() => {
    //   // Failed to read Course List
    //   this.props.toastSvc.toastOpen({tType: "Error", content: "No course list found."});
    //   this.setTitleParam();
    // })
  }

  componentWillUnmount() {
    this.setOpenItems(false);   
    this.tI.clearTrek();
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
  }

  initializeObservables = () => {
    this.setOpenNavMenu(false);
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  // Set the title in the header
  setTitleParam = (titleMsg?: string) => {
    if(this.cS.courseList && (this.cS.courseList.length > 0)) {
      this.setHeaderTitle(titleMsg || 'Courses (' + this.cS.courseList.length + ')');
    }
    else {
      this.setHeaderTitle("No Courses");
    }
  }

  // Set the title in the header
  @action
  setHeaderTitle = (title: string) => {
    this.headerTitle = title;
  };

  @action
  setOpenItems = (status: boolean) => {
    this.openItems = status;
  }

  // edit the selected course
  @action
  renameCourse = (index: number) => {
    let c = this.cS.courseList[index];
    this.props.toastSvc.toastOpen({
      tType: "Warning",
      content: "TODO list item:\n COURSE RENAME",
    })
    return c;
  }

  // delete the selected course from the list
  @action
  deleteCourse = (index: number) => {
    let c = this.cS.courseList[index];

    this.props.modalSvc.simpleOpen({heading: "Delete Course", headingIcon: "Delete",     
      content: "Delete Course:", bigContent: '"' + c.name + '"', 
      cancelText: 'CANCEL', deleteText: 'DELETE'})
    .then(() => {
      this.setOpenItems(false);
      this.cS.deleteCourse(c.name)
      .then(() => {
        this.setTitleParam();
        requestAnimationFrame(() => {
          this.setOpenItems(true);
        })
      })
      .catch((err) => {
        this.props.toastSvc.toastOpen({
          tType: "Error",
          content: err,
        });
        this.setTitleParam();
        requestAnimationFrame(() => {
          this.setOpenItems(true);
        })
      })
    })
    .catch(() => {
    });
  }

  // Show the details of the given Course object
  showCourseDetails = (course: string) => {
    // this.setOpenItems(false);        
    this.props.navigation.navigate({ routeName: 'CourseDetails', params: {focusCourse: course}, 
                                     key: 'Key-CourseDetails'});
  }

  // update the value of the selected course index
  setSelectedCourse = (index: number) => {
    this.selectedCourse = index;
  }

  // update the value of the selected course index and show the course details
  @action
  showSelectedCourse = (index: number) => {
    requestAnimationFrame(() => { 
      this.setSelectedCourse(index);
      this.showCourseDetails(this.cS.courseList[index].name);
    })
  }

  // display the map for the defining event for the selected course
  showCourseMap = (index: number) => {
    requestAnimationFrame(() => { 
      this.setSelectedCourse(index);
      this.cS.getDefiningTrek(index)
      .then((trek) => {
        this.tI.setTrekProperties(trek);
        this.props.navigation.navigate("SelectedTrek", {
          title:
            this.uSvc.formattedLocaleDateAbbrDay(trek.date) +
            "  " +
            trek.startTime,
          icon: trek.type,
          switchSysFn: this.tI.switchMeasurementSystem,
          mapDisplayMode: 'noSpeeds'
        })
      })
      .catch((err) => {
          this.props.toastSvc.toastOpen({
            tType: "Error",
            content: err
          });
      })
    })
  }

  // Show the details of the given Course object
  scanForEfforts = (index: number) => {
    // this.setOpenItems(false);        
    let c = this.cS.courseList[index];
    this.props.toastSvc.toastOpen({
      tType: "Warning",
      content: "TODO list item:\n SCAN FOR EFFORTS",
    })
    return c;
  }

  // respond to a speed dial menu command
  speedDialAction = (cmd: string, index: number) => {
    switch(cmd){
      case 'Scan':
        this.scanForEfforts(index);
        break;
      case 'Rename':
        this.renameCourse(index);
        break;
      case 'Delete':
        this.deleteCourse(index);
        break;
      default:
    }
  }

  setActiveNav = (val: string) => {
    requestAnimationFrame(() => {
      switch (val) {
        case "Home":
          this.props.navigation.dispatch(StackActions.popToTop());
          break;
        case "Summary":
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
    })
  }

  render() {

    const { mediumTextColor, disabledTextColor, dividerColor, highlightedItemColor, cardItemTitleColor,
            pageBackground, highTextColor, rippleColor, primaryColor, altCardBackground
          } = this.props.uiTheme.palette[this.tI.colorTheme];
    const { cardLayout, pageTitle, fontRegular } = this.props.uiTheme;
    const displayList = this.cS.courseList && this.cS.courseList.length > 0;
    const courseCardHeight = 195 + 15;
    const navMenuItems : NavMenuItem[] = 
      [ {icon: 'Home', label: 'Home', value: 'Home'},
        {icon: 'Pie', label: 'Activity', value: 'Summary'},
        {icon: 'Target', label: 'Goals', value: 'Goals'},
        {icon: 'Settings', label: 'Settings', value: 'Settings'},
        {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'}
      ]; 
    
    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      cardCustom: {
        justifyContent: "space-between",
        paddingBottom: 0,
        paddingLeft: 0,
        paddingTop: 0,
        paddingRight: 0,
        marginTop: 5,
        marginBottom: 10,
        marginLeft: 5,
        marginRight: 5,
        borderColor: dividerColor,
        borderStyle: "solid",
        borderWidth: 1,
        borderBottomWidth: 2,
        borderRadius: 3,
        backgroundColor: altCardBackground,
      },
      courseHighlight: {
        backgroundColor: highlightedItemColor,
      },
      centered: {
        marginTop: 150,
        alignItems: "center",
        justifyContent: "center"
      },
      mapAndDist: {
        flexDirection: "row",
        marginTop: 15,
        marginLeft: 15,
        marginBottom: 20,
      },
      nameAndTimes: {
        flexDirection: "column",
      },
      courseNameText: {
        fontFamily: fontRegular,
        color: cardItemTitleColor,
        fontSize: 22
      },
      effortRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginLeft: 5,
      },
      effortLabel: {
        fontFamily: fontRegular,
        fontSize: 18,
        color: mediumTextColor,
        width: 70,
      },
      effortTime: {
        fontFamily: fontRegular,
        fontSize: 20,
        color: highTextColor,
        width: 70,
      },
      effortDate: {
        fontFamily: fontRegular,
        fontSize: 18,
        color: mediumTextColor,
      },
      courseDist: {
        fontFamily: fontRegular,
        fontSize: 20,
        color: highTextColor,
        textAlign: "center",
      },
      noCourses: {
        fontFamily: fontRegular,
        marginTop: 100,
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 24,
      },
      speedDialTrigger: {
        backgroundColor: "transparent",
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
      courseImageArea: {
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        elevation: 4,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: disabledTextColor,
        width: 100, 
        height: 130, 
        alignItems: "center", 
        backgroundColor: pageBackground, 
        justifyContent: "center"
      },
      listArea: {
        ...cardLayout,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        backgroundColor: pageBackground,
      },
      pageTitleAdj: {
        color: highTextColor,
        paddingLeft: 10,
        paddingRight: 10,
        marginBottom: 10,
      },
    })

    let mapActions : SpeedDialItem[] =
                       [{icon: 'MapSearch', label: 'Scan', value: 'Scan'},
                       {icon: 'Edit', label: 'Rename', value: 'Rename'},
                       {icon: 'Delete', label: 'Delete', value: 'Delete'}];


    return(
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        open={this.openNavMenu}> 
        <View style={styles.container}>
          <TrekLogHeader
            titleText={this.headerTitle}
            icon="*"
            backButtonFn={() => this.props.navigation.dispatch(goBack)}
          />
            <View style={styles.listArea}>
              <NavMenuTrigger openMenuFn={this.openMenu}/>
              <Text style={[pageTitle, styles.pageTitleAdj]}>Course List</Text>
              <ScrollView snapToInterval={courseCardHeight} decelerationRate={.90}> 
                {!displayList && 
                  <View style={styles.centered}>
                    <Text style={styles.noCourses}>No Courses Found</Text>
                  </View>
                }
                {displayList && 
                  <View style={{paddingBottom: 85}}>
                    {this.cS.courseList.map((dlItem, index) => (
                      <FadeInView startValue={0} key={index} endValue={1} open={this.openItems} 
                          duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                        <SlideDownView startValue={-180} endValue={0} open={this.openItems} 
                            duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                          <View style={[cardLayout, styles.cardCustom, {overflow: "hidden"},
                                      this.selectedCourse === index ? styles.courseHighlight : {}]}>
                            <RectButton
                              rippleColor={rippleColor}
                              onPress={() => this.showSelectedCourse(index)}
                            >
                              <View style={styles.mapAndDist}>
                                <View style={{width: 100, marginRight: 10}}>
                                  {dlItem.courseImageUri && 
                                    <RectButton
                                      rippleColor={rippleColor}
                                      onPress={() => this.showCourseMap(index)}
                                    >
                                      <View style={styles.courseImageArea}>
                                        <Image source={{uri: 'file://' + dlItem.courseImageUri}}
                                          style={{width: 98, height: 128}}
                                        />
                                      </View>
                                    </RectButton>
                                  }
                                  {!dlItem.courseImageUri &&
                                    <RectButton
                                      rippleColor={rippleColor}
                                      onPress={() => this.showCourseMap(index)}
                                    >
                                      <View style={styles.courseImageArea}>
                                          <Text style={{color: disabledTextColor, fontSize: 20, fontStyle: "italic"}}>No Map</Text>
                                        </View>
                                    </RectButton>
                                  }
                                  <Text style={styles.courseDist}>
                                    {this.uSvc.formatDist(dlItem.definingEffort.subject.distance, this.tI.distUnits())}
                                  </Text>
                                </View>
                                <View style={styles.nameAndTimes}>
                                  <Text style={styles.courseNameText}>{dlItem.name}</Text>
                                  <View style={styles.effortRow}>
                                    <Text style={styles.effortLabel}>Default:</Text> 
                                    <Text style={styles.effortTime}>
                                          {this.uSvc.timeFromSeconds(dlItem.definingEffort.subject.duration)}</Text>
                                    <Text style={styles.effortDate}>
                                          {this.uSvc.dateFromSortDateYY(dlItem.definingEffort.subject.date)}</Text>
                                  </View>
                                  {dlItem.lastEffort && 
                                    <View style={styles.effortRow}>
                                      <Text style={styles.effortLabel}>Last:</Text> 
                                      <Text style={styles.effortTime}>
                                            {this.uSvc.timeFromSeconds(dlItem.lastEffort.subject.duration)}</Text>
                                      <Text style={styles.effortDate}>
                                            {this.uSvc.dateFromSortDateYY(dlItem.lastEffort.subject.date)}</Text>
                                    </View>
                                  }
                                  {dlItem.bestEffort && 
                                    <View style={styles.effortRow}>
                                      <Text style={styles.effortLabel}>Best:</Text> 
                                      <Text style={styles.effortTime}>
                                            {this.uSvc.timeFromSeconds(dlItem.bestEffort.subject.duration)}</Text>
                                      <Text style={styles.effortDate}>
                                            {this.uSvc.dateFromSortDateYY(dlItem.bestEffort.subject.date)}</Text>
                                    </View>
                                  }
                                  </View>
                              </View>
                              <SpeedDial
                                icon="DotsVertical"
                                bottom={5}
                                // right={15}
                                iconColor={mediumTextColor}
                                items={mapActions}
                                sdIndex={index}
                                selectFn={this.speedDialAction}
                                style={styles.speedDialTrigger}
                                horizontal={true}
                                menuColor="transparent"
                                itemIconsStyle={{backgroundColor: pageBackground}}
                                itemIconsColor={primaryColor}
                                iconSize="Small"
                              />
                            </RectButton>
                          </View>
                          {/* <View style={styles.divider}/> */}
                        </SlideDownView>
                      </FadeInView>       
                      ))
                    }
                  </View>
                }
              </ScrollView>
            </View>
        </View>
      </NavMenu>
    )
  }
  
}
export default Courses;