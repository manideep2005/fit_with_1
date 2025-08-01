const fs = require('fs');
const path = require('path');

// Read the User.js file
const userFilePath = path.join(__dirname, 'models', 'User.js');
let content = fs.readFileSync(userFilePath, 'utf8');

console.log('🔧 Fixing schema syntax errors...');

// Fix missing commas in schema definitions
const fixes = [
  // Fix Date default syntax
  { from: /Date default:/g, to: 'Date, default:' },
  
  // Fix missing commas in workouts schema
  { from: /date: { type: Date, default: Date\.now }\s*type: String/g, to: 'date: { type: Date, default: Date.now },\n    type: String,' },
  { from: /type: String\s*duration: Number/g, to: 'type: String,\n    duration: Number,' },
  { from: /duration: Number, \/\/ in minutes\s*calories: Number/g, to: 'duration: Number, // in minutes\n    calories: Number,' },
  { from: /calories: Number\s*exercises: \[/g, to: 'calories: Number,\n    exercises: [' },
  { from: /name: String\s*sets: Number/g, to: 'name: String,\n      sets: Number,' },
  { from: /sets: Number\s*reps: Number/g, to: 'sets: Number,\n      reps: Number,' },
  { from: /reps: Number\s*weight: Number/g, to: 'reps: Number,\n      weight: Number,' },
  { from: /weight: Number\s*duration: Number/g, to: 'weight: Number,\n      duration: Number' },
  { from: /duration: Number\s*}\]/g, to: 'duration: Number\n    }],' },
  { from: /}\]\s*notes: String/g, to: '}],\n    notes: String' },
  
  // Fix biometrics schema
  { from: /weight: Number\s*bodyFat: Number/g, to: 'weight: Number,\n    bodyFat: Number,' },
  { from: /bodyFat: Number\s*muscleMass: Number/g, to: 'bodyFat: Number,\n    muscleMass: Number,' },
  { from: /muscleMass: Number\s*measurements:/g, to: 'muscleMass: Number,\n    measurements:' },
  { from: /chest: Number\s*waist: Number/g, to: 'chest: Number,\n      waist: Number,' },
  { from: /waist: Number\s*hips: Number/g, to: 'waist: Number,\n      hips: Number,' },
  { from: /hips: Number\s*arms: Number/g, to: 'hips: Number,\n      arms: Number,' },
  { from: /arms: Number\s*thighs: Number/g, to: 'arms: Number,\n      thighs: Number' },
  
  // Fix nutrition logs schema
  { from: /totalCalories: Number\s*totalProtein: Number/g, to: 'totalCalories: Number,\n    totalProtein: Number,' },
  { from: /totalProtein: Number\s*totalCarbs: Number/g, to: 'totalProtein: Number,\n    totalCarbs: Number,' },
  { from: /totalCarbs: Number\s*totalFat: Number/g, to: 'totalCarbs: Number,\n    totalFat: Number,' },
  { from: /totalFat: Number\s*waterIntake: Number/g, to: 'totalFat: Number,\n    waterIntake: Number' },
  
  // Fix food items schema
  { from: /name: String\s*quantity: Number/g, to: 'name: String,\n        quantity: Number,' },
  { from: /quantity: Number\s*unit: String/g, to: 'quantity: Number,\n        unit: String,' },
  { from: /unit: String\s*calories: Number/g, to: 'unit: String,\n        calories: Number,' },
  { from: /protein: Number\s*carbs: Number/g, to: 'protein: Number,\n        carbs: Number,' },
  { from: /carbs: Number\s*fat: Number/g, to: 'carbs: Number,\n        fat: Number' }
];

let fixCount = 0;
fixes.forEach((fix, index) => {
  const before = content;
  content = content.replace(fix.from, fix.to);
  if (content !== before) {
    fixCount++;
    console.log(`✅ Applied fix ${index + 1}: ${fix.from.toString()}`);
  }
});

console.log(`\n📊 Applied ${fixCount} fixes total`);

// Write the fixed content back
fs.writeFileSync(userFilePath, content, 'utf8');
console.log('💾 Fixed User.js file saved');

console.log('\n🔍 Verifying fixes...');

// Check for remaining syntax issues
const remainingIssues = [
  /Date default:/g,
  /String\s+[a-zA-Z]/g,
  /Number\s+[a-zA-Z]/g
];

let issuesFound = 0;
remainingIssues.forEach((pattern, index) => {
  const matches = content.match(pattern);
  if (matches) {
    console.log(`⚠️  Remaining issue ${index + 1}: ${matches.length} matches for ${pattern.toString()}`);
    issuesFound += matches.length;
  }
});

if (issuesFound === 0) {
  console.log('✅ No remaining syntax issues found!');
} else {
  console.log(`❌ Found ${issuesFound} remaining syntax issues`);
}

console.log('\n🎉 Schema syntax fix completed!');