//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //audio context to help us record

const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const pauseButton = document.getElementById("pauseButton");
const uploadFileButton = document.getElementById("uploadFile");
const uploadRecordedButton = document.getElementById("uploadRecordedFile");
const recordingsList = document.getElementById("recordingsList");

//add events to the buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);
uploadFileButton.addEventListener("click", uploadFile);
uploadRecordedButton.addEventListener("click", uploadRecordedFile);

/**
 * Uploads audio recorded file to the server
 */
function uploadRecordedFile() {
  console.log("uploading recorded file....");

  postToServer(recordedBlob, recorderBlobFilename);
}

/**
 * Uploads audio file to the server
 */
function uploadFile() {
  var file = document.querySelector("input[type=file]").files[0];
  if (!file) {
    alert("Please select the file.");
    return;
  }
  var filename = file.name;

  console.log("uploading file....");
  postToServer(file, filename);
}

function startRecording() {
  console.log("recordButton clicked");

  var constraints = { audio: true, video: false };

  /*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/
  recordButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;

  /*
    	We're using the standard promise based getUserMedia() 
	*/
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      console.log(
        "getUserMedia() success, stream created, initializing Recorder ..."
      );

      /*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
      audioContext = new AudioContext();

      //update the format
      document.getElementById("formats").innerHTML =
        "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

      /*  assign to gumStream for later use  */
      gumStream = stream;

      /* use the stream */
      input = audioContext.createMediaStreamSource(stream);

      /* 
			Create the Recorder object and configure to record mono sound (1 channel)
        */
      rec = new Recorder(input, { numChannels: 1 });

      //start the recording process
      rec.record();

      console.log("Recording started");
    })
    .catch(function (err) {
      //enable the record button if getUserMedia() fails
      recordButton.disabled = false;
      stopButton.disabled = true;
      pauseButton.disabled = true;

      console.log("The following error occurred: " + err);
    });
}

function pauseRecording() {
  console.log("pauseButton clicked rec.recording=", rec.recording);
  if (rec.recording) {
    //pause
    rec.stop();
    pauseButton.innerHTML = "Resume";
  } else {
    //resume
    rec.record();
    pauseButton.innerHTML = "Pause";
  }
}

function stopRecording() {
  console.log("stopButton clicked");

  //disable the stop button, enable the record too allow for new recordings
  stopButton.disabled = true;
  recordButton.disabled = false;
  pauseButton.disabled = true;

  //reset button just in case the recording is stopped while paused
  pauseButton.innerHTML = "Pause";

  //tell the recorder to stop the recording
  rec.stop();

  //stop microphone access
  gumStream.getAudioTracks()[0].stop();

  //create the wav blob and pass it on to createDownloadLink
  rec.exportWAV(createAudioHTML);
}

/**
 * createAudioHTML generates the audio tag HTML
 *
 * @param {Blob} blob
 */
function createAudioHTML(blob) {
  var url = URL.createObjectURL(blob);
  var au = document.createElement("audio");
  var li = document.createElement("li");

  //name of .wav file to use during upload and download
  var filename = new Date().toISOString();

  //add controls to the <audio> element
  au.controls = true;
  au.src = url;

  //add the new audio element to li
  li.appendChild(au);

  //add the filename to the li
  li.appendChild(document.createTextNode(filename + ".wav "));

  recordedBlob = blob;
  recorderBlobFilename = filename;

  //removing all recording list from the DOM
  recordingsList.innerHTML = "";

  //add the li element to the ol
  recordingsList.appendChild(li);
}

/**
 * postToServer post request the audio blob
 *
 * @param {Blob} blob
 * @param {String} filename
 */
function postToDeepServer(blob, filename) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function (e) {
    if (this.readyState === 4 && e.target.status == 200) {
      console.log("Server returned: ", e.target.responseText);
    } else {
      console.log("Error occurred while getting response");
    }
  };
  var fd = new FormData();
  fd.append("audioFile", blob, filename);
  xhr.open("POST", "/server", true);
  xhr.send(fd);
}
