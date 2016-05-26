const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const readline = require('readline');
const dgram = require('dgram');

var port = 0;
var ip = "";
var offer_message;

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
        offer_message = Buffer.from(`OFFER ${ip}:${port}`);
        app.get('/', (req,res) => {
            res.sendfile('index.html');
        });

        io.on('connection', (socket) => {
            console.log('a user connected');
        });

        http.listen(port, () => {
            console.log(`listening for clients on TCP protocol on ${ip}:${port}`);
        });
    });
    
});