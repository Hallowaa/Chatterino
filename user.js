export class User {
    username;
    icon;
    bio;
    _id;
    token;

    // only IDs of groups are stored!
    groupIDs;

    constructor(username, icon, bio, _id, token, groupIDs) {
        this.username = username;
        this.icon = icon;
        this.bio = bio;
        this._id = _id;
        this.token = token;
        this.groupIDs = groupIDs;
    }

    get username() {
        return this.username;
    }

    get icon() {
        return this.icon;
    }

    get bio() {
        return this.bio;
    }

    get _id() {
        return this._id;
    }

    get token() {
        return this.token;
    }

    get groupIDs() {
        return this.groupIDs;
    }

}