const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Price at the time of purchase
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 
      default: 'Pending' 
    },
    paymentMethod: { type: String, enum: ['COD', 'Online'], required: true },
    shippingAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
    },
    createdAt: { type: Date, default: Date.now },
  });

module.exports = mongoose.model('Order', OrderSchema);