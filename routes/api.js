const express = require("express");
const apicache = require("apicache");
const config = require("../config");
const router = express.Router();
const requests = require("../utils/requests");
const Gamer = require("../models/gamer");
const Review = require("../models/review");
const Tag = require("../models/tag");
const logic_lol = require("../logics/lol");
const array_tools = require("../utils/arrays");
const email_tools = require("../utils/email");
const date_tools = require("../utils/date");
const Q = require("q");
const User = require("../models/user");
const ObjectId = require("mongoose").Types.ObjectId;
const slack = require("../utils/slack");
const environment = require("../global").environment;
const _ = require("lodash");
const log = require("color-logs")(
  (isLogEnabled = true),
  (isDebugEnabled = true),
  __filename
);

let cache = apicache.middleware;

const cache_only_20x = (req, res) =>
  res.statusCode === 200 || res.statusCode === 201;
const cache_success = cache("3 hours", cache_only_20x);

// Setup Steam
const steamDeveloperKey = "389EC943738900A510BF540217AFB042";

// Enum for different kind of api (lol, steam, psn, xbox...)
const API_TYPE = {
  LOL: 0,
  STEAM: 1,
  PSN: 2,
  XBOX: 3
};

// Insert tags into the DB
router.post("/tags", function(req, res, next) {
  const secret_token = req.body.secret_token;
  const tags = req.body.tags;
  Q()
    .then(function() {
      for (var i = 0; i < tags.length; i++) {
        var newTag = new Tag({
          name: tags[i].name,
          type: tags[i].type
        });
        newTag.save();
      }
      res.status(201).json({ message: "Tags Created" });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json({ err: "Internal Server Error" });
    });
});

// Retrieve available tags
router.get("/attributes", function(req, res, next) {
  // if (!req.session._id) {
  //     res.status(403).json({err : "Forbidden"});
  //     return;
  // }
  Q()
    .then(function() {
      return Tag.find();
    })
    .then(function(tags, err) {
      if (err) {
        console.log(err);
        return res.status(500).json("Internal Server Error");
      } else {
        return res.status(200).json({ attributes: tags });
      }
    })
    .catch(function(reason) {
      console.log(reason);
      return res.status(500).json("Internal Server Error");
    });
});

const hasUserAlreadyReviewed = (loggedInuserId = null, gamerId) => {
  if (!loggedInuserId) return false;
  return Review.findOne({
    gamer_id: gamerId,
    reviewer_id: loggedInuserId
  }).then(review => {
    return review !== null;
  });
};

const getUsersFromReviews = async (reviews, email) => {
  const newReviews = [];
  for (i = 0; i < reviews.length; i++) {
    let newReview = JSON.parse(JSON.stringify(reviews[i]));
    const reviewedGamer = await Gamer.findOne({ gamer_id: newReview.gamer_id });

    newReviews.push(
      new Promise((resolve, reject) => {
        User.findOne({ _id: new ObjectId(newReview.reviewer_id) }).then(
          user => {
            newReview.username = user ? user.username : null;
            newReview.date_since = date_tools.timeSince(newReview.date);
            newReview.gamertag = reviewedGamer ? reviewedGamer.gamertag : null;
            newReview.region = reviewedGamer ? reviewedGamer.region : null;
            resolve(newReview);
          }
        );
      })
    );
  }
  return Promise.all(newReviews);
};

const getReviewerNameInReviews = function(gamers, reviews, loggedInuserId) {
  const newGamers = [];
  for (i = 0; i < gamers.length; i++) {
    let newGamer = JSON.parse(JSON.stringify(gamers[i]));
    newGamers.push(
      Q()
        .then(() => {
          return getUsersFromReviews(reviews.docs);
        })
        .then(async updatedReviews => {
          newGamer.hasReviewed = await hasUserAlreadyReviewed(
            loggedInuserId,
            newGamer.gamer_id
          );
          newGamer.reviews = updatedReviews;
          newGamer.attributes = logic_lol.computeAttributes(reviews.docs);
          newGamer.reviews_data = {
            pages: reviews.pages,
            page: reviews.page
          };
          return newGamer;
        })
    );
  }
  return Q.all(newGamers);
};

const parsedGamersProfilePictures = gamers => {
  const newGamers = [];
  for (i = 0; i < gamers.length; i++) {
    let newGamer = JSON.parse(JSON.stringify(gamers[i]));
    newGamers.push(
      Q()
        .then(() => {
          return requests.do_get_request(newGamer.profile_picture);
        })
        .then(response => {
          if (response.statusCode === 403) {
            newGamer.profile_picture =
              "https://ddragon.leagueoflegends.com/cdn/6.24.1/img/profileicon/26.png";
          }
          return newGamer;
        })
    );
  }
  return Q.all(newGamers);
};

const gerUsernameRegexpForSearch = gamertag => {
  let regex = "";
  for (var i = 0; i < gamertag.length; i++) {
    regex += gamertag[i];
    regex += "[ ]*";
  }
  return regex;
};

router.get("/config", function(req, res, next) {
  const lol_regions_short = logic_lol.get_regions_short();
  res.status(200).json({
    facebookAppId:
      environment === "production"
        ? config.facebook.prod.appId
        : config.facebook.dev.appId,
    platforms: config.supported_platforms,
    regions: {
      riot: {
        regions_short: lol_regions_short,
        regions: logic_lol.regions,
        verbose: logic_lol.regions_verbose
      }
    }
  });
});

router.get("/reviews/latest", function(req, res, next) {
  Review.find()
    .sort({ date: -1 })
    .limit(2)
    .then(async reviews => {
      const updatedReviews = await getUsersFromReviews(reviews);
      res.status(200).json(updatedReviews);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: { msg: "Internal Server Error" } });
    });
});

router.get("/test/:wtv/:wtv2", async function(req, res, next) {
  // const result = await logic_lol.getGamerStats('na1', req.params.wtv, req.params.wtv2);
  res.status(200).json({ msg: "OKAY", result: null });
});

router.get("/email_validation/:email", function(req, res, next) {
  var email = req.params.email ? req.params.email : null;
  if (!email) {
    res
      .status(400)
      .json({ statusCode: 400, error: { msg: "Missing email parameter" } });
  }

  if (email_tools.validateEmail(email)) {
    User.findOne({ email: email })
      .then(result => {
        if (!result) {
          res.status(201).json({ statusCode: 201, message: "OK" });
        } else {
          res.status(400).json({
            statusCode: 400,
            error: { msg: "Email address already exists" }
          });
        }
      })
      .catch(error => {
        res
          .status(500)
          .json({ statusCode: 500, error: { msg: "Internal Server Error" } });
        console.log(error);
      });
  } else {
    res
      .status(400)
      .json({ statusCode: 401, error: { msg: "Invalid email address" } });
  }
});

// Search a specific usertag based on the platform
// For now we force league of legends but we'll have to refactor this once
// we want to implement more of them (it is also ugly af :/)
router.get(
  "/search/:platform/:region/:game/:gamertag",
  async (req, res, next) => {
    const loggedInuserId = req.session._id ? req.session._id : null;
    const platform = req.params.platform
      ? req.params.platform.toLowerCase()
      : null;
    const game = req.params.game ? req.params.game.toLowerCase() : null;
    const gamertag = req.params.gamertag
      ? req.params.gamertag.toLowerCase()
      : null;
    const region = req.params.region ? req.params.region.toLowerCase() : null;
    const query_limit = req.query.limit ? +req.query.limit : 5;
    const query_sort = req.query.sort && req.query.sort === "OLDEST" ? 1 : -1;
    const query_filter =
      req.query.filter &&
      (req.query.filter === "APPROVALS" || req.query.filter === "DISAPPROVALS")
        ? req.query.filter
        : "ALL";
    const query_page = req.query.page ? +req.query.page : 1;

    try {
      const platformDetails = config.supported_platforms.find(
        p => p.name === platform
      );
      if (!platformDetails || !platformDetails.enabled)
        throw new Error("Not supported Platform");
      const gamerOptions = {
        gamertag: new RegExp(
          "^" + gerUsernameRegexpForSearch(gamertag) + "$",
          "i"
        ),
        region: region
      };
      let gamers = await Gamer.find(gamerOptions);
      let gamerJSON;
      let gamerOutline;
      if (!gamers || gamers.length === 0) {
        log.info(
          `${platform}-${game}-${gamertag} : Gamer did not exist in Mongo, querying in API...`
        );
        if (region) {
          gamerJSON = await logic_lol.getLolAccountInRegionByGamerTag(
            region,
            gamertag
          );
        } else {
          gamerJSON = await logic_lol.getLol(gamertag);
        }
        gamerOutline = await parsedGamersProfilePictures(
          await logic_lol.createLolGamersInDB(gamerJSON)
        );
      } else {
        let filters = {};
        if (query_filter === "APPROVALS") filters.review_type = "REP";
        if (query_filter === "DISAPPROVALS") filters.review_type = "FLAME";
        const reviews = await Review.paginate(
          { gamer_id: gamers[0].gamer_id, ...filters },
          {
            page: query_page,
            limit: query_limit,
            sort: { date: query_sort }
          }
        );
        logic_lol.computeAttributes(reviews.docs);
        await logic_lol.refreshGamerData(region, gamers);
        const updatedGamers = await getReviewerNameInReviews(
          gamers,
          reviews,
          loggedInuserId
        );
        gamerOutline = await parsedGamersProfilePictures(updatedGamers);
      }
      const regionId = logic_lol.regions[region];
      const {
        aggregateStats,
        allMatchData
      } = await logic_lol.getMatchAggregateStatsByChampion(
        regionId,
        gamerOutline[0].account_id
      );
      const recentMatches = await logic_lol.getRecentMatchList(
        regionId,
        gamerOutline[0].account_id
      );
      const ranked = await logic_lol.getRankedData(
        regionId,
        gamerOutline[0].gamer_id
      );
      const liveData = await logic_lol.getLiveMatchForPlayer(
        regionId,
        gamerOutline[0].gamer_id
      );

      const live = liveData.hasOwnProperty('gameMode');
      const rawRoles = allMatchData
        .map(m => {
          if (!m || !m.player || !m.player.stats) return null;
          const { kills, assists, deaths, win } = m.player.stats;
          return {
            lane: m.player.timeline.lane,
            kills,
            assists,
            deaths,
            win
          };
        })
        .reduce((acc, curr) => {
          if (!curr) return acc;
          const lane = curr.lane.toLowerCase();
          if (acc[lane] === undefined) {
            acc[lane] = {
              count: 1,
              kills: curr.kills,
              win: Number(curr.win),
              deaths: curr.deaths,
              assists: curr.assists,
              loss: Number(!curr.win)
            };
          } else {
            acc[lane].count += 1;
            acc[lane].kills += curr.kills;
            acc[lane].win += Number(curr.win);
            acc[lane].deaths += curr.deaths;
            acc[lane].assists += curr.assists;
            acc[lane].loss += Number(!curr.win);
          }
          return acc;
        }, {});
      let roles;
      if (rawRoles) {
        roles = Object.keys(rawRoles).reduce((acc, curr) => {
          const { count, win, loss, kills, deaths, assists } = rawRoles[curr];
          acc[curr] = {
            count,
            percentage: count / allMatchData.length,
            kills,
            win,
            loss,
            deaths,
            assists,
            winPercentage: win / (win + loss),
            kda: kills + assists / deaths
          };
          return acc;
        }, {});
      } else {
        roles = {
          count: 0,
          percentage: 0,
          kda: 0,
          wins: 0,
          loss: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          winPercentage: 0
        };
      }
      const trendData = allMatchData
        .map(m => {
          if (!m) return;
          const { kills, deaths, assists } = m.player.stats;
          const { gameCreation, teamKDA } = m;
          const { creepsPerMinDeltas } = m.player.timeline;
          if (!creepsPerMinDeltas) return;
          let kda;
          if (deaths === 0) kda = 0;
          else kda = (kills + assists) / deaths;
          const cs = Object.keys(creepsPerMinDeltas).reduce((acc, curr) => {
            acc += creepsPerMinDeltas[curr] * 10;
            return acc;
          }, 0);
          return { cs, kda, gameCreation, teamKDA };
        })
        .filter(m => m !== null);

      gamerOutline[0].stats.trends = _.sortBy(trendData, "gameCreation");
      gamerOutline[0].stats.roles = roles;
      gamerOutline[0].stats.frequent_champions = aggregateStats;
      gamerOutline[0].stats.recent = recentMatches;
      gamerOutline[0].stats.ranked = ranked;
      gamerOutline[0].stats.live = live;
      res.status(201).json(gamerOutline);
    } catch (err) {
      log.error(`Error here: ${err}`);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/:platform/:region/leagues/:league_id",
  cache_success,
  async function(req, res, next) {
    var league_id = req.params.league_id ? req.params.league_id : null;
    var platform = req.params.platform ? req.params.platform : null;
    var region = req.params.region ? req.params.region : null;
    var query_page = req.query.page ? +req.query.page : 1;

    if (league_id && platform && region) {
      const leagues = await logic_lol.getLeague(region, league_id, query_page);
      res.status(201).json({ leagues: leagues, statusCode: 201 });
    } else {
      res.status(400).json({ error: "missing parameters" });
    }
  }
);

router.get('/gamer/live/:region/:account_id', async (req, res, next) => {
  try {
    const { region, account_id } = req.params;
    const liveMatchData = await logic_lol.getLiveMatchForPlayer(region, account_id);
    res.status(201).json(liveMatchData);
  } catch(err) {
    log.error(err)
    res.status(500).json("Internal Server Error");
  }
});

router.get('/gamer/rank/:region/account_id', async function(req, res, next) {
  try {
  const { region, account_id } = req.params;
  const data = await logic_lol.getRankedData(region, account_id)
  res.status(200).json(data)
  } catch(err){
    res.status(500).json("Internal Server Error");
  }
});

router.get("/reviews/:gamer_id", function(req, res, next) {
  var query_limit = req.query.limit ? +req.query.limit : 5;
  var query_sort = req.query.sort && req.query.sort === "OLDEST" ? 1 : -1;
  var query_filter =
    req.query.filter &&
    (req.query.filter === "APPROVALS" || req.query.filter === "DISAPPROVALS")
      ? req.query.filter
      : "ALL";
  const gamer_id = req.params.gamer_id ? req.params.gamer_id : null;

  if (gamer_id) {
    Q()
      .then(function() {
        let filters = {};
        if (query_filter === "APPROVALS") filters.review_type = "REP";
        if (query_filter === "DISAPPROVALS") filters.review_type = "FLAME";
        return Review.find({ gamer_id: gamer_id, ...filters })
          .sort({ date: query_sort })
          .limit(query_limit);
      })
      .then(function(reviews, err) {
        if (err) {
          res.status(400).json({ error: err });
        } else {
          res.status(201).json({
            reviews: reviews,
            statusCode: 201
          });
        }
      });
  } else {
    res.status(400).json({ error: "missing gamer_id" });
  }
});

// Retrieve a gamer profile
router.get("/gamer/:gamer_id", function(req, res, next) {
  if (!req.session._id) {
    res.status(403).json({ err: "Forbidden" });
    return;
  }
  var gamer_id = req.params.gamer_id ? req.params.gamer_id : null;

  Q()
    .then(function() {
      return Gamer.findOne({ _id: gamer_id });
    })
    .then(function(gamer, err) {
      if (err) {
        res.status(400).json({ error: err });
      } else if (!gamer) {
        res.status(404).json({ error: "No Gamer Found" });
      } else {
        return res.status(201).json(gamer);
      }
    });
});

router.post("/account/validate", function(req, res, next) {
  var token = req.body.token ? req.body.token : null;

  if (!token) res.status(400).json({ error: "errMissingToken" });

  User.findOne({ validateAccountToken: token }).then((user, error) => {
    if (!user) {
      res.status(400).json({ error: "errWrongToken" });
    } else if (user && user.validated) {
      res.status(400).json({ error: "errWrongToken" });
    } else {
      if (user.emailToValidate) user.email = user.emailToValidate;
      user.emailToValidate = null;
      user.validateAccountToken = "done";
      user.validated = true;
      user.save();
      if (user.emailToValidate) req.session.email = user.emailToValidate;
      res.status(201).json({ msg: "success" });
    }
  });
});

// Post a review for a specific gamer
router.post("/gamer/review", function(req, res, next) {
  if (!req.session._id) {
    res.status(403).json({ err: "Forbidden" });
    return;
  }
  var gamer_id = req.body.id ? req.body.id : null;
  var comment = req.body.comment ? req.body.comment : null;
  var attributes = req.body.attributes ? req.body.attributes : [];
  var review_type = req.body.review_type ? req.body.review_type : null;

  Q()
    .then(function() {
      return Gamer.findOne({ gamer_id: gamer_id });
    })
    .then(function(gamer, err) {
      if (err) {
        res.status(400).json({ error: err });
      } else if (!gamer) {
        res.status(404).json({ error: "Gamer Not Found" });
      } else {
        return Q()
          .then(function() {
            return logic_lol.postReview(
              gamer,
              comment,
              attributes,
              review_type,
              req.session._id
            );
          })
          .then(function(result) {
            if (environment === "production")
              slack.slackNotificationForReview(
                "`" +
                  req.session._id +
                  "` just reviewed `" +
                  gamer.gamertag +
                  "` and said: `" +
                  comment +
                  "`"
              );
            res.status(result.status).json(result.data);
          })
          .catch(reason => {
            console.log("reason", reason);
            res.status(500).json("Internal Server Error");
          });
      }
    })
    .catch(reason => {
      console.log("reason", reason);
      res.status(500).json("Internal Server Error");
    });
});

// Get random players
router.get("/getRandomPlayers/:reviews_number", function(req, res, next) {
  // Get three reviews by default
  var reviews_number = req.params.reviews_number
    ? +req.params.reviews_number
    : 3;
  Q()
    .then(function() {
      return Gamer.aggregate([{ $sample: { size: reviews_number } }]);
    })
    .then(function(result, err) {
      if (!result.length > 0) {
        res.status(200).json({ gamers: result });
        return;
      }
      res.status(200).json({ gamers: result });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json("Internal Server Error");
    });
});

//Get 5 recent reviews
router.get("/getRecentReviews", function(req, res, next) {
  Q()
    .then(function() {
      return Gamer.find({})
        .sort({ _id: -1 })
        .limit(5);
    })
    .then(result => {
      return parsedGamersProfilePictures(result);
    })
    .then(function(result) {
      if (!result.length > 0) {
        res.status(200).json({ gamers: result });
        return;
      }
      res.status(200).json({ gamers: result });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json("Internal Server Error");
    });
});

//Get 5 most reviewed players
router.get("/getMostReviewed", function(req, res, next) {
  Q()
    .then(function() {
      return Gamer.find({})
        .sort({ review_count: -1 })
        .limit(5);
    })
    .then(result => {
      return parsedGamersProfilePictures(result);
    })
    .then(function(result, err) {
      if (!result.length > 0) {
        res.status(200).json({ gamers: result });
        return;
      }
      res.status(200).json({ gamers: result });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json("Internal Server Error");
    });
});

//Get 5 most highly rated players
router.get("/getHighestRated", function(req, res, next) {
  Q()
    .then(function() {
      return Gamer.find({})
        .sort({ rep_review_count: -1 })
        .limit(5);
    })
    .then(result => {
      return parsedGamersProfilePictures(result);
    })
    .then(function(result, err) {
      if (!result.length > 0) {
        res.status(200).json({ gamers: result });
        return;
      }
      res.status(200).json({ gamers: result });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json("Internal Server Error");
    });
});

// Get random reviews
router.get("/getRandomReviews/:reviews_number", function(req, res, next) {
  // Get three reviews by default
  var reviews_number = req.params.reviews_number
    ? req.params.reviews_number
    : 3;
  Q()
    .then(function() {
      return Gamer.aggregate([
        { $match: { reviews: { $gt: [] } } },
        { $sample: { size: 1 } }
      ]);
    })
    .then(result => {
      return parsedGamersProfilePictures(result);
    })
    .then(function(gamer, err) {
      if (!gamer.length > 0) {
        res.status(200).json({ reviews: [] });
        return;
      }
      var reviews = array_tools.getRandomRows(gamer[0].reviews, 3);
      res.status(200).json({ reviews: reviews });
    })
    .catch(function(reason) {
      console.log(reason);
      res.status(500).json("Internal Server Error");
    });
});

/* request steam api based on the username */
router.get("/steam/:username", function(req, res) {
  if (!req.session._id) {
    res.status(403).json({ err: "Forbidden" });
    return;
  }
  var username = req.params.username;
  var url =
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" +
    steamDeveloperKey +
    "&steamids=76561197960435530";
  request(url, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var data = JSON.parse(body);
      res.json(200, data);
    } else if (error) {
      console.log(
        "Something went wrong when trying to reach lol API : status code = " +
          response.statusCode
      );
      res.json(500);
    } else {
      res.json(404);
    }
  });
});

module.exports = router;
