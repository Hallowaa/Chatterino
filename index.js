import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import * as path from 'path';
import * as db from './db.js';
import * as dbu from './db_utils.js';
import * as dbp from './db_parsing.js'
import { fileURLToPath } from "url";
import { Group } from "./group.js";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const httpServer = createServer(app);
const server = new Server(httpServer);

async function main() {

    await db.connectDb();

    server.on("connection", (socket) => {
        socket.on("Login", (username, password) => {
            login(server, socket, username, password);
        });
    
        socket.on("Request user data", (token) => {
            sendUserData(server, socket, token);
        });

        socket.on("Request create group", (name, dateCreated, creatorID, id) => {
            let ID = id == db.mainChatID? dbu.newObjectID() : id;
            const group = new Group(ID, name, [creatorID], dateCreated, creatorID, []);
            db.addGroup(group);
        });

        socket.on("Request join group", (newGroupID, oldGroupID) => {
            joinGroup(server, socket, newGroupID, oldGroupID?oldGroupID:null);
        });

        socket.on("Send new message", (groupID, messageData) => {
            sendMessage(server, groupID, messageData);
        });

        socket.on("Request group names", (groupIDs) => {
            requestGroupNames(server, socket, groupIDs);
        })
    });

    httpServer.listen(process.env.PORT);
}

main();

app.use(express.static(path.join(__dirname + "/public")));

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/html/", "welcome.html"));
});
    
app.get("/mainchat", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/html/", "mainchat.html"));
});

async function requestGroupNames(server, socket, groupIDs) {
    let groupTuples = [];
    
    for await (const groupID of groupIDs) {
        let groupTuple = {}
        let group = await dbp.getGroupByID(db.db, groupID);
        groupTuple.groupName = group.name;
        groupTuple.groupID = groupID;
        groupTuples.push(groupTuple);
    }

    server.to(socket.id).emit("Respond group names", groupTuples);
}

function notifyMessageAddedInGroup(server, groupID, message) {
    const socketIDs = db.getSocketIDsInGroup(groupID);
    for(const socketID of socketIDs) {
        server.to(socketID).emit("Get new message", message);
    }
}

async function sendMessage(server, groupID, messageData) {
    try {
        const message = db.messageObjectToDocument(messageData);
        const group = await dbp.getGroupByID(db.db, groupID);
        await db.addMessageToGroup(message, group);
        notifyMessageAddedInGroup(server, groupID, message);
    } catch (error) {
        console.error(error);
    }
}

async function joinGroup(server, socket, newGroupID, oldGroupID) {
    try {
        const group = await dbp.getGroupByID(db.db, newGroupID);
        const groupData = db.groupDocumentToObject(group);
        if(groupData) {
            db.socketJoinGroup(socket.id, newGroupID, oldGroupID);
            server.to(socket.id).emit("Respond join group", groupData);
        }
    } catch (error) {
        console.error(error);
    }
    
}

async function sendUserData(server, socket, token) {
    try {
        let user = await dbp.getUserByToken(db.db, token);
        if (user != null) {
            server.to(socket.id).emit("Respond user data", user);
        }
    } catch (error) {
        console.error(error);
    }
}

async function login(server, socket, username, password) {
    try {
        let user = await dbp.getUserByUsernamePassword(db.db, username, password);
        if (user != null) {
            server.to(socket.id).emit("Login success", user.token);
        }
    } catch (error) {
        console.error(error);
    }
}
