# node-red-contrib-mpd
Two node-red nodes for controlling/querying one or multiple Music Player Daemon (MPD) servers.
If you don't know what mpd or node-red is, have a look at: [mpd](http://www.musicpd.org/), [node-red](http://nodered.org/).

## News
See [change log](https://github.com/cinhcet/node-red-contrib-mpd/blob/master/CHANGELOG.md).
- Since version 1.1.1 the reconnection issue is fixed!!!

## Installation
Run `npm install node-red-contrib-mpd` in your node-red user folder (usually $HOME/.node-red).
Have a look at [adding nodes](http://nodered.org/docs/getting-started/adding-nodes.html) for more details about installing nodes.

## Features
Provides two nodes, one for controlling and one for querying:
- ```MPD input node```: everytime the status of the mpd server changes, this node constructs
a message, which payload contains two objects. One serves the information about the current played song,
  the other contains the status of the mpd-server like stop, play etc.
- ```MPD input node```: enables you to send any command to the mpd server. 
See [mpd command reference](http://www.musicpd.org/doc/protocol/command_reference.html) for details about possible commands.
If the command returns something, it will be available in the payload as an array.
 
## Configuration
Just specify the ip and port of each your mpd-servers in config nodes. Only one connection per server is established, allowing to use many of the mpd nodes without performance issues.
 
## Todo
- [ ] examples

## Acknowledgements
- andrewrk [git](https://github.com/andrewrk/mpd.js) for the underlying mpd library.
- Maxime Journaux [git](https://github.com/zeitungen) for the reconnection issue. 
