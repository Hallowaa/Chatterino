import * as db from './db.js';
import { newToken } from './string_utils.js';
import { ObjectId } from "mongodb";

let server;
let socket;

export function init(_server, _socket) {
    if(!_server) throw 'Error: server is null';
    if(!_socket) throw 'Error: socket is null';
    server = _server;
    socket = _socket;
}

export async function login(username, password) {
    let user = await db.getUser({ 'properties.username': username, 'properties.password': password});
    if(user) server.to(socket.id).emit('Login success', user.properties.token);
}

export async function respondUserData(token) {
    let user = await db.getUser({'properties.token': token });
    let availableEmotes = await db.getUserAvaliableEmotes(user);
    server.to(socket.id).emit('Respond user data', user, availableEmotes);
}

export async function respondInstances(userID) {
    let user = await db.getUser({ _id: userID });
    server.to(socket.id).emit('Respond instances', user.properties.instances);
}

export async function respondJoinInstance(userID, instanceID) {
    let user = await db.getUser({ '_id': userID });
    let instance = await db.getInstanceShallow({ '_id': instanceID });
    await db.userJoinInstance(user, instance);
    server.to(socket.id).emit('Respond join instance', instance);
}

export async function respondInstanceData(newInstanceID, oldInstanceID) {
    let instance = await db.getInstanceShallow({ '_id': newInstanceID });
    db.socketEnterInstanceView(socket.id, newInstanceID);
    db.socketLeaveInstanceView(socket.id, oldInstanceID);
    server.to(socket.id).emit('Respond instance data', instance);
}

export async function respondChannelData(newChannelID, oldChannelID) {
    let channel = await db.getChannelDeep({ '_id': newChannelID });
    db.socketEnterChannelView(socket.id, newChannelID);
    db.socketLeaveChannelView(socket.id, oldChannelID);
    server.to(socket.id).emit('Respond channel data', channel);
}


export async function sendMessageInChannel(instanceID, channelID, messageData) {
    let channel = await db.getChannelShallow({ '_id': channelID });
    let message = await db.createMessage(messageData);
    await db.newMessageInChannel(message, channel);
    notifyMessageAddedInInstance(instanceID, channelID, message);
}

export function notifyMessageAddedInInstance(instanceID, channelID, message) {
    const socketIDsInstance = db.getSocketsInInstanceView(instanceID);
    for (const socketID of socketIDsInstance) {
        server.to(socketID).emit('Get new message', channelID, message);
    }
}

export async function saveIconChange(userID, bytes, type) {
    if(!userID ||!bytes || !type) {
        // TODO: Tell user that something went wrong.
        return;
    }
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
            // TODO: Tell user that something went wrong.
        } else {
            (async () => {
                const newURL = 'https://chatterinoxd.s3.eu-central-1.amazonaws.com/' + path;
                user.profile.icon = newURL;
                await user.save();
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

export async function createEmote(userID, instanceID, bytes, type, emoteData) {
    if(!userID || !instanceID || !bytes || !type || !emoteData) {
        // TODO: Tell user that something went wrong.
        return;
    }
    const buffer = Buffer.from(bytes);
    const ID = new ObjectId();
    const path = 'instance-emotes/' + ID + '.' + type===('png'||'jpeg')?'png':'gif';

    let putParams = {
        Bucket: process.env.S3_BUCKET,
        Key: path,
        Body: buffer,
    };

    db.s3.putObject(putParams, function(error, data) {
        if(error) {
            // TODO: Tell user that something went wrong.
            console.error(error);
            
        } else {
            (async () => {
                let user = await db.getUser({ _id: userID });
                const newURL = 'https://chatterinoxd.s3.eu-central-1.amazonaws.com/' + path;
                emoteData.properties.content = newURL;
                emoteData.properties.creator = user._id;
                emoteData._id = ID;
                let emote = await db.createEmote(emoteData);
                let instance = await db.getInstanceShallow({ _id: instanceID });
                await db.newEmoteInInstance(emote, instance);
            })();
        }
    });

    // Update the list of emotes in the instance for all members.
}