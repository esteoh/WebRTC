//our username
var name;
var connectedUser;

//connecting to the signalling server
var wsConn =  new WebSocket('ws://localhost:9090');

wsConn.onopen = function () {
    console.log("wsConn: Connected to the signalling server");
};

//when we got a message from a signaling server
wsConn.onmessage = function (msg) {
    console.log("wsConn: Got message", msg.data);

    var data = JSON.parse(msg.data);

    switch(data.type) {
        case "login":
            handleLogin(data.success);
            break;
        //when somebody want to call us
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

wsConn.onerror = function (err) {
    console.log("wcConn: Got error", err);
};

//alias for sending JSON encoded messages
function send(message) {
    //attach the other peer username to our messages
    if (connectedUser) {
        message.name = connectedUser;
    }

    wsConn.send(JSON.stringify(message));
};

//****** 
//UI selectors block
//******

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var chatArea = document.querySelector('#chatArea');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');
var hangUpBtn = document.querySelector('#hangUpBtn');
var msgInput = document.querySelector('#msgInput');
var sendMsgBtn = document.querySelector('#sendMsgBtn');

var peerConn;
var dataChannel;

callPage.style.display = "none";

//Login when the user clicks the button
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
        alert("Oops...try a different username");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        //********************** 
        //Starting a peer connection 
        //**********************

        //using Goole public stun server
        var configuration = {
            "iceServers": [{ "url": "stun:stun2.1.google.com:19320" }]
        };

        peerConn = new RTCPeerConnection(configuration);
        // console.log("RTCPeerConnection object created: ", peerConn); 

        //setup ice handling
        peerConn.onicecandidate = function (event) {
            if (event.candidate) {
                send({
                    type: "candidate",
                    candidate: event.candidate
                });
            }
        };

        
        //creating data channel
        dataChannel = peerConn.createDataChannel("MyDataChannel");

        dataChannel.onopen = function (event) {
            var channelState = dataChannel.readyState;
            // console.log("RTCDataChannel state is: ", channelState);
        };

        peerConn.ondatachannel = function (event) {
            var receiveChannel = event.channel;
            // console.log("receiveChannel is: ", receiveChannel);
            receiveChannel.onmessage = function (event) {
                console.log("Received DataChannelMsg: ", event.data);
                chatArea.innerHTML += connectedUser + ": " + event.data + "<br />";
            };
        };
        
        dataChannel.onerror = function (error) {
            console.log("Oops...error:", error);
        };

        //when we receive a message from the other peer, display it on the screen
        // dataChannel.onmessage = function (event) {
        //     console.log("Received DataChannelMsg2:", event.data);
        //     chatArea.innerHTML += connectedUser + ": " + event.data + "<br />";
        // };

        dataChannel.onclose = function () {
            console.log("data channel is closed");
        };
    }
};

//initiating a call
callBtn.addEventListener("click", function () {
    var callToUsername = callToUsernameInput.value;

    if (callToUsername.length > 0) {

        connectedUser = callToUsername;

        //create an offer
        peerConn.createOffer(function (offer) {

            send({
                type: "offer",
                offer: offer
            });

            peerConn.setLocalDescription(offer);

        }, function (error) {
            alert("Error when creating an offer");
        });
    }
});

//when somebody sends us an offer
function handleOffer(offer, name) {
    connectedUser = name;
    peerConn.setRemoteDescription(new RTCSessionDescription(offer));

    //create an answer to an offer
    peerConn.createAnswer(function (answer) {
        peerConn.setLocalDescription(answer);

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
    peerConn.setRemoteDescription(new RTCSessionDescription(answer));
};

//when we got an ice candidate from remote user
function handleCandidate(candidate) {
    peerConn.addIceCandidate(new RTCIceCandidate(candidate));
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
    dataChannel.close();
    peerConn.close();
    peerConn.onicecandidate = null;
};

//when user clicks the "send message" button
sendMsgBtn.addEventListener("click", function (event) {
    var val = msgInput.value;
    chatArea.innerHTML += name + ": " + val + "<br />";
    console.log("Sending DataChannelMsg: ", val);
    dataChannel.send(val);
    msgInput.value = "";
});
