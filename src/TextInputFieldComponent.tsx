import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { StyleSheet, TextInput, Keyboard, KeyboardTypeOptions, View } from 'react-native';
import { TrekInfo } from './TrekInfoModel';


@inject('uiTheme', 'trekInfo')
@observer
class TextInputField extends React.Component<{   
  inputHeight       ?: number,
  inputWidth        ?: number,
  textColor         ?: string,
  kbType            ?: string,
  autoFocus         ?: boolean,
  placeholderValue  ?: string,
  pvDisplayOnly     ?: boolean,     // true if use placeholder value is not to be returned as input
  style             ?: any,
  returnType        ?: string,      // defaults to 'text'
  onChangeFn        ?: Function,
  uiTheme           ?: any,
  trekInfo          ?: TrekInfo,
}, {} > {

  @observable value : string;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.value = '';
  }

  @action
  setValue = (val: string) => {
      this.value = val;
  }

  setValueInput = () => {
    let v = this.value.trim();
    Keyboard.dismiss();
    if (v === '' && !this.props.pvDisplayOnly) { 
      v = this.props.placeholderValue;
    }
    this.props.onChangeFn(this.props.returnType !== "value" ? v : parseFloat(v));
    this.setValue('');
  }

  checkForEnter = (key : any) => {
    if(key === 'Enter') { this.setValueInput(); }
  }

  render() {

    const { highTextColor, mediumTextColor, disabledTextColor 
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const kbType = this.props.kbType || "numeric";
    const propStyle = this.props.style || {};
    const inputH = this.props.inputHeight || 45;
    const inputW = this.props.inputWidth || propStyle.width || 80;

    const styles = StyleSheet.create({
      textInputItem: {
        height: inputH,
        width: inputW,
        borderWidth: 0,
        fontWeight: "300",
        fontSize: 20,
        color: highTextColor,
      },      
    })

    return (
      <View style={{width: inputW, marginTop: -10, justifyContent: "center"}}>
        <TextInput
            style={[styles.textInputItem, propStyle]}
            onChangeText={(text) => this.setValue(text)}
            placeholder={this.props.placeholderValue}
            placeholderTextColor={disabledTextColor}
            value={this.value}
            onBlur={this.setValueInput}
            onKeyPress={(key) => this.checkForEnter(key)}
            keyboardType={kbType as KeyboardTypeOptions}
            // underlineColorAndroid={mediumTextColor}
            autoFocus={this.props.autoFocus ? true : false}
        /> 
        <View style={{flex: 1, marginTop: -10,
                      borderBottomColor: mediumTextColor, borderBottomWidth: 1, borderStyle: "solid"}}/>
    </View>
    )
  }
}

export default TextInputField;
