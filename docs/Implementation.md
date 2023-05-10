# Client/user script
This document was last updated at *2023-02-22*.

This includes **api.js** and **script.js**.

## api.js
There are 3 sections. **Timestamp modification**, **Cache/Local storage**, **Server availability**. The first section is the public interface. These functions should be used by other scripts. The other two sections are mostly private. Functions like **IsServerOnline** and **CacheMerge** can still be useful outside **api.js**.

Use **InitializeAPI** to give the api some options. Most importantly **server address** and **user id**.

#### Timestamp modification (public)
There are three functions which are used to **query**, **insert** or **aquire changed** **timestamps**. If the server is available, these functions interract with it using post requests. If the server is offline, the query, insert... functions call functions from the cache section. These functions replace the functionality of the requests allowing the timestamps and bars to work even without a server!

#### Server availability (private)
There are two functions. **IsServerOnline** and **StartPingingServer**. First function is used by **Timestamp modification** to check if server is available. If it isn't available, the second function is called to try to connect. **StartPingingServer** will change the state of **api.js** where the server is assumed to be offline. The function will do a post request to the server until it receives a response and then the state will go back to online. Each failed request will call **StartPingingServer** again after some time. This time increases as the requests fail (2s, 4s, 8s, 16s...).

#### Cache/local storage (private)
This section has 4 functions. Three of them are used by **Timestamp modification**  and the last one is used to save and load the timestamps to **localStorage**. The code behind these functions are very simular to the code for the database in the server.

Note: The cache is currently not used if server is online but you may want to use it anyway in case the server shuts down. If so you would at least have a cache of the timestamps. The reason the term cache is used is because it uses localStorage. The data in it is erased when clearing browser data. 

#### Some thoughts
The function CacheMerge is also public. It is used by the script to save/load data in localStorage. The **timestamp modification** section does not automatically call CacheMerge. The reason for it is because CacheMerge has to be called when the script terminates. Adding a APITerminate function would allow CacheMerge to be private and not used by functions outside **api.js**.

# script.js
Uses youtube api, event listener

player.addEventListener("onStateChange",...)
document.addEventListener("focus",...)
document.addEventListener("yt-page-data-updated",...)
window.onbeforeunload=()=>{}


# Server
This only consists of **server.js**.
More details coming later.

## Database
The database consists of a list of users where each user has a list of timestamps. This data is saved to disc in .txt format (very simple).

The files in the database has a variable **hasChanged** to know whether the loaded data is different from that of the disc. If hasn't change and we call database.save, the database doesn't have to save the unchanged data.