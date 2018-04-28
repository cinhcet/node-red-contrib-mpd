/**
 * Copyright 2015-2017 cinhcet@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
  "use strict";
  var mpd = require('mpd');
  var events = require('events');


  //The connections to multiple mpd servers are stored here.
  var connections = {};

  //The configuration node for the mpd server
  function MpdServerNode(n) {
    RED.nodes.createNode(this, n);

    var node = this;
    node.host = n.host;
    node.port = n.port;
    node.connected = false;

    node.eventEmitter = new events.EventEmitter();
    node.eventEmitter.setMaxListeners(0);

    node.connect();
  }
  RED.nodes.registerType("mpd-server", MpdServerNode);


  MpdServerNode.prototype.disconnect = function() {
    var id = this.getID()
    if(connections[id] != null) {
      connections[id].instances -= 1;
      if(connections[id].instances == 0) {
        connections[id].disconnecting = true;
        connections[id].socket.destroy();
        delete connections[id];
      }
    }
  }

  MpdServerNode.prototype.getID = function() {
    return "[" + this.host + ":" + this.port + "]";
  }

  MpdServerNode.prototype.connect = function() {
    var node = this;
    var id = node.getID();
    if(typeof connections[id] == "undefined" || connections[id] == null) {
      connections[id] = mpd.connect({
        port: node.port,
        host: node.host
      });
      var connection = connections[id];
      connection.instances = 0;

      connection.on('error', function(err) {
        node.log('Error: Connection problem? Is the mpd-server ' + node.host + ':' + node.port + ' running? \n Error code: ' + err);
      });
      connection.on('ready', function() {
        node.log('Connected to MPD server ' + node.host + ':' + node.port);
        node.connected = true;
        node.disconnecting = false;
        node.eventEmitter.emit('connected');
      });
      connection.on('end', function() {
        if(!connection.disconnecting) {
          node.log('Disconnected to MPD server ' + node.host + ':' + node.port);
          node.connected = false;
          node.eventEmitter.emit('disconnected');
          setTimeout(function() {
            node.disconnect();
            node.connect();
          }, 1000);
        }
      });
    }
    connections[id].instances += 1;
    node.client = connections[id];
  }


  //MPD out Node
  function MpdOutNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    node.topic = n.topic;
    node.server = RED.nodes.getNode(n.server);
    node.status({
      fill: "red",
      shape: "ring",
      text: "not connected"
    });

    node.on('input', function(m) {
      if(node.server.connected) {
        var options = [];
        if(m.options) {
          options = m.options;
        }
        node.server.client.sendCommand(mpd.cmd(m.payload, options), function(err, msg) {
          if(err) {
            node.log('[MPD] - ' + err);
            return;
          }
          var message = m;
          if(m.rawOutput === true) {
            message.payload = parseMessageRaw(msg);
          } else {
            message.payload = mpd.parseArrayMessage(msg);
          }
          if(node.topic.length) {
            message.topic = node.topic;
          }
          if(message.payload /* && message.payload.length > 0 && Object.getOwnPropertyNames(message.payload[0]).length > 0*/ ) {
            node.send(message);
          }
        });
      }
    });

    node.server.eventEmitter.on('connected', function() {
      node.status({
        fill: "green",
        shape: "dot",
        text: "connected"
      });
    });
    node.server.eventEmitter.on('disconnected', function() {
      node.status({
        fill: "red",
        shape: "ring",
        text: "not connected"
      });
    });
    node.on("close", function() {
      node.server.disconnect();
    });
  }
  RED.nodes.registerType("mpd out", MpdOutNode);



  //Mpd in node
  function MpdInNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    node.topic = n.topic;
    node.server = RED.nodes.getNode(n.server);
    node.status({
      fill: "red",
      shape: "ring",
      text: "not connected"
    });
    node.server.eventEmitter.on('connected', function() {
      node.server.client.on('system', function(name) {
        var msg = {};
        msg.topic = node.topic;
        msg.payload = {};
        node.server.client.sendCommand(mpd.cmd("currentsong", []), function(err, message) {
          if(err) {
            node.log('[MPD] - Error: ' + err);
          }
          msg.payload.currentsong = mpd.parseKeyValueMessage(message);
          node.server.client.sendCommand(mpd.cmd('status', []), function(err, message) {
            if(err) {
              node.log('[MPD] - Error: ' + err);
            }
            msg.payload.status = mpd.parseKeyValueMessage(message);
            node.send(msg);
          });
        });
      });
      node.status({
        fill: "green",
        shape: "dot",
        text: "connected"
      });
    });
    node.server.eventEmitter.on('disconnected', function() {
      node.status({
        fill: "red",
        shape: "ring",
        text: "not connected"
      });
    });
    node.on("close", function() {
      node.server.disconnect();
    });
  }
  RED.nodes.registerType("mpd in", MpdInNode);
}

function parseMessageRaw(msg) {
  /* This function parseMessageRaw is based on https://github.com/andrewrk/mpd.js/blob/master/index.js
     MIT licence
     Copyright (c) 2014 Andrew Kelley
     Permission is hereby granted, free of charge, to any person
     obtaining a copy of this software and associated documentation files
     (the "Software"), to deal in the Software without restriction,
     including without limitation the rights to use, copy, modify, merge,
     publish, distribute, sublicense, and/or sell copies of the Software,
     and to permit persons to whom the Software is furnished to do so,
     subject to the following conditions:

     The above copyright notice and this permission notice shall be
     included in all copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
     EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
     MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
     NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
     BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
     ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
     CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     SOFTWARE.
 */
  var result = [];
  msg.split('\n').forEach(function(m) {
    if(m.length === 0) {
      return;
    }
    var keyValue = m.match(/([^ ]+): (.*)/);
    if(keyValue === null) {
      return;
    }
    if(keyValue.length !== 3) {
      return;
    }
    var obj = {};
    obj[keyValue[1]] = keyValue[2];
    result.push(obj);
  });
  return result;
}
