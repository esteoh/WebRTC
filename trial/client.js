function hasUserMedia() {
    //check if teh browser support webrtc
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
}

if (hasUserMedia()) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    //enabling video and audio channels
    navigator.getUserMedia({ video: true, audio: true }, function (stream) {
        //console.log("testing 1 2 3 4 5");
        var video = document.querySelector('video');
        console.log(stream);

        //insert our stream into the video tag
        video.src = window.URL.createObjectURL(stream);
    }, function (err) {});
} else {
    alert("WebRTC is not supported");
}