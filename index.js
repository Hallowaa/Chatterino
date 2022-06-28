import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as path from 'path';
import * as db from './db.js';
import { fileURLToPath } from "url";
import { newToken } from './string_utils.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const server = new Server(httpServer);

async function main() {

    server.on('connection', (socket) => {
        socket.on('Login', (username, password) => {
            login(server, socket, username, password);
        });
    
        socket.on('Request user data', (token) => {
            respondUserData(server, socket, token);
        });

        socket.on('Request create instance', () => {
            
        });

        socket.on('Request instances', (userID) => {
            respondInstances(server, socket, userID);
        })

        socket.on('Request join instance', (userID, instanceID) => {
            respondJoinInstance(server, socket, userID, instanceID);
        });

        socket.on('Request instance data', (newInstanceID, oldInstanceID) => {
            respondInstanceData(server, socket, newInstanceID, oldInstanceID);
        });

        socket.on('Request channel data', (newChannelID, oldChannelID) => {
            respondChannelData(server, socket, newChannelID, oldChannelID);
        })

        socket.on('Send new message', (instanceID, channelID, messageData) => {
            sendMessageInChannel(server, instanceID, channelID, messageData);
        });

        socket.on('Request icon change', (userID, bytes, type) => {
            saveIconChange(server, socket, userID, bytes, type);
        });

        socket.on('disconnect', (reason) => {
            db.socketLeaveAll(socket.id);
        })

    });

    httpServer.listen(process.env.PORT);
}

main();

app.use(express.static(path.join(__dirname + '/public')));

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/html/', 'welcome.html'));
});
    
app.get("/mainchat", (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public/html/', 'mainchat.html'));
});

async function login(server, socket, username, password) {
    let user = await db.getUser({ 'properties.username': username, 'properties.password': password});
    if(user) {
        server.to(socket.id).emit('Login success', user.properties.token);
    }
}

async function respondUserData(server, socket, token) {
    let user = await db.getUser({'properties.token': token });
    server.to(socket.id).emit('Respond user data', user);
}

async function respondJoinInstance(server, socket, userID, instanceID) {
    let user = await db.getUser({ '_id': userID });
    let instance = await db.getInstanceShallow({ '_id': instanceID });
    await db.userJoinInstance(user, instance);
    server.to(socket.id).emit('Respond join instance', instance);
}

async function respondInstances(server, socket, userID) {
    let user = await db.getUser({ _id: userID });
    server.to(socket.id).emit('Respond instances', user.properties.instances);
}

async function respondInstanceData(server, socket, newInstanceID, oldInstanceID) {
    let instance = await db.getInstanceShallow({ '_id': newInstanceID });
    db.socketEnterInstanceView(socket.id, newInstanceID);
    db.socketLeaveInstanceView(socket.id, oldInstanceID);
    server.to(socket.id).emit('Respond instance data', instance);
}

async function respondChannelData(server, socket, newChannelID, oldChannelID) {
    let channel = await db.getChannelDeep({ '_id': newChannelID });
    db.socketEnterChannelView(socket.id, newChannelID);
    db.socketLeaveChannelView(socket.id, oldChannelID);
    server.to(socket.id).emit('Respond channel data', channel);
}

async function sendMessageInChannel(server, instanceID, channelID, messageData) {
    let channel = await db.getChannelShallow({ '_id': channelID });
    let message = await db.createMessage(messageData);
    await db.newMessageInChannel(message, channel);
    notifyMessageAddedInChannel(server, instanceID, channelID, message);
}

function notifyMessageAddedInChannel(server, instanceID, channelID, message) {
    const socketIDsChannel = db.getSocketsInChannelView(channelID);
    for (const socketID of socketIDsChannel) {
        server.to(socketID).emit('Get new message', channelID, message);
    }
}

async function saveIconChange(server, socket, userID, bytes, type) {
    const buffer = Buffer.from(bytes);
    let random = newToken(6);
    const path = 'user-icons/' + userID + '_' + random + '.' + type;
    let user = await db.getUser({ _id: userID });

    let putParams = {
        Bucket: process.env.S3_BUCKET,
        Key: path,
        Body: buffer,
    };

    
    db.s3.putObject(putParams, function (error, data) {
        if(error) {
            console.error(error);
            server.to(socket.id).emit('Receive alert', 'Could not change user icon', 'error');
        } else {
            (async () => {
                const newURL = 'https://chatterinoxd.s3.eu-central-1.amazonaws.com/' + path;
                user.profile.icon = newURL;
                await user.save();
                server.to(socket.id).emit('Receive alert', 'User icon has been changed', 'announcement');
            })();
        }
    });

    if(user.profile.icon) {
        let deleteParams = {
            Bucket: process.env.S3_BUCKET,
            Key: 'user-icons/' + user.profile.icon.split('/').pop()
        }
    
        db.s3.deleteObject(deleteParams, function(error, data) {
            if(error) {
                console.error(error);
            }
        });
    }
    
}
