import { Alert } from 'react-native';
import BackgroundGeolocation, { ConfigureOptions } from '@mauron85/react-native-background-geolocation';

import { TrekInfo } from './TrekInfoModel'
import { StorageSvc } from './StorageService';

const GPS_EVENT_INTERVAL = 1;       // seconds betweed geolocation reports

export class LocationSvc {

  constructor ( private trekInfo: TrekInfo,  private storageSvc: StorageSvc ) {
  }

  geolocationIsRunning = false;

  startGeoLocation = (gotLocation: Function, startFresh: boolean, configOptions: ConfigureOptions) => {

    this.setGeolocationConfig(configOptions);
  
    // if(this.geolocationIsRunning){ return; }
  
    // geolocation has started
    BackgroundGeolocation.on('start', () => {
      this.geolocationIsRunning = true;
    });
  
    // geolocation has stopped
    BackgroundGeolocation.on('stop', () => {
      this.geolocationIsRunning = false;
    });
  
    // status of authorization update
    BackgroundGeolocation.on('authorization', status => {
      if (status !== BackgroundGeolocation.AUTHORIZED) {
        // we need to set delay after permission prompt or otherwise alert will not be shown
        setTimeout(() =>
          Alert.alert(
            'App requires location tracking',
            'Would you like to open app settings?',
            [
              {
                text: 'Yes',
                onPress: () => BackgroundGeolocation.showAppSettings()
              },
              {
                text: 'No',
                onPress: () => console.log('No Pressed'),
                style: 'cancel'
              }
            ]
        ), 2000);
      }
    });
  
    // got some sort of error
    BackgroundGeolocation.on('error', ({ message }) => {
      Alert.alert('BackgroundGeolocation error', message);
    });
  
    // got a moving location reading
    BackgroundGeolocation.on('location', location => {
      BackgroundGeolocation.startTask(taskKey => {
        gotLocation(location);
        BackgroundGeolocation.endTask(taskKey);
      });
    });
  
    // got a stationary location reading
    BackgroundGeolocation.on('stationary', (location) => {
      BackgroundGeolocation.startTask(taskKey => {
        gotLocation(location);
        BackgroundGeolocation.endTask(taskKey);
      });
    });
  
    // TrekLog has entered the foreground
    BackgroundGeolocation.on('foreground', () => {
   });
  
    // TrekLog has entered the background
    BackgroundGeolocation.on('background', () => {
      BackgroundGeolocation.startTask(taskKey => {
        if (this.trekInfo.timerOn || this.trekInfo.pendingReview){
          this.storageSvc.storeRestoreObj(this.trekInfo.getRestoreObject());
        }
        BackgroundGeolocation.endTask(taskKey);
      });
    });
  
    // Try to start the service
    BackgroundGeolocation.checkStatus(({ locationServicesEnabled, authorization }) => {
  
      // if(!isRunning){
        if (!locationServicesEnabled) {
          Alert.alert(
            'Location services disabled',
            'Would you like to open location settings?',
            [
              {
                text: 'Yes',
                onPress: () => BackgroundGeolocation.showLocationSettings()
              },
              {
                text: 'No',
                onPress: () => console.log('No Pressed'),
                style: 'cancel'
              }
            ]
          );
        }
        else {
          if ([0,1,2].indexOf(authorization) === -1) {
            // authorization yet to be determined
            BackgroundGeolocation.start();
            if (startFresh) { BackgroundGeolocation.deleteAllLocations(); }
          } else if (authorization == BackgroundGeolocation.AUTHORIZED) {
            // calling start will also ask user for permission if needed
            // permission error will be handled in permisision_denied event
            BackgroundGeolocation.start();
            if (startFresh) { BackgroundGeolocation.deleteAllLocations(); }
          } else {
            Alert.alert(
              'App requires location tracking',
              'Please grant permission',
              [
                {
                  text: 'Ok',
                  onPress: () => BackgroundGeolocation.start()
                }
              ]
            );
          }
        }
    });
  
    // BackgroundGeolocation.checkStatus(({ isRunning }) => {
    //   this.geolocationIsRunning = isRunning;
    // });
  
  }
  
  // update the configuration options for BackgroundGeolocation
  setGeolocationConfig = (configOptions: ConfigureOptions) => {
    let options : ConfigureOptions = {
      desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
      locationProvider: BackgroundGeolocation.RAW_PROVIDER,
      stationaryRadius: 0,
      stopOnStillActivity: false,
      distanceFilter: 3,
      interval: GPS_EVENT_INTERVAL * 1000,
      fastestInterval: GPS_EVENT_INTERVAL * 1000 / 2,
      activitiesInterval: GPS_EVENT_INTERVAL * 1000,
      startForeground: true,
      debug: false,
      stopOnTerminate: true,
    }
    let finalOptions : ConfigureOptions;
  
    finalOptions =  Object.assign({}, options, configOptions);
    // Alert.alert('Settings:', JSON.stringify(finalOptions))
    this.updateGeolocationConfig(finalOptions);
  }
  
  // get the current location
  getCurrentLocation = (gotLocation: Function, gclOptions) => {
    BackgroundGeolocation.getCurrentLocation(location => {
      gotLocation(location );
      }, () => {
        // setTimeout(() => {
        //   Alert.alert('Error obtaining current location', JSON.stringify(error));
        // }, 100);
      }, gclOptions);
  }
  
  // pause or resume geolocation service
  pauseGeolocation = (pause: boolean) => {
    if (pause) {
      BackgroundGeolocation.stop();
    } else {
      BackgroundGeolocation.start();
    }
  }

  // stop the geolocation service
  stopGeolocation() {
    this.geolocationIsRunning = false;
    this.removeGeolocationListeners();
    BackgroundGeolocation.stop();
  }

  // stop the geolocation and allow it to stop if the app is terminated
  shutDownGeolocation = () => {
    this.setGeolocationConfig({stopOnTerminate: true});
    this.stopGeolocation();
  }
  
  // remove all geolocation event listeners
  removeGeolocationListeners = () => {
    BackgroundGeolocation.removeAllListeners();
  }
  
  // update the distanceFilter property of the geolocation configuration
  updateGeolocationConfig = (options: any) => {
    BackgroundGeolocation.configure(options);
  }
  
  getGeolocationConfig = () => {
    BackgroundGeolocation.getConfig((config => alert(JSON.stringify(config,null,2))))
  }
  
}

