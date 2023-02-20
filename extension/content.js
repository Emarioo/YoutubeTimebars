
// setInterval(() => {
//     var plr = document.getElementById("movie_player");
//     console.log(plr,plr.getCurrentTime);
// }, 2000);
// console.log("hELLO!");
// let script = document.createElement("script");
// script.src = chrome.runtime.getURL('script.js');
// script.onload = () => {
//     console.log("loaded", script);
// }
// document.head.appendChild(script);
// console.log(script);

// let apiScript = document.createElement("script");
// apiScript.src = chrome.runtime.getURL('api.js');
// document.head.appendChild(apiScript);

// let pp = document.createElement("p");
// pp.innerText = "Hello";
// document.body.appendChild(pp);

// let res = fetch("http://localhost:8080/script.js", {
//     method: 'GET',
//     headers: {
//         'Content-Type': 'text/javascript'
//     },
// }).then(async (res) => {
//     // let ret = URL.createObjectURL(await res.blob());
//     // console.log(await res.text());
//     let script = document.createElement("script");
//     script.textContent = await res.text();
//     document.body.appendChild(script);
// });


let ops = "ytbOptions";
console.log("Started content");
// var serverScript = null; 
function DoStuff(options) {
    // console.log(options);
    if (options.server == null || options.user == null)
        return
    
    // if (serverScript == null) {
    //     let script = document.createElement("script");
    //     script.nonce = "ajk025a";
    //     script.src = options.server + "/script.js";
    //     document.body.appendChild(script);
    //     script.onload = () => {
    //         Initialize(options);
    //     }
    // } else {
    Initialize(options);
    // }
}

// var OPTIONS = { server: "http://localhost:8080", server: "test" }

// get storage and settings, run initialize
chrome.storage.sync.get([ops]).then((res) => {
    let options = res[ops];
    if (options == null)
        return;
    
    DoStuff(options);
});


chrome.storage.onChanged.addListener((changes, namespace) => {
    // console.log(changes, namespace);
    if (namespace == "sync") {
        for (let [key, { oldValue,newValue}] of Object.entries(changes)) {
            if (key != ops) continue;
            
            DoStuff(newValue);            
        }
    }
});