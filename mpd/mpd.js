/**
 * Copyright 2015 Danny Drieﬂ, cinhcet@gmail.com
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
	var util = require('util');
	
	//The connections to multiple mpd servers are stored here.
	var connections = {}; 
	
	//The configuration node for the mpd server
	function MpdServerNode(n) {
		RED.nodes.createNode(this,n);
		
		var node = this;
		node.host = n.host;
		node.port = n.port;
		node.connected = false;
		
		var id = "[" + node.host + ":" + node.port + "]";
		
		if(connections[id] == null) {
			connections[id] = mpd.connect({port: node.port, host: node.host});
			var connection = connections[id];
			connection.instances = 0;
			
			connection.on('error', function(err) { 
				util.log('[MPD] - Error: Connetcion problem? Is the mpd-server running? \n Error code: ' + err);
			});
			connection.on('ready', function() {
				util.log('[MPD] - Connected to MPD server ' + node.host + ':' + node.port);
				node.connected = true;
			});
			connection.on('end', function() {
				util.log('[MPD] - Disconnected to MPD server ');
				node.connected = false;
			});
		}
		connections[id].instances += 1;
		node.client = connections[id];
		
		node.disconnect = function() {
			if(connections[id] != null) {
				connections[id].instances -= 1;
				if(connections[id].instances == 0) {
					connections[id].socket.destroy();
					delete connections[id];
				}
			}
		}
		
		this.on("close", function() {
			node.client.socket.destroy();
			connections = {};
		});
	}
	RED.nodes.registerType("mpd-server",MpdServerNode);
	
	
	
	//MPD out Node
	function MpdOutNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
		node.topic = n.topic;
		node.server = RED.nodes.getNode(n.server);
		
		node.on('input', function (msg) {
			if(node.server.connected) {
				var options = [];
				if(msg.options) {
					options = msg.options;
				}
				node.server.client.sendCommand(mpd.cmd(msg.payload, options), function(err, msg) {
					if(err) {
						util.log('[MPD] - ' + err);
					}
					var message = {};
					message.payload = msg;
					message.topic = node.topic;
					if(message.payload) {
						node.send(message);
					}
				});
			}
		});

		node.on("close", function() {
			node.server.disconnect();
		});
	}
	RED.nodes.registerType("mpd out",MpdOutNode);
	
	
	
	//Mpd in node
	function MpdInNode(n) {
		RED.nodes.createNode(this,n);
		var node = this;
        node.topic = n.topic;
		node.server = RED.nodes.getNode(n.server);
		
		node.server.client.on('system', function(name) {
			var msg = {};
			msg.topic = node.topic;
			msg.payload = {};
			node.server.client.sendCommand(mpd.cmd("currentsong", []), function(err, message) {
				if(err) {
					util.log('[MPD] - Error: ' + err);
				}
				msg.payload.currentsong = mpd.parseKeyValueMessage(message);
				node.server.client.sendCommand(mpd.cmd('status', []), function(err, message) {
					if(err) {
						util.log('[MPD] - Error: ' + err);
					}
					msg.payload.status = mpd.parseKeyValueMessage(message);
					node.send(msg);
				});
			});
		});
		
		node.on("close", function() {
			node.server.disconnect();
		});
	}
	RED.nodes.registerType("mpd in",MpdInNode);
	
	
}