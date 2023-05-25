// ==UserScript==
// @name         Youtube Time Bars
// @version      3.0
// @description  Script which allows you to resume videos where you left off.
// @author       Emarioo/Dataolsson
// @include      *.youtube.*
// @run-at       document-body
// ==/UserScript==
var API_OPTIONS = null;

var API_TIMESTAMP_CACHE = [];
var API_CACHE_CHANGED = false;
const SPLIT_OBJECT = "\n";
const SPLIT_PROPERTY = " ";

function InitializeAPI(options) {
    if (API_OPTIONS) {
        console.log("API Options already set!")
        return;   
    }
    if (options == null) {
        console.log("API Options is null!");
        return;
    }
    if (typeof options != "object") {
        console.log("API Options is not of type object!");
        return;
    }
    API_OPTIONS = options;
    API_OPTIONS.enableCache = true;
    StartServerPinging();
    // Server is assumed to be offline. We have to start pinging to prove otherwise.
    // Any fetch requests will not be attempted if server is offline and the functions
    // doing fetch will not even try to ping. This should maybe change.
}
var lastQueryModified = 0;
async function QueryModified() {
    if (!IsServerOnline()) {
        if (API_OPTIONS.enableCache) {
            return CacheQueryModified();
        }
        return null;
    }
    let res = await fetch(API_OPTIONS.server+'/queryModified',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({
            userId: API_OPTIONS.user,
            lastModified: lastQueryModified,
        }),
    }).catch(err=>{
        // if(IsDebug(DEBUG_ERROR)) console.log("ERROR?",err);
    });
    if (res == null) {
        StartServerPinging();
        if (API_OPTIONS.enableCache) {
            return CacheQueryModified();
        }
        return null;
    }
    // console.log(res);
    if (!res.ok) {
        // if(IsDebug(DEBUG_ERROR)) console.log("Bad",response);
        return null;
    }
    let obj = await res.json();
    lastQueryModified = obj.lastModified;
    return obj.timestamps;
}
async function QueryTimestamp(videoId) {
    // console.log("QueryTimestamp", videoId,serverIsOnline);
    if (!IsServerOnline()) {
        if (API_OPTIONS.enableCache) {
            return CacheQuery(videoId);
        }
        return null;
    }
    //if(IsDebug(DEBUG_INFO)) console.log("Query",videoId);
    let res = await fetch(API_OPTIONS.server+'/query',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({
            userId: API_OPTIONS.user,
            videoId: videoId
        }),
    }).catch(err=>{
        if(API_OPTIONS.debugError) console.log("ERROR?",err);
    });
    if (res == null) {
        StartServerPinging();
        if (API_OPTIONS.enableCache) {
            return CacheGetTimestamp(videoId);
        }
        return null;
    }
    if (!res.ok) {
        if(API_OPTIONS.debugError) console.log("Bad",res);
        return null;
    }
    return await res.json();
}
async function InsertTimestamp(timestamp) {
    if (!IsServerOnline()) {
        StartServerPinging();
        // console.log(API_OPTIONS);
        if (API_OPTIONS.enableCache) {
            CacheInsert(timestamp);
        }
        return null;
    }
    
    if (API_OPTIONS.debugInfo)
        console.log("Insert", timestamp.videoId);
    let res = await fetch(API_OPTIONS.server + '/insert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: API_OPTIONS.user,
            timestamp: timestamp,
        }),
    });
    if (res == null) {
        StartServerPinging();
        if (API_OPTIONS.enableCache) {
            CacheInsert(timestamp);
        }
        return null;
    }
    if (!res.ok) {
        if (API_OPTIONS.debugError)
            console.log("Insert bad response?", res);
    }
}
function CacheInsert(timestamp) {
    // console.log("cache insert",timestamp)
    // Todo: validate timestamp
    for (let i = API_TIMESTAMP_CACHE.length - 1; i >= 0; i--) {
        let t = API_TIMESTAMP_CACHE[i];
        if (timestamp.videoId == t.videoId) {
            // only update if new timestamp is newer
            // console.log("suc insert", t, timestamp);
            if (t.lastModified <= timestamp.lastModified) {
                if (t.duration != timestamp.duration) {
                    // This is fine no need to log
                    // if (API_OPTIONS.debugWarning)
                    //     console.log("[Warning] Duration " + t.duration + " of '" + t.videoId + "' does not match inserted duration " + timestamp.duration);
                    t.duration = timestamp.duration;
                }
                if(API_OPTIONS.debugInfo)
                    console.log("Replacing ",t);
                t.time = timestamp.time;
                t.lastModified = timestamp.lastModified;
                API_CACHE_CHANGED = true;
                if (API_TIMESTAMP_CACHE.length - i != 1) {
                    // most recent changed timestamp is put at the back
                    API_TIMESTAMP_CACHE.splice(i, 1);
                    API_TIMESTAMP_CACHE.push(t);
                }

                return;
            } else {
                if (API_OPTIONS.debugWarning)
                    console.log("[Warning] Skipping insert of '" + timestamp.videoId + "' (lastMod: " + t.lastModified + ", newMod: " + timestamp.lastModified + ")");
                return;
            }
        }
    }
    // id does not exist, add new
    // timestamps.push(timestamp);
    API_TIMESTAMP_CACHE.push(timestamp);
    API_CACHE_CHANGED = true;
}
var API_CACHE_QUERY_MODIFIED = 0;
function CacheQueryModified() {
    // there may be a 0.5 second gap if you have bad latency where you will miss a timestamp
    // if it is on it's way. This is only relevant if you have multiple tabs open and care
    // about synchronization when looking at time bars.
    let max = API_CACHE_QUERY_MODIFIED;
    let list = [];
    for (let i = API_TIMESTAMP_CACHE.length - 1; i >= 0; i--) {
        let t = API_TIMESTAMP_CACHE[i];
        if (API_CACHE_QUERY_MODIFIED <= t.lastModified) {
            list.push(t);
            if (t.lastModified > max)
                max = t.lastModified;
        }
    }
    API_CACHE_QUERY_MODIFIED = max;
    // console.log("cache query modified", list);
    return list;
}
function CacheQuery(videoId) {
    // console.log("cache query",videoId)
    for (let i = API_TIMESTAMP_CACHE.length - 1; i >= 0; i--) {
        let t = API_TIMESTAMP_CACHE[i];
        if (videoId == t.videoId)
            return t;
    }
    return null;
}
// Load and save
function CacheMerge() {
    let localName = "ytbTimestamps";
    let data = localStorage.getItem(localName);

    if (data == null)
        data = "";
    // Todo: check for bad format
    let objs = data.split(SPLIT_OBJECT);
    let timestamps = [];
    for (let i = 0; i < objs.length; i++) {
        let str = objs[i];
        // console.log("T "+str+" "+str.length);
        if (str.length == 0)
            continue;

        let props = str.split(SPLIT_PROPERTY);
        let timestamp = new Timestamp(props[0], parseInt(props[1]), parseInt(props[2]), parseInt(props[3]));
        timestamps.push(timestamp);
    }

    for (let i = 0; i < timestamps.length; i++) {
        CacheInsert(timestamps[i]);
    }

    let content = "";
    for (let i = 0; i < API_TIMESTAMP_CACHE.length; i++) {
        let t = API_TIMESTAMP_CACHE[i];
        content += t.videoId + SPLIT_PROPERTY + t.time + SPLIT_PROPERTY + t.duration + SPLIT_PROPERTY + t.lastModified + SPLIT_OBJECT;
    }
    // console.log("Cache merge", API_TIMESTAMP_CACHE);
    localStorage.setItem(localName, content);
    API_CACHE_CHANGED = false;
}
var serverIsOnline = false;
function IsServerOnline() {
    return serverIsOnline;
}
var isPinging = false;
var pingDelay = 2;
var pingAttempts = 0;
const MAX_PING_DELAY = 30;
const MAX_PING_ATTEMPTS = 30;
function StartServerPinging() {
    if (API_OPTIONS.disablePinging && pingAttempts != 0) {
        return;
    }
    if (isPinging) return;
    
    // This is to prevent spam
    if (pingAttempts > MAX_PING_ATTEMPTS) {
        // console.log("Stopped pinging server")
        return;
    }
        
    // console.log("Try pinging server");
    isPinging = true;
    serverIsOnline = false;
    setTimeout(async () => {
        let success = false;
        let res = await fetch(API_OPTIONS.server + '/ping', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        }).catch(err => { });
        if (res != null)
            success = res.ok;
        
        if (success) {
            // console.log("Ping successful");
            serverIsOnline = true;
            isPinging = false;
        } else {
            pingDelay *= 2;
            pingAttempts++;
            if (pingDelay > MAX_PING_DELAY) {
                pingDelay = MAX_PING_DELAY;
            }
            isPinging = false;

            StartServerPinging();
        }
    }, pingDelay * 1000);
}
var SCRIPT_OPTIONS = null;

// console.log("loaded script content")

var updateInterval = null;
var updateRate = 0;
function StartUpdate(){
    if(SCRIPT_OPTIONS.updateRate==-1)
        updateRate = 10;
    else{
        if(SCRIPT_OPTIONS.updateRate<1)
            SCRIPT_OPTIONS.updateRate=1;
        updateRate = SCRIPT_OPTIONS.updateRate;
    }
    updateInterval = setInterval(async ()=>{
        if(SCRIPT_OPTIONS.updateRate!=-1){
            let timestamps = await QueryModified(SCRIPT_OPTIONS.server,SCRIPT_OPTIONS.user);
            if (timestamps) {
                if(SCRIPT_OPTIONS.debugInfo)
                    console.log("Update",timestamps.length);
                let map = GetElements();
                for(let i=0;i<timestamps.length;i++){
                    let timestamp = timestamps[i];
                    let elements = map[timestamp.videoId];
                    // console.log("elems",elements);
                    if(elements){
                        for(let j=0;j<elements.length;j++){
                            UpdateTimebar(elements[j],timestamp);
                        }
                    }
                }
            }
        }

        if((SCRIPT_OPTIONS.updateRate==-1&&updateRate!=10)||(SCRIPT_OPTIONS.updateRate!=-1&&updateRate!=SCRIPT_OPTIONS.updateRate)){
            clearInterval(updateInterval);
            StartUpdate();
        }
    },updateRate*1000);
}

var saveInterval = null;
var saveRate = 0;
// var saveDelay = 0;
// var DelaySave(){
//     saveDelay = 5;
// }
function StartSave() {
    if(SCRIPT_OPTIONS.saveRate==-1)
        saveRate = 10;
    else{
        if(SCRIPT_OPTIONS.saveRate<1)
            SCRIPT_OPTIONS.saveRate=1;
        saveRate = SCRIPT_OPTIONS.saveRate;
    }
    // console.log(SCRIPT_OPTIONS,saveRate);
    saveInterval = setInterval(() => {
        // console.log(GetPageType());
        if(SCRIPT_OPTIONS.saveRate!=-1){
            if(GetPageType()=="watch"){
                InsertTimestamp2();
            }
        }
        
        if((SCRIPT_OPTIONS.saveRate==-1&&saveRate!=10)||(SCRIPT_OPTIONS.saveRate!=-1&&saveRate!=SCRIPT_OPTIONS.saveRate)){
            clearInterval(saveInterval);
            StartSave();
        }
    },saveRate*1000);
}

function ValidateOptions(options) {
    if (options == null || typeof options != "object") {
        options = {};   
    }
    if (options.server == undefined) {
        console.log("Missing SCRIPT_OPTIONS.server");
        return null;
    }
    if (options.user == undefined) {
        console.log("Missing SCRIPT_OPTIONS.user");
        return null;
    }
    
    if (options.saveRate == undefined)
        options.saveRate = 2;
    if (options.updateRate == undefined)
        options.updateRate = 2;
    if (options.videoMinDuration == undefined)
        options.videoMinDuration = 60;
    if (options.debugError == undefined)
        options.debugError = true;
    if (options.debugWarning == undefined)
        options.debugWarning = true;
    if (options.debugInfo == undefined)
        options.debugInfo = false;
    
    return options;
}
let timesFailed = 0;
function Initialize(options) {
    if (!SCRIPT_OPTIONS) {
        SCRIPT_OPTIONS = ValidateOptions(options);
        if (SCRIPT_OPTIONS == null) {
            console.log("Initialize had bad options!")
            return;
        }
    }
    
    var start = document.getElementById("start");
    if (start == null || timesFailed == 0) {
        if(SCRIPT_OPTIONS.debugInfo)
            console.log("Loaded to quickly, waiting a bit...");
        timesFailed++;
        if (timesFailed < 7) {
            setTimeout(Initialize, 2000);
        }
        return;
    }
    
    if(SCRIPT_OPTIONS.debugInfo)
        console.log("Initializing timestamps");
    
    var styles = document.createElement("style");
    styles.textContent=`
        .my-duration{
            position:absolute;
            background-color:#444;
            bottom:0px;
            margin:0px;
            height:4px;
        }
        .my-duration-red{
            background-color:#d44;
        }
        `;
    document.body.appendChild(styles);
        
    // Load API script
    // let apiJS = document.createElement("script");
    // apiJS.src=SCRIPT_OPTIONS.server+"/api.js";
    // apiJS.onload = Initialize2;
    // document.body.appendChild(apiJS);
    
    Initialize2();
}
async function Initialize2() {
    InitializeAPI(SCRIPT_OPTIONS);
    // console.log("INIT WEE")
    document.addEventListener('yt-page-data-updated', OnPageUpdate);
    if(GetPlayer()!=null){
        GetPlayer().addEventListener("onStateChange", OnStateChange);
    }
    window.onbeforeunload=Terminate;
    
    if (location.pathname == "/watch")
        SetPageType("watch");
    
    CacheMerge();

    SetVideoTimestamp().catch(err => { console.log(err) });
    
    UpdateTimestamps().catch(err => { console.log(err)});

    StartSave();
    StartUpdate();
}
// time in seconds since 2020
function GetModifiedTime(){
    return Math.floor(Date.now()/1000-60*60*24*365*50);
}
var player=null;
function GetPlayer(){
    if(player==null){
        player=document.getElementById("movie_player");
    }
    return player;
}
class Timestamp {
    constructor(videoId,time,duration,lastModified){
        this.videoId=videoId;
        this.time=time;
        this.duration=duration;
        this.lastModified=lastModified;
    }
}
function UrlOptions(href){
    var SCRIPT_OPTIONS = href.substr(href.lastIndexOf("?")+1).split("&");
    var object={};
    for(var i=0;i<SCRIPT_OPTIONS.length;i++){
        var set = SCRIPT_OPTIONS[i].split("=");
        object[set[0]]=set[1];
    }
    return object;
}
async function SetVideoTimestamp(){
    var videoId = UrlOptions(location.href).v;
    if (!videoId) {
        console.log("SetVideoTimestamp bad id");
        return;
    }

    let timestamp = await QueryTimestamp(videoId);
    if (!timestamp) {
        if(SCRIPT_OPTIONS.debugInfo)
            console.log("Time bar '"+videoId+"' not found");
        safeToInsertNewData = true;
        return;
    }
    let time = timestamp.time-3; // -3 to give the user some time to remember where in the video they are
    if(time<0)
        time = 0;
    if (timestamp.duration-time < 5)
        time = timestamp.duration - 5;
    
    let tryLimit = 50;
    TrySetTime();
    function TrySetTime() {
        // Note: temporary solution for ignoring music videos
        let words = SCRIPT_OPTIONS.blacklist;
        let title = GetTitle();
        if (!title) {
            if (tryLimit == 0)
                return;
            tryLimit--;
            setTimeout(TrySetTime, 500);
            return;
        }
        title = title.toLowerCase();
        for (let i = 0; i < words.length; i++) {
            let pos = title.indexOf(words[i].toLowerCase());
            if (pos != -1) {
                if (SCRIPT_OPTIONS.debugInfo) {
                    console.log("Title matched with '"+words[i]+"' therefore playing from beginning");   
                }
                safeToInsertNewData = true;
                return
            }
        }
    
        if (SCRIPT_OPTIONS.debugInfo)
            console.log("Set playtime", time);
        if (Math.abs(GetCurrentTime() - time) > 0.3)
            GetPlayer().seekTo(time, true);
        safeToInsertNewData = true;
    }
}

var currentPageType="";
function GetPageType(){
    if(currentPageType==""){
        return window.location.pathname.substr(1);
    }
    return currentPageType;
}
function SetPageType(type){
    currentPageType = type;
}
function GetCurrentTime() {
    if (GetPlayer().getCurrentTime) {
        return GetPlayer().getCurrentTime();
    }
    // player.getCurrentTime is null when using chrome extension.
    // The code below is an alternative to aquiring time
    var elems = document.getElementsByClassName("ytp-time-current");
    if (elems.length == 0) return 0;
    let split = elems[0].innerText.split(":");
    return parseInt(split[0]) * 60 + parseInt(split[1]);
}
function GetVideoId() {
    if (GetPlayer().getVideoUrl) {
        return UrlOptions(GetPlayer().getVideoUrl()).v;
    }
    // Todo: location.href and playtime will be desynchronized for a moment when switching video.
    //      This will result in the time from the previous video being applied to the newly switched video.
    //      This is a massive bug, you can delay save time/inserttimestamp during the switch.
    return UrlOptions(location.href).v;
}
function GetDuration() {
    if (GetPlayer().getDuration) {
        return GetPlayer().getDuration();
    }
    // player.getDuration is null when using chrome extension.
    // The code below is an alternative to aquiring time
    var elems = document.getElementsByClassName("ytp-time-duration");
    if (elems.length == 0) return 0;
    let split = elems[0].innerText.split(":");
    return parseInt(split[0]) * 60 + parseInt(split[1]);
}
function GetTitle() {
    // Todo: not synchronized when switching video. The document doesn't update quick enough
    //   and as such the title of the previous video is retrieved.
    let primary_inner = document.getElementById("primary-inner");
    // console.log(primary_inner);
    if (!primary_inner) return null;

    let a = primary_inner.getElementsByTagName("h1")[0];
    if (!a) return null;
    let b = a.children[0];
    if (!b) return null;
    return b.innerText;
    // let indices = [1, 4, 0, 0, 3, 0];
    // let titleElement = primary_inner;
    // for (let i = 0; i < indices.length; i++) {
    //     if (titleElement) {
    //         console.log("oof");
    //         return null;
    //     }
    //     titleElement = titleElement.children[i];
    // }
    // if (titleElement) {
    //     console.log("oof");
    //     return null;
    // }
    // let titleElement = primary_inner.children[1].children[4].children[0].children[0].children[3].children[0];
    // return titleElement.innerText;
}
var safeToInsertNewData = false;
// This is not an api function because it is often used and you would need to pass in server, user and timestamp.
async function InsertTimestamp2() {
    if (!safeToInsertNewData)
        return;
    
    let timestamp = new Timestamp(GetVideoId(), GetCurrentTime(), GetDuration(), GetModifiedTime());
    if (SCRIPT_OPTIONS.debugInfo) {
        console.log("Try save, ",timestamp);   
    }
    
    // console.log("yeah?",timestamp);
    // don't save short videos
    if(timestamp.duration<SCRIPT_OPTIONS.minVideoDuration)
        return;

    InsertTimestamp(timestamp);
}
function GetElements(){
    let map = {};
    let elems = document.getElementsByTagName("ytd-thumbnail");
    for(let i=0;i<elems.length;i++){
        if(elems[i].children.length==0){
            if(SCRIPT_OPTIONS.debugWarning) console.log("Element has no children?");
            continue;
        }
        let element = elems[i].children[0];
        let SCRIPT_OPTIONS = UrlOptions(element.href);
        if(SCRIPT_OPTIONS.v==null) continue;

        let list = map[SCRIPT_OPTIONS.v];
        // there can be thumbnails of the same video
        if(list) list.push(element);
        else map[SCRIPT_OPTIONS.v] = [element];
    }
    return map;
}
// timebar is removed if timestamp is null
function UpdateTimebar(element,timestamp){
    // Do you exist?
    let timebar = element.getElementsByClassName("my-duration-red");
    if(timebar.length!=0){
        timebar = timebar[0];
        // should you exist
        if(timestamp){
            // console.log("Timebar",timestamp,element);
            // update existing
            let newPercent = Math.floor(100*(timestamp.time/timestamp.duration));
            timebar.style.width=newPercent+"%";
        }else{
            // remove
            let del = element.getElementsByClassName("my-duration");
            for(let j=0;j<del.length;j++)
                del[j].remove();
        }
    }else if(timestamp){
        // console.log("Makeing ",timestamp);
        // create new
        var divFront = document.createElement("div");
        var divBack = document.createElement("div");
        divBack.classList.add("my-duration");
        divBack.style.width="100%";
        divFront.classList.add("my-duration","my-duration-red");
        if(timestamp.duration==0)
            if (SCRIPT_OPTIONS.debugWarning) console.log("WARNING duration is 0",timestamp.videoId);
        let newPercent = Math.floor(100*(timestamp.time/timestamp.duration));
        divFront.style.width=newPercent+"%";
        element.appendChild(divBack);
        element.appendChild(divFront);
    }
}
async function UpdateTimestamps(){
    let elems = document.getElementsByTagName("ytd-thumbnail");
    
    if(SCRIPT_OPTIONS.debugInfo) console.log("Updating ",elems.length);

    for(let i=0;i<elems.length;i++){
        if(elems[i].children.length==0){
            if (SCRIPT_OPTIONS.debugWarning)
                console.log("Element has no children?");
            continue;
        }
        let element = elems[i].children[0];
        let ops = UrlOptions(element.href);
        // console.log(elems[i], element);
        // console.log("eh", ops.v);
        if (ops.v != null) {
            // console.log("Start query",ops);
            let timestamp = await QueryTimestamp(ops.v);
            // console.log("queried", timestamp);
            if (IsServerOnline() || timestamp) { // || timestamp because cache may have it
                // UpdateTimebar will remove time bar if timestamp is null which it should if timestamp doesn't exist.
                // But timestamp could also be null if server wasn't reached. If so we want to do anything.
                UpdateTimebar(element, timestamp);
            };
        }
    }
}

function OnPageUpdate(e) {
    if (e.detail==null)
        return;
    let pageType = e.detail.pageType;
    SetPageType(pageType);
    // DelaySave();
    // UpdateTimestamps();
    if(SCRIPT_OPTIONS.debugInfo)
        console.log("Page", pageType);
    if(pageType == "watch"){
        SetVideoTimestamp();
    }
}
function OnStateChange(state){
    let vidtime = GetCurrentTime();
    if((state==-1&&vidtime!=0)||state==2){ // save when leaving or pausing
        InsertTimestamp2();
    }
}
function Terminate() {
    // if(SCRIPT_OPTIONS.debugInfo) console.log("Terminate");
    if(GetPageType()=="watch"){
        InsertTimestamp2();
    }
    CacheMerge();
}
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

        // how often time bars on thumbnails should be saved
        updateRate: 2,
        
        disablePinging: true,
        
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
