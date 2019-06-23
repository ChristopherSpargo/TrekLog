import { observable, action } from 'mobx';
import { TL_BLUE, TL_YELLOW } from './App';

export type ToastLocation = "Top" | "Bottom";
export const INFO_TOAST_TIME = 2500;
export const ERR_TOAST_TIME = 4000;
export const WARN_TOAST_TIME = 4000;
export const SUCCESS_TOAST_TIME = 2500;

// the ModalData object is used to pass configuration parameters to the modals' Open functions
export interface ToastData {      
  tType              ?: string,   // toast type: Success = show with success icon and color
                                  //             Error = show with error icon and color
                                  //             Warning = show with warning icon and color
                                  //             Info = show with info icon and color
  tColor             ?: string,   // color for toast background
  bColor             ?: string,   // border color for toast 
  icon               ?: string,   // Icon to use to override default icon for type
  iColor             ?: string,   // tintColor for icon
  content            ?: string,   // modal content
  time               ?: number,   // length of time (milliseconds) to display the toast
  location           ?: ToastLocation // location on screen for toast
}


// The ToastModel class provides a toast-like notification feature.
// Toast types currently available: 
//     Info - used for general notices and confirmations
//     Success - used to indicate successful completion of an operation
//     Error - used to indicate error occurring during an operation
//     Warning - used to warn of potential problems

export class ToastModel {

  TOAST_CONFIGS = {
    Success: { icon: "CheckMark", iColor: 'white',             
               tColor: TL_BLUE,  bColor: 'white',  time: SUCCESS_TOAST_TIME},
    Error:   { icon: "AlertCircleOutline",   iColor: 'white',
               tColor: "#f44336",    bColor: 'white',    time: ERR_TOAST_TIME},
    Warning: { icon: "Warning", iColor: 'white', 
               tColor: TL_YELLOW, bColor: 'white', time: WARN_TOAST_TIME},
    Info:    { icon: "InfoCircleOutline",    iColor: 'white',
               tColor: TL_BLUE,  bColor: 'white',  time: INFO_TOAST_TIME}
  }

  @observable toastIsOpen;    // when true, Toast component will be open

  @observable tData  : ToastData;         // data object for Toast

  constructor () {
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.toastIsOpen = false;
    this.tData = {};
  }

  @action
  toastOpen = (tData: ToastData) => {
    this.tData.tType        = tData.tType || 'Info';
    this.tData.icon         = tData.icon || this.TOAST_CONFIGS[this.tData.tType].icon;
    this.tData.iColor       = tData.iColor || this.TOAST_CONFIGS[this.tData.tType].iColor;
    this.tData.tColor       = tData.tColor || this.TOAST_CONFIGS[this.tData.tType].tColor;
    this.tData.content      = tData.content || '';
    this.tData.bColor       = tData.bColor || this.TOAST_CONFIGS[this.tData.tType].bColor
    this.tData.time         = tData.time || this.TOAST_CONFIGS[this.tData.tType].time;
    this.tData.location     = tData.location || 'Bottom';
    this.toastIsOpen = true;
    setTimeout(() => {
      this.closeToast();
    }, this.tData.time)
  }

  @action
  closeToast = () => {
    this.toastIsOpen = false;      
  }

}


