import React, { useRef, useEffect, useContext } from "react";
import { View, FlatList, Image } from "react-native";
import { RectButton } from 'react-native-gesture-handler'

import { UiThemeContext, MainSvcContext, TrekSvcContext } from "./App";
import { MainSvc } from './MainSvc';
import { TrekSvc } from "./TrekSvc";

function TrekImageListDisplay({
  tInfo,            // TrekInfo object containing images
  trekId,           // id for trek (sortDate & group)
  showImages = true,  // don't show list if false
  imageSetIndex = undefined,    // index of image set to show (show all sets if undefined)
  showImagesFn,     // function to call if user taps an image
  imageStyle,       // style for each image
  focusImageStyle,     // height for images from focused location
}) {
  const uiTheme: any = useContext(UiThemeContext);
  const mS: MainSvc = useContext(MainSvcContext);
  const tS: TrekSvc = useContext(TrekSvcContext);
  const scrollViewRef = useRef<FlatList<any>>();

  useEffect(() => {       // didUpdate
    if(
        tS.getTrekImageCount(tInfo) > 0 && 
        scrollViewRef && 
        scrollViewRef.current){
      let pos = tS.imagesToSet(tInfo, imageSetIndex) * (imageStyle.width + imageStyle.marginRight);
      scrollViewRef.current.scrollToOffset({offset: pos , animated: true});
    }
  },[trekId, imageSetIndex, showImages]);

  // call the given function function to show the selected trek image
  function showSelectedImage(set: number, image: number) {
    showImagesFn(set, image);
  }

  const { rippleColor } = uiTheme.palette[mS.colorTheme];
  const hasImages = tS.getTrekImageSetCount(tInfo) > 0;

  let imageData = [];
  if (hasImages){
      tInfo.trekImages.forEach((iSet, sIndex) => {
        iSet.images.forEach((image, iIndex) => imageData.push({sNum: sIndex, iNum: iIndex, image: image}))
      })
  }

  const _keyExtractor = (_item, index) => index.toString();

  const _renderItem = ({item}) => {
    let iStyle = item.sNum === imageSetIndex ? focusImageStyle : imageStyle;

    return (
      <View style={iStyle}>
        <RectButton
          rippleColor={rippleColor}
          onPress={() => showSelectedImage(item.sNum, item.iNum)}
        >
          <Image source={{uri: 'file://' + item.image.uri}}
            style={{width: iStyle.width - 2, height: iStyle.height - 2}}
          />
        </RectButton>
      </View>
    )};


  return  (
    <View>
      {hasImages && showImages &&
        <FlatList
          ref={e => scrollViewRef.current = e}
          data={imageData}
          keyExtractor={_keyExtractor}
          initialNumToRender={20}     // this must be integer
          horizontal
          renderItem={_renderItem}
        />
      }
    </View>
  )
}
export default React.memo(TrekImageListDisplay);


