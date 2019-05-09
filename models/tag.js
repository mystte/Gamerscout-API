var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var tagSchema = new Schema({
	_id: {type: String, required: true},
	name: { type: String, required: true, index: { unique: true } },
	type: { type: String, required: true },
	image_url: { type: String, required: true }
}, { usePushEach: true });

module.exports = mongoose.model('Tag', tagSchema);