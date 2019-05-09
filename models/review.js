var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;

var reviewSchema = new Schema({
	_id: { type: Schema.ObjectId },
	gamer_id: { type: String },
	date: { type: Date, default: Date.now },
	date_since: { type: String, default: null },
	comment: { type: String },
	review_type: { type: String },
	rating: { type: Number },
	reviewer_id: { type: Schema.ObjectId },
	tags: [
		{
			id: { type: String, required: true },
			name: { type: String, required: true },
			type: { type: String }
		}
	]
}, { usePushEach: true });
reviewSchema.plugin(mongoosePaginate);


module.exports = mongoose.model('Review', reviewSchema);