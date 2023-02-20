# Youtube Time bars!
Time bars for youtube!
Note that you need to setup a server for this to work.
You can setup one locally. More info below.

## Warning
I am not sure how well the security on the scripts hold up. Could be really bad.
If you are doing things locally then it is probably fine.
The chrome extension that's on it's way is currently very much **not** safe. 

## Features
- Resume video where you left off.
- See time bar on other videos update in real time.
- Time bars are saved on a server per user and not per computer. (meaning, they aren't saved locally which allows you to resume from any computer)
- You can see all your saved videos when logging in to the web server. (https://serverip/userId)

## Coming soon?
- An official server. (let someone else host the server!)
- Time bars saved locally if server is unavailable. (no server needed!)
- Chrome extension

## Notes
- Tested on computers (Windows 8.1, Windows 10).
- This is not a chrome extension altough it probably could/should be.
- See "docs/An overview" for more information. (the docs is not very organized yet, a lot of scattered thoughts)

# Setup
## Local NodeJS server
- Install NodeJS
- Download code or clone repository
- Run "node server.js YourPort". Server should now be running. Test by going to https://localhost:YourPort.

## No tampermonkey
- Copy the code in scripts/minimal.js and paste into the web console when on the youtube page.
- Watch a video half way through. Start watching a different video. Go back to the original and continue where you left off.
- Note that you need to paste the script everytime you load/reload the youtube page. This is why tampermonkey is used.

## Tampermonkey
- Install/enable tampermonkey chrome extension
- Go to dashboard and create a new script (you may need to look around a little for it, google how tampermonkey works if you are unsure)
- Copy code in scripts/tamperscript.js and paste into the new script in tampermonkey
- There are some options in the script which you may want to change.
- Go to www.youtube.com and see if tampermonkey and the script is enabled.
- Watch a video half way through. Start watching a different video. Go back to the original and continue where you left off.

## It didn't work ):
Contact me and I shall help you.
Discord: (Emarioo#1783)
