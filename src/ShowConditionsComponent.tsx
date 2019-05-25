import React, { Component } from 'react';
import { NavigationActions } from 'react-navigation';
import { View, StyleSheet } from 'react-native'

import TrekLogHeader from './TreklogHeaderComponent'
import Conditions from './ConditionsComponent';

const goBack = NavigationActions.back() ;

class ShowConditions extends Component<{navigation?: any}, {} > {


  render() {
      const styles = StyleSheet.create({
        container: { ... StyleSheet.absoluteFillObject },
      })

    return (
      <View style={styles.container}>
        <TrekLogHeader
          icon="*"
          titleText="Conditions"
          backButtonFn={() =>  this.props.navigation.dispatch(goBack)}
        />
        <Conditions/>
      </View>
    )
  }
}

export default ShowConditions;


