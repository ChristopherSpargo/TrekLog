import React, { useContext, useState, useEffect, useRef } from "react";
import { Location } from '@mauron85/react-native-background-geolocation';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import { RectButton } from 'react-native-gesture-handler'
import { useObserver } from "mobx-react-lite";

import {
  UiThemeContext,
  WeatherSvcContext,
  LocationSvcContext,
  TrekInfoContext,
  UtilsSvcContext,
  ToastSvcContext,
  // StorageSvcContext,
  HEADER_HEIGHT
} from "./App";
import { APP_ICONS } from "./SvgImages";
import SvgIcon from "./SvgIconComponent";
import { TrekInfo, SPEED_UNIT_CHOICES, SMALL_DIST_UNITS, DIST_UNIT_CHOICES } from "./TrekInfoModel";
import { WeatherSvc, WeatherData, WindInfo } from './WeatherSvc';
import { LocationSvc } from './LocationService';
import { UtilsSvc } from './UtilsService';
import { ToastModel } from './ToastModel';
// import { StorageSvc } from './StorageService';
import { LatLng } from "react-native-maps";
import Waiting from './WaitingComponent';

function Conditions() {

  const uiTheme: any = useContext(UiThemeContext);
  const weatherSvc: WeatherSvc  = useContext(WeatherSvcContext);
  const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const locationSvc: LocationSvc = useContext(LocationSvcContext);
  const utilsSvc: UtilsSvc = useContext(UtilsSvcContext);
  const toastSvc: ToastModel = useContext(ToastSvcContext);
  // const storageSvc: StorageSvc = useContext(StorageSvcContext);

  const [weatherReady, setWeatherReady] = useState(false);
  const weatherData = useRef<WeatherData>();
  // const [update, setUpdate] = useState(false);
  const currLocation = useRef<LatLng>();
  const elevation = useRef(0);

  useEffect(() => {
    if (!weatherReady){
      getLocation();
    }
    // if (update) {
    //   setUpdate(false);
    //   storageSvc.reportFilespaceUse();
    // }
    // return function cleanUp() { setWeatherReady(false); }
  });

  function getLocation() {
    // Get the current GPS position
    locationSvc.getCurrentLocation((location: Location) => {   
        currLocation.current = {latitude: location.latitude, longitude: location.longitude};
        locationSvc.stopGeolocation();
        getWeatherConds();
      },
      { enableHighAccuracy: true, 
        maximumAge        : 0, 
        timeout           : 30000
      }
    );
  }

  function getWeatherConds() {
    weatherSvc.getWeatherData({ type: 'W', pos: currLocation.current })
    .then((data) => {
      weatherData.current = data as WeatherData;
      utilsSvc.getPathElevations([currLocation.current], 1)
      .then((eData) => {
        elevation.current = eData.results[0].elevation;
        setWeatherReady(true);
      })
      .catch(() => {
        toastSvc.toastOpen({tType: 'Error', content: 'Error fetching information.', time: 3000});
        setWeatherReady(false);
      }) 
    })
    .catch(() => {
      toastSvc.toastOpen({tType: 'Error', content: 'Error fetching weather information.', time: 3000});
      setWeatherReady(false);
    })
  }

  // return the given temperature formatted for the measuring system (or conditions.temp if not given)
  function formattedTemp(temp ?: number) : string {
    if (temp === undefined) { temp = weatherData.current ? weatherData.current.temp : undefined }
    if (temp === undefined) { return 'N/A'; }
    return weatherSvc.formatTemperature(temp, trekInfo.measurementSystem);
  }

  // return the given humidity percentage formatted for display (or conditions.humidity if not given)
  function formattedHumidity(pct ?: number) : string {
    if (pct === undefined) { pct = weatherData.current  ? weatherData.current.humidity : undefined }
    if (pct === undefined) { return 'N/A'; }
    return pct + '%';
  }

  // return the formatted elevation for the elevation property
  function formattedElevation() {
    if (elevation.current) {
      return utilsSvc.formatDist(elevation.current, 
              SMALL_DIST_UNITS[DIST_UNIT_CHOICES[trekInfo.measurementSystem]]);
    } 
    else { return 'N/A';
    }
  }

  // return the given wind information formatted for display (or conditions.wind if not given)
  function formattedWind(part: string) : string {
    let windInfo : WindInfo = weatherData.current .wind;
    if (windInfo === undefined) { return 'N/A'; }
    switch(part){
      case 'Dir':
        return windInfo.windDir;
      case 'Speed':
        return utilsSvc.computeRoundedAvgSpeed(trekInfo.measurementSystem, windInfo.windSpeed, 1, true).toString();
      case 'Units':
        return SPEED_UNIT_CHOICES[trekInfo.measurementSystem];
      default:
        return '';
    }
  }

  // return the given conditions formatted for display
  function formattedConditions(part: string) : string {
    let str = '';

    switch(part){
      case 'City':
        str = weatherData.current.city;
        break;
      case 'Time':
        str =  utilsSvc.formatTime(weatherData.current.time * 1000);
        break;
      default:
    }
    return str;
  }

  function changeSystem() {
    trekInfo.switchMeasurementSystem();
    // setUpdate(true);
  }

  const {
    highTextColor,
    dividerColor,
    listIconColor,
    rippleColor,
    pageBackground,
    disabledTextColor,
    trekLogBlue
  } = uiTheme.palette[trekInfo.colorTheme];
  const { cardLayout } = uiTheme;
  const sortIconSize = 24;
  const sortButtonHeight = 53;

  const styles = StyleSheet.create({
    container: { ... StyleSheet.absoluteFillObject, backgroundColor: pageBackground, top: HEADER_HEIGHT },
    rowLayout: {
      flexDirection: "row",
      alignItems: "center",
    },
    sortButton: {
      paddingLeft: 5,
      minHeight: sortButtonHeight,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: pageBackground,
    },
    sortButtonArea: {
      minWidth: 80,
      minHeight: sortButtonHeight,
      justifyContent: "center",
      alignItems: "flex-end",
    },
    sortButtonTrigger: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",   
    },
    sortButtonIcon: {
      width: sortIconSize,
      height: sortIconSize,
      backgroundColor: "transparent"
    },
    sortButtonText: {
      fontSize: 18,
      marginLeft: 10,
      color: highTextColor,
    },
    sortButtonValue: {
      paddingRight: 15,
      fontSize: 20,
      color: highTextColor,
      fontWeight: "bold",
    },
    selectable: {
      color: trekLogBlue,
    },
    windText: {
      fontSize: 18,
      color: highTextColor,
      fontWeight: "bold",
    },
    windValue: {
      paddingHorizontal: 4,
      fontSize: 20,
      color: highTextColor,
      fontWeight: "bold",
    },
    city: {
      fontSize: 30,
      color: disabledTextColor,
    },
    time: {
      fontSize: 22,
      color: highTextColor,
    },
    divider: {
      flex: 1,
      marginRight: 15,
      marginLeft: 45,
      borderBottomWidth: 1,
      borderStyle: "solid",
      borderColor: dividerColor,
    },
  })

  const SortItem = ({icon, label, valueFn, selValue, div = true}) => {

    return (  
      <View>   
        {div &&
          <View style={styles.divider}/>
        }
        <View style={styles.sortButton}>
            <View style={styles.sortButtonTrigger}>
              <SvgIcon
                style={styles.sortButtonIcon}
                size={sortIconSize}
                paths={APP_ICONS[icon]}
                fill={listIconColor}
              />
              <Text style={styles.sortButtonText}>{label}</Text>
            </View>
            {selValue &&
              <RectButton
                rippleColor={rippleColor}
                onPress={changeSystem}>
                  <View style={styles.sortButtonArea}>
                    <Text style={[styles.sortButtonValue, styles.selectable]}>{valueFn()}</Text>
                  </View>
              </RectButton>
            }
            {!selValue && 
              <View>
                <Text style={styles.sortButtonValue}>{valueFn()}</Text>
              </View>
            }
          </View>
        </View>
    )
  }

  return useObserver(() => (
    <View>
      {!weatherReady && 
        <View style={{height: 400}}>
          <Waiting msg={'Obtaining weather conditions...'}/>
        </View>
      }
      <ScrollView>
        {weatherReady &&
          <View style={[cardLayout]}>
            <View style={{alignItems: "center"}}>
                <Text style={styles.city}>{formattedConditions('City')}</Text>
                <Text style={styles.time}>{formattedConditions('Time')}</Text>
            </View>
            <SortItem
              div={false}
              icon={weatherData.current.condIconId}
              label='Skies'
              valueFn={() => utilsSvc.capitalizeWords(weatherData.current.desc)}
              selValue={false}
            />
            <SortItem
              icon={weatherData.current.tempIconId}
              label='Temperature'
              valueFn={formattedTemp}
              selValue={true}
            />
            <View style={styles.divider}/>
            <View style={[styles.sortButton, {paddingRight: 15}]}>
              <View style={styles.sortButtonTrigger}>
                <SvgIcon
                  style={styles.sortButtonIcon}
                  size={sortIconSize}
                  paths={APP_ICONS[weatherData.current.windIconId]}
                  fill={listIconColor}
                />
                <Text style={styles.sortButtonText}>Wind</Text>
              </View>
              <View style={styles.rowLayout}>
                <Text style={styles.windValue}>{formattedWind('Dir')}</Text>
                <Text style={styles.windText}>at</Text>
                <Text style={styles.windValue}>{formattedWind('Speed')}</Text>
                <Text style={styles.windText}>{formattedWind('Units')}</Text>
              </View>
            </View>
            <SortItem
              icon='Humidity'
              label='Humidity'
              valueFn={formattedHumidity}
              selValue={false}
            />
            <SortItem
              icon='ElevationRise'
              label='Elevation'
              valueFn={formattedElevation}
              selValue={false}
            />
          </View>
        }
      </ScrollView>
    </View>
  ))
}

export default Conditions;