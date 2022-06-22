export class Message {
    user;
    dateCreated;
    content;
    deleted;
    _id;

    constructor(user, dateCreated, content, deleted, _id) {
        this.user = user;
        this.dateCreated = dateCreated;
        this.content = content;
        this.deleted = deleted;
        this._id = _id;
    }

    get user() {
        return this.user;
    }

    get dateCreated() {
        return this.dateCreated;
    }

    get content() {
        return this.content;
    }

    get deleted() {
        return this.deleted;
    }

    get _id() {
        return _id;
    }
}