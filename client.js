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
const udpClient = dgram.createSocket('udp4');
bindUDP();
const BROADCAST_MESSAGE = Buffer.from("DISCOVER");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

savedIps = JSON.parse(fs.readFileSync(fileName).toString());

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

if(savedIps.length > 0){
    rl.question('Do you want to connect to the last used server? (Y/N)', (anwser) => {
        
        if(anwser === 'y' || anwser === 'Y'){
            
            let lastIp = savedIps[savedIps.length - 1];
            serverIp = lastIp.substr(0, lastIp.indexOf(':'));
            serverPort = lastIp.substr( lastIp.indexOf(':') + 1 );
            
            connect();
            
        }
        
        else if(anwser === 'n' || anwser === 'N'){
            
            lookUpForServers();
            
        }
        
    });
}
else{
    
    lookUpForServers();
    
}

function connect(){
    socket = require('socket.io-client')(`http://${serverIp}:${serverPort}`);

    socket.on('error', (error) => {
        console.log(`Connection failed: ${error}`);
        askUserForIp();
    });

    socket.on('connect', () => {
        savedIps.push(`${serverIp}:${serverPort}`);
        jsonBuffer = new Buffer( JSON.stringify(savedIps) );
        fs.writeFile(fileName, jsonBuffer, (err) => {
            if(err) throw err;
            console.log('Used IP was saved!');
        });
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

function lookUpForServers(){
    
    udpClient.send(BROADCAST_MESSAGE, 7, "", (err) => {
            
        if(err !== undefined){
            console.log(`error occured: ${err}`);
        }

    });
    
}

function bindUDP(){
    
    try{
        udpClient.bind(clientUDPPort, (err) => {
        
            if(err !== undefined){
                console.log(`error occured while binding: ${err}`);
            }
            
            udpClient.setBroadcast(true);
            
        });
    }
    catch(err){
        console.log(err);
    }
    
}