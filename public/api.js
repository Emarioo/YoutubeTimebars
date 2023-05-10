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