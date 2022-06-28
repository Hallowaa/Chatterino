import mongoose from 'mongoose';

const EmoteSchema = new mongoose.Schema({
    properties: {
        name: { type: String, required: true },
        content: { type: String, validate: {
            validator: function(value) {
                const urlPattern = /(http|https):\/\/(\w+:{0,1}\w*#)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%#!\-/]))?/;
                const urlRegExp = new RegExp(urlPattern);
                return value.match(urlRegExp);
            },
                message: props => `${props.value} is not a valid URL`    
            }
        , required: true},
        creator: { type: mongoose.Schema.Types.ObjectId, required: true }
    }
}, { collection: 'Emotes' });

export const Emote = mongoose.model('Emote', EmoteSchema);