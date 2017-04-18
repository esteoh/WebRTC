//the username
var name;
var connectedUser;

//connecting to the signaling server
var wsconn = new WebSocket('ws://localhost:9090');

wsconn.onopen = function () {
    console.log("Connected to the signaling server");
};

//when received a message from the signaling sevrer
wsconn.onmessage = function (msg) {
    console.log("Got message", msg.data);

    var data = JSON.parse(msg.data);

    switch(data.type) {
        case "login":
            handleLogin(data.success);
            break;
        //when somebody wants to call us
        case "offer":
            handleOffer(data.offer, data.name);
            break;
        case "answer":
            handleAnswer(data.answer);
            break;
        //when a remote peer sends an ice candidate to us
        case "candidate":
            handleCandidate(data.candidate);
            break;
        case "leave":
            handleLeave();
            break;
        default:
            break;
    }
};

wsconn.onerror = function (err) {
    console.log("Got error", err);
};

//alias for sending JSON encoded messages
function send( message) {
    //attach the other peer username to our messages
    if (connectedUser) {
        message.name = connectedUser;
    }

    wsconn.send(JSON.stringify(message));
};


/*
UI selectors block
*/

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');

var localVideo = document.querySelector('#localVideo'); 
var remoteVideo = document.querySelector('#remoteVideo');
 
var yourRtcConn; 
var stream;

//hide call page
callPage.style.display = "none";

//login when user clicks the button
loginBtn.addEventListener("click", function (event) {
    name = usernameInput.value;

    if (name.length > 0) {
        send({
            type: "login",
            name: name
        });
    }
});

function handleLogin(success) {

    if (success === false) {
        alert("Oops...Please try a different username");
    } else {
        //display the call page if login is successfull
        loginPage.style.display = "none";
        callPage.style.display = "block";

        //********************** 
        //Starting a peer connection 
        //********************** 
        
        //getting local video stream
        navigator.getUserMedia({ video: true, audio: true}, function (myStream) {
            stream = myStream;

            //display local video stream on the page
            localVideo.src = window.URL.createObjectURL(stream);

            //using Google public stun server
            var configuration = {
                "iceServers": [{ "url": "stun:stun2.1.google.com:19320" }]
            };

            yourRtcConn = new RTCPeerConnection(configuration);

            //setup stream listening
            yourRtcConn.addStream(stream);

            //when a remote user adds stream to the peer connection, we display it
            yourRtcConn.onaddstream = function (e) {
                remoteVideo.src = window.URL.createObjectURL(e.stream);
            };

            //setup ice handling
            yourRtcConn.onicecandidate = function (event) {

                if (event.candidate) {
                    send({
                        type: "candidate",
                        candidate: event.candidate
                    });
                }

            };

        }, function (error) {
            console.log(error);
        });
    }
};

//initiating a call
callBtn.addEventListener("click", function () {
    var callToUsername = callToUsernameInput.value;

    if (callToUsername.length > 0) {

        connectedUser = callToUsername;

        //create an offer
        yourRtcConn.createOffer(function (offer) {
            send({
                type: "offer",
                offer: offer
            });

            yourRtcConn.setLocalDescription(offer);

        }, function (error) {
            alert("Error when creating an offer");
        });
    }
});

//when somebody send us an offer
function handleOffer(offer, name) {
    connectedUser = name;
    yourRtcConn.setRemoteDescription(new RTCSessionDescription(offer));

    //create an answer to an offer
    yourRtcConn.createAnswer(function (answer) {
        yourRtcConn.setLocalDescription(answer);

        send({
            type: "answer",
            answer: answer
        });

    }, function (error) {
        alert("Error when creating an answer");
    });
};

//when we got an answer from remote user
function handleAnswer(answer) {
    yourRtcConn.setRemoteDescription(new RTCSessionDescription(answer));
};

//when we got ice candidate from remote user
function handleCandidate(candidate) {
    yourRtcConn.addIceCandidate(new RTCIceCandidate(candidate));
};

//hang up
hangUpBtn.addEventListener("click", function () {

    send({
        type: "leave"
    });

    handleLeave();
});

function handleLeave() {
    connectedUser = null;
    remoteVideo.src = null;
    // connectedUser = "";
    // remoteVideo.src = "";

    yourRtcConn.close();
    yourRtcConn.onicecandidate = null;
    yourRtcConn.onaddstream = null;
    // yourRtcConn.onicecandidate = "";
    // yourRtcConn.onaddstream = "";
};
