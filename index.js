import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as path from 'path';
import * as db from './db.js';
import { fileURLToPath } from "url";
import 'dotenv/config';
import * as userHandler from './user_handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const server = new Server(httpServer);

function onConnection(socket) {
    socket.on('Login', (username, password) => userHandler.login(username, password));
    socket.on('Request user data', (token) => userHandler.respondUserData(token));
    socket.on('Request create instance', () => { /* TODO */ });
    socket.on('Request instances', (userID) => userHandler.respondInstances(userID));
    socket.on('Request join instance', (userID, instanceID) => userHandler.respondJoinInstance(userID, instanceID));
    socket.on('Request instance data', (newInstanceID, oldInstanceID) => userHandler.respondInstanceData(newInstanceID, oldInstanceID));
    socket.on('Request channel data', (newChannelID, oldChannelID) => userHandler.respondChannelData(newChannelID, oldChannelID));
    socket.on('Request icon change', (userID, bytes, type) => userHandler.saveIconChange(userID, bytes, type));
    socket.on('Request create emote', (userID, instanceID, bytes, type, emoteData) => userHandler.createEmote(socket, userID, instanceID, bytes, type, emoteData));
    socket.on('Send new message', (instanceID, channelID, messageData) => userHandler.sendMessageInChannel(instanceID, channelID, messageData));
    socket.on('disconnect', (reason) => db.socketLeaveAll(socket.id));
}

server.on('connection', (socket) => {
    userHandler.init(server, socket);
    onConnection(socket);
});

httpServer.listen(process.env.PORT);

app.use(express.static(path.join(__dirname + '/public')));
app.get("/", (req, res) => { res.sendFile(path.resolve(__dirname, 'public/html/', 'welcome.html')); });
app.get("/mainchat", (req, res) => { res.sendFile(path.resolve(__dirname, 'public/html/', 'mainchat.html')); });
