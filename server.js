// ############
//   SETTINGS
// ############

var OPTIONS = {
    port: 8080,
    // seconds
    databaseSaveRate: 60,
    
    debugError: true,
    debugWarning: true,
    debugInfo: false
};

// ###################
//   Libraries and setup
// ###################
const express = require('express')
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors')
const { type } = require('os')
const app = express()

app.use(bodyParser.json());
app.use(cors());

function GetSystemSeconds(){
    return Date.now()/(1000)-60*60*24*365*50;
}

function GetDisplayTime(){
    let date = new Date();
    let str = "[";
    if(date.getHours()<10) str+="0";
    str+=date.getHours()+":";
    if(date.getMinutes()<10) str+="0";
    str+=date.getMinutes()+":";
    if(date.getSeconds()<10) str+="0";
    str+=date.getSeconds();
    return str+"]";
}
function Log(str){
    console.log(GetDisplayTime(),str);
}

// ##############
//    Database
// ##############
const SPLIT_OBJECT="\n";
const SPLIT_PROPERTY=" ";

class Timestamp{
    constructor(videoId,time,duration,lastModified){
        this.videoId=videoId;
        this.time=time;
        this.duration=duration;
        this.lastModified=lastModified;
    }
}

function IsUserValid(userId){
    // console.log(userId);
    if(userId==null) return false;
    // console.log("not null");
    if(typeof userId != "string") return false;
    // console.log("is null");
    // if(userId.toLocaleLowerCase()=="users") return false;
    // console.log("not users");
    if(userId.length==0||userId.length>20) return false;
    // console.log("less than 20");
    // console.log("TEST");
    for(let i=0;i<userId.length;i++){
        let code = userId.charCodeAt(i);
        let any = 0;
        if(code>='a'.charCodeAt(0)&&code<='z'.charCodeAt(0)) any=1;
        if(code>='A'.charCodeAt(0)&&code<='Z'.charCodeAt(0)) any=2;
        if(code>='0'.charCodeAt(0)&&code<='9'.charCodeAt(0)) any=3
        if(code=='_'||code=='-') any=4;
        
        // console.log(" "+code+" a "+any);
        // any is good for debugging
        if(any==0)
            return false;
    }
    return true;
}
function IsTimestampValid(timestamp){
    if(typeof timestamp != "object") return false;

    if(!IsVideoValid(timestamp.videoId)) return false;
    if(typeof timestamp.time != "number") return false;
    if(typeof timestamp.duration != "number") return false;
    if(typeof timestamp.lastModified != "number") return false;

    timestamp.time = Math.floor(timestamp.time);
    timestamp.duration = Math.floor(timestamp.duration);
    timestamp.lastModified = Math.floor(timestamp.lastModified);
    
    return true;
}
function IsVideoValid(videoId){
    if(videoId==null) return false;
    // console.log("not null");
    if(typeof videoId != "string") return false;
    // console.log("is null");
    if(videoId.length==0||videoId.length>20) return false; // 11 may be the limit but youtube might change this so 20 is used.
    // console.log("less than 20");
    
    for(let i=0;i<videoId.length;i++){
        let code = videoId.charCodeAt(i);
        // console.log(code);
        let any = 0;
        if(code>='a'&&code<='z') any=1;
        if(code>='A'&&code<='Z') any=2;
        if(code>='0'&&code<='9') any=3
        if(code=='_'||code=='-') any=4;
        
        // any is good for debugging
        if(any!=0)
            return false;
    }

    return true;
}
class UserData{
    constructor(userId,fileName){
        this.userId = userId;
        this.fileName = fileName;
        this.timestamps = [];
        this.hasChanged = false;
        this.isLoaded = false;
    }
}
class Database {
    constructor(){
        this.users = [];
        this.root = __dirname+"/database";
        this.nextFileName = 0;
        this.timestamps = [];
        this.hasChanged=false;
    }
    clear(){
        this.timestamps = [];
    }
    get(userId, videoId){
        let timestamps = this.getUser(userId).timestamps;

        for(let i=timestamps.length-1;i>=0;i--){
            let t = timestamps[i];
            if(videoId==t.videoId)
                return t;
        }
        return null;
    }
    getRecent(userId, lastModified){
        let timestamps = this.getUser(userId).timestamps;

        // there may be a 0.5 second gap if you have bad latency where you will miss a timestamp
        // if it is on it's way. This is only relevant if you have multiple tabs open and care
        // about synchronization when looking at time bars.
        let max = lastModified;
        let list = [];
        for(let i=timestamps.length-1;i>=0;i--){
            let t = timestamps[i];
            if(lastModified<t.lastModified){
                list.push(t);
                if(t.lastModified>max)
                    max = t.lastModified;
            }
        }

        return {timestamps:list,lastModified:max};
    }
    // Users must have been loaded, database will be overwritten otherwise
    getUser(userId){
        // console.log(this.users);
        for(let i=0;i<this.users.length;i++){
            let user = this.users[i];
            if(user.userId==userId){
                if(!user.isLoaded){
                    this.loadTimestamps(user);
                }
                return user;
            }
        }
        // console.log("Create user",this.nextFileName);
        // create new user if not found
        let newUser = new UserData(userId,""+(this.nextFileName++));
        this.users.push(newUser);
        this.hasChanged = true;
        this.isLoaded = true;
        // this.loadTimestamps(newUser); // nothing to load.
        return newUser;
    }
    hasUser(userId){
        // console.log(userId);
        for(let i=0;i<this.users.length;i++){
            let user = this.users[i];
            if(user.userId==userId){
                // console.log(user.userId,"==",userId);
                return true;
            }
        }
        return false;
    }
    insert(userId, timestamp){
        let user = this.getUser(userId);
        let timestamps = user.timestamps;

        // latest access should be pushed to front, everything else should be moved back
        // Check if videoId exists
        for(let i=timestamps.length-1;i>=0;i--){
            let t = timestamps[i];
            if(timestamp.videoId==t.videoId){
                // only update if new timestamp is newer
                if(t.lastModified<=timestamp.lastModified){
                    if(t.duration!=timestamp.duration){
                        if(OPTIONS.debugWarning)console.log("[Warning] Duration "+t.duration+" of '"+t.videoId+"' does not match inserted duration "+timestamp.duration);
                        t.duration = timestamp.duration;
                    }
                    t.time = timestamp.time;
                    t.lastModified = timestamp.lastModified;
                    user.hasChanged=true;
                    if(timestamps.length-i!=1){
                        // most recent changed timestamp is put at the back
                        timestamps.splice(i,1);
                        timestamps.push(t);
                    }
                    
                    return;
                }else{
                    if(OPTIONS.debugWarning) console.log("[Warning] Skipping insert of '"+timestamp.videoId+"' (lastMod: "+t.lastModified+", newMod: "+timestamp.lastModified+")");
                    return;
                }
            }
        }
        // id does not exist, add new
        // timestamps.push(timestamp);
        timestamps.push(timestamp);
        user.hasChanged=true;
    }
    save(force = false) {
        if (!fs.existsSync(this.root)) {
            fs.mkdirSync(this.root, { recursive: true });
        }
        
        if(this.hasChanged||force){
            let content = "";
            for(let i=0;i<this.users.length;i++){
                let t = this.users[i];
                content += t.userId+SPLIT_PROPERTY+t.fileName+SPLIT_OBJECT;
            }
            let path = this.root + "/users.txt";
            
            try{
                fs.writeFileSync(path,content,'utf8');
            }catch(err){
                if(OPTIONS.debugError)console.log("[Error] Cannot save database '"+path+"'");
                // Note: that if user saving failes, save of timestamps will not be attempted.
                //  This is to keep the database consistent.
                return;

            }
            this.hasChanged=false;
            if(OPTIONS.debugInfo)Log("Saved database with "+this.users.length+" users");
        }
        for(let j=0;j<this.users.length;j++){
            let user = this.users[j];
            if(!user.hasChanged||force) continue;

            // console.log("user",user);
            let content = "";
            for(let i=0;i<user.timestamps.length;i++){
                let t = user.timestamps[i];
                content += t.videoId+SPLIT_PROPERTY+t.time+SPLIT_PROPERTY+t.duration+SPLIT_PROPERTY+t.lastModified+SPLIT_OBJECT;
            }
            let path = this.root+"/"+user.fileName+".txt";
            try{
                fs.writeFileSync(path,content,'utf8');
            }catch(err){
                if(OPTIONS.debugError) console.log("[Error] Cannot save timestamps '"+path+"'");
                return;
            }
            user.hasChanged = false;
            if(OPTIONS.debugInfo)Log("Saved database with "+user.timestamps.length+" timestamps");
        }
    }
    loadUsers(){
        // no need to load users them
        let path = this.root+"/users.txt";
        let data=null;
        try{
            data = fs.readFileSync(path,'utf8');
        }catch(err){
            if(OPTIONS.debugError)console.log("[Error] Cannot load database '"+path+"'");
            return;
        }
        if(this.users.length!=0){
            if(OPTIONS.debugWarning)console.log("[Warning] Overwriting database, may have lost "+this.users.length+" users");
            this.users = []; // rip
        }
        this.nextFileName = 0;
        // Todo: check for bad format
        let users = data.split(SPLIT_OBJECT);
        for(let i=0;i<users.length;i++){
            let str = users[i];
            // console.log("T "+str+" "+str.length);
            if(str.length==0)
                continue;

            let props = str.split(SPLIT_PROPERTY);
            let user = new UserData(props[0],props[1]);
            this.users.push(user);

            let num = parseInt(props[1]);
            if(this.nextFileName<=num)
                this.nextFileName = num + 1;
        }
        if(OPTIONS.debugInfo) Log("Loaded database with "+this.users.length+" users");
    }
    loadTimestamps(user){
        user.isLoaded=true;
        let path = this.root+"/"+user.fileName+".txt";
        let data = null;
        try{
            data = fs.readFileSync(path,'utf8');
        }catch(err){
            if(OPTIONS.debugError)
                console.log("[Warning] Cannot load user from '"+path+"', is user new?");
            return;
        }

        if(user.timestamps.length!=0){
            if(OPTIONS.debugWarning) console.log("[Warning] Overwriting database, may have lost "+user.timestamps.length+" timestamps");
            user.timestamps = []; // rip
        }

        // Todo: check for bad format
        let timestamps = data.split(SPLIT_OBJECT);
        for(let i=0;i<timestamps.length;i++){
            let str = timestamps[i];
            // console.log("T "+str+" "+str.length);
            if(str.length==0)
                continue;

            let props = str.split(SPLIT_PROPERTY);
            let timestamp = new Timestamp(props[0],parseInt(props[1]),parseInt(props[2]),parseInt(props[3]));
            user.timestamps.push(timestamp);
        }

        if(OPTIONS.debugInfo)
            Log("Loaded user with "+user.timestamps.length+" timestamps");
    }
}
let database = new Database();
database.loadUsers();

// ############
//    Server
// ############

app.use('/',express.static(__dirname+"/public"));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});
app.get('/', (req, res) => {
    // console.log("Get ",req.url);
    res.sendFile(__dirname+'/public/user.html')
})
// app.get('/script',(req,res)=>{
//     console.log(req.url);
    
//     res.sendFile(__dirname+'/public/script.js');
// })
app.get("*",(req,res)=>{
    // Validate url?
    // console.log("hello ",req.url);
    // let userId = req.url.substr(1); // remove /
    // if(!IsUserValid(userId)){
    //     // res.sendStatus(403);
    //     // return;
    // }else{
    //     let validUser = database.hasUser(userId);
    //     if(!validUser){
    //         console.log("User '"+userId+"' not found");
    //         // res.sendStatus(404);
    //         // return;
    //     }
    // }
    res.sendFile(__dirname+'/public/user.html')
});
app.post('/ping',(req,res)=>{
    res.sendStatus(200);
});
app.post('/query',(req,res)=>{
    // console.log("Query start");
    let userId = req.body.userId;
    let videoId = req.body.videoId;
    
    if(!IsUserValid(userId)){
        res.sendStatus(403);
        return;
    }
    if(!IsVideoValid(videoId)){
        res.sendStatus(403);
        return;
    }

    let timestamp = database.get(userId,videoId);
    if(timestamp){
        // if(OPTIONS.debugInfo)console.log("Query '"+video+"' from '"+user+"'");
        res.json(timestamp).status(200);
    } else{
        // console.log("Query '"+video+"' was missing");
        res.json(null).status(200);
    }
    // console.log("Query finished");
})
// Todo: multi query
app.post('/queryModified',(req,res)=>{
    let userId = req.body.userId;
    let lastModified = req.body.lastModified;
    
    // console.log(userId);
    if(!IsUserValid(userId)){
        res.sendStatus(403);
        return;
    }
    // console.log(" ok");
    if(typeof lastModified != "number")
        lastModified = 0;
    lastModified = Math.floor(lastModified);
    // console.log("input:",req.body);
    // console.log("output:",recent);

    let recent = database.getRecent(userId,lastModified);
    res.json(recent).status(200);
})
app.post('/insert',(req,res)=>{
    let userId = req.body.userId;
    let timestamp = req.body.timestamp;

    if(!IsUserValid(userId)){
        res.sendStatus(403);
        return;
    }
    if(!IsTimestampValid(timestamp)){
        res.sendStatus(403);
        return;
    }

    // Todo: check if timestamp is valid? hacker may have sent wierd stuff?
    if(timestamp.time>3) // no point in saving time
        database.insert(userId,timestamp);

    // if(OPTIONS.debugInfo) console.log("Inserted '"+timestamp.videoId+"' from '"+userId+"',",timestamp);

    res.sendStatus(200); // has to send back something (thats how http protocol works)
});

setInterval(()=>{
    database.save();
},1000*OPTIONS.databaseSaveRate);

if(process.argv.length>=3){
    OPTIONS.port = parseInt(process.argv[2]); // arg0 is node.exe, arg1 is server.js
}

let server = app.listen(OPTIONS.port, () => {
    console.log('Listening on port ' + OPTIONS.port)
})
server.on("close",OnClose);
function OnClose(){
    database.save();
}
process.on('SIGTERM', () => {
    // console.log("SIGTERM");
    OnClose();
    // server.close(); // dosen't work, probably because of http 1.1 persistant connection
    process.exit(0);
});
process.on('SIGINT', () => {
    // console.log("SIGINT");
    OnClose();
    // server.close();
    process.exit(0);
});