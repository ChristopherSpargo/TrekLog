import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import { View, StyleSheet, Text, TextInput, Keyboard, Dimensions, BackHandler } from 'react-native';
import { RectButton } from 'react-native-gesture-handler'
import { useObserver } from "mobx-react-lite";

import { BACKDROP_Z_INDEX, LABEL_FORM_Z_INDEX, UiThemeContext, MainSvcContext, 
         ModalSvcContext } from './App';
import { APP_ICONS } from './SvgImages';
import SvgIcon from './SvgIconComponent';
import { ModalModel } from './ModalModel'
import { MainSvc } from './MainSvc';

const MAX_LABEL_LENGTH = 35;
const MAX_NOTE_LENGTH = 300;

// dialog used for trek label

function TrekLabelForm({open =undefined}) {   
  const uiTheme: any = useContext(UiThemeContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);
  const modalSvc: ModalModel = useContext(ModalSvcContext);
  const mData = modalSvc.lfData;

  const [labelValue, setLabelValue] = useState('');
  const [noteValue, setNoteValue] = useState('');

  const bHandler = useRef(false);

  const onBackButtonPressLabel = useCallback(
    () => {
      dismiss();
      return true;
    }, [], // Tells React to memoize regardless of arguments.
  );

  useEffect(() => {                       // componentDidUpdate
    if(open && !bHandler.current) {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPressLabel); 
      bHandler.current = true;
    }
  },[open])

  useEffect(() => {     
    updateLabelValue(mData.label);           // componentDidMount
    updateNoteValue(mData.notes);
  },[open])

  // useEffect(() => {                       // DidUpdate
  //   if (limits.units && (limits.units.indexOf(units) === -1)){
  //     updateUnits(limits.defaultUnits);
  //   }
  // },[limits.units])

  function removeListeners() {
    BackHandler.removeEventListener('hardwareBackPress', onBackButtonPressLabel);
    bHandler.current = false;
  }

  function updateLabelValue(val: string) {
    if (val !== undefined && val.length <= MAX_LABEL_LENGTH) {
      setLabelValue(val);      
    }
  }

  function updateNoteValue(val: string) {
    if (val !== undefined && val.length <= MAX_NOTE_LENGTH) {
      setNoteValue(val);      
    }
  }

  // call the resolve method
  function close() {
    Keyboard.dismiss();
    setTimeout(() => {
      modalSvc.closeLabelForm(400)
      .then(() => {
        let result = {label: labelValue, notes: noteValue};
        setLabelValue('');
        setNoteValue('');
        removeListeners();
        modalSvc.lfData.resolve(result);
      })
      .catch((err) => {
        removeListeners();
        alert(err)})
    }, 200);
  }

  // call the reject method
  function dismiss() {
    Keyboard.dismiss();
    // alert("Dismiss")
    setTimeout(() => {
      modalSvc.closeLabelForm(400)
      .then(() => {
        setLabelValue('');
        setNoteValue('');
        removeListeners();
        modalSvc.lfData.reject('CANCEL');      
      })
      .catch((err) => {
        removeListeners();
        alert(err);
      })
    }, 200);
  }
  

    const { width } = Dimensions.get('window');
    const bPadding = 10;
    const cardWidth = width - (bPadding * 2);
    const { cardLayout, roundedTop, footer, footerButton,
            formTextInput, formHeader, formHeaderText } = uiTheme;
    const { highTextColor, dividerColor, mediumTextColor, pageBackground,
            trekLogBlue, contrastingMask_3, textOnPrimaryColor, rippleColor, footerButtonText,
          } = uiTheme.palette[mainSvc.colorTheme];
    const defHIcon = mData.headingIcon || "Edit";
    const labelPrompt = "Label:"
    const labelChars = (MAX_LABEL_LENGTH - (labelValue ? labelValue.length : 0)) + " characters left";
    const notePrompt = "Note:";
    const noteChars =  (MAX_NOTE_LENGTH - (noteValue ? noteValue.length : 0)) + " characters left";

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

    return useObserver(() => (
      <View style={styles.container}>
        {modalSvc.labelFormOpen &&
          <View style={[styles.container]}>
            <View style={styles.background}>
              <View style={styles.formArea}>
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
                          onChangeText={(text) => updateLabelValue(text)}
                          value={labelValue}
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
                        onChangeText={(text) => updateNoteValue(text)}
                        value={noteValue}
                        multiline
                        underlineColorAndroid={mediumTextColor}
                        numberOfLines={4}
                        keyboardType="default"
                        autoFocus={mData.focus === 'Note'}
                        /> 
                  </View>
                </View>
                  <View style={[styles.footer]}>
                    <RectButton
                      rippleColor={rippleColor}
                      style={{flex: 1}}
                      onPress={dismiss}>
                      <View style={[footerButton, {flex:0}]}>
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
                      onPress={close}>
                      <View style={[footerButton, {flex:0}]}>
                        <Text
                          style={footerButtonText}
                        >
                          {mData.okText}
                        </Text>
                      </View>
                    </RectButton>
                  </View>
              </View>
            </View>
          </View>
        }
      </View>
    ))
}

export default TrekLabelForm;
