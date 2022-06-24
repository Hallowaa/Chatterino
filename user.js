import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    profile: {
        username: { type: String, required: true },
        bio: { type: String },
        color: { type: String },
        icon: { type: String, validate: {
            validator: function(value) {
                const urlPattern = /(http|https):\/\/(\w+:{0,1}\w*#)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%#!\-/]))?/;
                const urlRegExp = new RegExp(urlPattern);
                return value.match(urlRegExp);
            },
                message: props => `${props.value} is not a valid URL`    
            }
        }
    },
    properties: {
        token: { type: String, index: true, required: true },
        password: { type: String, required: true },
        friends: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        ],
        groups: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
        ]
    }
}, { collection: 'Users'});

export const User = mongoose.model('User', UserSchema);