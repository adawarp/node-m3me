"use strict";

import * as Noble from "noble";
import { Subject } from "rx";
import * as Debug from "debug";

import MemeDevice from "./memeDevice";


const MEME_SERVICE_UUID =   "d6f25bd15b54436096d87aa62e04c7ef";
const WRITE_ENDPOINT_UUID = "d6f25bd25b54436096d87aa62e04c7ef";
const READ_ENDPOINT_UUID =  "d6f25bd45b54436096d87aa62e04c7ef";
const CLIENT_CHARACTERISTIC_CONFIGURATION_UUID = "2902";

const debug = Debug("Meme:API");
var STATE: string = null;
class Meme {
  _device: any;
  _peripheral: Noble.Peripheral;
  _service: Noble.Service;
  _rxChar: Noble.Characteristic;
  _txChar: Noble.Characteristic;
  _isSdkInitialized: boolean = false;
  _isDiscovered: boolean = false;

  onDeviceReady: Rx.Subject<void>;
  onDeviceDisconnect: Rx.Subject<void>;
  onData: Rx.Subject<any>;

  isConnected: boolean = false;
  
  uuid: string;

  constructor() {
    this.onDeviceReady = new Subject<void>();
    this.onDeviceDisconnect = new Subject<void>();
    this.onData = new Subject<any>();

    this._device = new MemeDevice(() => {

      this.onDeviceReady.onNext(undefined);

    }, (gattValue) => {

      if (this.isConnected) {
        this._txChar.write(new Buffer(gattValue), false);
      }

    }, (data) => {

      this.onData.onNext(data);

    });
  }

  public start(): void {
    this._device.startDataReport();
  }

  public stop(): void {
    this._device.stopDataReport();
  }

  public scan(uuid: string): void {
    this.uuid = uuid;
    if (STATE === "poweredOn") {
      debug("start scanning...");
      STATE = "poweredOn";
      Noble.startScanning([], true);
    } else {
      Noble.on("stateChange", (state) => {
        STATE = state;
        if( state === "poweredOn") {
          STATE = "poweredOn";
          debug("start scanning...");
          Noble.startScanning([], true);
        }
      });
    }


    Noble.on("discover", (peripheral) => {
      let uuids = peripheral.advertisement.serviceUuids;
      if (uuids.length > 0 && !this._isDiscovered && uuids[0] == uuid) {
        this._isDiscovered = true;
        debug("Discovered target");
        Noble.stopScanning();
        peripheral.once("connect", () => {
          this.initDevice(peripheral); 
        });
        peripheral.connect();
      }
    });
  }

  public initDevice(peripheral: Noble.Peripheral): void {
    this._peripheral = peripheral;
    debug("Start GATT Setup");
    this._peripheral.once('disconnect', this.disconnect.bind(this));
    this.discoverSomeServicesAndCharacteristics(this._peripheral)
      .then(result => {
        this._service = result.services[0];

        for (let characteristic of result.characteristics) {
          if (characteristic.uuid == WRITE_ENDPOINT_UUID) {
            this._txChar = characteristic;
          } else if (characteristic.uuid == READ_ENDPOINT_UUID) {
            this._rxChar = characteristic;
          }
        }

        this._rxChar.on("data", (data, isNotification) => {
          if (this._device) {
            this._device.push(data);
          }
        });
        this._rxChar["subscribe"]();
        return this.discoverDescriptors(this._rxChar);

    }).then(descriptors => {

      let configDescriptor = null;
      for (let key in descriptors) {
        let descriptor = descriptors[key];
        if (descriptor.uuid == CLIENT_CHARACTERISTIC_CONFIGURATION_UUID) {
          configDescriptor = descriptor;
          break;
        }
      }
      let value = new Buffer(2);
      value.writeInt16LE(0x0001, 0);
      return this.writeDescriptorValue(configDescriptor, value);

    }).then(() => {

      debug("Initialize SDK");
      this.isConnected = true;
      if (this._isSdkInitialized) {
        this.onDeviceReady.onNext(undefined);
      } else {
        this._device._sdk.initialize();
        this._isSdkInitialized = true;
      }



    }).catch((err) => {
      debug("Error: ", err);
    });
  }

  public disconnect() {
    debug("Disconnected");
    this.isConnected = false;
    this.stop();
    this._rxChar = null;
    this._txChar = null;
    this._peripheral = null;
    this._service = null;
    this._device._sdk = null;
    this._device = null;

    Noble["removeAllListeners"]("stateChange");
    Noble["removeAllListeners"]("discover");
    this.onDeviceDisconnect.onNext(undefined);
    /*
    this._device = new MemeDevice(() => {

      debug("Device onready kicking");
      this.onDeviceReady.onNext(undefined);

    }, (gattValue) => {

      this._txChar.write(new Buffer(gattValue), false);

    }, (data) => {

      this.onData.onNext(data);

    });
    this.scan(this.uuid);
   */
  }

  private discoverSomeServicesAndCharacteristics(peripheral: Noble.Peripheral):
    Promise<{services: Noble.Service[], characteristics: Noble.Characteristic[]}> {

    return new Promise((resolve, reject) => {
      debug("discoverSomeServicesAndCharacteristics");
      peripheral.discoverSomeServicesAndCharacteristics(
        [MEME_SERVICE_UUID], [WRITE_ENDPOINT_UUID, READ_ENDPOINT_UUID],
        (error, services, characteristics) => {
          if (error) {
            debug("Error=" + error);
            reject("discoverSomeServicesAndCharacteristics failed");
            return;
          }
          resolve({services, characteristics});
      });
    });
  }

  private discoverDescriptors(characteristic): Promise<{descriptors: Noble.Descriptor[]}> {
    return new Promise((resolve, reject) => {
      debug("discoverDescriptors");
      characteristic.discoverDescriptors((error, descriptors) => {
        if (error) {
          debug("Error=" + error);
          reject("discoverDescriptors failed");
          return;
        }
        resolve(descriptors);
      });
    });
  }

  private writeDescriptorValue(descriptor, value) {
    return new Promise((resolve, reject) => {
      debug("writeValue");
      descriptor.writeValue(value, error => {
        if (error) {
          debug("Error=" + error);
          reject("writeDescriptorValue failed");
          return;
        }
        resolve();
      });
    });
  }

  private writeCharacteristicValue(characteristic, value) {
    return new Promise((resolve, reject) => {
      debug("writeCharacteristicValue");
      characteristic.write(value, false, error => {
        if (error) {
          debug("Error=" + error);
          reject("writeCharacteristicValue failed");
          return;
        }
        resolve();
      });
    });
  }
}

export default Meme;
