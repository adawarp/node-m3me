var childProcess = require('child_process');
connect();


function connect() {
  child = childProcess.fork('child.js');
  child.on("message", (msg) => {
    console.log(msg);
    child.kill("SIGTERM");
    connect();
  });
}


