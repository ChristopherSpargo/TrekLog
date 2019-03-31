import React from "react";
import { observer, inject } from "mobx-react";
import { observable, action } from "mobx";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  Dimensions
} from "react-native";

import { CONFIRM_Z_INDEX, BACKDROP_Z_INDEX, pageBackground } from "./App";
import { APP_ICONS } from "./SvgImages";
import RadioGroup from "./RadioGroupComponent";
import SvgIcon from "./SvgIconComponent";
import { ModalModel } from "./ModalModel";

// dialog used for item selection from a list

@inject("uiTheme", "modalSvc")
@observer
class RadioPicker extends React.Component<
  {
    modalSvc?: ModalModel;
    uiTheme?: any;
  },
  {}
> {
  @observable selection;

  done = "";
  closeCount = 0;
  scrollViewRef;
  mData = this.props.modalSvc.rpData;

  constructor(props) {
    super(props);
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.selection = "";
  };

  componentDidUpdate() {
    if (
      this.mData.selection &&
      this.mData.selectionValues.indexOf(this.selection) === -1
    ) {
      this.setSelection(this.mData.selection);
    }
  }

  @action
  setSelection = (val: string) => {
    this.selection = val;
  };

  // call the resolve method
  close = () => {
    setTimeout(() => {
      this.props.modalSvc
        .closeRadioPicker(400)
        .then(() => {
          let result = this.selection;
          this.setSelection("");
          this.props.modalSvc.rpData.resolve(result);
        })
        .catch(() => {});
    }, 200);
  };

  // call the reject method
  dismiss = () => {
    setTimeout(() => {
      this.props.modalSvc
        .closeRadioPicker(400)
        .then(() => {
          this.setSelection("");
          this.props.modalSvc.rpData.reject("CANCEL");
        })
        .catch(() => {});
    }, 200);
  };

  render() {
    const { height } = Dimensions.get("window");
    const {
      highTextColor,
      dividerColor,
      mediumTextColor,
      primaryColor
    } = this.props.uiTheme.palette;
    const { cardLayout, footerButton, footerButtonText } = this.props.uiTheme;
    const headerHeight = 50;

    const styles = StyleSheet.create({
      container: { ...StyleSheet.absoluteFillObject },
      formArea: {
        // flex: 1,
        marginVertical: 40,
        marginHorizontal: 20
      },
      background: {
        ...StyleSheet.absoluteFillObject,
        zIndex: BACKDROP_Z_INDEX,
        backgroundColor: "rgba(0,0,0,.4)"
      },
      cardCustom: {
        marginTop: 0,
        marginBottom: 0,
        elevation: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        borderWidth: 0,
        maxHeight: height - 100,
        zIndex: CONFIRM_Z_INDEX
      },
      header: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: headerHeight,
        paddingLeft: 30,
        paddingBottom: 5,
        borderStyle: "solid",
        borderBottomColor: dividerColor,
        borderBottomWidth: 1,
        backgroundColor: cardLayout.backgroundColor
      },
      title: {
        color: highTextColor,
        fontWeight: "bold",
        fontSize: 20
      },
      body: {
        flexDirection: "column",
        paddingVertical: 8
      },
      bodyText: {
        fontSize: 16,
        color: highTextColor
      },
      rowLayout: {
        flexDirection: "row",
        alignItems: "center"
      },
      colLayout: {
        flexDirection: "column",
        alignItems: "center"
      },
      footer: {
        height: headerHeight,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        borderStyle: "solid",
        borderTopColor: dividerColor,
        borderTopWidth: 1,
        backgroundColor: cardLayout.backgroundColor
      },
      rgItem: {
        paddingVertical: 5,
        backgroundColor: pageBackground,
        paddingRight: 15,
        paddingLeft: 30
      },
      rgLabel: {
        color: highTextColor,
        fontSize: 20,
        paddingLeft: 30,
        flex: 1
      }
    });

    return (
      <View style={styles.container}>
        {this.props.modalSvc.radioPickerOpen && (
          <View style={styles.container}>
            <TouchableWithoutFeedback onPress={this.dismiss}>
              <View style={styles.background}>
                <View style={styles.formArea}>
                  <View style={[cardLayout, styles.cardCustom]}>
                    <View style={styles.header}>
                      {this.mData.headingIcon && (
                        <SvgIcon
                          style={{
                            marginRight: 4,
                            backgroundColor: "transparent"
                          }}
                          size={24}
                          widthAdj={0}
                          fill={mediumTextColor}
                          paths={APP_ICONS[this.mData.headingIcon]}
                        />
                      )}
                      <Text style={styles.title}>{this.mData.heading}</Text>
                    </View>
                    <ScrollView ref={e => (this.scrollViewRef = e)}>
                      <View style={styles.body}>
                        {this.mData.selectionNames !== undefined && (
                          <RadioGroup
                            onChangeFn={this.setSelection}
                            selected={this.selection}
                            itemStyle={styles.rgItem}
                            values={this.mData.selectionValues}
                            labels={this.mData.selectionNames}
                            labelStyle={styles.rgLabel}
                            vertical={true}
                            align="start"
                            inline
                            itemHeight={40}
                            radioFirst
                          />
                        )}
                      </View>
                    </ScrollView>
                    <View style={styles.footer}>
                      <TouchableNativeFeedback
                        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                        onPress={this.dismiss}
                      >
                        <View style={[footerButton, { height: headerHeight }]}>
                          <Text
                            style={[footerButtonText, { color: primaryColor }]}
                          >
                            {this.mData.cancelText}
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                      <TouchableNativeFeedback
                        background={TouchableNativeFeedback.SelectableBackgroundBorderless()}
                        onPress={this.close.bind(this, this.mData.okText)}
                      >
                        <View style={[footerButton, { height: headerHeight }]}>
                          <Text
                            style={[footerButtonText, { color: primaryColor }]}
                          >
                            {this.mData.okText}
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
      </View>
    );
  }
}

export default RadioPicker;
