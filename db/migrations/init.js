// This script is made to init the API on an empty database
conn = new Mongo();
db = conn.getDB("gs-api");

debug.tags.insert([
  {
    "_id": "fa67ef4a-522d-43b3-9e77-42c75d98a609",
    "name": "chill",
    "type": "good",
    "image_url": "/static/images/tags/Chill.png"
  },
  {
    "_id": "d8516a6d-9baf-4499-9076-79015d644771",
    "name": "shotCaller",
    "type": "good",
    "image_url": "/static/images/tags/Shot Caller.png"
  },
  {
    "_id": "a46a6b04-df59-4320-88c2-e27aa7c40690",
    "name": "skilled",
    "type": "good",
    "image_url": "/static/images/tags/Skilled.png"
  },
  {
    "_id": "896fe2e9-fb04-4e1e-b376-069b853caedf",
    "name": "teamPlayer",
    "type": "good",
    "image_url": "/static/images/tags/Team Player.png"
  },
  {
    "_id": "2f7ca25f-0740-4828-944e-2c03bceba314",
    "name": "abusive",
    "type": "neutral",
    "image_url": "/static/images/tags/Abusive.png"
  },
  {
    "_id": "1deefe78-9733-4a39-86a2-870700335f27",
    "name": "quitter",
    "type": "neutral",
    "image_url": "/static/images/tags/Quitter.png"
  },
  {
    "_id": "2bce8b1f-5bfa-40ae-a44e-02f02adf84c1",
    "name": "unhelpful",
    "type": "neutral",
    "image_url": "/static/images/tags/Unhelpful.png"
  },
  {
    "_id": "d299fd9b-c37c-4016-b23c-48c4d6103efb",
    "name": "unskilled",
    "type": "neutral",
    "image_url": "/static/images/tags/Unskilled.png"
  },
  {
    "_id": "125cdb71-92ee-4ee9-af39-0c342bbb769d",
    "name": "cheater",
    "type": "bad",
    "image_url": "/static/images/tags/Cheater.png"
  },
  {
    "_id": "30bcabff-f0df-45a5-87b6-ec4a8e81b8c8",
    "name": "griefer",
    "type": "bad",
    "image_url": "/static/images/tags/Griefer.png"
  },
  {
    "_id": "75bdb479-18eb-48d9-81c5-9bbf0da89d45",
    "name": "troll",
    "type": "bad",
    "image_url": "/static/images/tags/Troll.png"
  },
  {
    "_id": "598390e8-be68-42d9-933d-6cb78384744a",
    "name": "scammer",
    "type": "bad",
    "image_url": "/static/images/tags/Scammer.png"
  }
]);
