import React, { Component } from 'react'
import { View, StyleSheet, Text, ScrollView, Image } from 'react-native'
import { RectButton } from 'react-native-gesture-handler'
import { action, observable } from 'mobx'
import { observer, inject } from 'mobx-react'
import { NavigationActions } from 'react-navigation';

import { TrekInfo } from './TrekInfoModel'
import { ToastModel } from './ToastModel';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel';
import { CourseSvc } from './CourseService';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import SpeedDial, { SpeedDialItem } from './SpeedDialComponent';
import TrekLogHeader from './TreklogHeaderComponent';
import FadeInView from './FadeInComponent';
import SlideDownView from './SlideDownComponent';
import { SCROLL_DOWN_DURATION, FADE_IN_DURATION } from './App';

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

  selectedCourse = -1;             // index of currently selected course list item (-1 if none)
  
  tI = this.props.trekInfo;
  cS = this.props.courseSvc;
  uSvc = this.props.utilsSvc;
  APCIndex = -1;

  _didFocusSubscription;
  _willBlurSubscription;

  constructor(props) {
    super(props);
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        this.setOpenItems(true)
      }
    );
  }

  componentDidMount() {
    requestAnimationFrame(() => {
      this.setOpenItems(true);
    })
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        this.setOpenItems(false)
    );
  }

  componentWillMount() {
    // read the Course list from the database
    this.tI.clearTrackingItems();
    this.setSelectedCourse(-1);
    this.cS.getCourseList()
    .then(() => {
      if (this.cS.courseList.length){
        this.setSelectedCourse(0);
        this.setTitleParam();
        this.setOpenItems(false);   
        // alert(JSON.stringify(this.cS.courseList,null,2))     
      }
      else {
      // Course List is there but empty
      this.props.toastSvc.toastOpen({tType: "Error", content: "Course list is empty."});
      this.setTitleParam();
      }
    })
    .catch(() => {
      // Failed to read Course List
      this.props.toastSvc.toastOpen({tType: "Error", content: "No course list found."});
      this.setTitleParam();
    })
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
  }

  // Set the title in the header
  setTitleParam = (titleMsg?: string) => {
    if(this.cS.courseList && (this.cS.courseList.length > 0)) {
      let plural = this.cS.courseList.length === 1 ? '' : 's';
      this.setHeaderTitle(titleMsg || (this.cS.courseList.length + ' Course' + plural));
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
  editCourse = (index: number) => {
    let c = this.cS.courseList[index];
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
    this.props.navigation.navigate('CourseDetails', {focusCourse: course});
  }

  // update the value of the selected course index
  @action
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

  // Show the details of the given Course object
  scanForCourse = (index: number) => {
    // this.setOpenItems(false);        
    let c = this.cS.courseList[index];
  }

  // respond to a speed dial menu command
  speedDialAction = (cmd: string, index: number) => {
    switch(cmd){
      case 'Scan':
        this.scanForCourse(index);
        break;
      case 'Edit':
        this.editCourse(index);
        break;
      case 'Delete':
        this.deleteCourse(index);
        break;
      default:
    }
  }

  render() {

    const { mediumTextColor, disabledTextColor, dividerColor, highlightedItemColor,
            pageBackground, highTextColor, rippleColor, primaryColor,
          } = this.props.uiTheme.palette[this.tI.colorTheme];
    const { cardLayout, pageTitle } = this.props.uiTheme;
    const displayList = this.cS.courseList && this.cS.courseList.length > 0;
    const courseIconSize = 40;

    const styles=StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground },
      cardCustom: {
        justifyContent: "space-between",
        paddingBottom: 0,
        paddingLeft: 0,
        paddingTop: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingRight: 0,
      },
      courseHighlight: {
        backgroundColor: highlightedItemColor,
      },
      centered: {
        marginTop: 150,
        alignItems: "center",
        justifyContent: "center"
      },
      mapAndTitle: {
        flexDirection: "row",
        marginTop: 15,
        marginLeft: 15,
        marginBottom: 10,
      },
      courseNameText: {
        color: highTextColor,
        fontSize: 20
      },
      effortRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginLeft: 5,
      },
      effortLabel: {
        fontSize: 16,
        color: mediumTextColor,
        width: 70,
      },
      effortTime: {
        fontSize: 18,
        color: highTextColor,
        width: 75,
      },
      effortDate: {
        fontSize: 16,
        color: mediumTextColor,
      },
      courseDist: {
        fontSize: 18,
        color: highTextColor,
        textAlign: "center",
      },
      noCourses: {
        marginTop: 100,
        textAlign: "center",
        color: disabledTextColor,
        fontSize: 22,
      },
      speedDialTrigger: {
        backgroundColor: pageBackground,
      },
      divider: {
        flex: 1,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: dividerColor,
      },
    })

    let mapActions : SpeedDialItem[] =
                       [{icon: 'MapSearch', label: 'Scan', value: 'Scan'},
                       {icon: 'Edit', label: 'Edit', value: 'Edit'},
                       {icon: 'Delete', label: 'Delete', value: 'Delete'}];


    return(
      <View style={styles.container}>
        <TrekLogHeader
          titleText={this.headerTitle}
          icon="*"
          backButtonFn={() => this.props.navigation.dispatch(goBack)}
        />
        <View style={[cardLayout, {marginBottom: 0, paddingBottom: 15}]}>
          <Text style={[pageTitle, {color: highTextColor}]}>Courses</Text>
        </View>
        <ScrollView>
          {!displayList && 
            <View style={styles.centered}>
              <Text style={styles.noCourses}>No Courses Found</Text>
            </View>
          }
          {displayList && 
            <View style={{paddingBottom: 85}}>
              {this.cS.courseList.map((dlItem, index) => (
                <FadeInView startValue={0.1} key={index} endValue={1} open={this.openItems} 
                    duration={FADE_IN_DURATION} style={{overflow: "hidden"}}>
                  <SlideDownView startValue={-110} endValue={0} open={this.openItems} 
                      duration={SCROLL_DOWN_DURATION} style={{overflow: "hidden"}}>
                    <View style={[cardLayout, styles.cardCustom, {overflow: "hidden"},
                                this.selectedCourse === index ? styles.courseHighlight : {}]}>
                      <RectButton
                        rippleColor={rippleColor}
                        onPress={() => this.showSelectedCourse(index)}
                      >
                        <View style={styles.mapAndTitle}>
                          <View style={{width: 75, marginRight: 15}}>
                            <Image source={{uri: "file:///storage/emulated/0/Pictures/TrekLog/Karate.png"}}
                              style={{width: 75, height: 130}}
                            />
                            <Text style={styles.courseDist}>
                              {this.uSvc.formatDist(dlItem.definingEffort.subject.distance, this.tI.distUnits())}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.courseNameText}>{dlItem.name}</Text>
                            {/* <View style={styles.effortRow}>
                              <Text style={styles.effortLabel}>Created:</Text> 
                              <Text style={styles.effortDate}>{this.uSvc.dateFromSortDateYY(dlItem.createDate)}</Text>
                            </View> */}
                            <View style={styles.effortRow}>
                              <Text style={styles.effortLabel}>Default:</Text> 
                              <Text style={styles.effortTime}>
                                    {this.uSvc.timeFromSeconds(dlItem.definingEffort.subject.duration)}</Text>
                              <Text style={styles.effortDate}>
                                    {this.uSvc.dateFromSortDateYY(dlItem.definingEffort.subject.date)}</Text>
                            </View>
                            <View style={styles.effortRow}>
                              <Text style={styles.effortLabel}>Last:</Text> 
                              <Text style={styles.effortTime}>
                                    {this.uSvc.timeFromSeconds(dlItem.lastEffort.subject.duration)}</Text>
                              <Text style={styles.effortDate}>
                                    {this.uSvc.dateFromSortDateYY(dlItem.lastEffort.subject.date)}</Text>
                            </View>
                            <View style={styles.effortRow}>
                              <Text style={styles.effortLabel}>Best:</Text> 
                              <Text style={styles.effortTime}>
                                    {this.uSvc.timeFromSeconds(dlItem.bestEffort.subject.duration)}</Text>
                              <Text style={styles.effortDate}>
                                    {this.uSvc.dateFromSortDateYY(dlItem.bestEffort.subject.date)}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={{flexDirection: "row", alignItems: 'flex-end', marginBottom: 10}}>
                          <SpeedDial
                            icon="DotsVertical"
                            iconColor={mediumTextColor}
                            items={mapActions}
                            sdIndex={index}
                            selectFn={this.speedDialAction}
                            style={[styles.speedDialTrigger]}
                            horizontal={true}
                            menuColor="transparent"
                            itemIconsStyle={{backgroundColor: pageBackground}}
                            itemIconsColor={primaryColor}
                            iconSize="Small"
                          />
                        </View>
                      </RectButton>
                    </View>
                    <View style={styles.divider}/>
                  </SlideDownView>
                </FadeInView>       
                ))
              }
            </View>
          }
        </ScrollView>
      </View>
    )
  }
  
}
export default Courses;