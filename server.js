const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const readline = require('readline');
const dgram = require('dgram');

var port = 0;
var ip = "";
var offer_message;
var loggedUsers = [];

const udpServer = dgram.createSocket('udp4');

udpServer.on('error', (err) => {
    console.log(`server error: ${error.stack}\n`);
});

udpServer.on('message', (msg, rinfo) => {
    console.log(`server got ${msg} from ${rinfo.address}:${rinfo.port}\n`);
    if(msg.toString() === "DISCOVER"){
        console.log(`responding with ${offer_message}`);
        udpServer.send(offer_message, rinfo.port, rinfo.address, (err) =>{
            if(err !== undefined){
                console.log(`error occured: ${err}`);
            }
        });
    }
});

udpServer.on('listening', () => {
    var address = udpServer.address();
    ip = address.address;
    console.log(`server listening at ip ${ip}\n`);
});

udpServer.bind(7, () => {
    
    console.log('listening on port 7 using UDP protocol\n');
    
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('On which port server should be started?\n',
    (anwser) => {
        port = anwser;
        rl.close();
        offer_message = Buffer.from(`OFFER ${port}`);
        
        app.get('/', (req,res) => {
            res.send('');
        });

        io.on('connection', (socket) => {
            console.log('a user connected');
            
            socket.send("NICK");
            
            socket.on('disconnect', () => {
                //console.log(`${socket.nick} -> disconnected`);
                notifyUserDisconnected(socket.nick); 
            });
            
            socket.on('message', (msg) => {
                if(msg.substr(0,4) === "NICK"){
                    if(userIsLogged()){
                        socket.send("NICK");
                    }
                    else{
                        socket.nick = msg.substr(5);
                        loggedUsers.push(socket.nick);
                        socket.send("NICKOK");
                    }
                }
                else if(msg.substr(0, 5) === "VALUE"){
                    console.log(`${socket.nick} -> ${msg.substr(6)}`);
                }
            });
            
        });

        http.listen(port, () => {
            console.log(`listening for clients on TCP protocol on ${ip}:${port}`);
        });
    });
    
});

function userIsLogged(name){
    for(let i = 0; i < loggedUsers; i++){
        if(loggedUsers[i] === name){
            return true;
        }
    }
    return false;
}

function notifyUserDisconnected(user, c = 0){
    var count = c;
    if(count < 5){
        console.log(`${user} -> disconnected`);
        setTimeout(()=>{
            count++;
            notifyUserDisconnected(user, count);
        },1000);
    }
}