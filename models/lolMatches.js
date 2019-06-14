const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const lol_matches = new Schema({
    gameId:{ type: Number, required: true },
    platformId:{ type: String },
    gameCreation:{ type: Number},
    gameDuration:{ type: Number},
    queueId:{ type: Number},
    mapId:{ type: Number},
    seasonId:{ type: Number},
    gameVersion:{ type: String },
    gameMode:{ type: String },
    gameType:{ type: String },
    teams:{ type: Array },
    participants:{ type: Array },
    participantIdentities: { type: Array }
}, { usePushEach: true });

module.exports = mongoose.model('LOLMatches', lol_matches);
