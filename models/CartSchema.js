const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Make it optional
  },
  items: [
      {
          product: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Product',
              required: false // Make it optional
          },
          quantity: {
              type: Number,
              required: true
          },
          size: {
              type: String,
              required: true
          }
      }
  ]
});

  module.exports = mongoose.model('Cart', CartSchema);