const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    name: { type: String, required: true },
    calories: { type: Number, required: true },
    water: { type: Number, default: 0 },
    region: { type: String, enum: ['North Indian', 'South Indian', 'East Indian', 'West Indian', 'Any'], required: true },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Snacks', 'Dinner'], required: true }
});

module.exports = mongoose.model('Meal', mealSchema);
