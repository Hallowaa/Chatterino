import mongoose from "mongoose";
import { User } from './user.js';
import { Group } from './group.js';
import { Message } from './message.js';
import * as stringUtils from './string_utils.js';
import { ObjectId } from "mongodb";
import 'dotenv/config';
export const socketsInGroups = new Map();
const USER_TOKEN_LENGTH = 15;


mongoose.connect(process.env.MONGODB_URI, {useUnifiedTopology: true}).then(
    console.log('Connected to MongoDB!'),
    generateDefaults()
);

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));


/**
 * Generates the default collections and an admin user.
 * 
 */
export async function generateDefaults() {
    let admin = await User.findOne({ 'properties.username': process.env.ADMIN_USERNAME, 'properties.password': process.env.ADMIN_PASSWORD});
    if(!admin) {
        await User.create({
            'profile.nickname': process.env.ADMIN_USERNAME,
            'properties.username': process.env.ADMIN_USERNAME,
            'properties.password': process.env.ADMIN_PASSWORD,
            'properties.token': stringUtils.newToken(USER_TOKEN_LENGTH)}
        );
        console.log('Admin has been created');
    }
    
    let mainGroup = await Group.findOne({ '_id': new ObjectId('000000000000000000000000')});
    if(!mainGroup) {
        await Group.create({
            '_id': new ObjectId('000000000000000000000000'),
            'properties.name': 'Chatterino'
        });
        console.log('Main group has been created');
    }   

    admin = await User.findOne({ 'properties.username': process.env.ADMIN_USERNAME, 'properties.password': process.env.ADMIN_PASSWORD});
    mainGroup = await Group.findOne({ '_id': new ObjectId('000000000000000000000000')});
    await userJoinGroup(admin, mainGroup);
}

export async function getUser(query) {
    return await User.findOne(query).populate('properties.groups');
}

export async function getGroupShallow(query) {
    return await Group.findOne(query).populate('content.messages').populate('properties.users');
}

export async function getGroupDeep(query) {
    return await Group.findOne(query).populate({
        path: 'content',
        populate: {
            path: 'messages',
            populate: {
                path: 'properties',
                populate: 'creator'
            }
        }
    }).populate('properties.users');
}

export async function createMessage(messageData) {
    let result = new Message({
        content: {
            text: messageData.content.text
        },
        properties: {
            creator: new mongoose.Types.ObjectId(messageData.properties.creator._id),
            dateCreated: messageData.properties.dateCreated,
            deleted: messageData.properties.deleted,
            edited: messageData.properties.edited
        }
    });

    await result.save();
    
    return await result.populate('properties.creator');;
}

export async function newMessageInGroup(message, group) {
    group.content.messages.push(message);
    await group.save();
}

export async function userJoinGroup(user, group) {
    let filteredGroups = user.properties.groups.map(groupFromProps => groupFromProps.toString());
    if(!contains(filteredGroups, group._id.toString())) {
        user.properties.groups.push(group);
        group.properties.users.push(user);
        await user.save();
        await group.save();
    }
}

function contains(array, toSearch) {
    let result = false;
    array.forEach(element => {
        if(element === toSearch) result = true;
    });
    return result;
}

/**
 * Method used to keep track of what sockets to notify for what group when an event happens in that group.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} groupID the ID of the group with group._id
 */
export function socketEnterGroupView(socketID, groupID) {
    let sockets = socketsInGroups.get(groupID);
    if(sockets == null) sockets = [];
    sockets.push(socketID);
    socketsInGroups.set(groupID.toString(), sockets);
}

/**
 * Method used to keep track of what sockets to notify for what group when an event happens in that group.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} groupID the ID of the group with group._id
 */
export function socketLeaveGroupView(socketID, groupID) {
    let sockets = socketsInGroups.get(groupID);

    if(groupID) {
        let index = sockets.indexOf(socketID);
        if(index > -1) {
            sockets.splice(index, 1);
        }
    
        socketsInGroups.set(groupID.toString(), sockets);
    }
}

export function getSocketsInGroupView(groupID) {
    return socketsInGroups.get(groupID.toString());
}