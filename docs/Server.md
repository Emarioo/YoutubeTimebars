The purpose of this server is to store timestamps and allow the script to access the timestamps from anywhere.

# How does script interract with the server
The messages transferred between are mostly timestamps. When the script starts, all timestamps are **NOT** sent because all timestamps will not be used. This is a waste of bandwidth.

The script will check the current video id and if the script has that time loaded from before it uses it. If it doesn't have it then it will request it.

# Merging of timestamps
What happens if you play two videos at once?
Which should be saved and when?

# Two types of databases
Database which is stored in one .txt file.
And database which has multiple .txt files.

# Users
You give yourself an id. Can be any reasonably sized string with no wierd characters. You specify id in the script itself. The messages will use this id to query "your" timestamps. The id is both password and user name.

you supply videoId, that you want. The server shouldn't send all available timestamps. to much.

# Storing timestamps
Timestamps are stored in a file for each user. There is a user.txt file which maps user ids to timestamp files. The name of the timestamp file is a number. For new users, this number is incrementally chosen from some number kept in user.txt.

**Lifetime**
Timestamps have infinite lifetime. They are never deleted automatically. 

# Security?
These are some temporary measures against hackers.
The server has no sensitive information so focus on handling spam.
Also make backups of the data because it would suck if it were lost to some bug.
- Max capacity of 1000 timestamps per user.
- Max capacity of 10 users.
- More measures against spam?

# Administration
If you go to `serverip/userId` (this is **not** secure by the way). You can see your timestamps. Timestamps include the thumbnails. Do you go to the video if you click on them?
