There are some many bugs that need to be fixed. The timebars does not appear where they should and the timestamps aren't saved either.

# Major bugs
- [ ] Time bars become incorrect if you remove a video in a playlist. There is some code in V2.2 to detect a removal. You can then call UpdateTimestamps to refresh all time bars.
- [ ] Things are really slow when refreshing page or clicking a new video. Is it due to `GetElements`?
- [ ] location.href and GetPlayer().getVideoUrl() can be different when switching video. If you use href with GetPlayer().getCurrentTime then you will apply the wrong time to the wrong video. With getCurrentTime you have to use getVideoUrl! This is fine normally but with the chrome extension which cannot access GetPlayer things get more complicated.
- [ ] Function SetVideoTimestamp fails sometimes when site loads to quickly. Not sure if this has something to do with videos not saving sometimes. Retrying 1 or 2 times might help?
- [x] Clicking on a video: Timestamp may be overwritten if things didn't load quickly. SetVideoTimestamp should not run until the timestamp of current video has loaded. **NOTE:** Fixed with the global variable safeToInsertNewData. It controls whether InsertTimestamp2 is allowed to insert timestamps and ensures taht it doens't overwrite the current one.
- [x] Inconsistent fails. Sometimes a timestamp fails loading. It tries loading when youtube isn't ready and fails. On fail, time of video isn't saved and that's where the inconsistencies come from. Really annoying please fix this. There are some errors like "properties of undefined, children" I assume it loaded to fast and the element was undefined.
- [x] GetPlayer().getCurrentTime is null when using chrome extension. Using document.getElementsByClassName("ytp-time-current") works but will detect the time of an advertisement. It fixes itself when the video shows upbecause it will replace the time and duration.

# Features
- [ ] You are watching a video and accidently hit a button or click with the mouse which causes the video to jump to a different time in the video. It is your fault but you don't remember where you were. CTRL+Z or something to undo or some how rollback would be usefull. This feature only needs to be on the client script. The video time is updated every few seconds any way so to store at least 20 of these would be nice.
- [ ] Login to the server to see your time bars. Showing them in a list with the video image would be nice. In the login screen you can remove and change time bars. What about hackers here though? Don't do login?
- [ ] Backup system. The hosting site may have a backup features but it is probably good for the server itself to provide it too. Should things backup each week? keep backups from three weeks ago. Remove the rest?
- [ ] Cache queries in the script? Especially useful if the server is offline. localsSorage?
- [ ] Version format when saving and loading database
- [ ] Real time update in `user.html`.
- [ ] Filtering timestamps in `user.html`
- [ ] If server is "" (empty) then local time bars are used. How would it work if you then decided to use a server? Do you have an extra copy of the time bars in local storage? localstorage is kind off volatile. it disappears if you clear browser information. there aren't really other options though.
- [ ] Button to remove time bars if hovering over the thumbnail in `user.html`.
- [ ] Two red bars. One for how far you have watched. One for where you left off.
- [x] Do a ping to the server to see if it's available before doing a bunch of queries.
- [x] You may not need users.txt. If a user inserts a timestamp, if user doesn't exist they will be created and the user's timestamp file will be loaded. The only reason you need users.txt was to initially know the amount of users or store extra info about the users. But you don't really need to. **Note:** users.txt is not used currently but the code for it is there if I need it for something. **Update:** users.txt is required because files in windows are case sensitive. Emarioo and emarioo maps to the same file.
- [x] Real time refresh rate on thumbnails' time bar. Cool to see the bar go up at a steady rate. Long videos can be updated slower since it is harder to notice a change. Real time change on thumbnails that are played in other tabs. This is difficult since you don't want to query 100 timestamps every 1 second (i tested chrome does not like it). Maybe query changes instead of specific videos? QueryTimestamps, QueryModifiedOnes

# Other
- [ ] Create a dev branch and use the master branch as release.
- [ ] Options for enableCache, forceServerOffline or something.
- [ ] APITerminate. It should call CacheMerge.
- [ ] Options, number of pingAttempts
- [ ] localStorage is used if you queried with a good userId. If you type an empty user id into search href you will use the latest localstorage.
- [ ] Move some functionality from `script.js` into `api.js` so that `user.html` can use it.
- [ ] Time bar appears on thumbnails they shouldn't. Removing videos in a playlist doesn't remove the time bar.
- [ ] Move GetElements, StartUpdate to `api.js`
- [ ] Stop logging database saved. It spams the log. But it is still kind of useful.
- [ ] More server logging. Good when fixing bugs.
- [ ] Use images in documentation.
- [ ] Show examples that don't use tampermonkey. For example you just need to run the following code in the web console when on youtube site. `let script = document.createElement("script");script.onload=()=>{Initialize(null);} script.src="serverAddress/bootscript.js";document.body.appendChild(script);`
- [ ] Some inconsistances with the timeline of videos not showing up. A reload of the page seems to fix it. Test this.
- [ ] APISetOptions(OPTIONS), useful since instead of `QueryTimestamp(server,user,video)` you do `QueryTimestamp(video)`. The question is object lifetime. What happens if accidently replace OPTIONS in the `script.js`. The object in `api.js` would need to be replaced too.
- [ ] Floor time and duration in timestamps.
- [x] Move InsertTimestamp into `api.js`.
- [ ] Rename IsUserValid, IsTimestampValid... to ValidateUser, ValidateTimestamp and if they return null, the validation failed. The functions should also format the values. For example, use Math.floor on numbers.
- [ ] Use http instead of express. Lightweight and smaller footprint.
- [ ] Chrome extension instead of tampermonkey

# Optimization/Speed
- [ ] Store times in binary format. Number would use less memory. Client and server side. I believe there is a ByteArray where you can pack the info in. Converting it to a string and moving it to localStorage should work.
- [ ] The startup time of the script is rather slow. Can it be improved. It does depend on how fast youtube can load the video.
- [ ] Time bars take a few seconds before appearing when reloading the page. Do something about it.
- [ ] Speed up queries by sorting the recently used time bars at the front or back. Back is probably better since `push` is better than `unshift`. Time bars are currently sorted using lastModified but this doesn't necesarily mean recently used.
- [ ] Multi query time bars.
- [ ] Use Date.getTime and do performance tests.

# Security
- [ ] Use require('http') instead of express. Less unknown magic?
- [ ] TEST the system. Become a hacker and break things.
- [ ] Https?
- [ ] You do `http://serverip/userId` to see your time bars. This is not safe. Use a different approach (since user id is like a password).
- [ ] Test the filtering and validation of timestamps, videoid, times, user id.
- [ ] UserID in chrome extension is not safe because it is stored in `storage.sync`. It is not encrypted.
- [x] Make options fail safe. If you do Initialize(OPTIONS) where OPTIONS is null or a property is then defaults are set.

# Fancy
- [x] Changing how frequent the database is saved based on how often insert is called. For example, few inserts at night since I won't be watching videos and but normal saving during day when I do insert timestamps. **Actually:** hasChanged variable solves this already by not saving the database if no changes has been made.
