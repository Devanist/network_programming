const app = require('express')();
const http = require('http').Server(app);
const readline = require('readline');
const dgram = require('dgram');
const fs = require('fs');
var network = require('network');

var broadcastIp = "";
var mask = "";
var clientIp = "";

network.get_active_interface(function(err, obj){
    mask = obj.netmask;
    clientIp = obj.ip_address;
    broadcastIp = getBroadcastIP(clientIp, mask);
    console.log("info\n");
    console.log(broadcastIp);
    console.log(mask);
    console.log(clientIp);
});

var serverIp = "";
var offeredIps = [];
var savedIps = [];
var serverPort = 0;
var clientUDPPort = 8;
var frequency = 0;
var username = "";
var nameFile = "name.json";
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

try{
    username = JSON.parse( fs.readFileSync(nameFile).toString() );
    console.log(`Saved name found: ${username}`);
}
catch(err){
    username = "";
    console.log(`Saved name not found.`);
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
    // clientIp = address.address;
    // console.log(address.family);
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
            
            askForName();
            
        }
        else if(msg === "NICKOK"){
            
            fs.writeFile(nameFile, JSON.stringify(username), (err) => {
                
                if(err !== undefined && err !== null){
                    console.log(`Error while saving name to file: ${err}`);
                }
                
            });
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

function askForName(){
    if(username === ""){
        rl.question("Please enter your NICK: ", (anwser) => {
        
            username = anwser;
            socket.send(`NICK:${username}`);
            
        });
    }
    else{
        rl.question(`Do you want to use name ${username}? `, (anwser) => {
            
            if(anwser === "Y" || anwser === "y"){
                socket.send(`NICK:${username}`);
            }
            else if(anwser === "N" || anwser === "n"){
                rl.question("Please enter your NICK: ", (anwser) => {
                
                    socket.send(`NICK:${anwser}`);
                    
                });
            }
            else{
                console.log("Wrong anwser.");
                askForName();
            }
            
        });
    }
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
    
    udpClient.send(BROADCAST_MESSAGE, 7, broadcastIp, (err) => {
            
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
        console.log(`UDP binded at port ${clientUDPPort}`);
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
        var num = (Math.random() * 100) | 0;
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

function getBroadcastIP(hostIP, mask){
    var bip = "";

    var netmask = mask.split(".");
    var clientIP = hostIP.split(".");
    
    for(let i = 0; i < 4; i++){
        netmask[i] = (parseInt(netmask[i]) >>> 0).toString(2);
        clientIP[i] = (parseInt(clientIP[i]) >>> 0).toString(2);

        let l = netmask[i].length;
        if(l < 8){
            for(let j = 0; j < 8 - l; j++){
                netmask[i] = "0" + netmask[i];
            }
        }

        l = clientIP[i].length;
        if(clientIP[i].length < 8){
            for(let j = 0; j < 8 - l; j++){
                clientIP[i] = "0" + clientIP[i];
            }
        }

        let part = "";
        for(let j = 0; j < 8; j++){
            let n;
            if(parseInt(netmask[i].charAt(j)) === 0){
                n = 1;
            }
            else{
                n = 0;
            }
            part += parseInt(clientIP[i][j]) | n;  
        }
        bip += parseInt(part,2).toString();
        if(i != 3){
            bip += ".";
        }
    }


    return bip;
}