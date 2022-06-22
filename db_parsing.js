import { ObjectId } from "mongodb";
import { groupsCollection, usersCollection } from "./db.js";

export async function getGroupByID(db, groupID) {
    return await db.collection(groupsCollection).findOne({ _id:new ObjectId(groupID) });
}

export async function getUserByID(db, userID) {
    return await db.collection(usersCollection).findOne({ _id:new ObjectId(userID) });
}

export async function getUserByToken(db, token) {
    return await db.collection(usersCollection).findOne({ token:token });
}

export async function getUserByUsernamePassword(db, username, password) {
    return await db.collection(usersCollection).findOne({ username:username, password:password });
}

export async function getMessageByID(db, messageID, groupID) {
    let group = getGroupByID(db, groupID);
    // TODO
}

export async function getAllCollections(db) {
    let collections = [];
    await db.listCollections().toArray().then(array => {
        array.forEach(element => {
            collections.push(element);
        });
    });
    return collections;
}

export async function getAllFromCollection(db, collection) {
    let result = [];
    await db.collection(collection).find({}).toArray().then(documents => {
        documents.forEach(element => {
            result.push(element);
        });
    });
    return result;
}
