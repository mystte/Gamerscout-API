var request = require('request-promise');
var mongoose = require('mongoose');
var axios = require('axios');
var Q = require('q');
var Gamer = require('../models/gamer');
var Review = require('../models/review');
var Tag = require('../models/tag');
var array_tools = require('../utils/arrays');
var config = require('../config');
var constants = require('../utils/constants');

const regions = {
  na : "na1",
  br : "br1",
  eue : "eun1",
  euw : "euw1",
  kr : "kr",
  lan : "la1",
  las : "la2",
  oce : "oc1",
  ru : "ru",
  tr : "tr1"
};

const regions_verbose = {
  na1 : "North America",
  br1 : "Brazil",
  eun1 : "Europe North & East",
  euw1 : "Europe West",
  kr : "Korea",
  la1 : "Latin America North",
  la2 : "Latin America South",
  oc1 : "Oceania",
  ru : "Russia",
  tr1 : "Turkey"
};

const regions_short = () => {
  const result = [];
  const test = Object.keys(regions).forEach(function (key) {
    result.push(key);
  });
  return result;
}

function orderByOccurrence(arr, total) {
  var counts = {};

  arr.forEach(function(value){
    if(!counts[value]) {
      counts[value] = 0;
    }
    counts[value]++;
  });

  const sortedTags = Object.keys(counts).sort(function(curKey,nextKey) {
      return counts[curKey] < counts[nextKey];
  });
  var finalTags = [];
  for (var i = 0; i < sortedTags.length; i++) {
    finalTags.push({
      name: sortedTags[i],
      frequency: counts[sortedTags[i]],
      ratio: counts[sortedTags[i]] * 100 / total,
    });
  }
  return finalTags;
}

// get third top tags for a user
var computeAttributes = function(reviews) {
  var i = 0;
  var j = 0;
  var frequency = [];
  var total = 0;
  while (i < reviews.length) {
    total += reviews[i].tags.length;
    while (j < reviews[i].tags.length) {
      frequency.push(reviews[i].tags[j].name);
      j++;
    }
    j = 0;
    i++;
  }
  return orderByOccurrence(frequency, total);
}

// Generate the request for the lol api
var lolRequestGetSummonerByGamertag = function(region, username, json) {
  const lolRegion = regions[region];
  var url = "https://" + lolRegion + ".api.riotgames.com/lol/summoner/" + config.lol_api.version + "/summoners/by-name/" + username + "?api_key=" + constants.LOL_API_KEY;
  console.log(url);
  return Q().then(function() {
    return request(url);
  }).then(function(body) {
    var data = JSON.parse(body);
    data.platform = 'riot';
    data.regionVerbose = regions_verbose[lolRegion.toLowerCase()];
    data.region = region.toLowerCase();
    data.game = "League Of legends";
    data.game_code = "lol";
    json.push(data);
    return json;
  }).catch(function (err) {
    console.log(err);
    return json;
  });
}

var lolRequestGetSummonerByGamerId = function (region, gamerId, json) {
  const lolRegion = regions[region];
  var url = "https://" + lolRegion + ".api.riotgames.com/lol/summoner/" + config.lol_api.version + "/summoners/" + gamerId + "?api_key=" + constants.LOL_API_KEY;
  console.log(url);
  return Q().then(function () {
    return request(url);
  }).then(function (body) {
    var data = JSON.parse(body);
    data.platform = 'riot';
    data.regionVerbose = regions_verbose[lolRegion.toLowerCase()];
    data.region = region.toLowerCase();
    data.game = "League Of legends";
    data.game_code = "lol";
    json.push(data);
    return json;
  }).catch(function (err) {
    console.log(err);
    return json;
  });
}

var getLolProfileIcon = function(iconId) {
  return (iconId) ? "https://ddragon.leagueoflegends.com/cdn/6.24.1/img/profileicon/" + iconId + ".png" : "/static/images/default_profile_picture.jpg";
}

// Create entries with json form
var createLolGamersInDB = function(json) {
  var result = [];
  for(var i=0; i < json.length; i++) (function(i){
    var newGamer = new Gamer({
      gamer_id : json[i].id,
      level: json[i].summonerLevel,
      gamertag : json[i].name,
      platform : json[i].platform,
      region: json[i].region,
      account_id : json[i].accountId,
      last_update: json[i].revisionDate,
      game : json[i].game,
      game_code: json[i].game_code,
      stats: json[i].stats,
      attributes: [],
      reviews: [],
      last_update: Date.now(),
      profile_picture: getLolProfileIcon(json[i].profileIconId)
    });
    result.push(newGamer.save(json[i].item));
  })(i); // avoid the closure loop problem
  return Q.all(result)
}

var hasAlreadyReviewedPlayer = async function(gamer, reviewer_id) {
  const res = await Review.findOne({ reviewer_id: reviewer_id, gamer_id: gamer.gamer_id}).then((review) => {
    return review !== null;
  });
  return res;
}

// Update the gamer profile with the review
var postReview = function(gamer, comment, tags, review_type, reviewer_id) {
  var result = {status : 400, data : {message : "postReview"}};
  let reviews = [];
  if (comment == null) {
      result.data = {error : "bad value format (review, comment)"};
      return result;
  } else {
    var review = {
      _id: mongoose.Types.ObjectId(),
      comment: comment,
      tags : tags,
      review_type : review_type,
      reviewer_id : reviewer_id,
      gamer_id : gamer.gamer_id
    };
    return Q().then(() => {
      return Review.find({ gamer_id: gamer.gamer_id }, { 'tags._id': 0 });
    }).then(function(foundReviews) {
      reviews = foundReviews;
      reviews.push(review);
      return Gamer.findOne({_id:gamer._id});
    }).then(async function(gamer, err) {
      const hasReviewed = await hasAlreadyReviewedPlayer(gamer, reviewer_id);

      if (!hasReviewed) {
        if (review_type == "REP") {
          gamer.rep_review_count ++;
        } else if (review_type == "FLAME") {
          gamer.flame_review_count ++;
        }
        gamer.review_count += 1;
        result.status = 201;
        result.data = {message : "Review Successfully posted"};
        gamer.attributes = computeAttributes(reviews);
        const newReview = new Review(review);
        newReview.save();

        return gamer.save().then(function(res) {
          return result;
        });
      } else {
        result.data = {error: "cannot review player twice"};
        return result;
      }
    }).catch(function(error) {
      console.log(error);
    });
  }
}

// Retrieve one gamer profile in the db + the tags list
var getGamerProfile = function(gamer) {
    var result = {status : 400, data : {message : "getGamerProfile"}};
    return Q().then(function(){
      return Tag.find({});
    }).then(function(tags, err) {
      if (err) {
        result.data = {message : err};
        return result;
      } else {
        var data = JSON.parse(JSON.stringify(gamer));
        data.all_tags = tags;
        result.status = 201;
        result.data = data;
        return result;
      }
    });
}

// Request for a specific lol gamertag
var getLolAccountInRegionByGamerTag = function(region, gamertag) {
  return Q().then(function () {
    json = [];
    return lolRequestGetSummonerByGamertag(region, gamertag, json);
  }).then(async function(json) {
    const newStats = await lolRequestGetStatsForGamer(region, json[0].id, json[0].accountId);
    json[0].stats = newStats;
    return json;
  });
}

// Request for a specific lol gamertag
var getLolAccountInRegionByGamerId = function (region, gamerId) {
  return Q().then(function () {
    json = [];
    return lolRequestGetSummonerByGamerId(region, gamerId, json);
  }).then(async function (json) {
    const newStats = await lolRequestGetStatsForGamer(region, json[0].id, json[0].accountId);
    json[0].stats = newStats;
    return json;
  });
}

var getWinrate = function(wins = 0, losses = 0) {
  const totalGames = wins + losses;
  return Math.floor(wins * 100 / totalGames);
}

var romanToNumber = function(romanNumber) {
  const convertTable = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
  };
  const result = convertTable[romanNumber];
  return result ? result : 0;
}

var getLeagueIconUrl = function(tier, rank) {
  const image = (tier === 'grandmaster') ? 'grandmaster' : tier + '_' + rank;
  return image;
}

var sortStatsResultArray = function(rankedArray) {
  const solo5v5 = array_tools.findObjectInJson(rankedArray, 'type', 'RANKED_SOLO_5x5');
  const flex5v5 = array_tools.findObjectInJson(rankedArray, 'type', 'RANKED_FLEX_SR');
  const flex3v3 = array_tools.findObjectInJson(rankedArray, 'type', 'RANKED_FLEX_TT');

  const sortedRankedArray = [];

  if (solo5v5 !== -1) sortedRankedArray.push(solo5v5);
  if (flex5v5 !== -1) sortedRankedArray.push(flex5v5);
  if (flex3v3 !== -1) sortedRankedArray.push(flex3v3);

  return sortedRankedArray;
}

var getRankedFromData = function(data) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    result.push({
      team_name: data[i].playerOrTeamName,
      team_id: data[i].playerOrTeamId,
      tier: data[i].tier.toLowerCase(),
      rank: data[i].rank,
      rank_in_number: romanToNumber(data[i].rank),
      league_name: data[i].leagueName,
      league_id: data[i].leagueId,
      type: data[i].queueType,
      league_img_url: getLeagueIconUrl(data[i].tier.toLowerCase(), romanToNumber(data[i].rank)),
      wins: data[i].wins,
      lost: data[i].losses,
      winrate: getWinrate(data[i].wins, data[i].losses),
      points: data[i].leaguePoints,
      extras: {
        veteran: data[i].veteran,
        inactive: data[i].inactive,
        fresh_blood: data[i].fresh_blood,
        hot_streak: data[i].hot_streak
      }
    });
  }
  return sortStatsResultArray(result);
}

var getPlayedPositionsFromData = function(data) {
  const result = {
    top: { count: 0, percentage: 0 },
    jungle: { count: 0, percentage: 0 },
    mid: { count: 0, percentage: 0 },
    bottom: { count: 0, percentage: 0 },
    support: { count: 0, percentage: 0 },
  };
  var totalCount = 0;
  for (var i = 0; i < data.matches.length; i++) {
    const match = data.matches[i];
    if (match.lane === 'TOP') {
      result.top.count += 1;
    } else if (match.lane === 'BOTTOM') {
      if (match.role === 'DUO_SUPPORT') {
        result.support.count += 1;
      } else {
        result.bottom.count += 1;
      }
    } else if (match.lane === 'JUNGLE') {
      result.jungle.count += 1;
    } else if (match.lane === 'MID') {
      result.mid.count += 1;
    }
  };
  totalCount = result.top.count + result.support.count + result.bottom.count + result.jungle.count + result.mid.count;
  result.top.percentage = Math.trunc(result.top.count * 100 / totalCount);
  result.support.percentage = Math.trunc(result.support.count * 100 / totalCount);
  result.bottom.percentage = Math.trunc(result.bottom.count * 100 / totalCount);
  result.jungle.percentage = Math.trunc(result.jungle.count * 100 / totalCount);
  result.mid.percentage = Math.trunc(result.mid.count * 100 / totalCount);
  return result;
};

var getPlayedChampionsFromData = async function(data) {
  var urlChampions = "https://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/champion.json";
  var championsRes = JSON.parse(await request(urlChampions));
  const champions = {};

  for (var i = 0; i < data.matches.length; i++) {
    const match = data.matches[i];
    const foundChampion = await array_tools.findObjectInJson(championsRes.data, 'key', match.champion);
    if (foundChampion !== -1) {
      if (champions[foundChampion.id]) champions[foundChampion.id] += 1;
      if (!champions[foundChampion.id]) champions[foundChampion.id] = 1;
    }
  };
  const sortedChampions = Object.keys(champions).sort(function (a, b) { return champions[b] - champions[a] });
  return sortedChampions.slice(0, 5);
}

var lolRequestGetStatsForGamer = async function(region, gamerId, accountId) {
  const lolRegion = regions[region];
  var stats = {
    ranked: [],
    frequent_champions: [],
    roles: {
      top: { count: 0, percentage: 0 },
      jungle: { count: 0, percentage: 0 },
      mid: { count: 0, percentage: 0 },
      bottom: { count: 0, percentage: 0 },
      support: { count: 0, percentage: 0 },
    },
  };
  try {
    var urlRanking = "https://" + lolRegion + ".api.riotgames.com/lol/league/" + config.lol_api.version + "/positions/by-summoner/" + gamerId + "?api_key=" + constants.LOL_API_KEY;
    var urlMatches = "https://" + lolRegion + ".api.riotgames.com/lol/match/" + config.lol_api.version + "/matchlists/by-account/" + accountId + "?api_key=" + constants.LOL_API_KEY;

    var rankingPromise = axios.get(urlRanking);
    var matchesPromise = axios.get(urlMatches);

    const [rankingRes, matchesRes] = await Promise.all([rankingPromise, matchesPromise]);
    var stats = {
      ranked: getRankedFromData(rankingRes.data),
      frequent_champions: await getPlayedChampionsFromData(matchesRes.data),
      roles: getPlayedPositionsFromData(matchesRes.data),
    };
    return stats;
  } catch(err) {
    return stats;
  }
}

var updateReviewsWithNewGamerId = async function(previousGamerId, newGamerId) {
  Review.update({gamer_id: previousGamerId}, { $set: {gamer_id: newGamerId} }, { multi: true });
}

var checkEncryptedGamerId = async function(region, gamer) {
  var url = "https://" + regions[region] + ".api.riotgames.com/lol/summoner/" + config.lol_api.version + "/summoners/by-name/" + gamer.gamertag + "?api_key=" + constants.LOL_API_KEY;
  const result = JSON.parse(await request(url));

  if (result.id !== gamer.gamer_id) {
    await updateReviewsWithNewGamerId(gamer.gamer_id, result.id);
    gamer.gamer_id = result.id;
    gamer.account_id = result.accountId;
  }
  return gamer;
}

var refreshGamerData = async function(region, gamers) {
  for (var i = 0; i < gamers.length; i++) {
    let gamer = gamers[i];
    gamer = await checkEncryptedGamerId(region, gamer); // make sure we use the right encrypted key (in case we change api key)
    if (Date.now() - gamer.last_update > 3600000 || !gamer.last_update) {// refresh data if last refresh was made at least one hour ago
      const updated_gamer = (await getLolAccountInRegionByGamerId(region, gamer.gamer_id))[0];
      gamer.last_update = Date.now();
      gamer.gamertag = updated_gamer.name;
      gamer.stats = updated_gamer.stats;
      gamer.level = updated_gamer.summonerLevel;
      gamer.gamer_id = updated_gamer.id;
      gamer.game = updated_gamer.game;
      gamer.game_code = updated_gamer.game_code;
      gamer.region = region.toLowerCase();;
      gamer.account_id = updated_gamer.accountId;
      gamer.profile_picture = getLolProfileIcon(updated_gamer.profileIconId);
      gamer.save();
    }
  }
}

var getEntriesWithPage = function(entries, page) {
  const newEntries = [];
  const cursor_end = page * 50;
  const cursor_begin = cursor_end - 50;
  for (var i = 0; i < entries.length; i++) {
    if (i >= cursor_begin && i <= cursor_end) {
      entries[i].iconUrl = getLolProfileIcon();
      newEntries.push();
    }
  }
  return newEntries;
}

var addExtraInfoInEntryLeague = function(entries) {
  const newEntries = [];
  for (var i = 0; i < entries.length; i++) {
    const entry = entries[i];
    entries[i].iconUrl = getLolProfileIcon();
    entries[i].winPercentage = Math.floor(entry.wins * 100 / (entry.wins + entry.losses))
    newEntries.push(entries[i]);
  }
  return newEntries;
}

var sortLeagueEntries = function(entries) {
  const tier1 = array_tools.sortByKey(entries.filter((el) => el.rank === 'I'), 'leaguePoints', false);
  const tier2 = array_tools.sortByKey(entries.filter((el) => el.rank === 'II'), 'leaguePoints', false);
  const tier3 = array_tools.sortByKey(entries.filter((el) => el.rank === 'III'), 'leaguePoints', false);
  const tier4 = array_tools.sortByKey(entries.filter((el) => el.rank === 'IV'), 'leaguePoints', false);
  return [
    ...tier1, ...tier2, ...tier3, ...tier4
  ];
}

var getLeague = async function(region, league_id, page) {
  try {
    const url_leagues = "https://" + region + ".api.riotgames.com/lol/league/" + config.lol_api.version + "/leagues/" + league_id + "?api_key=" + constants.LOL_API_KEY;
    const league_res = await axios.get(url_leagues);
    league_res.data.cursor = page;
    league_res.data.pages = Math.round(league_res.data.entries.length / 50);
    league_res.data.entries = sortLeagueEntries(league_res.data.entries);
    // league_res.data.entries = getEntriesWithPage(league_res.data.entries, page);
    league_res.data.entries = addExtraInfoInEntryLeague(league_res.data.entries);
    return league_res.data;
  } catch (err) {
    console.log("Err:", err);
    return err;
  }
}

// Request for a specific lol gamertag (DEPRECATED)
var getLol = function(gamertag) {
	var result = {status : 400, data : {message : "getLol"}};
	return Q().then(function() {
    json = [];
    return lolRequestGetSummonerByGamertag(regions.na, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.br, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.eune, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.kr, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.lan, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.las, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.oce, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.ru, gamertag, json);
  }).then(function(json){
    return lolRequestGetSummonerByGamertag(regions.tr, gamertag, json);
  });
}

module.exports = {
  getLol: getLol,
  getLeague,
  getLolAccountInRegionByGamerTag,
  getLolAccountInRegionByGamerId,
  getGamerProfile: getGamerProfile,
  postReview: postReview,
  regions_verbose: regions_verbose,
  get_regions_short: regions_short,
  regions: regions,
  getGamerStats: lolRequestGetStatsForGamer,
  refreshGamerData,
  createLolGamersInDB: createLolGamersInDB,
  computeAttributes,
}
