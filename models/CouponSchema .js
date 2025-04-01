const mongoose = require('mongoose');
const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  });
  module.exports = mongoose.model('Coupon', CouponSchema);  // Export the model to be used in other files.  // The 'Coupon' is the singular form of the model name, and it should match the name in your database.  // The 'CouponSchema' is the schema definition for the model.  // The 'Coupon' model is then used to create instances of the 'Coupon' documents.  // The 'CouponSchema' defines the properties and validation rules
  