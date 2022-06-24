import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    content: {
        messages: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
        ]
    },
    properties: {
        name: { type: String, required: true},
        creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dateCreated: { type: String },
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
        }
    }
}, { collection: 'Groups'});

export const Group = mongoose.model('Group', GroupSchema);