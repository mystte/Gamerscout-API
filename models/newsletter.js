const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const newsletter = new Schema(
  {
    email: { type: String, required: true, unique: true },
    subscribed: { type: Boolean, default: true },
  },
  { usePushEach: true }
);

module.exports = mongoose.model("Newsletter", newsletter);
