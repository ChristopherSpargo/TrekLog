import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { View, StyleSheet, Text, TextInput, Keyboard } from 'react-native';

import { BACKDROP_Z_INDEX, LABEL_FORM_Z_INDEX, NAV_ICON_SIZE } from './App';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import { ModalModel } from './ModalModel'
import { TrekInfo } from './TrekInfoModel';
import IconButton from './IconButtonComponent';

const MAX_LABEL_LENGTH = 35;
const MAX_NOTE_LENGTH = 300;

// dialog used for trek label

@inject('uiTheme', 'modalSvc', 'trekInfo')
@observer
class TrekLabelForm extends React.Component<{   
  modalSvc    ?: ModalModel,
  trekInfo    ?: TrekInfo,
  uiTheme     ?: any,
}, {} > {

  @observable labelValue;
  @observable noteValue;
  @observable keyboardOpen;

  keyboardDidShowListener;
  keyboardDidHideListener;

  needDefaults = true;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  componentDidMount() {
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  componentDidUpdate() {
    if(this.needDefaults){
      this.needDefaults = false;
      this.setLabelValue(this.props.modalSvc.lfData.label);
      this.setNoteValue(this.props.modalSvc.lfData.notes);
    }
  }

  @action
  setKeyboardOpen = (status: boolean) => {
    this.keyboardOpen = status;

  }
  keyboardDidShow = () => {
    this.setKeyboardOpen(true);
  }

  keyboardDidHide = () => {
    this.setKeyboardOpen(false);
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.labelValue = '';
    this.noteValue = '';
    this.keyboardOpen = false;
  }

  @action
  setLabelValue = (val: string) => {
    if (val !== undefined && val.length <= MAX_LABEL_LENGTH) {
      this.labelValue = val;      
    }
  }

  @action
  setNoteValue = (val: string) => {
    if (val !== undefined && val.length <= MAX_NOTE_LENGTH) {
      this.noteValue = val;      
    }
  }

  // call the resolve method
  close = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      this.props.modalSvc.closeLabelForm(400)
      .then(() => {
        let result = {label: this.labelValue, notes: this.noteValue};
        this.setLabelValue('');
        this.setNoteValue('');
        this.needDefaults = true;
        this.props.modalSvc.lfData.resolve(result);
      })
      .catch(() => {})
    }, 200);
  }

  // call the reject method
  dismiss = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      this.props.modalSvc.closeLabelForm(400)
      .then(() => {
        this.setLabelValue('');
        this.setNoteValue('');
        this.needDefaults = true;
        this.props.modalSvc.lfData.reject('CANCEL');      
      })
      .catch(() => {})
    }, 200);
  }
  
  render() {

    const mData = this.props.modalSvc.lfData;
    const { controlsArea, cardLayout, roundedTop, navItem, navIcon } = this.props.uiTheme;
    const { highTextColor, dividerColor, mediumTextColor, navIconColor, pageBackground, navItemBorderColor,
            trekLogBlue, contrastingMask_3 } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const defHIcon = mData.headingIcon || "Edit";
    const labelPrompt = "Label:"
    const labelChars = (MAX_LABEL_LENGTH - this.labelValue.length) + " characters left";
    const notePrompt = "Note:";
    const noteChars =  (MAX_NOTE_LENGTH - this.noteValue.length) + " characters left";
    const navIconSize = NAV_ICON_SIZE;

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      background: {
        ... StyleSheet.absoluteFillObject,
        zIndex: BACKDROP_Z_INDEX,
        backgroundColor: contrastingMask_3,
      },
      formArea: {
        position: "absolute",
        bottom: controlsArea.height,
        left: 0,
        right: 0,
        zIndex: LABEL_FORM_Z_INDEX,
      },
      cardCustom: {
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        borderBottomWidth: 0,
        borderTopColor: dividerColor,
        borderTopWidth: 2,
        backgroundColor: pageBackground,
      },
      caAdjust: {
        borderRightWidth: 0,
        borderLeftWidth: 0,
        backgroundColor: pageBackground,
      },
      header: {
        paddingLeft: 10,
        paddingBottom: 5,
        flexDirection: "row",
        alignItems: "flex-end",
        height: 40,
        borderStyle: "solid",
        borderBottomColor: dividerColor,
        borderBottomWidth: 1,
      },
      title: {
        color: highTextColor,
        fontSize: 18
      },
      body: {
        flexDirection: "column",
        paddingTop: 10,
        paddingHorizontal: 8,
        minHeight: 100,
      },
      bodyText: {
        fontSize: 18,
        color: highTextColor,
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      textInputItem: {
        height: 40,
        width: 330,
        borderWidth: 0,
        fontWeight: "300",
        fontSize: 18,
        marginRight: 10,
        color: trekLogBlue,
      },      
      labelText: {
        color: mediumTextColor,
        fontSize: 16
      },
      charsLeft: {
        flexDirection: "row",
        width: 326,
        justifyContent: "flex-end",
        marginBottom: 10,
        marginTop: -5,
        height: 20,
      },
      charsLeftText: {
        fontSize: 14,
        color: mediumTextColor,
      }
    })

    return (
      <View style={styles.container}>
        {this.props.modalSvc.labelFormOpen &&
          <View style={[styles.container]}>
            <View style={styles.background}>
              <View style={[styles.formArea, this.keyboardOpen ? {bottom: 0} : {}]}>
                <View style={[cardLayout, styles.cardCustom, roundedTop]}>
                  <View style={styles.header}>
                    <SvgIcon 
                      style={{marginRight: 6}}
                      size={24}
                      widthAdj={0}
                      fill={highTextColor}
                      paths={APP_ICONS[defHIcon]}
                    />
                    <Text style={styles.title}>{mData.heading}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.labelText}>{labelPrompt}</Text>
                    <View style={styles.rowLayout}>
                      <TextInput
                          style={[styles.textInputItem]}
                          onChangeText={(text) => this.setLabelValue(text)}
                          value={this.labelValue}
                          underlineColorAndroid={mediumTextColor}
                          keyboardType="default"
                      /> 
                    </View>
                    <View style={styles.charsLeft}>
                      <Text style={styles.charsLeftText}>{labelChars}</Text>
                    </View>
                    <Text style={styles.labelText}>{notePrompt}</Text>
                    <TextInput
                        style={[styles.textInputItem, {height: 110}]}
                        onChangeText={(text) => this.setNoteValue(text)}
                        value={this.noteValue}
                        multiline
                        underlineColorAndroid={mediumTextColor}
                        numberOfLines={4}
                        keyboardType="default"
                    /> 
                    <View style={styles.charsLeft}>
                      <Text style={styles.charsLeftText}>{noteChars}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {!this.keyboardOpen && 
                <View style={[controlsArea, styles.caAdjust]}>
                  {mData.cancelText && 
                    <IconButton 
                      iconSize={navIconSize}
                      icon="ArrowBack"
                      style={navItem}
                      borderColor={navItemBorderColor}
                      iconStyle={navIcon}
                      color={navIconColor}
                      raised
                      onPressFn={this.dismiss}
                    />
                  }
                    <IconButton 
                      iconSize={navIconSize}
                      icon="CheckMark"
                      style={navItem}
                      iconStyle={navIcon}
                      borderColor={navItemBorderColor}
                      color={navIconColor}
                      raised
                      onPressFn={this.close}
                    />
                </View>
              }
            </View>
          </View>
        }
      </View>
    )
  }
}

export default TrekLabelForm;
