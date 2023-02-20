## Summary
A javascript for youtube where your play time of a video is saved. You can resume watching after closing down the video. The play time on videos is displayed below thumbnails. This is what is called a time bar. The script puts an emphasis on user experience. Easy to install and things just work.

## Usage
You need a NodeJS server and Tampermonkey. There are alternatives to Tampermonkey. Tampermonkey is used to start the script when on youtube. NodeJS server communicates between the script to insert and query time bars.

Run the boot script when on www.youtube.com. You can use tampermonkey to automatically run the script.

## Features and Behaviour
- Thumbnails have time bars showing when in the video you stopped watching. Time bar does not show if you haven't watched the video.
- The script does not set play time if URL has &t=20m1s.

# Some terminology
**Timestamp** usually refers to a saved time point in a video
**Time bar** refers to the bars that appear below thumbnails