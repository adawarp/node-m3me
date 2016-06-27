var Meme = require("./index").default;

// example

var meme = new Meme();
// set service uuid
meme.scan("d6f25bd15b54436096d87aa62e04c7ef");
meme.onDeviceReady.subscribe(() => {
  meme.start();
});

meme.onData.subscribe((data) => {
  console.log(data);
});


