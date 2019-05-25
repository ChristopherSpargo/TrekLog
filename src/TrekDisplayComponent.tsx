import React from 'react';
import { Component } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import MapView, { Marker, Polyline, LatLng, Region } from 'react-native-maps';

import { INTERVAL_MARKER_Z_INDEX, CURRENT_POS_MARKER_Z_INDEX, INITIAL_POS_MARKER_Z_INDEX, 
         PICTURE_MARKER_Z_INDEX, 
         SHORT_CONTROLS_HEIGHT,
         HEADER_HEIGHT,
        } from './App';
import SpeedDial, {SpeedDialItem} from './SpeedDialComponent';
import { TrekInfo, MapType, TrekPoint, TrekImageSet } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import SvgIcon from './SvgIconComponent';
import { APP_ICONS } from './SvgImages';
import { ModalModel } from './ModalModel'
import IconButton from './IconButtonComponent';
import { LoggingSvc } from './LoggingService';

// const TREK_ZOOM_CURRENT = 15;
// const TREK_ZOOM_STATE   =  6;
// const TREK_ZOOM_COUNTRY =  4;
const COUNTRY_CENTER_LAT_USA = 41;
const COUNTRY_CENTER_LNG_USA = -101;

@inject('trekInfo', 'uiTheme', 'utilsSvc', 'modalSvc', 'loggingSvc')
@observer
class TrekDisplay extends Component<{
  intervalMarkers ?: LatLng[],
  intervalLabelFn ?: Function,
  selectedInterval ?: number,
  selectedPath ?: LatLng[],
  selectFn ?: Function,
  layoutOpts : string,
  mapType : MapType,
  changeMapFn : Function,
  changeZoomFn : Function,
  speedDialIcon ?: string,    // icon for speed dial trigger
  speedDialValue ?: string,   // value to return for speed dial with no items menu
  bottom ?: number,
  markerDragFn ?: Function,
  useCameraFn ?: Function,    // function to call if user takes picture or video while logging
  showImagesFn ?: Function,   // function to call if user taps an image marker on the map
  nextFn ?: Function,         // if present, display "right" button on map and call this function when pressed
  prevFn ?: Function,         // if present, display "left" button on map and call this function when pressed
  uiTheme ?: any,
  utilsSvc ?: UtilsSvc,
  modalSvc ?: ModalModel,
  trekInfo ?: TrekInfo,
  loggingSvc ?: LoggingSvc,
  }, {} > {


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
          "color": "#646464"
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

  lightThemeMapStyle = 
  [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#ebe3cd"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#523735"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#f5f1e6"
        }
      ]
    },
    {
      "featureType": "administrative",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#c9b2a6"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#dcd2be"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#ae9e90"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#dfd2ae"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#dfd2ae"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#93817c"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#a5b076"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#447530"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#f5f1e6"
        }
      ]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#fdfcf8"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#f8c967"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#e9bc62"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#e98d58"
        }
      ]
    },
    {
      "featureType": "road.highway.controlled_access",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#db8555"
        }
      ]
    },
    {
      "featureType": "road.local",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#806b63"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#dfd2ae"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#8f7d77"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#ebe3cd"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#dfd2ae"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#b9d3c2"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#92998d"
        }
      ]
    }
  ];

  darkThemeMapStyle = [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#8ec3b9"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1a3646"
        }
      ]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#64779e"
        }
      ]
    },
    {
      "featureType": "administrative.province",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#334e87"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#6f9ba5"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#3C7680"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#466cb9" //"#304a7d"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#c8d3ea" //"#98a5be"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#2c6675"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#255763"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#b0d5ce"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#98a5be"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#3a4762"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#0e1626"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#4e6d70"
        }
      ]
    }
  ];

  // propCamera : Camera = {
  //   center: {latitude: COUNTRY_CENTER_LAT_USA, longitude: COUNTRY_CENTER_LNG_USA},
  //   heading: 0, pitch: 0, altitude: 0,
  //   zoom: TREK_ZOOM_CURRENT
  // };

  currRegion : any = {
    latitude: 34,
    longitude: -112,
    latitudeDelta: 0.015,
    longitudeDelta: 0.01211
  }
  // currCamera : Camera;


  constructor(props) {
    super(props);
    this.setShowMapControls(true);
  }
  // shouldComponentUpdate(){
  //   return this.props.trekInfo.updateMap;
  // }

  // componentWillMount() {
  //   this.currCamera = this.propCamera;
  //   this.currCamera.center = this.propCamera.center;
  // }

  // componentDidMount() {
  //   if(this.mapViewRef){
  //     this.mapViewRef.setCamera(this.propCamera);
  //   }
  // }

  componentDidUpdate(prevProps){
    if (prevProps.mapType !== this.props.mapType){ 
      this.forceUpdate();
    }
    if (this.mode !== this.props.layoutOpts) {
      this.mode = this.props.layoutOpts;
      this.setLayout();
    }
    if ((this.props.selectedInterval !== undefined) && (this.selectedMarker !== this.props.selectedInterval)) {
      this.selectedMarker = this.props.selectedInterval;
      if (this.selectedMarker >= 0) {
        if (this.markerRefs) { this.markerRefs[this.selectedMarker].showCallout(); }
        if (this.mode === 'Interval') {
          if (this.mapViewRef) { 
            this.mapViewRef.fitToCoordinates(this.props.selectedPath,
                    {edgePadding: {top: 200, right: 250, bottom: 200, left: 100}, animated: false});
          }
        } 
        else {
          if (this.mapViewRef) { 
            this.mapViewRef.animateCamera({center: this.props.intervalMarkers[this.selectedMarker]}, 
                                        {duration: 300});
          }
        }
      }
    }
  }

  @action
  setShowMapControls = (status: boolean) => {
    this.tInfo.showMapControls = status;
  }

  toggleShowMapControls = () => {
    this.setShowMapControls(!this.tInfo.showMapControls);
  }

  // this happens when user moves map or program follows Current position
  regionChangeDone = (r: Region) => {
    if (this.mode !== 'Open') {
      // this.currCamera.center.latitude = r.latitude;
      // this.currCamera.center.longitude = r.longitude;
      this.currRegion.latitude        = r.latitude;
      this.currRegion.longitude       = r.longitude;
      this.currRegion.latitudeDelta   = r.latitudeDelta;
      this.currRegion.longitudeDelta  = r.longitudeDelta;

    }
  }

  // this happens when user moves the map
  regionChange = (r: Region) => {
    if (this.mode === 'Open') {
      // this.currCamera.center.latitude = r.latitude;
      // this.currCamera.center.longitude = r.longitude;
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
    // this.currCamera.center.latitude = point.l.a;
    // this.currCamera.center.longitude = point.l.o;
    // this.currCamera.zoom = TREK_ZOOM_CURRENT;
    if (point){
      this.currRegion.latitude        = point.l.a;
      this.currRegion.longitude       = point.l.o;
      this.currRegion.latitudeDelta   = 0.015;
      this.currRegion.longitudeDelta  = 0.01211;
    }
  }

  // change the focus or zoom level on the map
  layoutMap = ( path: LatLng[]) => {
    switch(this.mode){
      case 'All':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: 250, right: 200, bottom: 250, left: 50}, 
                                          animated: false});
        }
        break;
      case 'Interval':
        if (this.mapViewRef) { 
          this.mapViewRef.fitToCoordinates(path,
                                          {edgePadding: {top: 200, right: 200, bottom: 200, left: 50}, 
                                          animated: false});
        }
        break;
      case 'NewAll':        
      case 'Current':
      case 'Start':
        if (this.mapViewRef) { 
          this.mapViewRef.animateToRegion(this.props.utilsSvc.copyObj(this.currRegion), 10);
        }
      // this.mapViewRef.animateToRegion(Object.assign({}, this.currRegion, 10));
      // this.mapViewRef.animateCamera(this.currCamera, {duration: 100});
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
    switch(this.mode){
      case 'All':
        path = this.tInfo.pointList.map((pt) =>
            { return {latitude: pt.l.a, longitude: pt.l.o}; }); // copy just the LatLng data
        break;
      case 'Current':
      case 'NewAll':
        this.resetCameraCenter(this.tInfo.pointList[this.tInfo.trekPointCount - 1]);
        break;
      case 'Start':
        this.resetCameraCenter(this.tInfo.pointList[0]);
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

  // call the function to set the map focus point/area (Current/Start/All)
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
  
  render () {
    const tInfo = this.tInfo;
    // tInfo.setUpdateMap(false);
    const { trekLogYellow, highTextColor, trekLogOrange, secondaryColor, matchingMask_5,
            matchingMask_3, contrastingMask_5, pageBackground, pathColor, navItemBorderColor, 
            locationRadiusBorder, intervalMarkerBorderColor, intervalMarkerBackgroundColor
          } = this.props.uiTheme.palette[this.tInfo.colorTheme];
    const { navIcon } = this.props.uiTheme;
    const path = tInfo.pointList.map((pt) =>
          { return {latitude: pt.l.a, longitude: pt.l.o}; }); // copy just the LaLo data
    const numPts = tInfo.trekPointCount;
    const selection = (this.props.selectedInterval !== undefined || this.props.selectedInterval !== -1) 
                          ? this.props.selectedInterval : 0;
    const markers = this.props.intervalMarkers;
    const themeMap = this.props.mapType === 'theme' as MapType;
    const mType : MapType = themeMap ? 'standard' : this.props.mapType;
    const haveLocation = tInfo.initialLoc !== undefined;
    const triggerIcon = this.props.speedDialIcon || "Location";
    const radiusBg = "rgba(18, 46, 59, .5)";
    const trekImages = this.tInfo.trekImageCount !== 0;
    const imageMarkerIconSize = 18;
    const imageSelectorWidth = 50;
    const selectedIntervalColor = trekLogOrange; //'rgba(255, 167, 38,.8)';  //"#ff704d";
    const showNext = this.props.nextFn !== undefined;
    const showPrev = this.props.prevFn !== undefined;
    const minSDOffset = (this.props.bottom !== 0) ? 5 : SHORT_CONTROLS_HEIGHT;
    const showControls = this.tInfo.showMapControls;

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
      marker: {
        width: 14,
        height: 14,
        borderWidth: 2,
        borderRadius: 7,
        borderColor: "white",
        backgroundColor: "green",
        overflow: "hidden"
      },
      bgEnd: {
        backgroundColor: "red",
        zIndex: CURRENT_POS_MARKER_Z_INDEX,
      },
      bgMoving: {
        backgroundColor: trekLogYellow,
        zIndex: CURRENT_POS_MARKER_Z_INDEX,
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
        fontSize: 10,
        color: "white",
      },
      speedDialTrigger: {
        // backgroundColor: "rgba(255, 245, 157, .6)",
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
            onPress={() => {
                // this.selectedMarker = index;
                props.selectFn(index);
              }
            }
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

    const  mapTypes : SpeedDialItem[] = 
                       [ {icon: 'Orbit', label: 'Satellite', value: 'hybrid'},
                          {icon: 'Landscape', label: 'Terrain', value: 'terrain'},
                          {icon: 'Highway', label: 'Standard', value: 'standard'}];
                          // {icon: 'YinYang', label: 'Theme', value: 'theme'}];

    // in Current mode, keep camera centered on current trek position
    // if (numPts > 0 && (this.mode === 'Current')) {
    //   this.currCamera.center.latitude =  path[numPts-1].latitude;
    //   this.currCamera.center.longitude = path[numPts-1].longitude;
    //   if (this.mapViewRef) {this.mapViewRef.setCamera(this.currCamera);}
    // }

    // // if logging hasn't started, center the camera on the user's general location (or country)
    // if (numPts === 0) {
    //   this.currCamera.center.latitude = haveLocation ? tInfo.initialLoc.latitude : COUNTRY_CENTER_LAT_USA;
    //   this.currCamera.center.longitude= haveLocation ? tInfo.initialLoc.longitude : COUNTRY_CENTER_LNG_USA;
    //   this.currCamera.zoom = haveLocation ? TREK_ZOOM_STATE : TREK_ZOOM_COUNTRY;
    //   if (this.mapViewRef) {this.mapViewRef.setCamera(this.currCamera);}
    // } 
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
              // camera={this.mode === 'Current' ? this.propCamera : undefined}
              // camera={this.propCamera}
              region={this.mode === 'Current' ? 
                { latitude: path[numPts-1].latitude,
                  longitude: path[numPts-1].longitude,
                  latitudeDelta: this.currRegion.latitudeDelta,
                  longitudeDelta: this.currRegion.longitudeDelta
                } : undefined}
              mapType={mType}
              // customMapStyle={themeMap ? (tInfo.colorTheme === COLOR_THEME_DARK ? 
              //                 this.darkThemeMapStyle : 
              //                 this.lightThemeMapStyle) : this.stdMapStyle}
              customMapStyle={this.stdMapStyle}
>
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
                >
                  <View style={styles.markerRadius}>
                    <View style={[styles.marker, tInfo.timerOn ? styles.bgMoving : styles.bgEnd]}/>
                  </View>
                </Marker>
              }
              {((numPts > 1) && markers) &&
                <Polyline
                  coordinates={this.props.selectedPath}
                  strokeColor={selectedIntervalColor}
                  strokeWidth={9}
                />
              }
              {(numPts > 1) &&
                <Polyline
                  zIndex={INTERVAL_MARKER_Z_INDEX}
                  coordinates={path}
                  strokeColor={pathColor}
                  strokeWidth={3}
                />
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
            </MapView>
        }
        {(numPts === 0) && 
          <MapView            // Map to show when waiting for START command
            style={styles.map}
            // camera={ this.propCamera }
            region={{
              latitude: haveLocation ? tInfo.initialLoc.latitude : COUNTRY_CENTER_LAT_USA,
              longitude: haveLocation ? tInfo.initialLoc.longitude : COUNTRY_CENTER_LNG_USA,
              latitudeDelta: haveLocation ? 10: 20,
              longitudeDelta: haveLocation ? 10 : 20,
            }}

          />
        }
        {(showControls && numPts > 0) &&
          <SpeedDial
            bottom={this.props.bottom + minSDOffset }
            icon={triggerIcon}
            triggerValue={this.props.speedDialValue}
            selectFn={this.props.changeZoomFn}
            style={styles.speedDialTrigger}
            horizontal={true}
            iconSize="Large"
          />
        }
        {(showControls && this.tInfo.logging && this.props.useCameraFn && (numPts > 0)) &&
          <SpeedDial
            icon="Camera"
            bottom={this.props.bottom + minSDOffset + 80}
            selectFn={this.callUseCameraFn}
            style={styles.speedDialTrigger}
            iconSize="Large"
          />
        }
        {(showControls && numPts > 0) &&
          <SpeedDial
            top={25 + HEADER_HEIGHT}
            items={mapTypes}
            icon="LayersOutline"
            selectFn={this.props.changeMapFn}
            style={styles.speedDialTrigger}
            horizontal={true}
            iconSize="Large"
            itemSize="Big"
          />
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
      </View>
    )   
  }
}

export default TrekDisplay;

