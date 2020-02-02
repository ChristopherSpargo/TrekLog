import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

import { UiThemeContext, MainSvcContext, ToastSvcContext, UtilsSvcContext } from "./App";
import { TextInput } from "react-native-gesture-handler";
import { ToastModel } from "./ToastModel";
import { UtilsSvc } from "./UtilsService";
import { MainSvc } from "./MainSvc";

function TimeInput({
  onChangeFn = undefined, // call this when done editign the time value
  timeVal = undefined,    // current time value for the input in seconds
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const toastSvc: ToastModel = useContext(ToastSvcContext);
  const uSvc: UtilsSvc = useContext(UtilsSvcContext);
  const mainSvc: MainSvc = useContext(MainSvcContext);

  const [time, setTime] = useState('');
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');

  const { highTextColor, mediumTextColor, disabledTextColor
        } = uiTheme.palette[mainSvc.colorTheme];
  const { fontRegular } = uiTheme;
  const zeros = '000000';
  const styles = StyleSheet.create({
    timeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    timeItem: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    timeItemValue: {
      fontSize: 28,
      fontFamily: fontRegular,
      color: onChangeFn ? highTextColor : disabledTextColor,
    },
    timeItemUnits: {
      marginLeft: 2,
      marginRight: 8,
      marginBottom: 2,
      fontFamily: fontRegular,
      fontSize: 18,
      color: mediumTextColor
    },
    textInput: {
      opacity: 0,
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }
  });

  useEffect(() => {
      let t = uSvc.timeFromSeconds(timeVal, '6digit');   
      timeChange(t);
  },[timeVal]);

  function reportNewTime() {
    if (parseInt(seconds) < 60 && parseInt(minutes) < 60) {
      onChangeFn((parseInt(hours)*3600 + parseInt(minutes)*60 + parseInt(seconds)).toString());
      timeChange('');
    } else {
      toastSvc.toastOpen({tType: 'Error',content: 'Invalid time value.', time: 2000});
    }
  }

  function timeChange(timeStr: string) {
    if (!/[\.\, \-]/.test(timeStr)) {
      let t = zeros.concat(timeStr);
      let l = t.length;
      setSeconds(t.substr(l-2, 2));
      setMinutes(t.substr(l-4, 2));
      setHours(t.substr(l-6, 2))
      setTime(timeStr);
    }
  }

  return  (
    <View>
      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <Text style={styles.timeItemValue}>
            {hours}
          </Text>
          <Text style={styles.timeItemUnits}>
            {'h'}
          </Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeItemValue}>
            {minutes}
          </Text>
          <Text style={styles.timeItemUnits}>
            {'m'}
          </Text>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeItemValue}>
            {seconds}
          </Text>
          <Text style={styles.timeItemUnits}>
            {'s'}
          </Text>
        </View>
        {onChangeFn &&
          <View style={styles.textInput}>
            <TextInput
                caretHidden={true}
                maxLength={6}
                onChangeText={(text) => timeChange(text)}
                value={time}
                onEndEditing={() => reportNewTime()}
                keyboardType='numeric'
            /> 
          </View>
        }
      </View>
    </View>
  )
}

export default TimeInput;
