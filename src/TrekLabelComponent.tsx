import React from 'react';
import { observer, inject } from 'mobx-react';
import { observable, action } from 'mobx';
import { View, StyleSheet, Text, TextInput, Keyboard, Dimensions } from 'react-native';
import { RectButton } from 'react-native-gesture-handler'

import { BACKDROP_Z_INDEX, LABEL_FORM_Z_INDEX } from './App';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import { ModalModel } from './ModalModel'
import { TrekInfo } from './TrekInfoModel';

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

    const { width } = Dimensions.get('window');
    const bPadding = 10;
    const cardWidth = width - (bPadding * 2);
    const mData = this.props.modalSvc.lfData;
    const { cardLayout, roundedTop, footer, footerButton,
            formTextInput, formHeader, formHeaderText } = this.props.uiTheme;
    const { highTextColor, dividerColor, mediumTextColor, pageBackground,
            trekLogBlue, contrastingMask_3, textOnPrimaryColor, rippleColor, footerButtonText,
          } = this.props.uiTheme.palette[this.props.trekInfo.colorTheme];
    const defHIcon = mData.headingIcon || "Edit";
    const labelPrompt = "Label:"
    const labelChars = (MAX_LABEL_LENGTH - this.labelValue.length) + " characters left";
    const notePrompt = "Note:";
    const noteChars =  (MAX_NOTE_LENGTH - this.noteValue.length) + " characters left";

    const styles = StyleSheet.create({
      container: { ... StyleSheet.absoluteFillObject },
      background: {
        ... StyleSheet.absoluteFillObject,
        zIndex: BACKDROP_Z_INDEX,
        backgroundColor: contrastingMask_3,
      },
      formArea: {
        position: "absolute",
        bottom: 0,
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
        ...formHeader,
        borderBottomColor: dividerColor,
      },
      title: {
        ...formHeaderText,
        color: textOnPrimaryColor,
      },
      body: {
        flexDirection: "column",
        padding: bPadding,
        minHeight: 100,
      },
      bodyText: {
        fontSize: 18,
        color: highTextColor,
      },
      footer: {
        ...footer,
        ...{borderTopColor: dividerColor, backgroundColor: pageBackground}
      },
        rowLayout: {
        flexDirection: "row",
        alignItems: "center",
      },
      textInputItem: {
        ...formTextInput,
        width: cardWidth,
        color: trekLogBlue,
      },      
      labelAndCharsLeft: {
        flexDirection: "row",
        width: cardWidth,
        justifyContent: "space-between",
      },
      labelText: {
        color: mediumTextColor,
        fontSize: 16
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
                      fill={textOnPrimaryColor}
                      paths={APP_ICONS[defHIcon]}
                    />
                    <Text style={styles.title}>{mData.heading}</Text>
                  </View>
                  <View style={styles.body}>
                    <View style={styles.labelAndCharsLeft}>
                      <Text style={styles.labelText}>{labelPrompt}</Text>
                      <Text style={styles.charsLeftText}>{labelChars}</Text>
                    </View>
                    <View style={styles.rowLayout}>
                      <TextInput
                          style={[styles.textInputItem]}
                          onChangeText={(text) => this.setLabelValue(text)}
                          value={this.labelValue}
                          underlineColorAndroid={mediumTextColor}
                          keyboardType="default"
                          autoFocus={mData.focus === 'Label'}
                      /> 
                    </View>
                    <View style={[styles.labelAndCharsLeft, {marginTop: bPadding}]}>
                      <Text style={styles.labelText}>{notePrompt}</Text>
                      <Text style={styles.charsLeftText}>{noteChars}</Text>
                    </View>
                    <TextInput
                        style={[styles.textInputItem, {height: 110}]}
                        onChangeText={(text) => this.setNoteValue(text)}
                        value={this.noteValue}
                        multiline
                        underlineColorAndroid={mediumTextColor}
                        numberOfLines={4}
                        keyboardType="default"
                        autoFocus={mData.focus === 'Note'}
                        /> 
                  </View>
                </View>
                {!this.keyboardOpen && 
                  <View style={[styles.footer]}>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={this.dismiss}>
                      <View style={footerButton}>
                        <Text
                          style={footerButtonText}
                        >
                          {mData.cancelText}
                        </Text>
                      </View>
                    </RectButton>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={() => this.close()}>
                      <View style={footerButton}>
                        <Text
                          style={footerButtonText}
                        >
                          {mData.okText}
                        </Text>
                      </View>
                    </RectButton>
                  </View>
                }
              </View>
            </View>
          </View>
        }
      </View>
    )
  }
}

export default TrekLabelForm;
