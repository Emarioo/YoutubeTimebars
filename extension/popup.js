const ops = "ytbOptions";
async function OnBlur(e) {
    // Todo: The code here is probably not safe but it doesn't
    //      use any sensitive data so it's fine. Could still make it safe though.
    
    let elem = e.srcElement;
    let obj = await chrome.storage.sync.get([ops]);
    if (obj[ops] == null)
        obj[ops] = {};
    obj[ops][elem.id] = elem.value;
    await chrome.storage.sync.set(obj);
    // console.log(await chrome.storage.sync.get(["ytbOptions"]));
}

window.onload = () => {
    let server = document.getElementById("server");
    let user = document.getElementById("user");
    server.addEventListener("blur", OnBlur);
    user.addEventListener("blur", OnBlur);
    
    chrome.storage.sync.get([ops]).then((result) => {
        if (result.server != null)
            server.value = result.server;
        if (result.user != null)
            user.value = result.user;
    });
}