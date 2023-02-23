# Summary
A javascript for youtube where your play time of a video is saved. You can resume watching after closing down the video. The play time on videos is displayed below thumbnails. This is what is called a time bar. The script puts an emphasis on user experience. Easy to install/use and things just work (whether that is the case is up for debate).

# Usage
The bare minimum you need is **public/api.js** and **public/script.js**. You can copy the code and paste it into the web console and start it up by copying the code in **scripts/minimal.js**. The problem with doing is that you have to do this every time you refresh the youtube website.

You can use the chrome extension **Tampermonkey** to automatically run scripts (there may be alternatives to Tampermonkey). Copy the code in **public/tampermonkey.js** and paste it into a new user script in Tampermonkey. It should now be working.

**For the server:**
- Install NodeJS.
- Download code or clone repository.
- Run "node server.js" in a terminal (cmd on windows). Server should now be running. Test by going to https://localhost:8080. You can go into **server.js** and change port to 8080. An alternative is to run "node server.js 5555" (5555 is your port).

If you watch a video, wait for a minute or two or stop the server. You should be able to see a folder called database and in it some text files. This is your data.

If you are using a server, you can use the code in **public/tampermonkey-min.js** instead for the userscript in Tampermonkey. It is much smaller

Run the boot script when on www.youtube.com. You can use tampermonkey to automatically run the script.

# What can you do?
...

options, change user and server

server database auto save

## Features and Behaviour
- Thumbnails have time bars showing when in the video you stopped watching. Time bar does not show if you haven't watched the video.
- The script does not set play time if URL has &t=20m1s.

# Some terminology
**Timestamp** usually refers to a saved time point in a video
**Time bar** refers to the bars that appear below thumbnails