//the username
var name;
var connectedUser;

//connecting to the signaling server
var conn = new WebSocket('ws://localhost:9090');

conn.onopen = function () {
    console.log("Connected to the signaling server");
};

//when received a message from the signaling sevrer
conn.onmessage = function (msg) {
    console.log("Got message", msg.data);

    var data = JSON.parse(msg.data);

    switch(data.type) {
        case "login":
            handleLogin(data.success);
            break;
        //when somebody wants to call us
        case "offer":
            handleOffer(date.offer, data.name);
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

conn.onerror = function (err) {
    console.log("Got error", err);
};

//alias for sending JSON encoded messages
function send( message) {
    //attach the other peer username to our messages
    if (connectedUser) {
        message.name = connectedUser;
    }

    conn.send(JSON.stringify(message));
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
 
var yourConn; 
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

function handleLogin(success0) {

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

            yourConn = new RTCPeerConnection(configuration);

            //setup stream listening
            yourConn.addStream(stream);

            //when a remote user adds stream to the peer connection, we display it
            yourConn.onaddstream = function (e) {
                remoteVideo.src = window.URL.createObjectURL(e.stream);
            };

            //setup ice handling
            yourConn.onicecandidate = function (event) {

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
