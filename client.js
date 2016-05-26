const app = require('express')();
const http = require('http').Server(app);
const readline = require('readline');
const dgram = require('dgram');

var clientIp = "";
var serverIp = "";
var offeredIps = [];
var serverPort = 0;
var clientUDPPort = 8;
var socket = {};
const BROADCAST_MESSAGE = Buffer.from("DISCOVER");

const udpClient = dgram.createSocket('udp4');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

udpClient.on('error', (error) => {
    console.log(`client udp error: ${error.stack}\n`);
});

udpClient.on('message', (msg, rinfo) => {
    
    offeredIps.push({
        ip: rinfo.address,
        port: msg.toString().substr(6)
    });
    
    clear();
    printOffers();
    askUserForIp();
    
});

udpClient.on('listening', () => {
    var address = udpClient.address();
    clientIp = address.address;
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

    });
    
});

function connect(){
    socket = require('socket.io-client')(`http://${serverIp}:${serverPort}`);

    socket.on('error', (error) => {
        console.log(`Connection failed: ${error}`);
        askUserForIp();
    });

    socket.on('connect', () => {
        console.log(`Connected`);
    });
}

function askUserForIp(){
    
    rl.question('To which server you want to connect?', (anwser) => {
        
        if(isNaN( parseInt(anwser) )){
            console.log('Wrong anwser.\n');
            askUserForIp();
        }
        else if(anwser <= 0 || anwser > offeredIps.length){
            console.log('Wrong anwser.\n');
            askUserForIp();
        }
        else{
            serverIp = offeredIps[anwser - 1].ip;
            serverPort = offeredIps[anwser - 1].port;
            
            console.log(`Connecting to ${serverIp}:${serverPort}...`);
            
            connect();
        }
        
    });
    
}

function clear(){
    process.stdout.write('\033c');
}

function printOffers(){
    for(let i = 0; i < offeredIps.length; i++){
        console.log(`${i+1}. ${offeredIps[i].ip}:${offeredIps[i].port}\n`);
    }
}