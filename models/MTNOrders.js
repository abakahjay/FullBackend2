// models/Orders.js
const mongoose = require('mongoose');

const MTNOrderSchema = new mongoose.Schema({
    recipient: String,
    quantity: String,
    network: String,
    price: String,
    payment: String,
    status: {
    type: String,
    enum: ['Pending', 'Delivered', 'Failed'],
    default: 'Pending'
    },
    updated: String,
}, { timestamps: true });

module.exports = mongoose.model('MTNOrders', MTNOrderSchema);
