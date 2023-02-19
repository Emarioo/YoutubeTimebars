# YoutubeTimebars
Time bars for youtube!
Note that you need to setup a server for this to work.
You can setup one locally. More info below.

## Features
- Resume video where you left off.
- See time bar on other videos update in real time.
- Time bars are saved on a server per user and not per computer. (meaning, they aren't saved locally which allows you to resume from any computer)
- You can see all your saved videos when logging in to the web server. (https://serverip/username)

## Coming soon?
- An official server. (you would just need an initial script)
- Time bars saved locally if server is unavailable. (no server needed!)

## Notes
- Only tested on computers.
- This is not a chrome extension altough it probably could/should be.
- Tampermonkey is used to load an initial script which will load another script from the server which does the logic.

## How to setup
You need a NodeJS server and Tampermonkey. There are alternatives to Tampermonkey.
Tampermonkey is used to start the script when on youtube.
NodeJS server communicates between the script to insert and query time bars.

## Local server setup
- Install NodeJS
- Download code or clone repository
- Run "node server.js YourPort". Server should now be running. Test by going to "https://localhost:YourPort".

## Script setup
- Install/enable tampermonkey chrome extension
- Go to dashboard and create a new script (you may need to look around a little for it, google how tampermonkey works if you are unsure)
- Copy code in tamper.js and paste into the new script in tampermonkey
- Go to www.youtube.com and see if tampermonkey and the script is enabled.

## It didn't work ):
Message me somehow and I shall help you.
