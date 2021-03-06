import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { StyleSheet, TextInput, Keyboard, KeyboardTypeOptions, View } from 'react-native';
import { MainSvc } from './MainSvc';


@inject('uiTheme', 'mainSvc')
@observer
class TextInputField extends React.Component<{   
  inputHeight       ?: number,
  inputWidth        ?: number,
  editable          ?: boolean,     // can't edit text if false
  pvTextColor       ?: string,      // color for placeholder text
  kbType            ?: string,
  itemTest          ?: RegExp,      // RegExp to use to validate input  
  autoFocus         ?: boolean,
  placeholderValue  ?: string,
  pvDisplayOnly     ?: boolean,     // true if use placeholder value is not to be returned as input
  style             ?: any,         // style for the TextInput component
  topAdjust         ?: number,      // amount to adjust container top position (marginTop)
  returnType        ?: string,      // defaults to 'text'
  onChangeFn        ?: Function,
  uiTheme           ?: any,
  mainSvc           ?: MainSvc,
}, {} > {

  @observable value : string;

  componentWillMount() {
    this.setValue('');
  }

  @action
  setValue = (val: string) => {
    if(!this.props.itemTest || this.props.itemTest.test(val)){   // check validity if necessary
      this.value = val;
    }
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
          } = this.props.uiTheme.palette[this.props.mainSvc.colorTheme];
    const { formTextInput, formNumberInput } = this.props.uiTheme;
    const kbType = this.props.kbType || "numeric";
    const propStyle = this.props.style || {};
    const inputH = this.props.inputHeight || 45;
    const inputW = this.props.inputWidth || propStyle.width || formNumberInput.width;
    const topAdj = this.props.topAdjust === undefined ? -10 : this.props.topAdjust;
    const canEdit = this.props.editable !== undefined ? this.props.editable : true;
    const editColor = canEdit ? highTextColor : disabledTextColor;

    const styles = StyleSheet.create({
      textInputItem: {
        ...formTextInput,
        height: inputH,
        width: inputW,
        color: editColor,
      },      
    })

    return (
      <View style={{width: inputW, marginTop: topAdj, justifyContent: "center"}}>
        <TextInput
            style={[styles.textInputItem, propStyle]}
            onChangeText={(text) => this.setValue(text)}
            placeholder={this.props.placeholderValue}
            placeholderTextColor={this.props.pvTextColor || editColor}
            value={this.value}
            onBlur={this.setValueInput}
            onKeyPress={(key) => this.checkForEnter(key)}
            keyboardType={kbType as KeyboardTypeOptions}
            autoFocus={this.props.autoFocus ? true : false}
            editable={canEdit}
        /> 
        <View style={{flex: 1, marginTop: -10,
                      borderBottomColor: mediumTextColor, borderBottomWidth: 1, borderStyle: "solid"}}/>
    </View>
    )
  }
}

export default TextInputField;
