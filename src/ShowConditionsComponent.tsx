import React, { Component } from 'react';
import { NavigationActions } from 'react-navigation';

import TrekLogHeader from './TreklogHeaderComponent'
import Conditions from './ConditionsComponent';

const goBack = NavigationActions.back() ;

class ShowConditions extends Component<{}, {} > {

  static navigationOptions = ({ navigation }) => {

    return {
      header: <TrekLogHeader titleText="Conditions"
                              icon="*"
                              backButtonFn={() =>  navigation.dispatch(goBack)}
              />,
    };
  }  

  render() {
    return (
      <Conditions/>
    )
  }
}

export default ShowConditions;


