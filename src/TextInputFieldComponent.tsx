import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { StyleSheet, TextInput, Keyboard, KeyboardTypeOptions } from 'react-native';


@inject('uiTheme')
@observer
class TextInputField extends React.Component<{   
  inputHeight       ?: number,
  inputWidth        ?: number,
  textColor         ?: string,
  kbType            ?: string,
  autoFocus         ?: boolean,
  placeholderValue  ?: string,
  style             ?: any,
  returnType        ?: string,      // defaults to 'text'
  onChangeFn        ?: Function,
  uiTheme           ?: any,
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
    if (v === '') { 
      v = this.props.placeholderValue;
    }
    this.props.onChangeFn(this.props.returnType !== "value" ? v : parseFloat(v));
    this.setValue('');
  }

  checkForEnter = (key : any) => {
    if(key === 'Enter') { this.setValueInput(); }
  }

  render() {

    const { highTextColor, mediumTextColor } = this.props.uiTheme.palette;
    const kbType = this.props.kbType || "numeric";
    const propStyle = this.props.style || {};
    const inputH = this.props.inputHeight || 45;
    const inputW = this.props.inputWidth || 80;
    const iColor = this.props.textColor || highTextColor;

    const styles = StyleSheet.create({
      textInputItem: {
        height: inputH,
        width: inputW,
        borderWidth: 0,
        fontWeight: "300",
        fontSize: 20,
        color: iColor,
      },      
    })

    return (
      <TextInput
          style={[styles.textInputItem, propStyle]}
          onChangeText={(text) => this.setValue(text)}
          placeholder={this.props.placeholderValue}
          value={this.value}
          onBlur={this.setValueInput}
          onKeyPress={(key) => this.checkForEnter(key)}
          keyboardType={kbType as KeyboardTypeOptions}
          underlineColorAndroid={mediumTextColor}
          autoFocus={this.props.autoFocus ? true : false}
      /> 
    )
  }
}

export default TextInputField;
