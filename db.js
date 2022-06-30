import mongoose from "mongoose";
import { User } from './user.js';
import { Instance } from './instance.js';
import { Channel } from './channel.js';
import { Message } from './message.js';
import { Emote } from './emote.js';
import { Test } from './test.js';
import * as stringUtils from './string_utils.js';
import { ObjectId } from "mongodb";
import 'dotenv/config';
import aws from 'aws-sdk';

// For keeping track of the users within an instance. This is used
// so that whenever a message is sent into a channel that the user
// is currently not viewing, some visual feedback can still be sent.
export const socketsInInstance = new Map();

// For keeping track of the users within a channel. This is used
// to notify sockets whenever a message is sent within a channel
// they are viewing.
export const socketsInChannel = new Map();

const USER_TOKEN_LENGTH = 15;


mongoose.connect(process.env.MONGODB_URI, {useUnifiedTopology: true}).then(
    console.log('Connected to MongoDB!'),
    generateDefaults()
);

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));

const region = process.env.S3_REGION;
const bucketName = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_KEY;
export const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
});

export async function getS3Object(key) {

    let params = {
        Bucket: bucketName,
        Key: key
    }

    s3.getObject(params, function(error, data) {
        if(error) console.error(error);
        else return data;
    });
}

/**
 * Generates the default collections and an admin user.
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
    
    let mainInstance = await Instance.findOne({ '_id': new ObjectId('000000000000000000000000')});
    if(!mainInstance) {
        await Channel.create({
            'properties.instanceId': new ObjectId('000000000000000000000000'),
            'properties.name': 'main'
        });

        await Channel.create({
            'properties.instanceId': new ObjectId('000000000000000000000000'),
            'properties.name': 'test'
        })

        let mainChannel = await Channel.findOne({ 'properties.instanceId': new ObjectId('000000000000000000000000'), 'properties.name': 'main'});
        let testChannel = await Channel.findOne({ 'properties.instanceId': new ObjectId('000000000000000000000000'), 'properties.name': 'test'});
        await Instance.create({
            '_id': new ObjectId('000000000000000000000000'),
            'properties.name': 'Chatterino',
            'properties.channels': [mainChannel._id, testChannel._id],
            'properties.isDirect': false,
            'properties.dateCreated': Date.now().toString()
        });
        console.log('Main instance has been created');
    }   

    admin = await User.findOne({ 'properties.username': process.env.ADMIN_USERNAME, 'properties.password': process.env.ADMIN_PASSWORD});
    mainInstance = await Instance.findOne({ '_id': new ObjectId('000000000000000000000000')});
    await userJoinInstance(admin, mainInstance);
}

export async function getUser(query) {
    return await User.findOne(query).populate('properties.instances');
}

export async function getInstanceShallow(query) {
    return await Instance.findOne(query).populate('properties.channels').populate('properties.users').populate('properties.emotes');
}

export async function getInstanceEmotes(query) {
    return await Instance.findOne(query).populate('properties.emotes');
}

export async function getChannelShallow(query) {
    return await Channel.findOne(query);
}

export async function getEmote(query) {
    return await Emote.findOne(query).populate('properties.creator');
}

export async function getUserAvaliableEmotes(user) {
    let result = [];

    let instances = await Instance.find({ 'properties.users': user._id }).populate({ path: 'properties', populate: 'emotes'});

    for (const instance of instances) {
        for(const emote of instance.properties.emotes) {
            result.push(emote);
        }
    }
    return result;
}

export async function getChannelDeep(query) {
    return await Channel.findOne(query).populate({
        path: 'content',
        populate: {
            path: 'messages',
            populate: {
                path: 'properties',
                populate: 'creator'
            }
        }
    });
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
    return await result.populate('properties.creator');
}

export async function createEmote(emoteData) {
    let result = new Emote({
        _id: emoteData._id,
        properties: {
            name: emoteData.properties.name,
            content: emoteData.properties.content,
            creator: new mongoose.Types.ObjectId(emoteData.properties.creator._id)
        }
    });

    await result.save();
    return await result.populate('properties.creator');
}

export async function newEmoteInInstance(emote, instance) {
    instance.properties.emotes.push(emote);
    await instance.save();
}

export async function newMessageInChannel(message, channel) {
    channel.content.messages.push(message);
    await channel.save();
}

/**
 * Adds a user model to the properties.users of an instance model if and only if the user is not already in it.
 * @param {User} user The user model.
 * @param {Instance} instance The instance model
 */
export async function userJoinInstance(user, instance) {
    if(!contains(user.properties.instances.map(instances => instances.toString()), instance._id.toString())) {
        user.properties.instances.push(instance._id);
        await user.save();
    }

    if(!contains(instance.properties.users.map(users => users.toString()), user._id.toString())) {
        instance.properties.users.push(user._id);
        await instance.save();
    }
}

export async function connectAllToMain() {
    let mainInstance = await Instance.findOne({ '_id': new ObjectId('000000000000000000000000')});
    for await (const user of User.find({})) {
        let filteredInstances = user.properties.instances.map(instances => instances.toString());
        if(!contains(filteredInstances, mainInstance._id.toString())) {
            user.properties.instances.push(mainInstance._id);
            await user.save();
        }

        if(!contains(mainInstance.properties.users.map(users => users.toString()), user._id.toString())) {
            mainInstance.properties.users.push(user._id);
        }
    }
    
    await mainInstance.save();
}

function contains(array, toSearch) {
    let result = false;
    array.forEach(element => {
        if(element === toSearch) result = true;
    });
    return result;
}

/**
 * Method used to keep track of what sockets to notify for what instance when an event happens in that instance.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} instanceID the ID of the instance with instance._id
 */
export function socketEnterInstanceView(socketID, instanceID) {
    try {
        let sockets = socketsInInstance.get(instanceID);
        if(sockets == null) sockets = [];
        sockets.push(socketID);
        socketsInInstance.set(instanceID.toString(), sockets);
    } catch (error) {
        console.error(`[db.js] Failed to add socket with ID ${socketID} to instanceView of ${instanceID}`);
        console.error(error);
    }
    
}

/**
 * Method used to keep track of what sockets to notify for what instance when an event happens in that instance.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} instanceID the ID of the instance with instance._id
 */
export function socketLeaveInstanceView(socketID, instanceID) {
    try {
        let sockets = socketsInInstance.get(instanceID);
        if(instanceID && socketID && sockets) {
            let index = sockets.indexOf(socketID);
            if(index > -1) {
                sockets.splice(index, 1);
            }
            socketsInInstance.set(instanceID.toString(), sockets);
        }
    } catch (error) {
        console.error(`[db.js] Failed to remove socket with ID ${socketID} from instanceView of ${instanceID}`);
        console.error(error);
    }   
}

/**
 * Method used to keep track of what sockets to notify for what channel when an event happens in that channel.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} channelID the ID of the channel with channel._id
 */
export function socketEnterChannelView(socketID, channelID) {
    try {
        let sockets = socketsInChannel.get(channelID);
        if(sockets == null) sockets = [];
        sockets.push(socketID);
        socketsInChannel.set(channelID.toString(), sockets);
    } catch (error) {
        console.error(`[db.js] Failed to add socket with ID ${socketID} to channelView of ${channelID}`);
        console.error(error);
    }
}

/**
 * Method used to keep track of what sockets to notify for what channelID when an event happens in that channelID.
 * @param {String} socketID The ID of the socket with socket.id
 * @param {String} channelID the ID of the channelID with channelID._id
 */
export function socketLeaveChannelView(socketID, channelID) {
    try {
        let sockets = socketsInChannel.get(channelID);
        if(channelID && socketID && sockets) {
            let index = sockets.indexOf(socketID);
            if(index > -1) {
                sockets.splice(index, 1);
            }
            socketsInChannel.set(channelID.toString(), sockets);
        }
    } catch (error) {
        console.error(`[db.js] Failed to remove socket with ID ${socketID} from channelView of ${channelID}`);
        console.error(error);
    }
}

export function socketLeaveAll(socketID) {
    try {
        if(socketID) {
            for(let instanceID of socketsInInstance.keys()) {
                socketLeaveInstanceView(socketID, instanceID);
            }

            for(let channelID of socketsInChannel.keys()) {
                socketLeaveChannelView(socketID, channelID);
            }
        }
    } catch (error) {
        console.error(`[db.js] Failed to remove socket with ID ${socketID} from all instances and channels`);
        console.error(error);
    }
}

export function getSocketsInInstanceView(instanceID) {
    return socketsInInstance.get(instanceID.toString());
}

export function getSocketsInChannelView(channelID) {
    return socketsInChannel.get(channelID.toString());
}

// TESTING
export async function createTest() {
    await Test.create({
        'testNestedFieldOne.testFieldOne': 'testOne',
        'testNestedFieldOne.testFieldTwo': 'testTwo',
        'testNestedFieldTwo.testFieldThree': 'testThree'
    });
}

export async function updateTest() {
    await Test.updateMany({}, { 'testNestedFieldTwo.testFieldFour': 'testFour'});
}