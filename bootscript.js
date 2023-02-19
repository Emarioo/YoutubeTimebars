// ==UserScript==
// @name         Youtube Time Bars
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Script which combined with a server allows you to resume videos where you left off.
// @author       Emarioo/Dataolsson
// @include      *.youtube.*
// @run-at       document-body
// ==/UserScript==

// Note: Every option with time is in seconds
var OPTIONS = {
    server: "http://localhost:3000",
    user: "Emarioo",
    
    // how often the time of the video should be saved
    saveRate: 2,
    
    // videos with less duration will not be saved, you usually don't want to save time in a music video.
    videoMinDuration: 60,
    
    // how often time bars on thumbnails should be saved
    updateRate: 2,
    
    // if server cannot be reached, the script will keep trying untill it can.
    // keepPingingOnFailure: true,

    debugError:true,
    debugWarning:true,
    debugInfo:false
};

(function() {
    'use strict';

    let script = document.createElement("script");
    script.src = OPTIONS.server+"/script.js";
    document.body.appendChild(script);

    script.onload=()=>{
        Initialize(OPTIONS);
    }
})();