"use strict";
const Debug = require("debug");
const java = require("java");
const path = require("path");
const fs = require("fs");
const debug = Debug("Meme:Devise");
const ROOT = path.join(__dirname, "/../");
const baseDir = path.join(ROOT, "/sdk/build/libs");
const dependencies = fs.readdirSync(baseDir);
dependencies.forEach((dependency) => {
    java.classpath.push(path.join(baseDir, dependency));
});
java.options.push('-Xverify:none');
class MemeDevice {
    constructor(onDeviceReady, onWriteRequest, onRealtimeData) {
        this.onDeviceReady = onDeviceReady;
        this.onWriteRequest = onWriteRequest;
        this.onRealtimeData = onRealtimeData;
        this.listener = java.newProxy("com.adawarp.meme.MemeSdk$Listener", {
            deviceReady: () => {
                debug("Device Ready");
                if (typeof this.onDeviceReady === "function") {
                    this.onDeviceReady();
                }
            },
            writeCommand: gattValue => {
                debug("WriteCommand: ");
                if (typeof this.onWriteRequest === "function") {
                    this.onWriteRequest(gattValue);
                }
            },
            realtimeDataReceived: data => {
                debug("Realtime Data received");
                if (typeof this.onRealtimeData === "function") {
                    this.onRealtimeData(data);
                }
            }
        });
        this._sdk = java.newInstanceSync("com.adawarp.meme.MemeSdk", this.listener);
    }
    startDataReport() {
        debug("start deta report");
        this._sdk.startDataReportSync();
    }
    stopDataReport() {
        debug("stop deta report");
        this._sdk.stopDataReport();
        this._sdk.dispose();
    }
    push(data) {
        this._sdk.responseCommandSync(toJavaByteArray(data));
    }
}
function toJavaByteArray(data) {
    let byteArray = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        byteArray[i] = java.newByte(data[i]);
    }
    return java.newArray("byte", byteArray);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemeDevice;
