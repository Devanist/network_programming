const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const readline = require('readline');
const dgram = require('dgram');

var serverIp = "";
var serverPort = 0;
var clientUDPPort = 7;
const BROADCAST_MESSAGE = Buffer.from("DISCOVER");

const udpClient = dgram.createSocket('udp4');

udpClient.on('error', (error) => {
    console.log(`client udp error: ${error.stack}\n`);
});

udpClient.bind(clientUDPPort, (err) => {
    
    if(err !== undefined){
        console.log(`error occured while binding: ${err}`);
    }
    
    udpClient.setBroadcast(true);
    
    udpClient.send(BROADCAST_MESSAGE, 7, "", (err) => {
        
        if(err !== undefined){
            console.log(`error occured: ${err}`);
        }
        
        udpClient.close();
    });
    
});