const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema(
    {
        image: {
            type: String,
            required: [true, 'Please provide an image for the meal'],
        },
        name: {
            type: String,
            required: [true, 'Please enter the meal name'],
        },
        rating: {
            type: Object,
            stars: { type: Number, default: 4.0 },
            count: { type: Number, default: 50 },
        },
        priceCents: {
            type: Number,
            required: [true, 'Please enter the meal price in cents'],
        },
        keywords: [
            {
                type: String,
            },
        ],
        type: {
            type: String, // e.g. "breakfast", "lunch", "dinner", "snack"
        },

        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true } // Adds createdAt & updatedAt fields automatically
);

const Meals = mongoose.model('Meals', MealSchema);
module.exports = Meals;
