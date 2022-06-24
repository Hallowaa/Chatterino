import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    content: {
        text: { type: String }
    },
    properties: {
        creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateCreated: { type: String },
        edited: { type: Boolean },
        deleted: { type: Boolean }
    }
}, { collection: 'Messages'});

export const Message = mongoose.model('Message', MessageSchema);