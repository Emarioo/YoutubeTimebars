@echo off

@REM Generates the userscript for tampermonkey.
@REM The reason you even need a batch file to generate the script
@REM is to avoid duplicating code and maintaining it in two places.

del scripts\tampermonkey.js

more scripts\gen_begin.js >> scripts\tampermonkey.js
more public\api.js >>scripts\tampermonkey.js
more public\script.js >> scripts\tampermonkey.js
more scripts\gen_end.js >> scripts\tampermonkey.js