import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import MapView, { Marker, Polyline, LatLng, Region } from 'react-native-maps';
import { RectButton } from 'react-native-gesture-handler'

import { INTERVAL_MARKER_Z_INDEX, CURRENT_POS_MARKER_Z_INDEX, INITIAL_POS_MARKER_Z_INDEX, 
         PICTURE_MARKER_Z_INDEX, MAIN_PATH_Z_INDEX, TRACKING_POS_MARKER_Z_INDEX,
         SHORT_CONTROLS_HEIGHT, CONTROLS_HEIGHT,
         HEADER_HEIGHT,
         HEADER_Z_INDEX,
         semitransWhite_8,
         semitransWhite_5,
         semitransBlack_5,
        } from './App';
import SpeedDial, {SpeedDialItem} from './SpeedDialComponent';
import { TrekInfo, MapType, TrekPoint, TrekImageSet } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import { ModalModel } from './ModalModel'
import IconButton from './IconButtonComponent';
import { LoggingSvc } from './LoggingService';
import { RateRangePathsObj, INTERVAL_AREA_HEIGHT } from './IntervalSvc';
import FadeInTemp from './FadeInTempComponent';

export type mapDisplayModeType = "normal" | "noControls" | "noIntervals" | "noSpeeds";

// const TREK_ZOOM_CURRENT = 15;
// const TREK_ZOOM_STATE   =  6;
// const TREK_ZOOM_COUNTRY =  4;
// const COUNTRY_CENTER_LAT_USA = 41;
// const COUNTRY_CENTER_LNG_USA = -101;

@inject('trekInfo', 'uiTheme', 'utilsSvc', 'modalSvc', 'loggingSvc')
@observer
class TrekDisplay extends Component<{
  displayMode : mapDisplayModeType,
  intervalMarkers ?: LatLng[],
  intervalLabelFn ?: Function,
  selectedInterval ?: number,
  selectedPath ?: LatLng[],   // path to the selected marker from the prior marker
  selectFn ?: Function,       // function to call when interval marker is selected
  layoutOpts : string,
  mapType : MapType,          // current map type (Sat/Terrain/Std)
  changeMapFn : Function,     // function to call to switch map type
  changeZoomFn : Function,    // switch between zoomed-in or out
  speedDialIcon ?: string,    // icon for speed dial trigger
  speedDialValue ?: string,   // value to return for speed dial with no items menu
  bottom ?: number,           // bottom limit for display
  markerDragFn ?: Function,   // function to call if interval marker dragged
  useCameraFn ?: Function,    // function to call if user takes picture or video while logging
  showImagesFn ?: Function,   // function to call if user taps an image marker on the map
  nextFn ?: Function,         // if present, display "right" button on map and call this function when pressed
  prevFn ?: Function,         // if present, display "left" button on map and call this function when pressed
  rateRangeObj ?: RateRangePathsObj,  // if present, show different colored PolyLine segements for path
  toggleRangeDataFn ?: Function, // fucntion to call to change the rateRange data type (speed/calories)
  trackingHeader ?: string,   // heading for tracking display
  trackingPath ?: LatLng[],
  trackingMarker ?: TrekPoint,
  pathToCurrent : TrekPoint[], // path for polyLine to current trek position
  pathLength : number,          // number of points in pathToCurrent
  trackingDiffDist ?: number,
  trackingDiffTime ?: number,
  trackingTime ?: number,     // elapsed tracking time
  trekMarkerDragFn ?: Function, // call this function if replay trek marker dragged
  courseMarkerDragFn ?: Function, // call this function if replay course marker dragged
  timerType ?: string,        // if 'Log', 'Paused' or 'Play' show trek current position with yellow marker, else red
  takeSnapshotFn ?: Function, // if present, take a snapshot of the map and return the uri to this function
  snapshotPrompt ?: string,   // display this prompt on button for user to take a snapshot of the map
  pauseFn ?: Function,        // if present dispaly a Pause/Play button and call this button when pressed
  isPaused ?: boolean,        // display PLAY icon if true otherwise display PAUSE icon
  uiTheme ?: any,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  trekInfo ?: TrekInfo,
  loggingSvc ?: LoggingSvc,
  }, {} > {

  @observable showPrevPtsIndex;

  tInfo = this.props.trekInfo;
  mapViewRef;
  mode = this.props.layoutOpts;
  markerRefs;
  selectedMarker = -1;
  updates = 0;
  eMsg = '';
  currentImageSet : TrekImageSet;
  currentImageSetIndex : number;
  backgroundTimeoutID : number;
  stdMapStyle =
  [
    {
      "featureType": "administrative.neighborhood",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#b4d27b"
        }
      ]
    },
    {
      "featureType": "administrative.neighborhood",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#666666"
        }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#949494"
        }
      ]
    },
    {
      "featureType": "landscape",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#303030"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#eaeaea"
        },
        {
          "weight": 1.5
        }
      ]
    },
    {
      "featureType": "poi.business",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#3a3a3a"
        },
        {
          "weight": 2.5
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#ffffff"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#484848"
        }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#ffffff"
        }
      ]
    },
    {
      "featureType": "road.local",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#ffffff"
        }
      ]
    }
  ];

  initRegionLatDelta = 0.090;     // amount of latitude to show on initial map render
  initRegionLngDelta = 0.072;     // amount of longitude to show on initial map render

  currRegionLatDelta = 0.05; //0.015;
  currRegionLngDelta = 0.04; //0.01211;

  currRegion : any = {
    latitude: 34,
    longitude: -112,
    latitudeDelta: this.currRegionLatDelta,
    longitudeDelta: this.currRegionLngDelta
  }

  renderCount = 0;

  constructor(props) {
    super(props);
    // this.tInfo.setShowMapControls(true);
    // this.showPrevPts(-1);      // **Debug
  }

  // shouldComponentUpdate(){
  //   alert(this.props.trekInfo.updateMap)
  //   return this.props.trekInfo.updateMap;
  // }

  componentDidUpdate(prevProps){
    if (prevProps.mapType !== this.props.mapType){ 
      this.forceUpdate();
    }
    if (this.mode !== this.props.layoutOpts ||
      prevProps.rateRangeObj !== this.props.rateRangeObj){ 
        this.mode = this.props.layoutOpts;
      this.setLayout();
    }
    if ((this.props.selectedInterval !== undefined) && (this.selectedMarker !== this.props.selectedInterval)) {
      this.selectedMarker = this.props.selectedInterval;
      if (this.selectedMarker >= 0) {
        if (this.markerRefs) { this.markerRefs[this.selectedMarker].showCallout(); }
        if (this.mode === 'Interval') {
          if (this.mapViewRef) { 
            let topPadding = this.props.rateRangeObj ? 325 : 200;
            this.mapViewRef.fitToCoordinates(this.props.selectedPath,
                    {edgePadding: {top: topPadding, right: 50, bottom: 50, left: 50}, animated: true});
          }
        } 
        else {
          if (this.mapViewRef) { 
            this.mapViewRef.animateCamera({center: this.props.intervalMarkers[this.selectedMarker]}, 
                                        {duration: 500});
          }
        }
      }
    }
  }

  toggleShowMapControls = () => {
    this.tInfo.setShowMapControls(!this.tInfo.showMapControls);
  }

  // this happens when user moves map or program follows Current position
  regionChangeDone = (r: Region) => {
    if (this.mode !== 'Open') {
      this.currRegion.latitude        = r.latitude;
      this.currRegion.longitude       = r.longitude;
      this.currRegion.latitudeDelta   = r.latitudeDelta;
      this.currRegion.longitudeDelta  = r.longitudeDelta;

    }
  }

  // this happens when user moves the map
  regionChange = (r: Region) => {
    if (this.mode === 'Open') {
      this.currRegion.latitude        = r.latitude;
      this.currRegion.longitude       = r.longitude;
      this.currRegion.latitudeDelta   = r.latitudeDelta;
      this.currRegion.longitudeDelta  = r.longitudeDelta;

    }
  }

  // User moved the map
  mapMoved = () => {
    if ((this.mode !== 'Open')) {
      this.mode = 'Open';
      this.props.changeZoomFn(this.mode);     // stop following current position        
    }
  }

  // set the camera center to the given point and the zoom to TREK_ZOOM_CURRENT
  resetCameraCenter = (point: TrekPoint) => {
    if (point){
      this.currRegion.latitude        = point.l.a;
      this.currRegion.longitude       = point.l.o;
      this.currRegion.latitudeDelta   = this.currRegionLatDelta;
      this.currRegion.longitudeDelta  = this.currRegionLngDelta;
    }
  }

  // change the focus or zoom level on the map
  layoutMap = ( path: LatLng[]) => {
    let bPadding = (this.props.intervalMarkers ? 50 : 250);
    let topPadding = this.props.rateRangeObj ? 325 : 200;
    switch(this.mode){
      case 'All':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: topPadding, right: 50, 
                                                         bottom: bPadding, left: 50}, 
                                          animated: true});
        }
        break;
      case 'Interval':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: topPadding, right: 50, 
                                           bottom: 50, left: 50}, animated: true});
        }
        break;
      case 'Current':
      case 'NewAll':        
      case 'Start':
        if (this.mapViewRef) { 
          this.mapViewRef.animateToRegion({...this.currRegion}, 500);
        }
        if (this.mode === 'NewAll'){
          this.mode = 'All';
          this.setLayout();
          this.props.changeZoomFn('All', false);
        }
        break;
      case 'Open':
        break;
      default:
    }
  }

  // prepare the path argument and the camera object in preparation for layoutMap
  setLayout = () => {
    let path : LatLng[] = [];
    let ptc = this.props.pathToCurrent;
    switch(this.mode){
      case 'All':
        if(this.props.trackingPath){
          path = this.props.trackingPath;
        } else {
          path = this.props.utilsSvc.cvtPointListToLatLng(ptc); // copy just the LatLng data
        }
        break;
      case 'Current':
      case 'NewAll':
          this.resetCameraCenter(ptc[ptc.length - 1]);
        break;
      case 'Start':
        this.resetCameraCenter(ptc[0]);
        break;
      case 'Open':
        break;
      case 'Interval':
        path = this.props.selectedPath;
        break;
      default:
        return;
    }
    this.layoutMap(path);
  }

  // call the function to set the map focus point/area (Current/All)
  changeMapFocus = (val: string) => {
    this.mode = '';
    this.props.changeZoomFn(val);
  }

  markerDragEnd = (index, path, event) => {
    if(this.props.markerDragFn){
      this.props.markerDragFn(index, event.nativeEvent.coordinate, path);
      this.selectedMarker = -1;
      this.props.selectFn(index);   // select this marker and show it's callout
    }
  }

  // call the function that will display photos/videos
  callShowImagesFn = (index: number) => {
    this.props.showImagesFn(index);
  }

  // call the function that will handle using the camera
  callUseCameraFn = () => {
    this.props.useCameraFn();
  }

  // call function that will setup the next trek in the list (if any)
  callNextFn = () => {
    this.props.nextFn();
  }

  // call function that will setup the previous trek in the list (if any)
  callPrevFn = () => {
    requestAnimationFrame(() => {
      this.props.prevFn();
    })
  }

  @action
  showPrevPts = (index: number) => {        // **Debug
    if(this.showPrevPtsIndex === index){
      this.showPrevPtsIndex = -1;
    } else {
      this.showPrevPtsIndex = index;
    }
  }

  takeMapSnapshot () {
    const snapshot = this.mapViewRef.takeSnapshot({
      format: 'jpg',   // image formats: 'png', 'jpg' (default: 'png')
      quality: .3,
      result: 'file'   // result types: 'file', 'base64' (default: 'file')
    });
    snapshot.then((uri) => {
      this.props.takeSnapshotFn(uri);
    });
  }  
  render () {
    const tInfo = this.tInfo;
    // alert(++this.renderCount)
    const { trekLogYellow, highTextColor, secondaryColor, matchingMask_8, mediumTextColor,
            matchingMask_3, contrastingMask_5, pageBackground, pathColor, navItemBorderColor, 
            locationRadiusBorder, intervalMarkerBorderColor, intervalMarkerBackgroundColor,
            trackingMarkerRadiusBorder, trackingMarkerPathColor, matchingMask_9, 
            trackingColorMinus, trackingColorPlus, trackingStatsBackgroundHeader, dividerColor,
            primaryColor, rippleColor
          } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const { fontRegular, fontBold, navIcon, footerButton, footerButtonText } = this.props.uiTheme;
    const path = this.props.utilsSvc.cvtPointListToLatLng(this.props.pathToCurrent); // copy just the LaLo data
    const numPts = this.props.pathLength;
    const selection = (this.props.selectedInterval !== undefined || this.props.selectedInterval !== -1) 
                          ? this.props.selectedInterval : 0;
    const markers = this.props.intervalMarkers;
    const mType = this.props.mapType;
    const triggerIcon = this.props.speedDialIcon || "Location";
    const radiusBg = "rgba(18, 46, 59, .5)";
    const trekImages = this.tInfo.trekImageCount !== 0;
    const imageMarkerIconSize = 18;
    const imageSelectorWidth = 50;
    const selectedIntervalColor = '#660000';//trekLogOrange; //'rgba(255, 167, 38,.8)';  //"#ff704d";
    const showNext = this.props.nextFn !== undefined;
    const showPrev = this.props.prevFn !== undefined;
    const minSDOffset = (this.props.bottom !== 0) ? 5 : SHORT_CONTROLS_HEIGHT;
    const showControls = this.tInfo.showMapControls && !this.props.takeSnapshotFn;
    const rangesObj = this.props.rateRangeObj;
    const trackingMarker = this.props.trackingMarker;
    const tdTime = this.props.trackingDiffTime;
    const tdTimeColor = tdTime < 0 ? trackingColorMinus : trackingColorPlus;
    const tdDist = this.props.trackingDiffDist ;
    const tdDistColor = tdDist < 0 ? trackingColorMinus : trackingColorPlus;
    const tdDistStr = tInfo.formattedDist(Math.abs(tdDist));
    const spindx = tdDistStr.indexOf(' ');
    const tdDistValue = tdDistStr.substr(0, spindx);
    const tdDistUnits = tdDistStr.substr(spindx);
    const trackingTime = this.props.trackingTime;
    const logOn = this.props.timerType === 'Log';
    const replayOn = (this.props.timerType === 'Play');
    const cmBackground = (logOn || replayOn) ? trekLogYellow : "red";
    const okTxt = this.props.snapshotPrompt || 'CONTINUE';
    const canTxt = 'CANCEL';
    const footerHeight = CONTROLS_HEIGHT;
    // const badPoints = this.tInfo.badPointList && this.tInfo.badPointList.length > 0; // **Debug

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      map: { ...StyleSheet.absoluteFillObject, bottom: this.props.bottom },
      markerRadius: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: locationRadiusBorder,
        backgroundColor: radiusBg,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center"
      },
      trackingMarkerRadius: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: trackingMarkerRadiusBorder,
        backgroundColor: radiusBg,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      },
      marker: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderColor: "white",
        backgroundColor: "green",
        overflow: "hidden"
      },
      currMarker: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderColor: "white",
        backgroundColor: cmBackground,
        overflow: "hidden"
      },
      trackingMarker: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderColor: "white",
        backgroundColor: "blue",
        overflow: "hidden"
      },
      intervalMarker: {
        width: 20,
        height: 20,
        borderWidth: 2.5,
        borderRadius: 10,
        borderColor: intervalMarkerBorderColor,
        backgroundColor: intervalMarkerBackgroundColor,
        justifyContent: "center",
        alignItems: "center",
      },
      selected: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderColor: selectedIntervalColor,
      },
      finalBg: {
        backgroundColor: "red"
      },
      finalText: {
        color: "white",
      },
      intervalTxt: {
        fontSize: 12,
        fontFamily: fontRegular,
        color: "white",
      },
      speedDialTrigger: {
        backgroundColor: secondaryColor,
      },
      imageIcon: {
        height: imageMarkerIconSize,
        width: imageMarkerIconSize,
      },
      imageMarker: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderRadius: 12,
        borderColor: 'firebrick',
        backgroundColor: pageBackground,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorArea: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "center",
      },
      imageSelectorPrev: {
        position: "absolute",
        left: 10,
        width: imageSelectorWidth,
        height: imageSelectorWidth,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorNext: {
        position: "absolute",
        right: 10,
        width: imageSelectorWidth,
        height: imageSelectorWidth,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorStyle: {
        backgroundColor: matchingMask_3, 
        borderRadius: imageSelectorWidth/2,
        borderStyle: "solid",
        borderWidth: 1,
      },
      legendLocation: {
        position: "absolute",
        bottom: markers ? INTERVAL_AREA_HEIGHT : 0,
        left: 0,
        right: 0,
      },
      legendArea: {
        flex: 1,
        paddingBottom: 5,
        paddingHorizontal: 15,
        backgroundColor: matchingMask_8,
        flexDirection: "row",
        alignItems: "center",
      },
      legendHeader: {
        fontSize: 18,
        textAlign: "center",
        fontFamily: fontRegular,
        color: highTextColor,
      },
      legendRangesArea: {
        flexDirection: "row",
        justifyContent: "space-between",
      },
      legendRange: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      legendRangeValue: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 4,
        borderStyle: "solid",
      },
      legendRangeText: {
        color: highTextColor,
        fontFamily: fontRegular,
      },
      legendRangeColor: {
        width: 15,
      },
      trackingStatus: {
        position: "absolute",
        top: 0 + (logOn ? CONTROLS_HEIGHT - 10 : 0),
        flex: 1,
        marginLeft: logOn ? 0 : 56,
        // paddingVertical: 5,
        paddingRight: 5,
        paddingLeft: logOn ? 5 : 0,
        backgroundColor: logOn ? matchingMask_9 : trackingStatsBackgroundHeader,
        flexDirection: "row",
        alignItems: "center",
        zIndex: HEADER_Z_INDEX+1,
      },
      trackingGroup: {
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      },
      trackingItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      },
      trackingItemValue: {
        fontFamily: fontRegular,
        fontSize: 34,
      },
      trackingTime: {
        fontSize: 18,
        fontFamily: fontRegular,
        color: mediumTextColor
      },
      trackingItemUnits: {
        fontSize: 28,
        fontFamily: fontRegular,
        marginTop: 4,
      },
      trackingHeader: {
        fontSize: 20,
        fontFamily: fontRegular,
        color: highTextColor
      },
      badMarker1: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderColor: "white",
        backgroundColor: "black",
        overflow: "hidden"
      },
      sdLabelStyle: {
        color: 'black',
        fontSize: 13,
        fontFamily: fontBold,
        paddingHorizontal: 2,
        backgroundColor: semitransWhite_8,
        borderRadius: 8,
      },
      footer: {
        zIndex: 15,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: footerHeight,
        flexDirection: "row",
        alignItems: "center",
        borderStyle: "solid",
        borderTopColor: dividerColor,
        borderTopWidth: 1,
        backgroundColor: pageBackground
      },
      menuTouchArea: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        width: 30,
        zIndex: 2,
        backgroundColor: "transparent"
      },
      pauseButtonArea: {
        position: "absolute",
        top: SHORT_CONTROLS_HEIGHT + 10,
        left: 10,
      },
      pauseButtonStyle: {
        backgroundColor: semitransBlack_5, 
        borderRadius: imageSelectorWidth/2,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: semitransWhite_5,
      },
    })

    const Intervals = (props: any) => {
      return (
        props.markers.map((item, index) => {
          let last = props.markers.length - 1;
          this.markerRefs = [];
          this.markerRefs.length = last+1;
          return (
          <Marker
            key={index}
            zIndex={INTERVAL_MARKER_Z_INDEX}
            anchor={{x: 0.5, y: 0.5}}
            coordinate={item}
            title={props.lableFn(index)}
            ref={e => this.markerRefs[index] = e}         
            tracksViewChanges={false}  
            draggable={index !== last ? true : undefined}
            onDragEnd={index !== last ? this.markerDragEnd.bind(this, index, path) : undefined}
            onPress={() => props.selectFn(index)}
          >
            {index !== last &&
              <View style={[styles.intervalMarker, props.selection === index ? styles.selected : {}]}>
                <Text style={[styles.intervalTxt,
                              (index === props.markers.length - 1) ? styles.finalText : {}]}>{index + 1}</Text>
              </View>
            }
            {index === last &&
              <View style={styles.markerRadius}>
                <View style={[styles.intervalMarker, props.selection === index ? styles.selected : {}, styles.finalBg]}>
                  <Text style={[styles.intervalTxt, styles.finalText]}>{index + 1}</Text>
                </View>
              </View>
            }
          </Marker>
      )})
    )}

    const Images = (props: any) => {
      return (
        props.images.map((item, index) => {
          return (
          <Marker
            zIndex={PICTURE_MARKER_Z_INDEX}
            key={index}
            anchor={{x: 0.5, y: 0.5}}
            coordinate={{latitude: item.loc.a, longitude: item.loc.o}}
            tracksViewChanges={false}
            onPress={() => {
                this.callShowImagesFn(index);
              }
            }
          >
            <View style={styles.imageMarker}>
              <SvgIcon
                style={styles.imageIcon}
                size={imageMarkerIconSize}
                paths={APP_ICONS.Camera}
                fill={highTextColor}
              />
            </View>
          </Marker>
      )})
    )}

    // const BadPoints = (props: any) => {       // **Debug
    //   let list = this.props.pathToCurrent;
    //   return (
    //     props.bads.map((item, index) => {
    //       return (
    //         <View key={index}>
    //           <Marker
    //             zIndex={PICTURE_MARKER_Z_INDEX}
    //             anchor={{x: 0.5, y: 0.5}}
    //             coordinate={{latitude: list[item-1].l.a, longitude: list[item-1].l.o}}
    //             tracksViewChanges={false}
    //             title={list[item-1].t + ' \ ' + list[item-1].s}
    //             onPress={() => this.showPrevPts(item-1)}
    //           >
    //             <View style={[styles.badMarker1, {backgroundColor: "purple"}]}/>
    //           </Marker>
    //           <Marker
    //             zIndex={PICTURE_MARKER_Z_INDEX}
    //             anchor={{x: 0.5, y: 0.5}}
    //             coordinate={{latitude: list[item].l.a, longitude: list[item].l.o}}
    //             tracksViewChanges={false}
    //             title={(list[item].t - list[item-1].t) + ' | ' + 
    //                    Math.round(this.props.utilsSvc.computeImpliedSpeed(list[item-1], list[item])) + ' | ' + 
    //                    list[item].s + ' | ' + list[item].t}
    //           >
    //             <View style={styles.badMarker1}/>
    //           </Marker>
    //         </View>
    //   )})
    // )}

    // const PreviousPts = (props: any) => {           // **Debug
    //   let list = this.props.pathToCurrent;
    //   return (
    //     props.bads.map((i: number) => {
    //       return (
    //           <Marker
    //             key={i}
    //             zIndex={PICTURE_MARKER_Z_INDEX}
    //             anchor={{x: 0.5, y: 0.5}}
    //             coordinate={{latitude: list[props.start-i].l.a, longitude: list[props.start-i].l.o}}
    //             tracksViewChanges={false}
    //             title={list[props.start-i].t + ' | ' + list[props.start-i].s}
    //           >
    //             <View style={[styles.badMarker1, {backgroundColor: "orange"}]}/>
    //           </Marker>
    //       )}
    //   )
    // )}

    const  mapTypes : SpeedDialItem[] = 
                        [ {icon: 'Orbit', label: 'Satellite', value: 'hybrid', lStyle: styles.sdLabelStyle},
                          {icon: 'Landscape', label: 'Terrain', value: 'terrain', lStyle: styles.sdLabelStyle},
                          {icon: 'Highway', label: 'Standard', value: 'standard', lStyle: styles.sdLabelStyle}];


    return (
      <View style={styles.container}>
        {(numPts > 0) &&
          <MapView              // Map that shows wile recording
              ref={mv => this.mapViewRef = mv} 
              onLayout={this.setLayout}
              style={styles.map}
              onRegionChangeComplete={this.regionChangeDone}
              onRegionChange={this.regionChange}
              onPanDrag={() => this.mapMoved()}
              onPress={() => this.toggleShowMapControls()}
              moveOnMarkerPress={false}
              initialRegion={{latitude: path[numPts-1].latitude,
                longitude: path[numPts-1].longitude,
                latitudeDelta: this.initRegionLatDelta,
                longitudeDelta: this.initRegionLngDelta}
              }
              region={this.mode === 'Current' ? 
                { latitude: path[numPts-1].latitude,
                  longitude: path[numPts-1].longitude,
                  latitudeDelta: this.currRegion.latitudeDelta,
                  longitudeDelta: this.currRegion.longitudeDelta
                } : undefined}
              mapType={mType}
              customMapStyle={this.stdMapStyle}
          >
            {(trackingMarker) &&
              <Marker
                zIndex={TRACKING_POS_MARKER_Z_INDEX}
                anchor={{x: 0.5, y: 0.5}}
                tracksViewChanges={false}
                coordinate={{latitude: trackingMarker.l.a, longitude: trackingMarker.l.o}}
                // draggable
                draggable={(trackingMarker && this.props.courseMarkerDragFn) ? true : undefined}
                onDragEnd={(event) => this.props.courseMarkerDragFn(event.nativeEvent.coordinate)}
              >
                <View style={styles.trackingMarkerRadius}>
                  <View style={styles.trackingMarker}/>
                </View>
              </Marker>
            }
            {(this.props.trackingPath) &&
              <Polyline
                coordinates={this.props.trackingPath}
                strokeColor={trackingMarkerPathColor}
                strokeWidth={11}
              />
            }
            {(numPts > 0) &&
              <Marker
                zIndex={INITIAL_POS_MARKER_Z_INDEX}
                anchor={{x: 0.5, y: 0.5}}
                tracksViewChanges={false}
                coordinate={path[0]}
              >
                <View style={styles.markerRadius}>
                  <View style={styles.marker}/>
                </View>
              </Marker>
            }
            {((numPts > 1) && !markers) &&
              <Marker
                zIndex={CURRENT_POS_MARKER_Z_INDEX}
                anchor={{x: 0.5, y: 0.5}}
                tracksViewChanges={false}
                coordinate={path[numPts-1]}
                // draggable
                draggable={(trackingMarker && this.props.trekMarkerDragFn) ? true : undefined}
                onDragEnd={(event) => this.props.trekMarkerDragFn(event.nativeEvent.coordinate)}
              >
                <View style={styles.markerRadius}>
                  <View style={styles.currMarker}/>
                </View>
              </Marker>
            }
            {((numPts > 1) && markers) &&
              <Polyline
                coordinates={this.props.selectedPath}
                strokeColor={selectedIntervalColor}
                strokeWidth={11}
              />
            }
            {(numPts > 1 && !rangesObj) &&
              <Polyline
                zIndex={MAIN_PATH_Z_INDEX}
                coordinates={path}
                strokeColor={pathColor}
                strokeWidth={5}
              />
            }
            {(numPts > 1 && rangesObj) && 
              rangesObj.lines.map((pathSeg, idx) => {
                let line = [...pathSeg.lineSegment];
                return (
                <Polyline
                  key={idx}
                  zIndex={MAIN_PATH_Z_INDEX}
                  coordinates={line}
                  strokeColor={pathSeg.fillColor}
                  strokeWidth={5}
                />)
              }
              )
            }
            {((numPts > 1) && markers) &&
              <Intervals 
                lableFn={this.props.intervalLabelFn}
                selection={selection}
                selectFn={this.props.selectFn}
                markers={markers}
              />
            }
            {((numPts > 0) && trekImages) &&
              <Images 
                images={this.tInfo.trekImages}
              />
            }
            {/* {((numPts > 0) && badPoints) &&           // **Debug
              <BadPoints 
                bads={this.tInfo.badPointList}
              />
            }
            {((numPts > 0) && badPoints && this.showPrevPtsIndex !== -1) &&   // **Debug
              <PreviousPts 
                bads={[1,2,3,4,5,6,7,8,9,10,11,12,13,14]}
                start={this.showPrevPtsIndex}
              />
            } */}
          </MapView>
        }
        <View style={styles.menuTouchArea}/>
        {(showControls && numPts > 0 && this.props.rateRangeObj) &&
          <View style={styles.legendLocation}>
          <FadeInTemp dimOpacity={0.2} onPressFn={this.props.toggleRangeDataFn} viewTime={5000}>            
            <View style={styles.legendArea}>
              <View style={{flex: 1}}>               
                <Text style={styles.legendHeader}>{rangesObj.legend.title}</Text>
                <View style={styles.legendRangesArea}>
                  {rangesObj.legend.ranges.map((range) =>
                      <View style={styles.legendRange}>
                        <View style={[styles.legendRangeValue, {borderColor: range.color}]}>
                          <Text style={styles.legendRangeText}>{range.start}</Text>
                          <Text style={[styles.legendRangeText]}> - </Text>
                          <Text style={styles.legendRangeText}>{range.end}</Text>
                        </View>
                      </View>
                    )
                  }
                </View>
              </View>
            </View>
          </FadeInTemp>
          </View>
        }
        {(numPts > 0 && trackingMarker) &&
          <View style={styles.trackingStatus}>
            <View style={[styles.trackingGroup]}>
              <Text style={styles.trackingHeader}>{this.props.trackingHeader}</Text>
              {trackingTime !== undefined &&
                <View style={styles.trackingItem}>
                  <Text style={styles.trackingTime}>
                      {'(' + this.props.utilsSvc.timeFromSeconds(trackingTime) + ')'}
                  </Text>
                </View>
              }
            </View>
            <View style={styles.trackingItem}>
              <Text style={[styles.trackingItemValue, {color: tdTimeColor}]}>
                {this.props.utilsSvc.timeFromSeconds(Math.abs(tdTime))}
              </Text>
            </View>
            <View style={styles.trackingItem}>
              <Text style={[styles.trackingItemValue, {color: tdDistColor}]}>
                {tdDistValue}
              </Text>
              <Text style={[styles.trackingItemUnits, {color: tdDistColor}]}>
                {tdDistUnits}
              </Text>
            </View>
          </View>
        }
        {(showControls && numPts > 0) &&
          <SpeedDial
            bottom={this.props.bottom + minSDOffset + 40}
            // right={10}
            icon={triggerIcon}
            triggerValue={this.props.speedDialValue}
            selectFn={this.props.changeZoomFn}
            style={styles.speedDialTrigger}
            horizontal={true}
            iconSize="Large"
            fadeOut={0}
          />
        }
        {(showControls && logOn && this.props.useCameraFn && (numPts > 0)) &&
          <SpeedDial
            icon="Camera"
            bottom={this.props.bottom + minSDOffset + 120}
            // right={10}
            selectFn={this.callUseCameraFn}
            style={styles.speedDialTrigger}
            iconSize="Large"
            fadeOut={0}
          />
        }
        {(showControls && numPts > 0) &&
          <SpeedDial
            top={70 + HEADER_HEIGHT}
            // right={10}
            items={mapTypes}
            icon="LayersOutline"
            menuColor="transparent"
            selectFn={this.props.changeMapFn}
            style={styles.speedDialTrigger}
            itemIconsStyle={{backgroundColor: "black"}}
            horizontal={true}
            iconSize="Large"
            itemSize="Big"
            fadeOut={5000}
            autoClose={5000}
          />
        }
        {showControls && this.props.pauseFn &&
          <View style={styles.pauseButtonArea}>
            <IconButton 
              style={styles.pauseButtonStyle}
              iconSize={40}
              icon={!this.props.isPaused ? 'Pause' : 'Play'}
              color={semitransWhite_8}
              iconStyle={navIcon}
              onPressFn={this.props.pauseFn}
            />
          </View>
        }
        {showControls && (showPrev || showNext) &&
          <View style={styles.imageSelectorArea}>
            {showPrev &&
              <View style={styles.imageSelectorPrev}>
                <IconButton 
                  style={styles.imageSelectorStyle}
                  iconSize={imageSelectorWidth}
                  icon="ChevronLeft"
                  color={contrastingMask_5}
                  borderColor={navItemBorderColor}
                  iconStyle={navIcon}
                  onPressFn={this.callPrevFn}
                />
              </View>
            }
            {showNext &&
              <View style={styles.imageSelectorNext}>
                <IconButton
                  style={styles.imageSelectorStyle}
                  iconSize={imageSelectorWidth}
                  icon="ChevronRight"
                  color={contrastingMask_5}
                  borderColor={navItemBorderColor}
                  iconStyle={navIcon}
                  onPressFn={this.callNextFn}
                />
              </View>
            }
          </View>
        }
        {this.props.takeSnapshotFn &&
          <View style={[styles.footer]}>
              <RectButton
                rippleColor={rippleColor}
                style={{flex: 1}}
                onPress={() => this.props.takeSnapshotFn(undefined)}>
                <View style={[footerButton, { height: footerHeight }]}>
                  <Text
                    style={[footerButtonText, { color: primaryColor }]}
                  >
                    {canTxt}
                  </Text>
                </View>
              </RectButton>
              <RectButton
                rippleColor={rippleColor}
                style={{flex: 1}}
                onPress={() => this.takeMapSnapshot()}>
                <View style={[footerButton, { height: footerHeight }]}>
                  <Text
                    style={[footerButtonText, { color: primaryColor }]}
                  >
                    {okTxt}
                  </Text>
                </View>
              </RectButton>
            </View>
        }
      </View>
    )   
  }
}

export default TrekDisplay;

