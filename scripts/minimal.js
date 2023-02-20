var OPTIONS = { server: "http://localhost:8080", server: "test" }
let script = document.createElement("script");
script.src = OPTIONS.server + "/script.js";
document.body.appendChild(script);
script.onload = () => {
    Initialize(OPTIONS);
}