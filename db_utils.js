import { ObjectId } from "mongodb";

export function newObjectID(id) {
    if(!id) {
        return new ObjectId();
    }
    return new ObjectId(id);
}
