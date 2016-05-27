const app = require('express')();
const http = require('http').Server(app);
const readline = require('readline');
const dgram = require('dgram');
const fs = require('fs');

var clientIp = "";
var serverIp = "";
var offeredIps = [];
var savedIps = [];
var serverPort = 0;
var clientUDPPort = 8;
var socket = {};
var jsonBuffer = new Buffer(1024);

const fileName = "savedServers.json";
const BROADCAST_MESSAGE = Buffer.from("DISCOVER");

var fd = fs.openSync(fileName, 'w+');
console.log(fd);
var stats = fs.statSync(fileName);

if(fs.readSync(fd, jsonBuffer, 0, stats.size, 0) === stats.size){
    console.log('file read');
    if(stats.size === 0){
        savedIps = [];
    }
    else{
        try{
            savedIps = JSON.parse( jsonBuffer );
        }
        catch(err){
            console.log('IPs file corrupted, creating new one');
            savedIps = [];
        }
    }
}

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

process.on('exit', (code) => {
    fs.closeSync(fd);
});

function connect(){
    socket = require('socket.io-client')(`http://${serverIp}:${serverPort}`);

    socket.on('error', (error) => {
        console.log(`Connection failed: ${error}`);
        askUserForIp();
    });

    socket.on('connect', () => {
        savedIps.push(`${serverIp}:${serverPort}`);
        jsonBuffer = new Buffer( JSON.stringify(savedIps) );
        fs.write(fd, jsonBuffer, 0, jsonBuffer.length, stats.size);
        console.log(`Connected`);
    });
}

function askUserForIp(){
    
    rl.question('To which server you want to connect? ', (anwser) => {
        
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