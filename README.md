# node-red-contrib-mpd
This is a node-red node for controlling one or multiple mpd-servers.
If you don't know what mpd or node-red is, have a look at: [mpd](http://www.musicpd.org/), [node-red](http://nodered.org/).

## Installation
In your node-red root directory run `npm install node-red-contrib-mpd`

## Features
Provides two nodes. With the mpd-input node, everytime the status of the mpd server changes, this nodes constructs
a message object, which is send from the node. The payload of this message contains two objects, one serves the information about the current played song,
  the other contains the status of the mpd-server like stop, play and so on.
 
The mpd-output node enables you to send any command to the mpd server. 
See [mpd command reference](http://www.musicpd.org/doc/protocol/command_reference.html) for details.
The payload must contain the pure command without options. If you want to send a command with optons, 
the message object should contain a property options, that contains an array of options.
If the command returns something, it will be available in the payload.
 
## Configuration
Just specify the ip of your mpd-server and port in the config node.
 
## Todo
- [ ] Timeout when connection lost
- [x] node status
- [ ] more documentation, examples
