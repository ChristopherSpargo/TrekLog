import { AppRegistry } from 'react-native';
import App from './App';

// workaround for a bogus warning you get using react-navigation
import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings(['Warning: isMounted(...) is deprecated', 'Module RCTImageLoader', 'Provider']);

AppRegistry.registerComponent('TrekLog', () => App);
