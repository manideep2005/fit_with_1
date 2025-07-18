const mongoose = require('mongoose');
const Meal = require('../models/Meal');
const database = require('../config/database');

const meals = [
    // North Indian
    { name: 'Aloo Paratha', calories: 250, water: 0.1, region: 'North Indian', mealType: 'Breakfast' },
    { name: 'Chole Bhature', calories: 450, water: 0.2, region: 'North Indian', mealType: 'Breakfast' },
    { name: 'Dal Makhani', calories: 350, water: 0.3, region: 'North Indian', mealType: 'Lunch' },
    { name: 'Paneer Butter Masala', calories: 400, water: 0.3, region: 'North Indian', mealType: 'Lunch' },
    { name: 'Rajma Chawal', calories: 400, water: 0.2, region: 'North Indian', mealType: 'Lunch' },
    { name: 'Samosa', calories: 150, water: 0, region: 'North Indian', mealType: 'Snacks' },
    { name: 'Tandoori Chicken', calories: 300, water: 0.1, region: 'North Indian', mealType: 'Dinner' },
    { name: 'Roti', calories: 100, water: 0, region: 'North Indian', mealType: 'Dinner' },

    // South Indian
    { name: 'Idli Sambar', calories: 200, water: 0.4, region: 'South Indian', mealType: 'Breakfast' },
    { name: 'Masala Dosa', calories: 300, water: 0.2, region: 'South Indian', mealType: 'Breakfast' },
    { name: 'Lemon Rice', calories: 250, water: 0.2, region: 'South Indian', mealType: 'Lunch' },
    { name: 'Sambar Rice', calories: 300, water: 0.5, region: 'South Indian', mealType: 'Lunch' },
    { name: 'Bisi Bele Bath', calories: 350, water: 0.4, region: 'South Indian', mealType: 'Lunch' },
    { name: 'Vada', calories: 150, water: 0.1, region: 'South Indian', mealType: 'Snacks' },
    { name: 'Avial', calories: 200, water: 0.3, region: 'South Indian', mealType: 'Dinner' },
    { name: 'Appam', calories: 120, water: 0.1, region: 'South Indian', mealType: 'Dinner' },

    // East Indian
    { name: 'Luchi Alur Dom', calories: 350, water: 0.2, region: 'East Indian', mealType: 'Breakfast' },
    { name: 'Panta Bhat', calories: 200, water: 0.6, region: 'East Indian', mealType: 'Breakfast' },
    { name: 'Macher Jhol', calories: 300, water: 0.4, region: 'East Indian', mealType: 'Lunch' },
    { name: 'Shukto', calories: 250, water: 0.3, region: 'East Indian', mealType: 'Lunch' },
    { name: 'Rasgulla', calories: 150, water: 0.1, region: 'East Indian', mealType: 'Snacks' },
    { name: 'Cheera Doi', calories: 200, water: 0.2, region: 'East Indian', mealType: 'Snacks' },
    { name: 'Kosha Mangsho', calories: 400, water: 0.2, region: 'East Indian', mealType: 'Dinner' },
    { name: 'Dhokar Dalna', calories: 300, water: 0.3, region: 'East Indian', mealType: 'Dinner' },

    // West Indian
    { name: 'Dhokla', calories: 180, water: 0.1, region: 'West Indian', mealType: 'Breakfast' },
    { name: 'Thepla', calories: 200, water: 0.1, region: 'West Indian', mealType: 'Breakfast' },
    { name: 'Vada Pav', calories: 300, water: 0, region: 'West Indian', mealType: 'Lunch' },
    { name: 'Pav Bhaji', calories: 400, water: 0.2, region: 'West Indian', mealType: 'Lunch' },
    { name: 'Khandvi', calories: 150, water: 0.1, region: 'West Indian', mealType: 'Snacks' },
    { name: 'Puran Poli', calories: 250, water: 0.1, region: 'West Indian', mealType: 'Snacks' },
    { name: 'Laal Maas', calories: 450, water: 0.2, region: 'West Indian', mealType: 'Dinner' },
    { name: 'Gatte ki Sabzi', calories: 300, water: 0.3, region: 'West Indian', mealType: 'Dinner' }
];

const seedMeals = async () => {
    try {
        await database.connect();
        await Meal.deleteMany({});
        await Meal.insertMany(meals);
        console.log('Meals seeded successfully!');
    } catch (error) {
        console.error('Error seeding meals:', error);
    } finally {
        await database.disconnect();
    }
};

seedMeals();