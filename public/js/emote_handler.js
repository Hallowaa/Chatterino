const emoteRegex = /^<:[a-zA-Z0-9_]+:[a-zA-Z0-9_]{24}@(a|s)>$/;
const emoteSuggestionRegex = /^:[a-zA-Z0-9_]*:?$/;
const preProcessingEmoteRegex = /^:[a-zA-Z0-9_]+(~[1-9]+)?:$/;

function matches(message, regex) {
    for(const part of message.split(' ')) { if(part.match(regex)) return true; }
    return false;
}

function insertEmoteString(message) {
    if(matches(message, preProcessingEmoteRegex)) {
        const availableEmotes = socket.availableEmotes;
        let result = '';

        for(const part of message.split(' ')) {
            if(part === '') {
                result += ' ';
            } else if(part.match(preProcessingEmoteRegex)) {
                const emoteName = part.split(':')[1];
                let found = false;
                for(const emote of availableEmotes) {
                    if(emote.properties.name === emoteName) {
                        found = true;
                        result += '<:' + emoteName.split('~')[0] + ':' + emote._id + '@' + (emote.properties.content.split('.').pop()==='png'?'s':'a') + '> ';
                        break;
                    }
                }
                if(!found) result += part + ' ';
            } else {
                 result += part + ' ';
            }
        }
        return result;
    }
    return message;
}

function insertEmoteImage(message) {
    if(matches(message.textContent, emoteRegex)) {
        let textContent = message.textContent;
        message.innerHTML = '';
        for(const part of textContent.split(' ')) {
            if(part === '') {
                message.innerHTML += ' ';
            } else if(part.match(emoteRegex)) {
                const emoteID = part.split(':')[2].split('@')[0];
                const fileType = part.split('@')[1].charAt(0)==='s'?'png':'gif';
                const emoteContainer = newElement('span', 'emoteImageContainer', 'emoteImageContainer');
                const emoteImage = newElement('img', 'emoteImage', 'emoteImage');
                const src = 'https://chatterinoxd.s3.eu-central-1.amazonaws.com/instance-emotes/' + emoteID + '.' + fileType;
                checkImage(src, () => { 
                    emoteImage.src = src;
                    emoteContainer.appendChild(emoteImage);
                    message.innerHTML += emoteContainer.outerHTML;
                }, () => { message.innerHTML += part + ' ' });
                        
            } else {
                message.innerHTML += part + ' ';
            }
        }
    }
}