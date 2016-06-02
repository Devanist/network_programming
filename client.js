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
var frequency = 0;
var socket = {};
var jsonBuffer = new Buffer(1024);
var connected = false;

const fileName = "savedServers.json";
const udpClient = dgram.createSocket('udp4');

const BROADCAST_MESSAGE = Buffer.from("DISCOVER");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

try{
    savedIps = JSON.parse(fs.readFileSync(fileName).toString());
}
catch(err){
    savedIps = [];
}

udpClient.on('error', (error) => {
    if(error.errno === "EADDRINUSE"){
        clientUDPPort++;
        bindUDP();
    }
    else{
        console.log(`client udp error: ${error}\n`);            
    }
});

process.on("uncaughtException", (error) => {
    if(error.errno === "EADDRINUSE"){
        clientUDPPort++;
        bindUDP();
    }
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

bindUDP();

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
    
    socket.on('reconnect_attempt', () => {
        console.log("Trying to reconnect...");
    });

    socket.on('connect', () => {
        connected = true;
        savedIps.push(`${serverIp}:${serverPort}`);
        jsonBuffer = new Buffer( JSON.stringify(savedIps) );
        fs.writeFile(fileName, jsonBuffer, (err) => {
            if(err) throw err;
            console.log('Used IP was saved!');
        });
        console.log(`Connected`);
    });
    
    socket.on("message", (msg) => {
        if(msg === "NICK"){
            
            rl.question("Please enter your NICK: ", (anwser) => {
                
                socket.send(`NICK:${anwser}`);
                
            });
            
        }
        else if(msg === "NICKOK"){
            
            askForFrequency(sendData);
            
        }
    });
    
    socket.on("disconnect", () => {
        connected = false;
        console.log("Disconnected from server.");
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
    
    udpClient.bind(clientUDPPort, (err) => {
    
        if(err !== undefined){
            console.log(`error occured while binding: ${err}`);
        }
        
        udpClient.setBroadcast(true);
        
    });
    
}

function askForFrequency(callback){
    
    rl.question("Please set the frequency of sending data to server: ", (anwser) => {
                
        if( !isNaN( parseInt(anwser)) && anwser >= 10 && anwser <= 10000 ){
            frequency = anwser;
            callback();
        }
        else{
            askForFrequency();
        }
        
    });
    
}

function sendData(){
    
    if(connected){
        var num = (Math.random() * 100000) | 0;
        socket.send(`VALUE:${num.toString()}`);
        console.log(`Sending ${num}`);
        setTimeout(()=>{
            sendData();
        }, frequency);
    }
    else{
        return;
    }
}