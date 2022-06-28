import mongoose from 'mongoose';

const InstanceSchema = new mongoose.Schema({
    properties: {
        name: { type: String, required: true},
        channels: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true }
        ],
        creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateCreated: { type: String, required: true },
        users: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        ],
        icon: { type: String, validate: {
            validator: function(value) {
                const urlPattern = /(http|https):\/\/(\w+:{0,1}\w*#)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%#!\-/]))?/;
                const urlRegExp = new RegExp(urlPattern);
                return value.match(urlRegExp);
            },
                message: props => `${props.value} is not a valid URL`    
            }
        },
        isDirect: { type: Boolean, required: true },
        emotes: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Emote' }
        ]
    }
}, { collection: 'Instances'});

export const Instance = mongoose.model('Instance', InstanceSchema);