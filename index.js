const express = require("express");
const socket = require("socket.io");
const app = express();
const port = 4000;

var server = app.listen(port, function(){
    console.log("server is running on port " + port);
});

app.use(express.static("public"));

const io = socket(server);

io.on("connection", function(socket){
    console.log("user connected at " + socket.id);

    socket.on("join", function(roomName)
    {
        console.log("server recieved join for room: " + roomName);
        var rooms = io.sockets.adapter.rooms;
        var room = rooms.get(roomName);
        
        if(room == undefined) {
            socket.join(roomName);
            console.log(" room " + roomName + " created ");
            console.log(" room " + roomName + " First user entered in room");
            socket.emit("created");  
        }
        else
        {   
            if (room.size < 2) {
                socket.join(roomName);
                console.log(" room " + roomName + " joined ");
                console.log(" room " + roomName + " user " + room.size + " entered in room");
                socket.emit("joined");
            } else {
                console.log(" room is full for now as already TWO users in room");
                socket.emit("full");
            }
            console.log(rooms);
        }
    });

    socket.on("ready", function(roomName){
        console.log("server rcvd ready with roomName " + roomName);
        socket.broadcast.to(roomName).emit("ready");
        console.log("server broadcasted ready");
    });

    socket.on("candidate", function(candidate, roomName){
        console.log("server rcvd candidate");
        socket.broadcast.to(roomName).emit("candidate", candidate);
        console.log("server broadcasted candidate");
    });

    socket.on("offer", function(offer, roomName){
        console.log("server rcvd offer", offer);
        socket.broadcast.to(roomName).emit("offer", offer);
        console.log("server broadcasted offer");
    });

    socket.on("answer", function(answer, roomName){
        console.log("server rcvd answer");
        socket.broadcast.to(roomName).emit("answer", answer);
        console.log("server broadcasted answer");
    });

    socket.on("leave", function(roomName){
        console.log("server rcvd leave");
        socket.leave(roomName);
        
        socket.broadcast.to(roomName).emit("leave");
        console.log("server broadcasted leave");
    });
});
