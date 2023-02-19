var lastQueryModified=0;
async function QueryModified(serverAddress, userId){
    let res = await fetch(serverAddress+'/queryModified',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({
            userId: userId,
            lastModified: lastQueryModified,
        }),
    }).catch(err=>{
        // if(IsDebug(DEBUG_ERROR)) console.log("ERROR?",err);
    });
    // console.log(res);
    if(!res.ok){
        // if(IsDebug(DEBUG_ERROR)) console.log("Bad",response);
        return null;
    }
    obj = await res.json();
    lastQueryModified = obj.lastModified;
    return obj.timestamps;
}
async function PingServer(serverAddress){
    try{
        let res = await fetch(serverAddress+'/ping',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
            }
        });
        return res.ok;
    }catch(err){
        return false;
    }
}
async function QueryTimestamp(serverAddress,userId, videoId){
    //if(IsDebug(DEBUG_INFO)) console.log("Query",videoId);
    let response = await fetch(serverAddress+'/query',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
        },
        body:JSON.stringify({
            userId: userId,
            videoId: videoId
        }),
    }).catch(err=>{
        if(IsDebug(DEBUG_ERROR)) console.log("ERROR?",err);
    });
    if(!response.ok){
        if(IsDebug(DEBUG_ERROR)) console.log("Bad",response);
        return null;
    }
    return await response.json();
}