"use strict";
console.log("Hello meme");
const java = require("java");
const fs = require("fs");
const baseDir = "./sdk/target/dependency";
const dependencies = fs.readdirSync(baseDir);
dependencies.forEach(function(dependency){
      java.classpath.push(baseDir + "/" + dependency);
})
java.classpath.push("./sdk/target/classes");
java.options.push('-Xverify:none');
let meme = java.newInstanceSync("com.adawarp.meme.MemeSdk",null);
meme.initialize();


