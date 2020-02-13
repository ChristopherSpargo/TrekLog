import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { observer, inject } from 'mobx-react';
import MapView, { Marker, Polyline, LatLng, Region } from 'react-native-maps';
import { RectButton } from 'react-native-gesture-handler'

import { INTERVAL_MARKER_Z_INDEX, CURRENT_POS_MARKER_Z_INDEX, INITIAL_POS_MARKER_Z_INDEX, 
         PICTURE_MARKER_Z_INDEX, MAIN_PATH_Z_INDEX, TRACKING_POS_MARKER_Z_INDEX,
         SHORT_CONTROLS_HEIGHT, CONTROLS_HEIGHT, _3D_CAMERA_PITCH,
         HEADER_HEIGHT, APP_VIEW_HEIGHT, APP_VIEW_WIDTH,
         semitransWhite_8,
         semitransWhite_5,
         semitransBlack_5,
         _2D_CAMERA_PITCH_STR,
         _3D_CAMERA_PITCH_STR,
        } from './App';
import SpeedDial, {SpeedDialItem} from './SpeedDialComponent';
import { TrekInfo, TrekPoint } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import { TrekImageSet } from './ImageService';
import { ModalModel } from './ModalModel'
import IconButton from './IconButtonComponent';
import { LoggingSvc } from './LoggingService';
import { RangeDataPathsObj, INTERVAL_AREA_HEIGHT } from './IntervalSvc';
import FadeInTemp from './FadeInTempComponent';
import TrackingStatusBar from './TrackingStatusBar';
import { MainSvc, MapType, TREK_TYPE_HIKE } from './MainSvc';

export type mapDisplayModeType = "normal" | "noControls" | "noIntervals" | "noSpeeds";

export const StdMapStyle =
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

// const TREK_ZOOM_CURRENT = 15;
// const TREK_ZOOM_STATE   =  6;
// const TREK_ZOOM_COUNTRY =  4;
// const COUNTRY_CENTER_LAT_USA = 41;
// const COUNTRY_CENTER_LNG_USA = -101;

@inject('uiTheme', 'utilsSvc', 'modalSvc', 'loggingSvc', 'mainSvc')
@observer
class TrekDisplay extends Component<{
  trek: TrekInfo,             // trek whos map is being displayed
  badPoints ?: TrekPoint[];
  displayMode: mapDisplayModeType,
  intervalMarkers ?: LatLng[],
  intervalLabelFn ?: Function,
  selectedInterval ?: number,
  selectedPath ?: LatLng[],   // path to the selected marker from the prior marker
  selectFn ?: Function,       // function to call when interval marker is selected
  layoutOpts : string,
  showControls : boolean,     // show title and controls overlay on map if true
  mapType : MapType,          // current map type (Sat/Terrain/Std)
  mapPitch : number,          // pitch angle for camera
  changeMapFn : Function,     // function to call to switch map type
  changeZoomFn : Function,    // switch between zoomed-in or out
  speedDialIcon ?: string,    // icon for speed dial trigger
  speedDialValue ?: string,   // value to return for speed dial with no items menu
  bottom ?: number,           // bottom limit for display
  markerDragFn ?: Function,   // function to call if interval marker dragged
  useCameraFn ?: Function,    // function to call if user takes picture or video while logging
  showImagesFn ?: Function,   // function to call if user taps an image marker on the map
  showImageMarkers ?: boolean, // show image markers if true or undefined
  nextFn ?: Function,         // if present, display "right" button on map and call this function when pressed
  prevFn ?: Function,         // if present, display "left" button on map and call this function when pressed
  rangeDataObj ?: RangeDataPathsObj,  // if present, show different colored PolyLine segements for path
  toggleRangeDataFn ?: Function, // fucntion to call to change the rateRange data type (speed/calories)
  trackingHeader ?: string,   // heading for tracking display
  trackingPath ?: LatLng[],
  trackingMarker ?: TrekPoint,
  pathToCurrent : TrekPoint[], // path for polyLine to current trek position
  pathLength : number,          // number of points in pathToCurrent
  trackingDiffDist ?: number,
  trackingDiffDistStr ?: string,
  trackingDiffTime ?: number,
  trackingDiffTimeStr ?: string,
  trackingTime ?: string,     // elapsed tracking time (hh:mm:ss)
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
  mainSvc ?: MainSvc,
  loggingSvc ?: LoggingSvc,
  }, {} > {

  mS = this.props.mainSvc;
  mapViewRef;
  mode = this.props.layoutOpts;
  markerRefs;
  selectedMarker = -1;
  updates = 0;
  eMsg = '';
  currentImageSet : TrekImageSet;
  currentImageSetIndex : number;
  backgroundTimeoutID : number;


  initRegionLatDelta = 0.090;     // amount of latitude to show on initial map render
  initRegionLngDelta = 0.072;     // amount of longitude to show on initial map render

  currRegionLatDelta = this.props.trek.type === TREK_TYPE_HIKE ? 0.05 : 0.015;
  currRegionLngDelta = this.props.trek.type === TREK_TYPE_HIKE ? 0.04 : 0.01211;
  currCameraZoom = this.props.trek.type === TREK_TYPE_HIKE ? 14 : 15;

  currRegion : any = {
    latitude: 34,
    longitude: -112,
    latitudeDelta: this.currRegionLatDelta,
    longitudeDelta: this.currRegionLngDelta
  }

  renderCount = 0;

  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps){
    if (prevProps.mapType !== this.props.mapType){ 
      this.forceUpdate();
    }
    if (prevProps.mapPitch !== this.props.mapPitch){
      this.resetPitch();
    }
    // check need to recenter the map if watching current position
    if (this.mode === 'Current' && this.props.pathToCurrent.length && this.mapViewRef) {
      let minY = this.props.mapPitch === _3D_CAMERA_PITCH ? 120 : 80;
      let p = this.props.pathToCurrent[this.props.pathToCurrent.length- 1];
      this.mapViewRef.pointForCoordinate({latitude: p.l.a, longitude: p.l.o})
      .then((pt) => {
        if (pt.x < 20 || pt.y < minY || pt.x > APP_VIEW_WIDTH - 20 || pt.y > APP_VIEW_HEIGHT - 80){
          this.mapViewRef.animateCamera({center: {latitude: p.l.a, longitude: p.l.o}}, 
            {duration: 500});
        }
      })
      .catch((err) => alert(err))
    }
    if (this.mode !== this.props.layoutOpts ){ 
        this.mode = this.props.layoutOpts;
      this.setLayout();
    }

    // this next section is for when intervals are being dispalyed
    if (((this.props.selectedInterval !== undefined) && 
         (this.selectedMarker !== this.props.selectedInterval)) || 
        prevProps.showControls !== this.props.showControls) {
      this.selectedMarker = this.props.selectedInterval;
      if (this.selectedMarker >= 0) {
        if (this.markerRefs) { this.markerRefs[this.selectedMarker].showCallout(); }
        // mode will be 'Interval' if user is zoomed-in on this interval path
        if (this.mode === 'Interval') {
          if (this.mapViewRef) { 
            let topPad = this.props.showControls ? 200 : 50;
            let bottomPad = (this.props.rangeDataObj && this.props.showControls) ? 200 : 50;
            this.mapViewRef.fitToCoordinates(this.props.selectedPath,
                    {edgePadding: {top: topPad, right: 50, bottom: bottomPad, left: 50}, animated: true});
            this.resetPitch(1500);
          }
        } 
        // otherwise just center map at interval marker
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
    this.mS.setShowMapControls(!this.mS.showMapControls);
  }

  // this happens when user moves map or program follows Current position
  regionChangeDone = (r: Region) => {
    if (this.mode !== 'Open') {
      this.currRegion.latitude        = r.latitude;
      this.currRegion.longitude       = r.longitude;
      // this.currRegion.latitudeDelta   = r.latitudeDelta;
      // this.currRegion.longitudeDelta  = r.longitudeDelta;

    }
  }

  // this happens when user moves the map
  regionChange = (r: Region) => {
    if (this.mode === 'Open') {
      this.currRegion.latitude        = r.latitude;
      this.currRegion.longitude       = r.longitude;
      // this.currRegion.latitudeDelta   = r.latitudeDelta;
      // this.currRegion.longitudeDelta  = r.longitudeDelta;

    }
  }

  // User moved the map
  mapMoved = () => {
    if ((this.mode !== 'Open')) {
      this.mode = 'Open';
      this.props.changeZoomFn(this.mode);     // stop following current position        
    }
  }

  // set the camera center to the given point
  resetCameraCenter = (point: TrekPoint) => {
    if (point){
      this.currRegion.latitude        = point.l.a;
      this.currRegion.longitude       = point.l.o;
      // this.currRegion.latitudeDelta   = this.currRegionLatDelta;
      // this.currRegion.longitudeDelta  = this.currRegionLngDelta;
    }
  }

  // set the pitch angle of the camera
  resetPitch = (delay = 200) => {
    setTimeout(() => {
      if(this.mapViewRef){
        this.mapViewRef.animateCamera({ pitch: this.props.mapPitch }, {duration: 500});
      }
    }, delay)
  }

  // change the focus or zoom level on the map
  layoutMap = ( path: LatLng[]) => {
    let log = this.props.timerType === 'Log';
    let topPadding = (log && this.props.trackingHeader) ? 455 : 170;
    let bPadding = (this.props.rangeDataObj ||
                    this.props.takeSnapshotFn || 
                    log) ? 175 : 40;
    switch(this.mode){
      case 'All':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: topPadding, right: 50, 
                                                         bottom: bPadding, left: 50}, 
                                          animated: false});
          this.resetPitch();
        }
        break;
      case 'Interval':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: topPadding, right: 50, 
                                           bottom: 50, left: 50}, animated: false});
          this.resetPitch();
        }
        break;
      case 'Current':
      case 'NewAll':        
      case 'Start':
        if (this.mapViewRef) { 
          this.mapViewRef.animateCamera(
            {center: {latitude: this.currRegion.latitude, longitude: this.currRegion.longitude},
             zoom: this.currCameraZoom,
             pitch: this.props.mapPitch
            },
            {duration: 1000});
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

  markerDragEnd = (index, path, pointList, event) => {
    if(this.props.markerDragFn){
      this.props.markerDragFn(index, event.nativeEvent.coordinate, path, pointList);
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

  takeMapSnapshot () {
    if(this.mapViewRef){      
      const snapshot = this.mapViewRef.takeSnapshot({
        format: 'jpg',   // image formats: 'png', 'jpg' (default: 'png')
        quality: .1,
        result: 'file'   // result types: 'file', 'base64' (default: 'file')
      });
      snapshot.then((uri) => {
        this.props.takeSnapshotFn(uri);
      });
    }
  }  
  
  render () {
    const { trekLogYellow, highTextColor, secondaryColor, matchingMask_8,
            pageBackground, pathColor, 
            locationRadiusBorder, intervalMarkerBorderColor, intervalMarkerBackgroundColor,
            trackingMarkerRadiusBorder, trackingMarkerPathColor, dividerColor,
            primaryColor, rippleColor, footerButtonText,
          } = this.props.uiTheme.palette[this.mS.colorTheme];
    const { fontRegular, fontBold, navIcon, footerButton } = this.props.uiTheme;
    const path = this.props.utilsSvc.cvtPointListToLatLng(this.props.pathToCurrent); // copy just the LaLo data
    const numPts = this.props.pathLength;
    const selection = (this.props.selectedInterval !== undefined || this.props.selectedInterval !== -1) 
                          ? this.props.selectedInterval : 0;
    const markers = this.props.intervalMarkers;
    const mType = this.props.mapType;
    const triggerIcon = this.props.speedDialIcon || "Location";
    const radiusBg = "rgba(18, 46, 59, .5)";
    const trekImages = this.props.trek.trekImages && (this.props.trek.trekImages.length !== 0);
    const showImgMarkers = trekImages && 
          (this.props.showImageMarkers === undefined || this.props.showImageMarkers === true);
    const imageMarkerIconSize = 10;
    const imageMarkerSize = 18;
    const intervalMarkerSize = 20;
    const imageSelectorWidth = 50;
    const imageSelectorBorderColor = semitransBlack_5;
    const selectedIntervalColor = '#660000';//trekLogOrange; //'rgba(255, 167, 38,.8)';  //"#ff704d";
    const showNext = this.props.nextFn !== undefined;
    const showPrev = this.props.prevFn !== undefined;
    const minSDOffset = (this.props.bottom !== 0) ? 5 : SHORT_CONTROLS_HEIGHT;
    const showControls = this.props.showControls && !this.props.takeSnapshotFn;
    const rangesObj = this.props.rangeDataObj;
    const trackingMarker = this.props.trackingMarker;
    const logOn = this.props.timerType === 'Log';
    const replayOn = this.props.timerType === 'Play';
    const startMarkerColor = 'green';
    const currMarkerColor = (logOn || replayOn) ? trekLogYellow : "red";
    const [okPrompt, okCourse] = this.props.snapshotPrompt ? this.props.snapshotPrompt.split('\n') 
                                                           : ['',''];
    const canTxt = 'CANCEL';
    const footerHeight = CONTROLS_HEIGHT;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      map: { ...StyleSheet.absoluteFillObject, bottom: this.props.bottom },
      markerRadius: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
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
        borderWidth: 1,
        borderColor: trackingMarkerRadiusBorder,
        backgroundColor: radiusBg,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      },
      marker: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderRadius: 5,
        borderColor: "white",
        backgroundColor: startMarkerColor,
        overflow: "hidden"
      },
      currMarker: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderRadius: 5,
        borderColor: "white",
        backgroundColor: currMarkerColor,
        overflow: "hidden"
      },
      trackingMarker: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderRadius: 5,
        borderColor: "white",
        backgroundColor: "blue",
        overflow: "hidden"
      },
      intervalMarker: {
        width: intervalMarkerSize,
        height: intervalMarkerSize,
        borderWidth: 1,
        borderRadius: intervalMarkerSize/2,
        borderColor: intervalMarkerBorderColor,
        backgroundColor: intervalMarkerBackgroundColor,
        justifyContent: "center",
        alignItems: "center",
      },
      selected: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderColor: selectedIntervalColor,
      },
      finalBg: {
        backgroundColor: "red"
      },
      selectedText: {
        fontSize: 13,
        fontFamily: fontBold,
      },
      intervalTxt: {
        fontSize: 11,
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
        width: imageMarkerSize,
        height: imageMarkerSize,
        borderWidth: 2,
        borderRadius: imageMarkerSize/2,
        borderColor: 'firebrick',
        backgroundColor: pageBackground,
        justifyContent: "center",
        alignItems: "center",
      },
      imageSelectorArea: {
        position: "absolute",
        top: 150,
        left: 0,
        right: 0,
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
        backgroundColor: semitransWhite_8, 
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
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: 'black',
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
            onDragEnd={index !== last ? 
                       this.markerDragEnd.bind(this, index, path, this.props.pathToCurrent) : undefined}
            onPress={() => props.selectFn(index)}
          >
            {index !== last &&
              <View style={[styles.intervalMarker, props.selection === index ? styles.selected : {}]}>
                <Text style={[styles.intervalTxt,
                              props.selection === index ? styles.selectedText : {}]}>{index + 1}</Text>
              </View>
            }
            {index === last &&
              <View style={styles.markerRadius}>
                <View style={[styles.intervalMarker, props.selection === index ? styles.selected : {}, styles.finalBg]}>
                  <Text style={styles.intervalTxt}>{index + 1}</Text>
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

    const BadPts = (props: any) => {
      return (
        props.points.map((item, index) => {
          return (
          <Marker
            zIndex={PICTURE_MARKER_Z_INDEX}
            key={index}
            anchor={{x: 0.5, y: 0.5}}
            coordinate={{latitude: item.l.a, longitude: item.l.o}}
            tracksViewChanges={false}
          >
            <View style={[styles.marker, {backgroundColor: 'black'}]}/>
          </Marker>
      )})
    )}

    const  mapTypes : SpeedDialItem[] = 
              [ {icon: this.props.mapPitch === _3D_CAMERA_PITCH ? 'TwoInBox' : 'ThreeInBox', 
                 value: this.props.mapPitch === _3D_CAMERA_PITCH ? 
                                                _2D_CAMERA_PITCH_STR : _3D_CAMERA_PITCH_STR},
                {icon: 'Orbit', value: 'hybrid'},
                {icon: 'Landscape', value: 'terrain'},
                {icon: 'Highway', value: 'standard'}
              ];


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
                  initialCamera={{center: {latitude: path[numPts-1].latitude,
                    longitude: path[numPts-1].longitude},
                    pitch: this.props.mapPitch,
                    heading: 0,
                    altitude: 0,
                    zoom: this.currCameraZoom,}
                  }
                  mapType={mType}
                  customMapStyle={StdMapStyle}
              >
                {(trackingMarker) &&
                  <Marker
                    zIndex={TRACKING_POS_MARKER_Z_INDEX}
                    anchor={{x: 0.5, y: 0.5}}
                    tracksViewChanges={false}
                    coordinate={{latitude: trackingMarker.l.a, longitude: trackingMarker.l.o}}
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
                    strokeWidth={7}
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
                    draggable={(trackingMarker && this.props.trekMarkerDragFn) ? true : undefined}
                    onDragEnd={(event) => this.props.trekMarkerDragFn(event.nativeEvent.coordinate)}
                  >
                    <View style={[styles.markerRadius, {borderColor: "#99c2ff"}]}>
                      <View style={styles.currMarker}/>
                    </View>
                  </Marker>
                }
                {((numPts > 1) && markers) &&
                  <Polyline
                    coordinates={this.props.selectedPath}
                    strokeColor={selectedIntervalColor}
                    strokeWidth={7}
                  />
                }
                {(numPts > 1 && !rangesObj) &&
                  <Polyline
                    zIndex={MAIN_PATH_Z_INDEX}
                    coordinates={path}
                    strokeColor={pathColor}
                    strokeWidth={3}
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
                      strokeWidth={3}
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
                {((numPts > 0) && showImgMarkers) &&
                  <Images 
                    images={this.props.trek.trekImages}
                    imageCount={this.props.trek.trekImageCount}
                  />
                }
                {((numPts > 0) && this.props.badPoints !== undefined) &&
                  <BadPts 
                    points={this.props.badPoints}
                  />
                }
              </MapView>
            }
            <View style={styles.menuTouchArea}/>
            {(showControls && numPts > 0 && this.props.rangeDataObj) &&
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
            {(numPts > 0 && this.props.trackingTime) &&
              <TrackingStatusBar
                colorTheme={this.mS.colorTheme}
                trackingHeader={this.props.trackingHeader}
                headerLeft={!logOn}
                trackingDiffDist={this.props.trackingDiffDist}
                trackingDiffDistStr={this.props.trackingDiffDistStr}
                trackingDiffTime={this.props.trackingDiffTime}
                trackingDiffTimeStr={this.props.trackingDiffTimeStr}
                trackingTime={this.props.trackingTime}
                barTop={logOn ? CONTROLS_HEIGHT : 0}
                logOn={logOn}
              />
            }
            {(showControls && numPts > 0) &&
              <SpeedDial
                bottom={this.props.bottom + minSDOffset + 60}
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
                top={HEADER_HEIGHT + 10}
                items={mapTypes}
                icon="LayersOutline"
                menuColor="transparent"
                selectFn={this.props.changeMapFn}
                style={styles.speedDialTrigger}
                itemIconsStyle={{backgroundColor: 'white', borderColor: 'black'}}
                horizontal={true}
                iconSize="Large"
                itemSize="Big"
                fadeOut={5000}
                autoClose={5000}
              />
            }
            {this.props.pauseFn &&
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
                      color={"black"}
                      borderColor={imageSelectorBorderColor}
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
                      color={"black"}
                      borderColor={imageSelectorBorderColor}
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
                      <Text style={[footerButtonText, { color: primaryColor }]}>
                        {okPrompt}
                      </Text>
                      <Text style={[footerButtonText, { color: primaryColor }]}>
                        {okCourse}
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

