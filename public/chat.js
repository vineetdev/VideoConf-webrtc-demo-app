var divVideoChatLobby = document.getElementById("video-chat-lobby");
var divVideoChat = document.getElementById("video-chat-room");
var joinButton = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var roomInput = document.getElementById("roomName");

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");
let hideCameraButton = document.getElementById("hideCameraButton");

let muteFlag = false;
let hideCameraFlag = false;

const socket = io.connect("http://localhost:4000");

var roomName;
var creator = false;
var rtcPeerConnection;
var userLocalStream;
var iceServers = {
    iceServers: [
        { urls: "stun:stun.services.mozilla.com"},
        { urls: "stun:stun1.l.google.com:19302"},
    ],
}

joinButton.addEventListener("click", function(){
    if( roomInput.value == ""){
        alert("Please input a room name");
    }
    else{
        console.log("client emitted join");
        roomName = roomInput.value;
        socket.emit("join", roomInput.value);
    }
});

muteButton.addEventListener("click", function(){
    muteFlag = !muteFlag;
    if(muteFlag)
    {
        console.log("client muting self microphone");
        userLocalStream.getTracks()[0].enabled = false;
        muteButton.textContent = "Unmute";
    }
    else{
        console.log("client unmuting self microphone");
        userLocalStream.getTracks()[0].enabled = true;
        muteButton.textContent = "Mute";
    }
});

hideCameraButton.addEventListener("click", function(){
    hideCameraFlag = !hideCameraFlag;
    if(hideCameraFlag)
    {
        console.log("client hiding local camera");
        userLocalStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent = "Show Camera";
    }
    else{
        console.log("client showing local camera");
        userLocalStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent = "Hide Camera";
    }
});

leaveRoomButton.addEventListener("click", function(){
    /* client will emit leave to server */
    socket.emit("leave", roomName);

    /* UI will be updated accordingly */
    divVideoChatLobby.style = "display:block";
    divButtonGroup.style = "display:none";

    /* WebRTC related changes */
    /* stop all audio/video streams */
    if(userVideo.srcObject){
        userVideo.srcObject.getTracks()[0].stop();
        userVideo.srcObject.getTracks()[1].stop();
    }
    if(peerVideo.srcObject){
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if(rtcPeerConnection)
    {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }

});

socket.on("created", function(){
    console.log("client rcvd created");
    creator = true;

    navigator.mediaDevices.getUserMedia(
      { audio: true, 
        video: { width: 500, height: 500 }
      })
    .then((stream) => {
        /* use the stream */
        socket.emit("join", roomInput.value);
        divVideoChatLobby.style= "display:none";
        divButtonGroup.style="display:flex";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = (e) => {
            userVideo.play();
        };
        userLocalStream = stream;
    })
    .catch((err) => {
        /* handle the error */
        alert("Couldnt access Camera OR Mic");
    });
});

socket.on("joined", function(){
    console.log("client rcvd joined");
    //creator = false;

    navigator.mediaDevices.getUserMedia(
      { audio: true, 
        video: { width: 500, height: 500 }
      })
    .then((stream) => {
        /* use the stream */
        divVideoChatLobby.style= "display:none";
        divButtonGroup.style="display:flex";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = (e) => {
            userVideo.play();
        };
        userLocalStream = stream;
        console.log("client emitted ready for room " + roomName);
        socket.emit("ready", roomName);
    })
    .catch((err) => {
        /* handle the error */
        alert("Couldnt access Camera OR Mic");
    });
});

socket.on("full", function(){
    alert("Room is full, cant join");
});

socket.on("ready", function(){
    console.log("client recieved ready event with creator value " + creator);
    if(creator){
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidateFunction;
        rtcPeerConnection.ontrack = onTrackFunction;
        rtcPeerConnection.addTrack(userLocalStream.getTracks()[0], userLocalStream);
        rtcPeerConnection.addTrack(userLocalStream.getTracks()[1], userLocalStream);
        rtcPeerConnection.createOffer(function(offer){
            console.log(" client created offer ", offer);
            rtcPeerConnection.setLocalDescription(offer);
            console.log("client emitted offer");
            socket.emit("offer", offer, roomName);
        }, 
        function(error){
            console.log(" error occured in creating offer ", error);
        });
    }
});

socket.on("candidate", function(candidate){
    console.log("client received candidate ", candidate);
    var icecandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(icecandidate);
});

socket.on("offer", function(offer){
    console.log("client recieved offer event with creator value " + creator);
    if(!creator){
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidateFunction;
        rtcPeerConnection.ontrack = onTrackFunction;
        rtcPeerConnection.addTrack(userLocalStream.getTracks()[0], userLocalStream);
        rtcPeerConnection.addTrack(userLocalStream.getTracks()[1], userLocalStream);
        console.log("client recieved offer event setting remote description ");
        rtcPeerConnection.setRemoteDescription(offer);
        rtcPeerConnection.createAnswer()
        .then((answer) => {
            console.log(" client created answer ", answer);
            rtcPeerConnection.setLocalDescription(answer);
            console.log("client emitted answer");
            socket.emit("answer", answer, roomName);
        })
        .catch((error) => {
            console.log("error in creating answer sdp is ", error);
        });
    }
});

socket.on("answer", function(answer){
    console.log("client received answer ", answer);
    rtcPeerConnection.setRemoteDescription(answer);
});

function onIceCandidateFunction(event){
    console.log("client recieved ice candidate event ", event.candidate);
    if(event.candidate){
        console.log("client emiited candidate");
        socket.emit("candidate", event.candidate, roomName);
    }
}

function onTrackFunction(event){
    console.log("client recieved stream from peer");
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = (e) => {
        peerVideo.play();
        };
}

socket.on("leave", function(){
    console.log("client received leave from server");
    
    if(peerVideo.srcObject){
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }

    if(rtcPeerConnection)
    {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }

    creator = true; // as this is the only person left in room. So, he must be creator.
});

