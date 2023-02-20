var API_OPTIONS = null;

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
    StartServerPinging();
    // Server is assumed to be offline. We have to start pinging to prove otherwise.
    // Any fetch requests will not be attempted if server is offline and the functions
    // doing fetch will not even try to ping. This should maybe change.
}

var lastQueryModified = 0;
async function QueryModified() {
    if (!IsServerOnline()) {
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
        return null;
    }
    // console.log(res);
    if (!res.ok) {
        // if(IsDebug(DEBUG_ERROR)) console.log("Bad",response);
        return null;
    }
    obj = await res.json();
    lastQueryModified = obj.lastModified;
    return obj.timestamps;
}
async function QueryTimestamp(videoId) {
    if (!IsServerOnline()) {
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
        if(IsDebug(DEBUG_ERROR)) console.log("ERROR?",err);
    });
    if (res==null) {
        StartServerPinging();
        return null;
    }
    if (!res.ok) {
        if(IsDebug(DEBUG_ERROR)) console.log("Bad",res);
        return null;
    }
    return await res.json();
}
async function InsertTimestamp(timestamp) {
    if (!IsServerOnline()) {
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
        return null;
    }
    if (!res.ok) {
        if (API_OPTIONS.debugError) console.log("Insert bad response?", res);
    }
}
var serverIsOnline = false;
function IsServerOnline() {
    return serverIsOnline;
}
var isPinging = false;
var pingDelay = 2;
const MAX_PING_DELAY = 30;
function StartServerPinging() {
    if (isPinging) return;
    
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
            if (pingDelay > MAX_PING_DELAY) {
                pingDelay = MAX_PING_DELAY;
            }
            isPinging = false;

            StartServerPinging();
        }
    }, pingDelay * 1000);
}