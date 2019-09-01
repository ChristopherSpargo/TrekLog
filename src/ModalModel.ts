import { observable, action } from 'mobx';

// the ModalData object is used to pass configuration parameters to the modals' Open functions
export interface ModalData {      
  dType               ?: string,    // dialog type: INFO : Non-critical confirmation
                                    //              WARNING : Critical confirmation
  heading             ?: string,    // heading for modal
  headingIcon         ?: string,    // Icon to use with the heading
  iconColor           ?: string,    // color to make the headingIcon
  content             ?: string,    // modal content
  label               ?: string,    // label text for labelForm
  notes               ?: string,    // notes text for labelForm
  bigContent          ?: string,    // content that should be bigger font
  itemList            ?: any[],     // list of items to show in body (for Goal Notification)
  selectionNames      ?: string[],  // list of selection names (for RadioPicker)
  selectionValues     ?: string[],  // list of selection values (for RadioPicker)
  selectionComments   ?: string[],  // comments to go under each selection
  itemTest            ?: RegExp,    // RegExp used to test validity of new items
  selection           ?: string,    // current selection in the item list
  selections          ?: boolean[], // selection flags for each checkbox item
  allowNone           ?: boolean,   // if true, enforce at least 1 selection (checkbox)
  cancelText          ?: string,    // text for CANCEL button
  okText              ?: string,    // text for OK button
  deleteText          ?: string,    // text for DELETE button
  notifyOnly          ?: boolean,   // true if no CANCEL button
  allowOutsideCancel  ?: boolean,   // true if user can cancel by tapping outside modal
  openFn              ?: Function,  // function to call to open/close the modal
  resolve             ?: Function,  // function to call to resolve the Promise
  reject              ?: Function   // function to call to reject the Promise
}

export const CONFIRM_WARNING = 'WARNING';
export const CONFIRM_INFO = 'INFO';

// The ModalModel class provides an asynchronous modal feature.
// Modal types currently available: 
//     Simple - used for general notices and confirmations
// 'open' functions return a Promise

export class ModalModel {
  @observable simpleIsOpen : boolean;                // when true, SimpleModal component will be open
  @observable goalNoticeIsOpen : boolean;            // when true, GoalNoticeModal component will be open
  @observable labelFormOpen : boolean;               // when true, TrekLabel component will be open

  @observable smData   : ModalData;         // data object for SimpleModal
  @observable gnmData  : ModalData;         // data object for GoalAchievedModal
  @observable lfData   : ModalData;         // data object for TrekLabel form
  @observable rpData   : ModalData;         // data object for RadioPicker form
  @observable cpData   : ModalData;         // data object for CheckboxPicker form

  constructor () {
    this.initializeObservables();
  }

  // initialize all the observable properties in an action for mobx strict mode
  @action
  initializeObservables = () => {
    this.simpleIsOpen = false;
    this.goalNoticeIsOpen = false;
    this.labelFormOpen = false;
    this.smData = {};
    this.gnmData = {};
    this.lfData = {};
    this.rpData = {};
    this.cpData = {selections: []};
  }

  @action
  simpleOpen = (mData: ModalData) => {
    this.smData.dType        = mData.dType || CONFIRM_WARNING;
    this.smData.heading      = mData.heading || '';
    this.smData.headingIcon  = mData.headingIcon;
    this.smData.iconColor    = mData.iconColor;
    this.smData.content      = mData.content || '';
    this.smData.bigContent   = mData.bigContent;
    this.smData.cancelText   = mData.cancelText || 'CANCEL';
    this.smData.deleteText   = mData.deleteText;
    this.smData.okText       = mData.okText;
    this.smData.notifyOnly   = mData.notifyOnly || !mData.cancelText;
    this.smData.allowOutsideCancel = mData.allowOutsideCancel;
    this.simpleIsOpen = true;
    return new Promise((resolve, reject) => {
      this.smData.resolve = resolve;
      this.smData.reject = reject;
    });
  }

  @action
  closeSimpleModal = (delay?: number) : Promise<string> => {
    this.simpleIsOpen = false;      
    return new Promise((resolve) => {       // now, allow time for the modal fade-out animation
      setTimeout(() => {
        resolve('Ok');
      }, delay || 400);
    })
  }

  @action
  goalNoticeOpen = (mData: ModalData) : Promise<any> => {
    this.gnmData.dType        = mData.dType || 'GoalAchieved';
    this.gnmData.heading      = mData.heading || 'Goal Achieved!';
    this.gnmData.headingIcon  = mData.headingIcon;
    this.gnmData.iconColor    = mData.iconColor;
    this.gnmData.content      = mData.content || '';
    this.gnmData.itemList     = mData.itemList || [];
    this.gnmData.cancelText   = mData.cancelText || 'CANCEL';
    this.gnmData.okText       = mData.okText || 'OK';
    this.gnmData.notifyOnly   = mData.notifyOnly || !mData.cancelText;
    this.gnmData.allowOutsideCancel = mData.allowOutsideCancel;
    this.goalNoticeIsOpen = true;
    return new Promise((resolve, reject) => {
      this.gnmData.resolve = resolve;
      this.gnmData.reject = reject;
    });
  }

  @action
  closeGoalNoticeModal = (delay?: number) : Promise<string> => {
    this.goalNoticeIsOpen = false;      
    return new Promise((resolve) => {       // now, allow time for the modal fade-out animation
      setTimeout(() => {
        resolve('Ok');
      }, delay || 400);
    })
  }

  @action
  openLabelForm = (mData: ModalData) => {
    this.lfData.heading       = mData.heading || '';
    this.lfData.headingIcon   = mData.headingIcon || 'Walk';
    this.lfData.label         = mData.label || '';
    this.lfData.notes         = mData.notes || '';
    this.lfData.cancelText    = mData.cancelText;
    this.lfData.okText        = mData.okText || 'SAVE';
    this.labelFormOpen = true;
    return new Promise((resolve, reject) => {
      this.lfData.resolve = resolve;
      this.lfData.reject = reject;
    });
  }

  @action
  closeLabelForm = (delay?: number) : Promise<string> => {
    this.labelFormOpen = false;      
    return new Promise((resolve) => {       // now, allow time for the modal fade-out animation
      setTimeout(() => {
        resolve('Ok');
      }, delay || 400);
    })
  }

  // open/close the labelForm
  @action
  setLabelFormOpen = (status: boolean) => {
    this.labelFormOpen = status;
  }

  @action
  openRadioPicker = (mData: ModalData) : Promise<string> => {
    this.rpData.heading             = mData.heading || '';
    this.rpData.headingIcon         = mData.headingIcon;
    this.rpData.selectionNames      = mData.selectionNames || [];
    this.rpData.selectionValues     = mData.selectionValues || [];
    this.rpData.selectionComments   = mData.selectionComments;
    this.rpData.itemTest            = mData.itemTest;
    this.rpData.selection           = mData.selection || '';
    this.rpData.cancelText          = mData.cancelText || 'CANCEL';
    this.rpData.okText              = mData.okText || 'OK';
    this.rpData.openFn              = mData.openFn;
    return new Promise((resolve, reject) => {
      this.rpData.resolve = resolve;
      this.rpData.reject = reject;
      this.rpData.openFn(true);    // putting this here (later) helps avoid an empty picker (no radios)
    });
  }

  @action
  closeRadioPicker = (delay?: number) : Promise<string> => {
    this.rpData.openFn(false);      
    // this.rpData.selection = '';
    return new Promise((resolve) => {       // now, allow time for the modal fade-out animation
      setTimeout(() => {
        resolve('Ok');
      }, delay || 400);
    })
  }

  @action
  openCheckboxPicker = (mData: ModalData) : Promise<string[]> => {
    this.cpData.heading             = mData.heading || '';
    this.cpData.headingIcon         = mData.headingIcon;
    this.cpData.selectionNames      = mData.selectionNames || [];
    this.cpData.selections           = mData.selections || [];
    // this.cpData.selectionComments   = mData.selectionComments;
    this.cpData.cancelText          = mData.cancelText || 'CANCEL';
    this.cpData.okText              = mData.okText || 'OK';
    this.cpData.allowNone           = mData.allowNone === undefined ? false : true;
    this.cpData.openFn              = mData.openFn;
    return new Promise((resolve, reject) => {
      this.cpData.resolve = resolve;
      this.cpData.reject = reject;
      this.cpData.openFn(true);    // putting this here (later) helps avoid an empty picker (no radios)
    });
  }

  @action
  closeCheckboxPicker = (delay?: number) : Promise<string> => {
    this.cpData.openFn(false);      
    this.cpData.selections = [];
    return new Promise((resolve) => {       // now, allow time for the modal fade-out animation
      setTimeout(() => {
        resolve('Ok');
      }, delay || 400);
    })
  }


}


