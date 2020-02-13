import { TrekObj, LaLo } from "./TrekInfoModel";
import { RESP_OK, MSG_TREK_LIST_READ_ERROR, MSG_TREK_READ_ERROR, TREK_TYPE_HIKE } from './MainSvc'
import { StorageSvc } from "./StorageService";
import { SortDate, UtilsSvc } from "./UtilsService";

export const IMAGE_TYPE_PHOTO = 1;
export const IMAGE_TYPE_VIDEO = 2;
export const IMAGE_TYPE_UNKNOWN = 3;

export const PHOTO_TYPES = ['JPEG','JPG'];
export const VIDEO_TYPES = ['MP4'];

export enum TrekImageType { IMAGE_TYPE_PHOTO, IMAGE_TYPE_VIDEO };

export const IMAGE_TYPE_INFO = [{}, {name: "Photo", icon: "Camera"}, {name: "Video", icon: "Video"}];

export const IMAGE_ORIENTATION_PORTRATE = 1;
export const IMAGE_ORIENTATION_PORTRATE_180 = 2;
export const IMAGE_ORIENTATION_LANDSCAPE_270 = 3;
export const IMAGE_ORIENTATION_LANDSCAPE_90 = 4;

export enum TrekImageOrientationType { IMAGE_ORIENTATION_PORTRATE , IMAGE_ORIENTATION_PORTRATE_180,
                            IMAGE_ORIENTATION_LANDSCAPE_270, IMAGE_ORIENTATION_LANDSCAPE_90 };

export const IMAGE_STORE_FULL = "Full";
export const IMAGE_STORE_COMPRESSED = "Compressed";
export const IMAGE_COMPRESSION_QUALITY = 30;

export interface TrekImage {
  sDate?:       SortDate,
  uri:          string,
  orientation:  TrekImageOrientationType,
  width?:       number,
  height?:      number,
  type:         TrekImageType, 
  time ?:       number,
  label ?:      string,
  note ?:       string,
}

export interface TrekImageSet {
  loc:          LaLo,         // location images were taken
  images:       TrekImage[];
}

export interface HomeScreenImage {
  sDate: SortDate,
  group: string,
  image: TrekImage
}

export class ImageSvc {

  allImages: HomeScreenImage[] = [];

  constructor (private utilsSvc: UtilsSvc, private storageSvc: StorageSvc) {}

  // read all the treks and make a list of all image information
  getAllImages = () => {
    // let count = 0;
    // let allDone: Promise<any>[] = [];

    return new Promise<any>((resolve, reject) => {
      this.allImages = [];
      this.storageSvc.readAllTrekFiles([])      // read all the trek files
      .then((result) => {  
        let trekList = result.list;
        for(let i = 0; i<trekList.length; i++) {
          let trek = trekList[i];
          // if(trek.pointList.length > 1){
          //   let badSpd = this.utilsSvc.computeImpliedSpeed(trek.pointList[1], trek.pointList[0]);
          //   if(badSpd > trek.pointList[1].s * 5){ 
          //     count++;
          //   }
          // }
                // if(trek.type === TREK_TYPE_HIKE){ 
          //   let cals = this.utilsSvc.computeCalories(trek.pointList, trek.duration, trek.type,
          //             trek.hills, trek.weight, trek.packWeight || 0);
          //   trek.calories = cals;
          //   allDone.push(this.storageSvc.storeTrekData(trek));
          // }
          if(trek.trekImages){
            let imageList : TrekImageSet[] = trek.trekImages;
            for(let j=0; j<imageList.length; j++) {
              let iSet: TrekImage[] = imageList[j].images;
              for (let k=0; k<iSet.length; k++) {
                this.allImages.push({sDate: trek.sortDate, group: trek.group, 
                                      image: this.utilsSvc.copyObj(iSet[k])});
              }
            }
          }
        }
        // Promise.all(allDone)
        // .then(() => resolve(RESP_OK))
        // .catch((err) => reject('Error updating calories\n' + err))
        // alert('Treks with bad first points: ' + count + '/' + trekList.length)
        resolve(RESP_OK)
      })
      .catch(() => {reject(MSG_TREK_LIST_READ_ERROR)})
    })
  }

  // find the image in the allImages array and return its index (-1 if not found)
  findImageIndex = (sDate: SortDate, uri: string) => {
    let searchUri = uri;
    if(uri.indexOf('file://') !== -1){
      searchUri = uri.substr(7);
    }
    for (let i=0; i<this.allImages.length; i++) {
      let entry = this.allImages[i].image;
      if((entry.sDate !== undefined) && (sDate !== undefined)){
        if (entry.sDate === sDate){  // find entry with matching sDate
          return i;
        } 
      } else {
        if (entry.uri === searchUri){     // if no sDate, find entry with matching uri
          return i;
        }
      }
    }
    return -1;
  }

  // remove the images from the given image sets
  removeTrekImages = (imgs: TrekImageSet[]) => {
    if(imgs){
      for (let i=0; i<imgs.length; i++) {
        let iSet = imgs[i];
        for (let j=0; j<iSet.images.length; j++) {
          this.removeImage(iSet.images[j].sDate, iSet.images[j].uri);
        }
      }
    }
  }

  // remove the image with the given uri from the allImages array
  removeImage = (sDate: SortDate, uri: string) => {
    let i = this.findImageIndex(sDate, uri);
    if (i !== -1){
      this.allImages.splice(i, 1);
    }
  }

  // add the given image sets to the allImages array
  addTrekImages = (trek: TrekObj) => {
    let imgs = trek.trekImages;
    if(imgs){
      for (let i=0; i<imgs.length; i++) {
        let iSet = imgs[i];
        for (let j=0; j<iSet.images.length; j++) {
          let indx = this.findImageIndex(iSet.images[j].sDate, iSet.images[j].uri);
          if (indx === -1){
            this.allImages.push({sDate: trek.sortDate, group: trek.group, 
              image: this.utilsSvc.copyObj(iSet.images[j])});
          }
        }
      }
    }
  }

  // update the note and label for the image with the given sortDate
  updateAllImagesEntry = (imageDate: SortDate, uri: string, data: any) => {
    let i = this.findImageIndex(imageDate, uri);
    if (i !== -1) {
      this.allImages[i].image.label = data.label;
      this.allImages[i].image.note = data.note;
      return;
    }
    alert("Image entry not found" + '\n' + imageDate);
  }

  // return the index position in allImages for the given image as well as its associated trek
  getTrekForImage = (img: HomeScreenImage) => {
    return new Promise<any>((resolve, reject) => {
      let i = this.findImageIndex(img.image.sDate, img.image.uri);
      if(i !== -1){
        this.storageSvc.fetchGroupAndDateTrek(this.allImages[i].group, this.allImages[i].sDate)
        .then((data) => {
          let trek = JSON.parse(data);
          resolve({trek: trek, index: i})
        })
        .catch(() => {
          reject(MSG_TREK_READ_ERROR)
        })
      } else {
        alert('not found  ' + img.image.sDate + '\n' + img.image.uri)
        reject(MSG_TREK_READ_ERROR)
      }
    })
  }

  // save the trek with the associated HomeScreenImage
  saveTrekForImage = (trek: TrekObj, index: number, img: TrekImage) => {
    this.allImages[index].image = this.utilsSvc.copyObj(img);
    return this.storageSvc.storeTrekData(trek);
  }

}

