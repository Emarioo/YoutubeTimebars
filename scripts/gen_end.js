(function () {
    'use strict';

    // Note: Every option with time is in seconds
    var OPTIONS = {
        server: "http://localhost:8080",
        user: "test",

        // how often the time of the video should be saved
        saveRate: 2,

        // videos with less duration will not be saved, you usually don't want to save time in a music video.
        videoMinDuration: 60,

        // how often time bars on thumbnails should be updated
        updateRate: 2,
        
        disablePinging: true,
        
        // How often timestamps should be saved to local storage (or sent to server)
        permanentSaveRate: 6,
        
        debugError: true,
        debugWarning: true,
        debugInfo: false,
        
        blacklist: ["nightcore", "song", "music", "lyrics", "remix", "cover","acapella"]
    };

    // let script = document.createElement("script");
    // script.src = OPTIONS.server + "/script.js";
    // document.body.appendChild(script);

    // script.onload = () => {
    Initialize(OPTIONS);
    // }

})();