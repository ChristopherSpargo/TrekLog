import React from "react";
import { Component } from "react";
import { RectButton } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  BackHandler,
  StatusBar
} from "react-native";
import { NavigationActions } from "react-navigation";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";

import { TrekObj } from "./TrekInfoModel";
import { UtilsSvc } from "./UtilsService";
import { HEADER_HEIGHT } from "./App";
import TrekLogHeader from "./TreklogHeaderComponent";
import { StorageSvc } from "./StorageService";
import { LocationSvc } from "./LocationService";
import Waiting from "./WaitingComponent";
import { CourseSvc } from "./CourseService";
import { HelpSvc, HELP_HOME } from "./HelpService";
import NavMenu from './NavMenuComponent';
import ImageView from './ImageViewComponent';
import { ImageSvc, HomeScreenImage, TrekImage, IMAGE_TYPE_INFO, IMAGE_TYPE_PHOTO,
         IMAGE_ORIENTATION_PORTRATE } from "./ImageService";
import { ModalModel } from "./ModalModel";
import { ToastModel } from "./ToastModel";
import { MainSvc, RESP_OK } from "./MainSvc";
import { RestoreObject } from './LogStateModel';
import { LoggingSvc } from "./LoggingService";

const cannedImages = [{name: 'desert1.jpg', label: 'Wind Cave Trail, AZ'}, 
                      {name: 'desert2.jpg', label: 'Wind Cave Trail, AZ'}, 
                      {name: 'desert3.jpg', label: 'Usery Pass Trail, AZ'},
                      {name: 'lightHouse.jpg', label: 'Seattle, WA'},
                      {name: 'countryClub.jpg', label: 'Bainbridge Island, WA'},
                      {name: 'sunset.jpg', label: 'Baingridge Island, WA'}];

const goBack = NavigationActions.back();
const MAX_DISPLAY_IMAGES = 6;
const NUM_LAYOUTS = 4;

@inject(
  "mainSvc",
  "loggingSvc",
  "imageSvc",
  "storageSvc",
  "locationSvc",
  "utilsSvc",
  "modalSvc",
  "toastSvc",
  "courseSvc",
  "helpSvc",
  "uiTheme"
)
@observer
class HomeScreen extends Component<
  {
    mainSvc?: MainSvc;
    loggingSvc?: LoggingSvc;
    imageSvc?: ImageSvc;
    storageSvc?: StorageSvc;
    locationSvc?: LocationSvc;
    utilsSvc?: UtilsSvc;
    modalSvc ?: ModalModel,
    toastSvc ?: ToastModel,
    courseSvc?: CourseSvc;
    helpSvc?: HelpSvc;
    uiTheme?: any;
    navigation?: any;
  },
  {}
> {
  @observable openNavMenu : boolean;
  @observable lockNavMenu;
  @observable haveNoPics;
  @observable currentImages: HomeScreenImage[];
  @observable selectedImage: HomeScreenImage;
  @observable showNote: boolean;
  @observable headerActions: any[];
  @observable waitingMsg: string;

  _didFocusSubscription;
  _willBlurSubscription;

  mS = this.props.mainSvc;
  iS = this.props.imageSvc;
  lS = this.props.loggingSvc;
  glS = this.props.locationSvc;
  cS = this.props.courseSvc;
  uSvc = this.props.utilsSvc;
  uiTheme = this.props.uiTheme;
  activeNav = "";
  imageZoomRef      : any;
  layout : number = 0;
  selectedImageIndex = -1;
      
  constructor(props) {
    super(props);
    this.setHeaderActions();
    this._didFocusSubscription = props.navigation.addListener(
      "didFocus",
      () => {
        BackHandler.addEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        );
        this.init();
      }
    );
  }

  componentWillMount() {
    StatusBar.setHidden(true, "none");
    this.initializeObservables();
    this.props.navigation.setParams({ checkBackButton: this.checkBackButton });
    this.mS.setAppReady(false);
    // Get the current GPS position so the log map shows where we are
    this.cS.getCourseList()                     // read the list of courses
    .then(() => {})
    .catch((err) => {
      alert(err);
    })
    this.props.helpSvc.pushHelp(HELP_HOME, true);     // set home screen help context
    this.mS.resObj = undefined;
    this.props.storageSvc
      .fetchRestoreObj()
      .then((ro: RestoreObject) => {
        this.setWaitingMsg(undefined)
        this.props.storageSvc.removeRestoreObj();
        this.mS.resObj = ro;
        this.setWaitingMsg(undefined);
        this.props.navigation.navigate({routeName: 'LogTrek', key: 'Key-LogTrek'});
      })
      .catch(() => {
        // nothingToRestore
        this.mS
          .init()
          .then(() => {
            this.glS.getCurrentLocation(
              location => {
                this.mS.initialLoc = {
                  latitude: location.latitude,
                  longitude: location.longitude
                };
                this.glS.stopGeolocation();
              },
              { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
            );
            this.mS.setAppReady(true);
            this.setWaitingMsg("Your journey continues...")
            this.iS.getAllImages()                    // read all the images from all the treks
            .then(() => {
              this.getImageSet();
              this.setWaitingMsg(undefined);          // clear the waiting indicator
            })
            .catch((err) =>  {
              this.setWaitingMsg(undefined);
              alert(err)
            })
          })
          .catch((err) => {
            this.mS.setAppReady(true);
            this.setWaitingMsg(undefined);
            // need to create a group or enter settings
            switch (err) {
              case "NO_GROUPS":
              case "NO_SETTINGS":
                this.props.navigation.navigate({routeName: 'Settings', key: 'Key-Settings'});
                break;
              default:
            }
          });
      });
  }

  componentDidMount() {
    this._willBlurSubscription = this.props.navigation.addListener(
      "willBlur",
      () =>
        BackHandler.removeEventListener(
          "hardwareBackPress",
          this.onBackButtonPressAndroid
        )
    );
  }

  componentWillUnmount() {
    this._didFocusSubscription && this._didFocusSubscription.remove();
    this._willBlurSubscription && this._willBlurSubscription.remove();
    this.props.helpSvc.popHelp();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.setCurrentImages([]);
    this.setHaveNoPics(false);
    this.setWaitingMsg(undefined);
    this.setOpenNavMenu(false);
    this.setLockNavMenu(false);
  };

  checkBackButton = () => {
    requestAnimationFrame(() => {
      if (!this.onBackButtonPressAndroid()) {
        this.props.navigation.dispatch(goBack);
      }
    });
  };

  onBackButtonPressAndroid = () => {
    if(this.selectedImage !== undefined){
      this.setSelectedImage(-1);
      return true;
    }
    return false;
  };


  init = () => {
    StatusBar.setHidden(true, "none");
    if(this.currentImages.length === 0){
      this.getImageSet();
    }
  };

  @action
  setCurrentImages = (list: HomeScreenImage[]) => {
    this.currentImages = list;
  }

  @action
  setWaitingMsg = (msg: string) => {
    this.waitingMsg = msg;
  }

  @action
  setSelectedImage = (index: number) => {
    this.selectedImageIndex = index;
    if(index === -1){
      this.setShowNote(false);
      this.selectedImage = undefined;
    } else {
      this.selectedImage = this.currentImages[index];
    }
    this.setHeaderActions();
  }

  @action
  updateCurrentImagesEntry = (index: number, image: TrekImage) => {
    this.currentImages[index].image = image;
  }

  @action
  setShowNote = (status: boolean) => {
    this.showNote = status;
  }

  toggleShowNote = () => {
    this.setShowNote(!this.showNote);
  }

  @action
  setHaveNoPics = (status: boolean) => {
    this.haveNoPics = status;
  }

  @action
  setLockNavMenu = (status: boolean) => {
    this.lockNavMenu = status;
  }

  @action
  setOpenNavMenu = (status: boolean) => {
    this.openNavMenu = status;
  }

  openMenu = () => {
    this.setOpenNavMenu(true);
  }

  // call the colorTheme swap function and then reset the header params
  swapColorTheme = () => {
    this.mS.swapColorTheme();
  }

  @action
  setHeaderActions = () => {
    let actions = [];
    if(this.selectedImage){
      if (this.selectedImage.sDate){
        actions.push({icon: 'Edit', style: {marginTop: 0}, actionFn: this.editImageLabel});
      }
      if(this.selectedImage.image.note){
        actions.push({icon: 'NoteText', style: {marginTop: 0}, actionFn: this.toggleShowNote});
      }
    } else {
      actions.push({icon: 'YinYang', style: {marginTop: 0}, actionFn: this.swapColorTheme});
      actions.push({icon: 'History', style: {marginTop: 0}, actionFn: this.getImageSet});
    }
    this.headerActions = actions;
  }

  // respond to action from controls
  setActiveNav = val => {
    requestAnimationFrame(() => {
      this.activeNav = val;
      switch (val) {
        case "Goals":
        case "Summary":
        case "LogTrek":
        case "Courses":
        case "Settings":
        case "Conditions":
        case "ShowHelp":
          this.props.navigation.navigate({routeName: val, key: 'Key-' + val});
          break;
        default:
      }
    });
  };

  // the next set of images to display on the home screen
  // randomly pick from the pictures directory
  getImageSet = () => {
    let images: HomeScreenImage[] = [];
    let randInit = Math.trunc(Math.random() * 7) + 3;
    for(let i = 0; i<randInit; i++){ Math.random(); }
    let nImages = this.iS.allImages.length;
    if(nImages){
      let ids: string[] = [];
      let maxIndex = nImages - 1;
      let toFind = Math.min(MAX_DISPLAY_IMAGES, nImages);
      for(let i=0; i<toFind;) {
        let img: HomeScreenImage = this.iS.allImages[Math.trunc(Math.random() * maxIndex)];
        if(ids.indexOf(img.image.sDate) === -1){
          i++;
          let uri = 'file://' + img.image.uri;
          ids.push(img.image.sDate);
          let newHSI = this.uSvc.copyObj(img);
          newHSI.image.uri = uri;
          images.push(newHSI);   //add to list if not already selected
        }
      }
    }
    this.layout = Math.trunc(Math.random() * NUM_LAYOUTS);
    if(images.length < MAX_DISPLAY_IMAGES){
      this.useCannedImages(images);
    }
    this.setCurrentImages(images);
  }

  // user has not taken enough pictures 
  // use canned images
  useCannedImages = (images: HomeScreenImage[]) => {
    let uris = [];
    let maxIndex = cannedImages.length;
    while (images.length < MAX_DISPLAY_IMAGES) {
      let image = cannedImages[Math.trunc(Math.random() * maxIndex)];
      let uri = 'asset:/' + image.name;
      if(uris.indexOf(uri) === -1){
        uris.push(uri);
        images.push({sDate: undefined, group: 'Sample', image:{uri: uri, type: IMAGE_TYPE_PHOTO, 
                     label: image.label, orientation: IMAGE_ORIENTATION_PORTRATE}});
      }
    }
  }

  // Let the user add/edit a label and note for the image
  editImageLabel = () => {
    return new Promise((resolve) => {
      this.mS.setTrekLabelFormOpen(true);
      this.props.modalSvc
        .openLabelForm({
          heading: IMAGE_TYPE_INFO[this.selectedImage.image.type].name + " Description",
          label: this.selectedImage.image.label,
          notes: this.selectedImage.image.note,
          headingIcon: "NoteText",
          okText: "SAVE",
          cancelText: "CANCEL",
        })
        .then((resp: any) => {
          this.mS.setTrekLabelFormOpen(false);
          let newI: TrekImage;
          let selUri = this.selectedImage.image.uri;
          if(selUri.indexOf('file://') !== -1){
            selUri = selUri.substr(7);
          }
          this.iS.getTrekForImage(this.selectedImage)
          .then((result: any) => {
            let trek: TrekObj = result.trek;
            let found = false;
            for (let i=0; i<trek.trekImages.length; i++) {
              let iSet = trek.trekImages[i];
              for (let j=0; j<iSet.images.length; j++){   
                let img = iSet.images[j];
                if (img.sDate !== undefined && this.selectedImage.image.sDate !== undefined){
                  if (img.sDate === this.selectedImage.image.sDate){
                    found = true;
                  }
                } else {
                  if (img.uri === selUri){
                    found = true;
                  }
                }           
                if (found){
                  img.label = resp.label;
                  img.note = resp.notes;
                  newI = img;
                  break;
                }
              }
              if (found){ break; }
            }
            this.iS.saveTrekForImage(trek, result.index, newI)
            .then(() => {
              this.mS.updateAllTreksList(trek);
              let newCI = this.uSvc.copyObj(this.iS.allImages[result.index].image);
              newCI.uri = 'file://' + newCI.uri;
              this.updateCurrentImagesEntry(this.selectedImageIndex, newCI);
              this.setSelectedImage(this.selectedImageIndex);
              this.props.toastSvc.toastOpen({
                tType: "Success",
                content: "Image Description updated."
              });
              resolve(RESP_OK)
            })
            .catch(() => {
              this.props.toastSvc.toastOpen({
                tType: "Error",
                content: "Error updating image description."
              });
            });
          })
          .catch(() => {
            this.props.toastSvc.toastOpen({
              tType: "Error",
              content: "Error reading trek file."
            });
          })
        })
        .catch(() => {
          this.mS.setTrekLabelFormOpen(false);
        });
    });
  }

  render() {
    const {
      pageBackground,
      rippleColor,
      mediumTextColor,
      disabledTextColor
    } = this.uiTheme.palette[this.mS.colorTheme];
    const { fontRegular } = this.uiTheme;
    const bgColor = pageBackground;
    const noMenu = this.lockNavMenu;
    const cWidth = Dimensions.get('window').width;
    const cHeight = Dimensions.get('window').height - HEADER_HEIGHT;
    const imageMargin = 4;
    const thirdWidth = (cWidth - (imageMargin * 4)) / 3;
    const fifthHeight = (cHeight - (imageMargin * 6)) / 5;
    const twoThirdWidth = thirdWidth + thirdWidth + imageMargin;
    const twoFifthHeight = fifthHeight + fifthHeight + imageMargin;
    const posV1 = imageMargin;
    const posV2 = posV1 + fifthHeight + imageMargin;
    const posV3 = posV2 + fifthHeight + imageMargin;
    const posV4 = posV3 + fifthHeight + imageMargin;
    const posV5 = posV4 + fifthHeight + imageMargin;
    const posH1 = imageMargin;
    const posH2 = posH1 + thirdWidth + imageMargin;
    const posH3 = posH2 + thirdWidth + imageMargin;
    const imageUri = this.selectedImage ? (this.selectedImage.image.uri) : undefined;
    const imageDate = this.selectedImage ? this.selectedImage.image.sDate : undefined;
    const imageType = this.selectedImage ? this.selectedImage.image.type : undefined;
    const imageLabel = this.selectedImage ? this.selectedImage.image.label : undefined;
    const imageNote = this.selectedImage ? this.selectedImage.image.note : undefined;
    const imageWidth = this.selectedImage ? this.selectedImage.image.width : undefined;
    const imageHeight = this.selectedImage ? this.selectedImage.image.height : undefined;
    const tText = this.selectedImage ? this.selectedImage.group : undefined;
    const tIcon = this.selectedImage ? 'FolderOpenOutline' : '*';
    const tBackFn = this.selectedImage ? this.checkBackButton : undefined;


    const navMenuItems =
        [ {icon: 'Edit', label: 'New Log', value: 'LogTrek'},
          {icon: 'Pie', label: 'Activity', value: 'Summary'},
          {icon: 'Course', label: 'Courses', value: 'Courses'},
          {icon: 'Target', label: 'Goals', value: 'Goals'},
          {icon: 'Settings', label: 'Settings', value: 'Settings'},
          {icon: 'PartCloudyDay', label: 'Conditions', value: 'Conditions'},  
          {icon: 'InfoCircleOutline', label: 'Help', value: 'ShowHelp'},  
        ]

    const layouts =
        [ 
          {
           SS1: {top: posV1, left: posH1},
           DS1: {top: posV2, left: posH2},
           DS2: {top: posV4, left: posH1},
           WR1: {top: posV1, left: posH2},
           TR1: {top: posV2, left: posH1},
           TR2: {top: posV4, left: posH3},
          },
          {
           TR1: {top: posV1, left: posH1},
           DS1: {top: posV1, left: posH2},
           WR1: {top: posV3, left: posH1},
           DS2: {top: posV4, left: posH1},
           SS1: {top: posV5, left: posH3},
           TR2: {top: posV3, left: posH3},
          },
          {
           SS1: {top: posV1, left: posH1},
           DS1: {top: posV1, left: posH2},
           DS2: {top: posV4, left: posH1},
           WR1: {top: posV3, left: posH2},
           TR1: {top: posV2, left: posH1},
           TR2: {top: posV4, left: posH3},
          },
          {
           DS1: {top: posV1, left: posH1},
           SS1: {top: posV1, left: posH3},           
           TR1: {top: posV2, left: posH3},
           WR1: {top: posV3, left: posH1},
           TR2: {top: posV4, left: posH1},
           DS2: {top: posV4, left: posH2},
          }
        ]
    const styles = StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: bgColor,
      },
      singleRow: {
        flexDirection: "row",
        alignItems: "center",
      },
      imageSS1: {
        position: "absolute",
        height: fifthHeight,
        width: thirdWidth,
        top: layouts[this.layout].SS1.top,
        left: layouts[this.layout].SS1.left,
      },
      imageDS1: {
        position: "absolute",
        height: twoFifthHeight,
        width: twoThirdWidth,
        top: layouts[this.layout].DS1.top,
        left: layouts[this.layout].DS1.left,
      },
      imageDS2: {
        position: "absolute",
        height: twoFifthHeight,
        width: twoThirdWidth,
        top: layouts[this.layout].DS2.top,
        left: layouts[this.layout].DS2.left,
      },
      imageWR1: {
        position: "absolute",
        height: fifthHeight,
        width: twoThirdWidth,
        top: layouts[this.layout].WR1.top,
        left: layouts[this.layout].WR1.left,
      },
      imageTR1: {
        position: "absolute",
        height: twoFifthHeight,
        width: thirdWidth,
        top: layouts[this.layout].TR1.top,
        left: layouts[this.layout].TR1.left,
      },
      imageTR2: {
        position: "absolute",
        height: twoFifthHeight,
        width: thirdWidth,
        top: layouts[this.layout].TR2.top,
        left: layouts[this.layout].TR2.left,
      },
      welcome: {
        fontSize: 52,
        fontFamily: fontRegular,
        color: disabledTextColor,
        marginTop: 120,
      }
    });


    const ImageButton = ({style, index}) => {
      return (  
          <View style={style}>
            <RectButton
              rippleColor={rippleColor}
              onPress={() => this.setSelectedImage(index)}
            >
                <Image source={{uri: this.currentImages[index].image.uri}}
                  style={{width: style.width, height: style.height}}
                />
            </RectButton>
          </View>
      )
    }

    return (
      <NavMenu
        selectFn={this.setActiveNav}
        items={navMenuItems}
        setOpenFn={this.setOpenNavMenu}
        locked={noMenu}
        open={this.openNavMenu}> 
        {this.mS.appReady && 
          <View style={[styles.container]}>
            <TrekLogHeader
              logo={this.selectedImage === undefined}
              titleText={tText}
              icon={tIcon as string}
              backButtonFn={tBackFn}
              actionButtons={this.headerActions}
              position="absolute"
              openMenuFn={this.openMenu}
              disableMenu={noMenu}
            />
            {this.waitingMsg !== undefined && 
              <Waiting msg={this.waitingMsg}/>
            }
            {(this.waitingMsg === undefined && this.currentImages.length !== 0) &&
              <View style={[styles.container, {top: HEADER_HEIGHT, justifyContent: "center", flex: 1}]}
              >
                  <ImageButton style={styles.imageSS1} index={0}/>
                  <ImageButton style={styles.imageWR1} index={1}/>
                  <ImageButton style={styles.imageTR1} index={2}/>
                  <ImageButton style={styles.imageDS1} index={3}/>
                  <ImageButton style={styles.imageDS2} index={4}/>
                  <ImageButton style={styles.imageTR2} index={5}/>
                  {this.selectedImage && 
                    <View style={[styles.container]}>
                      <ImageView imageUri={imageUri}
                                imageType={imageType}
                                imageDate={imageDate}
                                imageLabel={imageLabel}
                                imageNote={imageNote}
                                showNote={this.showNote}
                                imageHeight={imageHeight}
                                imageWidth={imageWidth}
                      />
                    </View>
                  }
              </View>
            }
            {(this.waitingMsg !== undefined) && 
              <View style={[styles.container, {top: HEADER_HEIGHT, alignItems: "center", flex: 1}]}>
                <Text style={styles.welcome}>Welcome</Text>
              </View>
            }
          </View>
        }
      </NavMenu>
    );
  }
}

export default HomeScreen;
