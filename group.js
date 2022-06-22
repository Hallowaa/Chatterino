export class Group {
    _id;
    name;
    // Only IDs of users are stored!!
    userIDs;
    dateCreated;

    // Only ID of creator is stored
    creatorID;
    messages;

    constructor(_id, name, userIDs, dateCreated, creatorID, messages) {
        this._id = _id;
        this.name = name;
        this.userIDs = userIDs;
        this.dateCreated = dateCreated;
        this.creatorID = creatorID;
        this.messages = messages;
    }

    get _id() {
        return this._id;
    }

    get name() {
        return this.name;
    }

    get userIDs() {
        return this.userIDs;
    }

    get dateCreated() {
        return this.dateCreated;
    }

    get creatorID() {
        return this.creatorID;
    }

    get messages() {
        return this.messages;
    }
}