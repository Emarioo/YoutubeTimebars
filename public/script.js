var OPTIONS = null;

var updateInterval = null;
var updateRate = 0;
function StartUpdate(){
    if(OPTIONS.updateRate==-1)
        updateRate = 10;
    else{
        if(OPTIONS.updateRate<1)
            OPTIONS.updateRate=1;
            updateRate = OPTIONS.updateRate;
    }
    updateInterval = setInterval(async ()=>{
        if(OPTIONS.updateRate!=-1){
            let timestamps = await QueryModified(OPTIONS.server,OPTIONS.user);
            if(timestamps) {
                // console.log("Update",timestamps.length);
                let map = GetElements();
                for(let i=0;i<timestamps.length;i++){
                    let timestamp = timestamps[i];
                    let elements = map[timestamp.videoId];
                    if(elements){
                        for(let j=0;j<elements.length;j++){
                            UpdateTimebar(elements[j],timestamp);
                        }
                    }
                }
            }
        }

        if((OPTIONS.updateRate==-1&&updateRate!=10)||(OPTIONS.updateRate!=-1&&updateRate!=OPTIONS.updateRate)){
            clearInterval(updateInterval);
            StartUpdate();
        }
    },updateRate*1000);
}

var saveInterval = null;
var saveRate = 0;
function StartSave(){
    if(OPTIONS.saveRate==-1)
        saveRate = 10;
    else{
        if(OPTIONS.saveRate<1)
            OPTIONS.saveRate=1;
        saveRate = OPTIONS.saveRate;
    }
    saveInterval = setInterval(()=>{
        if(OPTIONS.saveRate!=-1){
            if(GetPageType()=="watch"){
                InsertTimestamp();
            }
        }
        
        if((OPTIONS.saveRate==-1&&saveRate!=10)||(OPTIONS.saveRate!=-1&&saveRate!=OPTIONS.saveRate)){
            clearInterval(saveInterval);
            StartSave();
        }
    },saveRate*1000);
}

var serverIsOnline = false;
function IsServerOnline(){
    return serverIsOnline;
}
var isPinging=false;
var pingDelay=2;
const MAX_PING_DELAY = 30;
function StartServerPinging(){
    if(isPinging) return;
    isPinging = true;
    serverIsOnline = false;
    setTimeout(async ()=>{
        let success = await PingServer(OPTIONS.server);
        if(success){
            serverIsOnline=true;
            isPinging=false;
        }else{
            pingDelay*=2;
            if(pingDelay>MAX_PING_DELAY){
                pingDelay=MAX_PING_DELAY;
            }
            isPinging=false;

            StartServerPinging();
        }
    },pingDelay*1000);
}

function Initialize(options){
    // Todo: validate options

    if(OPTIONS!=null){
        console.log("Options has already been set!")
        return;
    }
    OPTIONS = options;

    StartServerPinging();

    if(OPTIONS.debugInfo)
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
    let apiJS = document.createElement("script");
    apiJS.src=OPTIONS.server+"/api.js";
    document.body.appendChild(apiJS);

    apiJS.onload=Initialize2;
}
function Initialize2(){

    document.addEventListener('yt-page-data-updated', OnPageUpdate);
    if(GetPlayer()!=null){
        GetPlayer().addEventListener("onStateChange", OnStateChange);
    }
    window.onbeforeunload=Terminate;
    
    UpdateTimestamps();

    SetVideoTimestamp();
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
    var options = href.substr(href.lastIndexOf("?")+1).split("&");
    var object={};
    for(var i=0;i<options.length;i++){
        var set = options[i].split("=");
        object[set[0]]=set[1];
    }
    return object;
}
async function SetVideoTimestamp(){
    var videoId = UrlOptions(location.href).v;
    if(!videoId)
        return;

    let timestamp = await QueryTimestamp(OPTIONS.server,OPTIONS.user,videoId);
    if(!timestamp){
        console.log("bad timestamp href:",location.href,"id:",videoId);

        return;
    }
    let time = timestamp.time-3; // -3 to give the user some time to remember where in the video they are
    if(time<0)
        time=0;
    player.seekTo(time, true);
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
// This is not an api function because it is often used and you would need to pass in server, user and timestamp.
async function InsertTimestamp(){
    let timestamp = new Timestamp(UrlOptions(GetPlayer().getVideoUrl()).v,GetPlayer().getCurrentTime(),GetPlayer().getDuration(),GetModifiedTime());
    
    // don't save short videos
    if(timestamp.duration<OPTIONS.minVideoDuration)
        return;

    if(OPTIONS.debugInfo) console.log("Insert",timestamp.videoId);
    let res = await fetch(OPTIONS.server+'/insert',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify({
            userId: OPTIONS.user,
            timestamp: timestamp,
        }),
    });
    
    if(!res.ok){
        if(OPTIONS.debugError) console.log("Insert bad response?",res);
    }
}
function GetElements(){
    let map = {};
    let elems = document.getElementsByTagName("ytd-thumbnail");
    for(let i=0;i<elems.length;i++){
        if(elems[i].children.length==0){
            if(OPTIONS.debugWarning) console.log("Element has no children?");
            continue;
        }
        let element = elems[i].children[0];
        let options = UrlOptions(element.href);
        if(options.v==null) continue;

        let list = map[options.v];
        // there can be thumbnails of the same video
        if(list) list.push(element);
        else map[options.v] = [element];
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
            if(IsDebug(DEBUG_WARNING)) console.log("WARNING duration is 0",timestamp.videoId);
        let newPercent = Math.floor(100*(timestamp.time/timestamp.duration));
        divFront.style.width=newPercent+"%";
        element.appendChild(divBack);
        element.appendChild(divFront);
    }
}
function UpdateTimestamps(){
    let elems = document.getElementsByTagName("ytd-thumbnail");
    
    if(OPTIONS.debugInfo)console.log("Updating ",elems.length);

    for(let i=0;i<elems.length;i++){
        if(elems[i].children.length==0){
            if(OPTIONS.debugWarning) console.log("Element has no children?");
            continue;
        }
        let element = elems[i].children[0];
        let options = UrlOptions(element.href);
        if(options.v!=null){
            QueryTimestamp(OPTIONS.server,OPTIONS.user,options.v).then(timestamp=>{
                UpdateTimebar(element,timestamp);
            });
        }
    }
}

function OnPageUpdate(e){
    let pageType = e.detail.pageType;
    SetPageType(pageType);
    // UpdateTimestamps();

    if(pageType == "watch"){
        SetVideoTimestamp();
    }
}
function OnStateChange(state){
    let vidtime = GetVideoTime();
    if((state==-1&&vidtime!=0)||state==2){ // save when leaving or pausing
        InsertTimestamp();
    }
}
function Terminate(){
    // if(OPTIONS.debugInfo) console.log("Terminate");
    if(GetPageType()=="watch"){
        InsertTimestamp();
    }
}