import React, { useState, useEffect } from "react";
import { View } from "react-native";
// import { useObserver } from "mobx-react-lite";

// import { UiThemeContext, TrekInfoContext } from "./App";
// import SvgIcon from "./SvgIconComponent";
// import { APP_ICONS } from "./SvgImages";
// import { TrekInfo } from './TrekInfoModel';

function NewComponent({
  onChangeFn = undefined, // call this when selection status of an item changes
  selections
}) {
  // const uiTheme: any = useContext(UiThemeContext);
  // const trekInfo: TrekInfo = useContext(TrekInfoContext);
  const [selectedItems, setSelectedItems] = useState([...selections]);

  useEffect(() => {           // componentDidUpdate
    setSelectedItems([...selections]);
  },[selections]);

  useEffect(() => {             // componentDidMount
    onChangeFn(selectedItems);
  },[]);

  useEffect(() => {             // componentWillUnmount
    // return () => {
      // if(timerId.current !== undefined){
      //   window.clearTimeout(timerId.current);
    //   }
    // }
  },[]);

  // const {
  //   rippleColor, footerButtonText,
  // } = uiTheme.palette[trekInfo.colorTheme];
  // const { cardLayout, roundedTop, roundedBottom, footer, footerButton, fontRegular 
  //       } = uiTheme;
  // const styles = StyleSheet.create({
  //   container: { ...StyleSheet.absoluteFillObject },
  // })

  return  (
    <View>

    </View>
      
  )
}
export default NewComponent;


