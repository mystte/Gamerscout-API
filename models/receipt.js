var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var receiptSchema = new Schema({
    receipt_type: {type : String},
    user_id: {type: Schema.ObjectId},
    adam_id: {type: Number},
    app_item_id: {type: Number},
    bundle_id: {type: String},
    application_version : {type: String},
    download_id: {type: String},
    version_external_identifier: {type: Number},
    receipt_creation_date: {type: Date},
    receipt_creation_date_ms: {type: String},
    receipt_creation_date_pst: {type: Date},
    request_date: {type: Date},
    request_date_ms: {type: String},
    request_date_pst: {type: Date},
    original_purchase_date: {type: Date},
    original_purchase_date_ms: {type: String},
    original_purchase_date_pst: {type: Date},
    original_application_version: {type: String},
    in_app: {type : Array}
}, { usePushEach: true });

module.exports = mongoose.model('Receipt', receiptSchema);
