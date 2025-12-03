# Enhanced AI Meal Planner API Documentation

## Overview
The Enhanced AI Meal Planner provides comprehensive nutrition tracking, AI-powered recipe generation, food scanning, and personalized meal planning with advanced features.

## Key Features

### 🤖 AI-Powered Features
- **Gemini AI Integration**: Advanced meal plan generation using Google's Gemini AI
- **Smart Recipe Generation**: AI creates recipes based on available ingredients
- **Personalized Recommendations**: AI analyzes user health data for custom suggestions
- **Nutritional Analysis**: AI provides detailed nutrition insights

### 📊 Advanced Nutrition Tracking
- **Real-time Progress**: Live tracking of daily nutrition goals
- **Visual Progress Bars**: Interactive displays for calories, protein, carbs, fat
- **Historical Data**: Track nutrition trends over time
- **Goal Setting**: Customizable nutrition targets based on health goals

### 📱 Smart Food Scanner
- **Camera Integration**: Scan food items with device camera
- **Image Upload**: Upload food photos for analysis
- **Database Search**: Search comprehensive food database
- **Instant Nutrition**: Get immediate nutrition information

### 📅 Meal Planning Calendar
- **Weekly View**: Visual calendar for meal planning
- **Drag & Drop**: Easy meal scheduling
- **Quick Actions**: Add/edit/remove meals efficiently
- **Meal Templates**: Pre-built meal combinations

## API Endpoints

### Health Assessment
```
POST /api/meal-planner/health-assessment
```
**Description**: Submit comprehensive health assessment for AI meal plan generation
**Body**:
```json
{
  "answers": {
    "age": 25,
    "gender": "male",
    "height": 175,
    "weight": 70,
    "activity_level": "moderately_active",
    "fitness_goals": ["lose_weight", "gain_muscle"],
    "region": "north_indian",
    "dietary_restrictions": ["vegetarian"],
    "medical_conditions": ["none"]
  }
}
```

### Quick Meal Plans
```
POST /api/meal-planner/quick-plan
```
**Description**: Generate instant meal plans for common goals
**Body**:
```json
{
  "planType": "weight-loss" // "muscle-gain", "maintenance", "healthy"
}
```

### AI Recipe Generation
```
POST /api/meal-planner/gemini-recipe
```
**Description**: Generate AI recipes from ingredients
**Body**:
```json
{
  "ingredients": ["chicken", "rice", "vegetables"],
  "dietaryRestrictions": ["gluten-free"],
  "region": "mixed",
  "mealType": "lunch"
}
```

### Food Analysis
```
POST /api/meal-planner/analyze-food-image
```
**Description**: Analyze food images for nutrition information
**Body**: FormData with image file

### Food Logging
```
POST /api/meal-planner/log-food
```
**Description**: Log food items to daily nutrition tracker
**Body**:
```json
{
  "name": "Chicken Breast",
  "calories": 165,
  "protein": 31,
  "carbs": 0,
  "fat": 3.6,
  "date": "2024-01-15"
}
```

### Nutrition Tracking
```
GET /api/meal-planner/nutrition/today
```
**Description**: Get today's nutrition progress

### Food Database Search
```
GET /api/meal-planner/foods/search?q=chicken&limit=20
```
**Description**: Search comprehensive food database

### Shopping List Generation
```
POST /api/meal-planner/shopping-list
```
**Description**: Generate shopping list from meal plan
**Body**:
```json
{
  "mealPlan": {
    "monday": {
      "breakfast": {...},
      "lunch": {...},
      "dinner": {...}
    }
  }
}
```

### Meal Prep Suggestions
```
POST /api/meal-planner/meal-prep-suggestions
```
**Description**: Get AI-powered meal prep recommendations

## Frontend Features

### Nutrition Tracker Dashboard
- **Real-time Updates**: Live nutrition progress bars
- **Color-coded Progress**: Visual indicators for goal achievement
- **Daily Targets**: Customizable nutrition goals
- **Quick Actions**: Easy food logging buttons

### AI Recipe Generator
- **Ingredient Input**: Natural language ingredient entry
- **Filter Options**: Dietary restriction filters
- **Recipe Cards**: Beautiful recipe displays
- **Nutrition Info**: Complete nutritional breakdown
- **Save to Plan**: One-click meal plan integration

### Food Scanner Interface
- **Camera Access**: Native camera integration
- **Image Upload**: Drag & drop image upload
- **Analysis Results**: Detailed nutrition breakdown
- **Quick Logging**: Instant food diary entry

### Meal Calendar
- **Weekly View**: 7-day meal planning grid
- **Day Selection**: Click to plan individual days
- **Meal Types**: Breakfast, lunch, dinner, snacks
- **Visual Indicators**: Meal status and nutrition info

## Advanced Features

### AI Insights
- **Personalized Tips**: Custom nutrition advice
- **Health Recommendations**: Medical condition considerations
- **Progress Analysis**: Weekly/monthly nutrition trends
- **Goal Optimization**: AI-suggested target adjustments

### Regional Cuisine Support
- **North Indian**: Authentic recipes and ingredients
- **South Indian**: Traditional dishes and preparations
- **International**: Global cuisine options
- **Fusion**: Modern healthy adaptations

### Medical Condition Support
- **Diabetes**: Low glycemic index recommendations
- **Hypertension**: Low sodium meal options
- **Heart Disease**: Heart-healthy recipes
- **Custom Restrictions**: Personalized dietary needs

### Smart Recommendations
- **Seasonal Foods**: Weather-appropriate suggestions
- **Budget Optimization**: Cost-effective meal planning
- **Time Management**: Quick meal options for busy days
- **Variety Scoring**: Ensure diverse nutrition intake

## Integration Points

### Google Services
- **Gemini AI**: Advanced meal planning intelligence
- **Vision API**: Food image recognition
- **Maps API**: Local ingredient sourcing
- **Cloud Storage**: Recipe and meal plan backup

### Health Platforms
- **Fitness Trackers**: Sync activity data
- **Health Apps**: Import health metrics
- **Wearables**: Real-time calorie burn data

### E-commerce
- **Grocery Delivery**: Direct shopping integration
- **Price Comparison**: Best deals on ingredients
- **Subscription Boxes**: Meal kit recommendations

## Data Models

### User Profile
```json
{
  "nutritionTargets": {
    "calories": 2000,
    "protein": 150,
    "carbs": 250,
    "fat": 67
  },
  "healthAssessment": {
    "answers": {...},
    "completedAt": "2024-01-15T10:00:00Z"
  },
  "preferences": {
    "region": "north_indian",
    "dietaryRestrictions": ["vegetarian"],
    "allergies": []
  }
}
```

### Meal Plan
```json
{
  "monday": {
    "breakfast": {
      "name": "Oats Upma",
      "calories": 300,
      "protein": 12,
      "carbs": 45,
      "fat": 8,
      "ingredients": [...],
      "instructions": [...],
      "cookingTime": 20
    }
  }
}
```

### Food Item
```json
{
  "name": "Chicken Breast",
  "calories_per_100g": 165,
  "protein_per_100g": 31,
  "carbs_per_100g": 0,
  "fat_per_100g": 3.6,
  "category": "protein",
  "tags": ["high_protein", "low_carb"],
  "regions": ["all_indian", "international"]
}
```

## Performance Optimizations

### Caching Strategy
- **Recipe Cache**: Store frequently accessed recipes
- **User Preferences**: Cache user settings locally
- **Food Database**: Efficient search indexing
- **Image Analysis**: Cache analysis results

### Real-time Updates
- **WebSocket Integration**: Live nutrition updates
- **Progressive Loading**: Lazy load meal plans
- **Offline Support**: Local data storage
- **Sync Management**: Conflict resolution

## Security & Privacy

### Data Protection
- **Encrypted Storage**: All health data encrypted
- **GDPR Compliance**: European privacy standards
- **User Consent**: Explicit permission for data use
- **Data Retention**: Configurable retention policies

### API Security
- **Authentication**: JWT token validation
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs
- **HTTPS Only**: Secure data transmission

## Future Enhancements

### Planned Features
- **Voice Commands**: "Add chicken to my meal plan"
- **AR Food Scanner**: Augmented reality nutrition overlay
- **Social Features**: Share meal plans with friends
- **Nutritionist Chat**: AI-powered nutrition counseling
- **Meal Delivery**: Integration with delivery services
- **Wearable Sync**: Real-time health data integration

### AI Improvements
- **Better Recognition**: Enhanced food image analysis
- **Predictive Planning**: AI suggests meals before you ask
- **Habit Learning**: Adapt to user preferences over time
- **Health Monitoring**: Track health improvements from nutrition

This enhanced meal planner provides a comprehensive solution for modern nutrition management with cutting-edge AI integration and user-friendly interfaces.