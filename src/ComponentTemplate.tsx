import { Component } from 'react';
// import { View, StyleSheet, Text } from 'react-native';
import { observer, inject } from 'mobx-react';

import { TrekInfo } from './TrekInfoModel';
import { UtilsSvc } from './UtilsService';
import { ModalModel } from './ModalModel'

@inject('trekInfo', 'uiTheme', 'utilsSvc', 'modalSvc')
@observer
class NewComponent extends Component<{
  uiTheme   ?: any,
  utilsSvc  ?: UtilsSvc,
  modalSvc  ?: ModalModel,
  trekInfo  ?: TrekInfo,
  }, {} > {

}

export default NewComponent;


