conn = new Mongo();
db = conn.getDB("gs-api");


// Update lol region with new standards

db.gamers.update({ region: 'na1' }, { $set: { region: 'na' } }, { multi: true });
db.gamers.update({ region: 'br1' }, { $set: { region: 'br' } }, { multi: true });
db.gamers.update({ region: 'eun1' }, { $set: { region: 'eue' } }, { multi: true });
db.gamers.update({ region: 'euw1' }, { $set: { region: 'euw' } }, { multi: true });
db.gamers.update({ region: 'kr' }, { $set: { region: 'kr' } }, { multi: true });
db.gamers.update({ region: 'la1' }, { $set: { region: 'lan' } }, { multi: true });
db.gamers.update({ region: 'la2' }, { $set: { region: 'las' } }, { multi: true });
db.gamers.update({ region: 'oc1' }, { $set: { region: 'oce' } }, { multi: true });
db.gamers.update({ region: 'ru' }, { $set: { region: 'ru' } }, { multi: true });
db.gamers.update({ region: 'tr1' }, { $set: { region: 'tr' } }, { multi: true });

// Update tags

db.tags.update({ name: "Shot Caller" }, { $set: { name: "shotCaller" } });
db.tags.update({ name: "Chill" }, { $set: { name: "chill" } });
db.tags.update({ name: "Skilled" }, { $set: { name: "skilled" } });
db.tags.update({ name: "Team Player" }, { $set: { name: "teamPlayer" } });
db.tags.update({ name: "Abusive" }, { $set: { name: "abusive" } });
db.tags.update({ name: "Quitter" }, { $set: { name: "quitter" } });
db.tags.update({ name: "Unhelpful" }, { $set: { name: "unhelpful" } });
db.tags.update({ name: "Unskilled" }, { $set: { name: "unskilled" } });
db.tags.update({ name: "Cheater" }, { $set: { name: "cheater" } });
db.tags.update({ name: "Griefer" }, { $set: { name: "griefer" } });
db.tags.update({ name: "Troll" }, { $set: { name: "troll" } });
db.tags.update({ name: "Scammer" }, { $set: { name: "scammer" } });

// Update reviews with new tags

db.reviews.update({ "tags.name": "Shot Caller" }, { $set: { "tags.$.name": "shotCaller" } }, { multi: true });
db.reviews.update({ "tags.name": "Chill" }, { $set: { "tags.$.name": "chill" } }, { multi: true });
db.reviews.update({ "tags.name": "Skilled" }, { $set: { "tags.$.name": "skilled" } }, { multi: true });
db.reviews.update({ "tags.name": "Team Player" }, { $set: { "tags.$.name": "teamPlayer" } }, { multi: true });
db.reviews.update({ "tags.name": "Abusive" }, { $set: { "tags.$.name": "abusive" } }, { multi: true });
db.reviews.update({ "tags.name": "Quitter" }, { $set: { "tags.$.name": "quitter" } }, { multi: true });
db.reviews.update({ "tags.name": "Unhelpful" }, { $set: { "tags.$.name": "unhelpful" } }, { multi: true });
db.reviews.update({ "tags.name": "Unskilled" }, { $set: { "tags.$.name": "unskilled" } }, { multi: true });
db.reviews.update({ "tags.name": "Cheater" }, { $set: { "tags.$.name": "cheater" } }, { multi: true });
db.reviews.update({ "tags.name": "Griefer" }, { $set: { "tags.$.name": "griefer" } }, { multi: true });
db.reviews.update({ "tags.name": "Troll" }, { $set: { "tags.$.name": "troll" } }, { multi: true });
db.reviews.update({ "tags.name": "Scammer" }, { $set: { "tags.$.name": "scammer" } }, { multi: true });


db.reviews.update({ "tags.name": "shotCaller" }, { $set: { "tags.$.type": "good" } }, { multi: true });
db.reviews.update({ "tags.name": "chill" }, { $set: { "tags.$.type": "good" } }, { multi: true });
db.reviews.update({ "tags.name": "skilled" }, { $set: { "tags.$.type": "good" } }, { multi: true });
db.reviews.update({ "tags.name": "teamPlayer" }, { $set: { "tags.$.type": "good" } }, { multi: true });
db.reviews.update({ "tags.name": "abusive" }, { $set: { "tags.$.type": "neutral" } }, { multi: true });
db.reviews.update({ "tags.name": "quitter" }, { $set: { "tags.$.type": "neutral" } }, { multi: true });
db.reviews.update({ "tags.name": "unhelpful" }, { $set: { "tags.$.type": "neutral" } }, { multi: true });
db.reviews.update({ "tags.name": "unskilled" }, { $set: { "tags.$.type": "neutral" } }, { multi: true });
db.reviews.update({ "tags.name": "cheater" }, { $set: { "tags.$.type": "bad" } }, { multi: true });
db.reviews.update({ "tags.name": "griefer" }, { $set: { "tags.$.type": "bad" } }, { multi: true });
db.reviews.update({ "tags.name": "troll" }, { $set: { "tags.$.type": "bad" } }, { multi: true });
db.reviews.update({ "tags.name": "scammer" }, { $set: { "tags.$.type": "bad" } }, { multi: true });
