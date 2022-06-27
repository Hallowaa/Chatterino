import mongoose from 'mongoose';

const ChannelSchema = new mongoose.Schema({
    content: {
        messages: [
            { type: mongoose.Types.ObjectId, ref: 'Message' }
        ]
    },
    properties: {
        instanceId: { type: mongoose.Types.ObjectId, ref: 'Instance' },
        name: { type: String, required: true }
    }
}, { collection: 'Channels'});

export const Channel = mongoose.model('Channel', ChannelSchema);