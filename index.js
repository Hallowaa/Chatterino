import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as path from 'path';
import * as db from './db.js';
import { fileURLToPath } from "url";
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

        socket.on('Request create group', () => {

        });

        socket.on('Request join group', (userID, groupID) => {
            respondJoinGroup(server, socket, userID, groupID);
        });

        socket.on('Request group data', (newGroupID, oldGroupID) => {
            respondGroupData(server, socket, newGroupID, oldGroupID);
        });

        socket.on('Send new message', (groupID, messageData) => {
            sendMessageInGroup(server, groupID, messageData);
        });

        socket.on('Request icon change', (userID, bytes) => {
            saveIconChange(server, socket, userID, bytes);
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

async function respondJoinGroup(server, socket, userID, groupID) {
    let user = await db.getUser({ '_id': userID });
    let group = await db.getGroupShallow({ '_id': groupID });
    await db.userJoinGroup(user, group);
    server.to(socket.id).emit('Respond join group', group);
}

async function respondGroupData(server, socket, newGroupID, oldGroupID) {
    let group = await db.getGroupDeep({ '_id': newGroupID });
    db.socketEnterGroupView(socket.id, newGroupID);
    db.socketLeaveGroupView(socket.id, oldGroupID);
    server.to(socket.id).emit('Respond group data', group);
}

async function sendMessageInGroup(server, groupID, messageData) {
    let group = await db.getGroupShallow({ '_id': groupID });
    let message = await db.createMessage(messageData);
    await db.newMessageInGroup(message, group);
    notifyMessageAddedInGroup(server, groupID, message);
}

function notifyMessageAddedInGroup(server, groupID, message) {
    const socketIDs = db.getSocketsInGroupView(groupID);
    for(const socketID of socketIDs) {
        server.to(socketID).emit('Get new message', message);
    }
}

async function saveIconChange(server, socket, userID, bytes) {
    const buffer = Buffer.from(bytes);

    const path = 'user-icons/' + userID;

    let params = {
        Bucket: process.env.S3_BUCKET,
        Key: path,
        Body: buffer,
    };

    db.s3.putObject(params, function (err, data) {
        if(err) {
            console.error(err);
        } else {
            console.log('Successfully uploaded image!');
        }
    });
}
