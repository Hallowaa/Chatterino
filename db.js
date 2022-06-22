import { MongoClient, ObjectId } from "mongodb";
import { Group } from "./group.js";
import { Message } from "./message.js";
import { User } from "./user.js";
import * as dbu from './db_utils.js';
import * as dbp from './db_parsing.js'

const uri = process.env.MONGODB_URI;
const dbName = "Chatterino";

export const mongoClient = new MongoClient(uri);
export const db = mongoClient.db(dbName);

export const usersCollection = "Users";
export const groupsCollection = "Groups";
export const mainChatID = dbu.newObjectID("000000000000000000000000");
export const socketsInGroups = new Map();
export async function connectDb() {
    try {
        mongoClient.isConnected = false;
        console.log(`Connecting Mongo client...`);
        mongoClient.connect(() => {
            console.log(`Mongo client has been connected`);
            mongoClient.isConnected = true;
            createDefaults();
        });
    } catch(err) {
        console.error(err);
        await mongoClient.close();
    }
}

async function createDefaults() {
    try {
        let collectionsInDB = await dbp.getAllCollections(db);
        let collectionsInDBNames = [];
        collectionsInDB.forEach(collection => {
            collectionsInDBNames.push(collection.name);
        })
        let expectedCollections = [usersCollection, groupsCollection];

        expectedCollections.forEach(element => {
            if(!contains(collectionsInDBNames, element)) {
                db.createCollection(element, (error, result) => {
                    if(error) console.error(error);
                });
            }
        });
    } catch(error) {
        console.error(`Error when creating default collections: ${error}`);
    }

    try{
        let found = await dbp.getGroupByID(db, mainChatID);
        
        if(!found) {
            dbp.getAllFromCollection(db, usersCollection).then(users => {
                addGroup(new Group(mainChatID, "Chatterino", [] , Date.now, null, []));
                users.forEach(user => {
                    connectUserAndGroup(user._id, mainChatID);
                });
            });
        }
    } catch (error) {
        console.error(`Error when creating default chat: ${error}`);
    }
}

export function socketJoinGroup(socketID, newGroupID, oldGroupID) {
    let socketsInNew = socketsInGroups.get(newGroupID);
    if(socketsInNew == null) {
        socketsInNew = [];
    }

    let socketsInOld = socketsInGroups.get(oldGroupID);
    if(socketsInOld == null) {
        socketsInOld = [];
    }

    socketsInNew.push(socketID);
    
    if(oldGroupID) {
        let index = usersInOld.indexOf(socketID);
        if(index > -1) {
            socketsInOld.splice(index, 1);
        }
        socketsInGroups.set(oldGroupID.toString(), socketsInOld);
    }
    socketsInGroups.set(newGroupID.toString(), socketsInNew);
}

export function getSocketIDsInGroup(groupID) {
    return socketsInGroups.get(groupID);
}

export function contains(array, toSearch) {
    let result = false;
    array.forEach(element => {
        if (element == toSearch) result = true;
    });
    return result;
}

export async function isConnected() {
    return mongoClient.isConnected;
}

/**
 * Returns a new Message object out of a message document.
 * @param {Document} message The message document.
 * @returns A new Message object.
 */
export function messageDocumentToObject(message) {
    return new Message(message.user, message.dateCreated, message.content, message.deleted, message._id);
}

/**
 * Returns a new Group object out of a group document. It only has the IDs of the users, not the users themselves.
 * @param {Document} group The group document.
 * @returns A new Group object.
 */
export function groupDocumentToObject(group) {
    return new Group(group._id, group.name, group.users, group.dateCreated, group.creator, group.messages);
}

/**
 * Returns a User object out of a user document.
 * @param {Document} user The user document.
 * @returns A new User object.
 */
export function userDocumentToObject(user) {
    return new User(user.username, user.icon, user.bio, user._id, user.token, user.groupIDs);
}

/**
 * Inserts a document into a collection
 * @param {Collection} collection A collection, needs to be used with db.collection();
 * @param {Document} document The document to insert
 */
export async function insertInto(collection, document) {
    db.collection(collection).insertOne(document);
}

/**
 * Implicitly creates a new document with the parameters of a group object.
 * @param {Group} group The group to add to the database.
 */
export async function addGroup(group) {
    const newGroup = {
        "_id": group._id,
        "name": group.name,
        "userIDs": group.userIDs,
        "dateCreated": group.dateCreated,
        "creatorID": group.creatorID,
        "messages": group.messages
    }
    insertInto(groupsCollection, newGroup);
}

export function messageObjectToDocument(message) {
    return {
        "_id": new ObjectId(),
        "content": message.content,
        "user": message.user,
        "deleted": message.deleted,
        "dateCreated": message.dateCreated
    }
}

/**
 * Adds a message document to the end of the message list of a group document
 * @param {Document} message The message we wish to add.
 * @param {Document} group The group we wish to add the message to.
 */
export async function addMessageToGroup(message, group) {
    try {
        let groupsMessages = group.messages;
        let groupsMessagesIDs = [];
        
        if(groupsMessages) {
            groupsMessages.forEach(element => {
                groupsMessagesIDs.push(element._id);
            });
        }
        
        if(!contains(groupsMessagesIDs, message._id)) {
            groupsMessages.push(message);
            await db.collection(groupsCollection).updateOne({ _id:group._id }, {$set: {messages: groupsMessages}});
        }

    } catch (error) {
        console.error(error);
    }
}

export async function connectUserAndGroup(userID, groupID) {
    try {
        let user = await dbp.getUserByID(db, userID);
        let group = await dbp.getGroupByID(db, groupID);

        let usersGroupIDs = user.groupIDs;
        let groupsUserIDs = group.userIDs;
    
        if(!contains(usersGroupIDs, group._id)) {
            usersGroupIDs.push(group._id);
            await db.collection(usersCollection).updateOne({ _id:user._id}, {$set: {groupIDs: usersGroupIDs}});
        }
        if(!contains(groupsUserIDs, user._id)) {
            groupsUserIDs.push(user._id);
            await db.collection(groupsCollection).updateOne({ _id:group._id}, {$set: {userIDs: groupsUserIDs}});
        }
    } catch (error) {
        console.error(error);
    }
}