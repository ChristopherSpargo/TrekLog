import { AppRegistry } from 'react-native';
import App from './App';
// import headlessLocationService from './headlessLocationService';
import { YellowBox } from 'react-native';

// workaround for a bogus warning you get using react-navigation
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader', 'Provider']);

AppRegistry.registerComponent('TrekLog', () => App);
// AppRegistry.registerHeadlessTask('RNLocationHeadlessService', () => headlessLocationService);