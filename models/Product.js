const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    required: [true, 'SKU/Barcode is required']
  },
  description: String,
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  stockQuantity: {
    type: Number,
    default: 0
  },
  category: {
    type: String, // You can change this to a ref once you have CategoryModel
    default: 'General'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
