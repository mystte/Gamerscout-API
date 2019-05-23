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
