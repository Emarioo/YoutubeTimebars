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