const foodData = {
  north: {
    breakfast: [
      { name: 'Aloo Paratha', calories: 320, protein: 12, description: 'Stuffed potato flatbread', ingredients: ['Wheat flour', 'Potato', 'Ghee', 'Spices'] },
      { name: 'Poha', calories: 250, protein: 8, description: 'Flattened rice with vegetables', ingredients: ['Poha', 'Onion', 'Peanuts', 'Turmeric'] },
      { name: 'Chole Bhature', calories: 450, protein: 15, description: 'Spicy chickpeas with fried bread', ingredients: ['Chickpeas', 'Flour', 'Oil', 'Spices'] },
      { name: 'Rajma Paratha', calories: 380, protein: 18, description: 'Kidney bean stuffed bread', ingredients: ['Wheat flour', 'Rajma', 'Onion', 'Ghee'] },
      { name: 'Makki di Roti', calories: 280, protein: 10, description: 'Corn flour flatbread', ingredients: ['Corn flour', 'Ghee', 'Salt', 'Water'] },
      { name: 'Puri Sabzi', calories: 350, protein: 8, description: 'Fried bread with curry', ingredients: ['Flour', 'Oil', 'Potato', 'Spices'] },
      { name: 'Kulcha', calories: 300, protein: 9, description: 'Leavened flatbread', ingredients: ['Flour', 'Yogurt', 'Baking powder', 'Ghee'] },
      { name: 'Bedmi Puri', calories: 320, protein: 12, description: 'Lentil stuffed fried bread', ingredients: ['Flour', 'Urad dal', 'Oil', 'Spices'] },
      { name: 'Chana Kulcha', calories: 420, protein: 16, description: 'Chickpea curry with bread', ingredients: ['Chickpeas', 'Flour', 'Onion', 'Spices'] },
      { name: 'Paranthe Wali Gali Special', calories: 400, protein: 14, description: 'Mixed stuffed parathas', ingredients: ['Wheat flour', 'Mixed vegetables', 'Ghee', 'Spices'] }
    ],
    lunch: [
      { name: 'Dal Makhani', calories: 380, protein: 18, description: 'Creamy black lentils', ingredients: ['Black lentils', 'Butter', 'Cream', 'Spices'] },
      { name: 'Rajma Chawal', calories: 350, protein: 16, description: 'Kidney beans with rice', ingredients: ['Kidney beans', 'Rice', 'Onion', 'Tomato'] },
      { name: 'Paneer Butter Masala', calories: 420, protein: 22, description: 'Cottage cheese in tomato gravy', ingredients: ['Paneer', 'Tomato', 'Butter', 'Cream'] },
      { name: 'Kadhi Chawal', calories: 320, protein: 14, description: 'Yogurt curry with rice', ingredients: ['Yogurt', 'Gram flour', 'Rice', 'Spices'] },
      { name: 'Sarson ka Saag', calories: 280, protein: 12, description: 'Mustard greens curry', ingredients: ['Mustard greens', 'Spinach', 'Ghee', 'Spices'] },
      { name: 'Aloo Gobi', calories: 220, protein: 6, description: 'Potato cauliflower curry', ingredients: ['Potato', 'Cauliflower', 'Onion', 'Spices'] },
      { name: 'Palak Paneer', calories: 360, protein: 20, description: 'Spinach with cottage cheese', ingredients: ['Spinach', 'Paneer', 'Onion', 'Spices'] },
      { name: 'Baingan Bharta', calories: 180, protein: 4, description: 'Roasted eggplant curry', ingredients: ['Eggplant', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Bhindi Masala', calories: 160, protein: 5, description: 'Spiced okra curry', ingredients: ['Okra', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Matar Paneer', calories: 340, protein: 18, description: 'Peas with cottage cheese', ingredients: ['Green peas', 'Paneer', 'Tomato', 'Spices'] }
    ],
    snacks: [
      { name: 'Samosa', calories: 180, protein: 5, description: 'Crispy pastry with filling', ingredients: ['Flour', 'Potato', 'Peas', 'Oil'] },
      { name: 'Pakoras', calories: 150, protein: 6, description: 'Vegetable fritters', ingredients: ['Gram flour', 'Vegetables', 'Oil', 'Spices'] },
      { name: 'Gol Gappa', calories: 120, protein: 3, description: 'Crispy shells with water', ingredients: ['Semolina', 'Tamarind water', 'Spices', 'Mint'] },
      { name: 'Aloo Tikki', calories: 200, protein: 4, description: 'Potato cutlets', ingredients: ['Potato', 'Breadcrumbs', 'Oil', 'Spices'] },
      { name: 'Dahi Bhalla', calories: 160, protein: 8, description: 'Lentil dumplings in yogurt', ingredients: ['Urad dal', 'Yogurt', 'Chutney', 'Spices'] },
      { name: 'Chaat', calories: 140, protein: 4, description: 'Mixed snack with chutneys', ingredients: ['Sev', 'Potato', 'Chutney', 'Onion'] },
      { name: 'Kachori', calories: 220, protein: 6, description: 'Fried pastry with lentils', ingredients: ['Flour', 'Moong dal', 'Oil', 'Spices'] },
      { name: 'Bhel Puri', calories: 130, protein: 4, description: 'Puffed rice snack', ingredients: ['Puffed rice', 'Sev', 'Chutney', 'Onion'] },
      { name: 'Raj Kachori', calories: 250, protein: 7, description: 'Large stuffed kachori', ingredients: ['Flour', 'Moong dal', 'Yogurt', 'Chutney'] },
      { name: 'Papdi Chaat', calories: 180, protein: 5, description: 'Crispy wafers with toppings', ingredients: ['Papdi', 'Potato', 'Yogurt', 'Chutney'] }
    ],
    dinner: [
      { name: 'Butter Chicken', calories: 480, protein: 28, description: 'Creamy chicken curry', ingredients: ['Chicken', 'Tomato', 'Butter', 'Cream'] },
      { name: 'Rogan Josh', calories: 420, protein: 25, description: 'Kashmiri lamb curry', ingredients: ['Lamb', 'Yogurt', 'Onion', 'Spices'] },
      { name: 'Biryani', calories: 450, protein: 20, description: 'Fragrant rice with meat', ingredients: ['Rice', 'Chicken', 'Saffron', 'Spices'] },
      { name: 'Tandoori Chicken', calories: 380, protein: 35, description: 'Clay oven roasted chicken', ingredients: ['Chicken', 'Yogurt', 'Spices', 'Lemon'] },
      { name: 'Keema Curry', calories: 360, protein: 22, description: 'Minced meat curry', ingredients: ['Minced meat', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Fish Curry', calories: 320, protein: 24, description: 'Spiced fish in gravy', ingredients: ['Fish', 'Coconut', 'Onion', 'Spices'] },
      { name: 'Malai Kofta', calories: 400, protein: 15, description: 'Cottage cheese balls in gravy', ingredients: ['Paneer', 'Potato', 'Cream', 'Spices'] },
      { name: 'Shahi Paneer', calories: 380, protein: 18, description: 'Royal cottage cheese curry', ingredients: ['Paneer', 'Cashews', 'Cream', 'Spices'] },
      { name: 'Chicken Tikka Masala', calories: 440, protein: 26, description: 'Grilled chicken in tomato gravy', ingredients: ['Chicken', 'Tomato', 'Yogurt', 'Spices'] },
      { name: 'Lamb Korma', calories: 460, protein: 24, description: 'Mild lamb curry with nuts', ingredients: ['Lamb', 'Yogurt', 'Cashews', 'Spices'] }
    ]
  },
  south: {
    breakfast: [
      { name: 'Idli Sambar', calories: 200, protein: 8, description: 'Steamed rice cakes with lentil curry', ingredients: ['Rice', 'Urad dal', 'Toor dal', 'Vegetables'] },
      { name: 'Masala Dosa', calories: 350, protein: 12, description: 'Crispy crepe with potato filling', ingredients: ['Rice', 'Urad dal', 'Potato', 'Coconut'] },
      { name: 'Upma', calories: 180, protein: 6, description: 'Semolina porridge', ingredients: ['Semolina', 'Vegetables', 'Mustard seeds', 'Curry leaves'] },
      { name: 'Uttapam', calories: 280, protein: 10, description: 'Thick pancake with vegetables', ingredients: ['Rice', 'Urad dal', 'Onion', 'Tomato'] },
      { name: 'Rava Idli', calories: 160, protein: 5, description: 'Semolina steamed cakes', ingredients: ['Semolina', 'Yogurt', 'Mustard seeds', 'Curry leaves'] },
      { name: 'Appam', calories: 120, protein: 3, description: 'Fermented rice pancakes', ingredients: ['Rice', 'Coconut milk', 'Yeast', 'Sugar'] },
      { name: 'Puttu', calories: 150, protein: 4, description: 'Steamed rice flour cylinders', ingredients: ['Rice flour', 'Coconut', 'Salt', 'Water'] },
      { name: 'Medu Vada', calories: 180, protein: 8, description: 'Fried lentil donuts', ingredients: ['Urad dal', 'Ginger', 'Green chili', 'Curry leaves'] },
      { name: 'Pesarattu', calories: 220, protein: 12, description: 'Green gram crepes', ingredients: ['Green gram', 'Rice', 'Ginger', 'Green chili'] },
      { name: 'Adai', calories: 200, protein: 10, description: 'Mixed lentil pancakes', ingredients: ['Mixed lentils', 'Rice', 'Red chili', 'Asafoetida'] }
    ],
    lunch: [
      { name: 'Sambar Rice', calories: 320, protein: 14, description: 'Lentil curry with rice', ingredients: ['Rice', 'Toor dal', 'Vegetables', 'Tamarind'] },
      { name: 'Curd Rice', calories: 250, protein: 10, description: 'Rice with yogurt', ingredients: ['Rice', 'Curd', 'Mustard seeds', 'Curry leaves'] },
      { name: 'Bisi Bele Bath', calories: 380, protein: 16, description: 'Spicy rice and lentil dish', ingredients: ['Rice', 'Toor dal', 'Vegetables', 'Spice powder'] },
      { name: 'Lemon Rice', calories: 280, protein: 6, description: 'Tangy turmeric rice', ingredients: ['Rice', 'Lemon', 'Turmeric', 'Peanuts'] },
      { name: 'Coconut Rice', calories: 320, protein: 8, description: 'Rice with fresh coconut', ingredients: ['Rice', 'Coconut', 'Curry leaves', 'Mustard seeds'] },
      { name: 'Tamarind Rice', calories: 300, protein: 7, description: 'Tangy tamarind flavored rice', ingredients: ['Rice', 'Tamarind', 'Peanuts', 'Spices'] },
      { name: 'Vegetable Biryani', calories: 400, protein: 12, description: 'Fragrant rice with vegetables', ingredients: ['Rice', 'Mixed vegetables', 'Saffron', 'Spices'] },
      { name: 'Chicken Biryani', calories: 480, protein: 24, description: 'Spiced rice with chicken', ingredients: ['Rice', 'Chicken', 'Saffron', 'Spices'] },
      { name: 'Fish Curry Rice', calories: 420, protein: 25, description: 'Fish curry with steamed rice', ingredients: ['Fish', 'Coconut', 'Rice', 'Curry leaves'] },
      { name: 'Mutton Biryani', calories: 520, protein: 28, description: 'Rich mutton rice dish', ingredients: ['Rice', 'Mutton', 'Saffron', 'Spices'] }
    ],
    snacks: [
      { name: 'Vada', calories: 160, protein: 6, description: 'Fried lentil donuts', ingredients: ['Urad dal', 'Ginger', 'Green chili', 'Curry leaves'] },
      { name: 'Murukku', calories: 140, protein: 4, description: 'Spiral rice crackers', ingredients: ['Rice flour', 'Urad dal flour', 'Sesame seeds', 'Spices'] },
      { name: 'Banana Chips', calories: 180, protein: 2, description: 'Fried banana slices', ingredients: ['Raw banana', 'Oil', 'Salt', 'Turmeric'] },
      { name: 'Mixture', calories: 160, protein: 5, description: 'Spicy snack mix', ingredients: ['Gram flour', 'Peanuts', 'Curry leaves', 'Spices'] },
      { name: 'Ribbon Pakoda', calories: 150, protein: 4, description: 'Ribbon-shaped fried snack', ingredients: ['Rice flour', 'Gram flour', 'Oil', 'Spices'] },
      { name: 'Thattai', calories: 120, protein: 3, description: 'Crispy rice crackers', ingredients: ['Rice flour', 'Urad dal', 'Sesame seeds', 'Asafoetida'] },
      { name: 'Sundal', calories: 100, protein: 6, description: 'Steamed chickpea snack', ingredients: ['Chickpeas', 'Coconut', 'Mustard seeds', 'Curry leaves'] },
      { name: 'Bajji', calories: 140, protein: 4, description: 'Vegetable fritters', ingredients: ['Gram flour', 'Vegetables', 'Oil', 'Spices'] },
      { name: 'Bonda', calories: 130, protein: 3, description: 'Fried potato balls', ingredients: ['Potato', 'Gram flour', 'Oil', 'Spices'] },
      { name: 'Kozhukattai', calories: 110, protein: 2, description: 'Steamed rice dumplings', ingredients: ['Rice flour', 'Coconut', 'Jaggery', 'Salt'] }
    ],
    dinner: [
      { name: 'Fish Curry', calories: 420, protein: 25, description: 'Coconut-based fish curry', ingredients: ['Fish', 'Coconut', 'Curry leaves', 'Tamarind'] },
      { name: 'Rasam', calories: 80, protein: 3, description: 'Tangy tomato soup', ingredients: ['Tomato', 'Tamarind', 'Rasam powder', 'Curry leaves'] },
      { name: 'Vegetable Korma', calories: 340, protein: 12, description: 'Mixed vegetables in coconut gravy', ingredients: ['Mixed vegetables', 'Coconut', 'Spices', 'Coriander'] },
      { name: 'Chicken Chettinad', calories: 460, protein: 28, description: 'Spicy chicken curry', ingredients: ['Chicken', 'Coconut', 'Red chili', 'Spices'] },
      { name: 'Mutton Curry', calories: 480, protein: 26, description: 'Spiced mutton in gravy', ingredients: ['Mutton', 'Coconut', 'Onion', 'Spices'] },
      { name: 'Prawn Curry', calories: 380, protein: 22, description: 'Coconut prawn curry', ingredients: ['Prawns', 'Coconut milk', 'Curry leaves', 'Spices'] },
      { name: 'Egg Curry', calories: 280, protein: 18, description: 'Boiled eggs in spicy gravy', ingredients: ['Eggs', 'Onion', 'Tomato', 'Coconut'] },
      { name: 'Dal Curry', calories: 220, protein: 12, description: 'Lentil curry with vegetables', ingredients: ['Toor dal', 'Vegetables', 'Tamarind', 'Spices'] },
      { name: 'Aviyal', calories: 180, protein: 6, description: 'Mixed vegetable curry', ingredients: ['Mixed vegetables', 'Coconut', 'Yogurt', 'Curry leaves'] },
      { name: 'Kuzhambu', calories: 200, protein: 8, description: 'Tamarind-based vegetable curry', ingredients: ['Vegetables', 'Tamarind', 'Sambar powder', 'Oil'] }
    ]
  },
  east: {
    breakfast: [
      { name: 'Luchi Aloo Dum', calories: 380, protein: 10, description: 'Fried bread with spicy potatoes', ingredients: ['Flour', 'Potato', 'Panch phoron', 'Oil'] },
      { name: 'Cholar Dal', calories: 280, protein: 15, description: 'Bengal gram curry', ingredients: ['Chana dal', 'Coconut', 'Bay leaves', 'Ghee'] },
      { name: 'Kochuri', calories: 320, protein: 8, description: 'Stuffed fried bread', ingredients: ['Flour', 'Lentils', 'Oil', 'Spices'] },
      { name: 'Ghugni', calories: 200, protein: 12, description: 'Yellow pea curry', ingredients: ['Yellow peas', 'Onion', 'Ginger', 'Spices'] },
      { name: 'Pitha', calories: 150, protein: 4, description: 'Rice flour pancakes', ingredients: ['Rice flour', 'Jaggery', 'Coconut', 'Milk'] },
      { name: 'Muri Ghonto', calories: 220, protein: 8, description: 'Fish head curry with rice', ingredients: ['Fish head', 'Rice', 'Vegetables', 'Mustard oil'] },
      { name: 'Khichuri', calories: 250, protein: 10, description: 'Rice and lentil porridge', ingredients: ['Rice', 'Moong dal', 'Vegetables', 'Ghee'] },
      { name: 'Paratha', calories: 300, protein: 8, description: 'Layered flatbread', ingredients: ['Wheat flour', 'Ghee', 'Salt', 'Water'] },
      { name: 'Dimer Curry', calories: 280, protein: 16, description: 'Egg curry Bengali style', ingredients: ['Eggs', 'Onion', 'Tomato', 'Mustard oil'] },
      { name: 'Aloo Posto', calories: 200, protein: 6, description: 'Potatoes in poppy seed paste', ingredients: ['Potato', 'Poppy seeds', 'Green chili', 'Mustard oil'] }
    ],
    lunch: [
      { name: 'Fish Curry Rice', calories: 400, protein: 22, description: 'Bengali fish curry with rice', ingredients: ['Fish', 'Rice', 'Mustard oil', 'Panch phoron'] },
      { name: 'Shukto', calories: 180, protein: 6, description: 'Mixed vegetable curry', ingredients: ['Bitter gourd', 'Drumstick', 'Potato', 'Milk'] },
      { name: 'Kosha Mangsho', calories: 450, protein: 28, description: 'Slow-cooked mutton curry', ingredients: ['Mutton', 'Onion', 'Yogurt', 'Garam masala'] },
      { name: 'Chingri Malai Curry', calories: 380, protein: 20, description: 'Prawns in coconut milk', ingredients: ['Prawns', 'Coconut milk', 'Onion', 'Spices'] },
      { name: 'Ilish Bhapa', calories: 350, protein: 24, description: 'Steamed hilsa fish', ingredients: ['Hilsa fish', 'Mustard paste', 'Green chili', 'Mustard oil'] },
      { name: 'Aloo Posto', calories: 280, protein: 8, description: 'Potatoes in poppy seed gravy', ingredients: ['Potato', 'Poppy seeds', 'Green chili', 'Mustard oil'] },
      { name: 'Dhokar Dalna', calories: 320, protein: 14, description: 'Lentil cake curry', ingredients: ['Chana dal', 'Potato', 'Tomato', 'Spices'] },
      { name: 'Begun Bhaja', calories: 150, protein: 3, description: 'Fried eggplant slices', ingredients: ['Eggplant', 'Turmeric', 'Salt', 'Mustard oil'] },
      { name: 'Macher Jhol', calories: 300, protein: 20, description: 'Light fish curry', ingredients: ['Fish', 'Potato', 'Tomato', 'Turmeric'] },
      { name: 'Chana Dal', calories: 240, protein: 16, description: 'Bengal gram lentil curry', ingredients: ['Chana dal', 'Onion', 'Turmeric', 'Ghee'] }
    ],
    snacks: [
      { name: 'Jhalmuri', calories: 120, protein: 4, description: 'Spicy puffed rice', ingredients: ['Puffed rice', 'Mustard oil', 'Onion', 'Green chili'] },
      { name: 'Beguni', calories: 150, protein: 5, description: 'Battered fried eggplant', ingredients: ['Eggplant', 'Gram flour', 'Turmeric', 'Oil'] },
      { name: 'Phuchka', calories: 100, protein: 3, description: 'Crispy shells with spicy water', ingredients: ['Semolina', 'Tamarind water', 'Spices', 'Potato'] },
      { name: 'Ghoti Gorom', calories: 140, protein: 6, description: 'Hot mixed snack', ingredients: ['Chickpeas', 'Potato', 'Onion', 'Spices'] },
      { name: 'Telebhaja', calories: 160, protein: 4, description: 'Mixed vegetable fritters', ingredients: ['Mixed vegetables', 'Gram flour', 'Oil', 'Spices'] },
      { name: 'Aloo Kabli', calories: 180, protein: 5, description: 'Spiced potato chaat', ingredients: ['Potato', 'Chickpeas', 'Tamarind', 'Spices'] },
      { name: 'Churmur', calories: 130, protein: 4, description: 'Crushed puri chaat', ingredients: ['Puri', 'Potato', 'Onion', 'Chutneys'] },
      { name: 'Singara', calories: 200, protein: 6, description: 'Bengali samosa', ingredients: ['Flour', 'Potato', 'Cauliflower', 'Oil'] },
      { name: 'Kathi Roll', calories: 280, protein: 12, description: 'Wrapped paratha roll', ingredients: ['Paratha', 'Chicken/Egg', 'Onion', 'Sauces'] },
      { name: 'Cutlet', calories: 220, protein: 8, description: 'Fried potato cutlets', ingredients: ['Potato', 'Breadcrumbs', 'Egg', 'Oil'] }
    ],
    dinner: [
      { name: 'Hilsa Fish Curry', calories: 380, protein: 24, description: 'Traditional hilsa in mustard gravy', ingredients: ['Hilsa fish', 'Mustard seeds', 'Turmeric', 'Green chili'] },
      { name: 'Mutton Curry', calories: 460, protein: 26, description: 'Bengali style mutton curry', ingredients: ['Mutton', 'Onion', 'Garam masala', 'Yogurt'] },
      { name: 'Prawn Malai Curry', calories: 400, protein: 22, description: 'Prawns in coconut milk curry', ingredients: ['Prawns', 'Coconut milk', 'Onion', 'Spices'] },
      { name: 'Chicken Curry', calories: 420, protein: 25, description: 'Bengali chicken curry', ingredients: ['Chicken', 'Onion', 'Tomato', 'Mustard oil'] },
      { name: 'Fish Kalia', calories: 350, protein: 20, description: 'Rich fish curry', ingredients: ['Fish', 'Onion', 'Yogurt', 'Garam masala'] },
      { name: 'Egg Curry', calories: 300, protein: 18, description: 'Bengali style egg curry', ingredients: ['Eggs', 'Onion', 'Tomato', 'Mustard oil'] },
      { name: 'Dal', calories: 200, protein: 12, description: 'Simple lentil curry', ingredients: ['Masoor dal', 'Turmeric', 'Cumin', 'Ghee'] },
      { name: 'Vegetable Curry', calories: 180, protein: 6, description: 'Mixed vegetable curry', ingredients: ['Mixed vegetables', 'Onion', 'Spices', 'Oil'] },
      { name: 'Chingri Bhapa', calories: 320, protein: 18, description: 'Steamed prawns', ingredients: ['Prawns', 'Mustard paste', 'Coconut', 'Green chili'] },
      { name: 'Macher Paturi', calories: 280, protein: 22, description: 'Fish wrapped in banana leaf', ingredients: ['Fish', 'Mustard paste', 'Banana leaf', 'Mustard oil'] }
    ]
  },
  west: {
    breakfast: [
      { name: 'Poha', calories: 250, protein: 6, description: 'Flattened rice with vegetables', ingredients: ['Poha', 'Onion', 'Peanuts', 'Turmeric'] },
      { name: 'Dhokla', calories: 180, protein: 8, description: 'Steamed gram flour cake', ingredients: ['Gram flour', 'Yogurt', 'Ginger', 'Green chili'] },
      { name: 'Misal Pav', calories: 350, protein: 12, description: 'Spicy sprouts curry with bread', ingredients: ['Mixed sprouts', 'Pav bread', 'Onion', 'Farsan'] },
      { name: 'Upma', calories: 200, protein: 5, description: 'Semolina porridge', ingredients: ['Semolina', 'Vegetables', 'Mustard seeds', 'Curry leaves'] },
      { name: 'Thepla', calories: 180, protein: 6, description: 'Spiced flatbread', ingredients: ['Wheat flour', 'Fenugreek leaves', 'Spices', 'Oil'] },
      { name: 'Handvo', calories: 220, protein: 8, description: 'Savory lentil cake', ingredients: ['Mixed lentils', 'Rice', 'Vegetables', 'Spices'] },
      { name: 'Khandvi', calories: 150, protein: 6, description: 'Gram flour rolls', ingredients: ['Gram flour', 'Yogurt', 'Ginger', 'Mustard seeds'] },
      { name: 'Fafda', calories: 200, protein: 6, description: 'Crispy gram flour strips', ingredients: ['Gram flour', 'Oil', 'Carom seeds', 'Turmeric'] },
      { name: 'Khaman', calories: 160, protein: 7, description: 'Steamed chickpea flour cake', ingredients: ['Gram flour', 'Yogurt', 'Green chili', 'Ginger'] },
      { name: 'Methi Thepla', calories: 190, protein: 7, description: 'Fenugreek flatbread', ingredients: ['Wheat flour', 'Fenugreek leaves', 'Yogurt', 'Spices'] }
    ],
    lunch: [
      { name: 'Dal Baati Churma', calories: 480, protein: 16, description: 'Lentils with baked wheat balls', ingredients: ['Wheat flour', 'Toor dal', 'Ghee', 'Jaggery'] },
      { name: 'Gujarati Thali', calories: 420, protein: 18, description: 'Complete Gujarati meal', ingredients: ['Dal', 'Sabzi', 'Roti', 'Rice'] },
      { name: 'Pav Bhaji', calories: 380, protein: 10, description: 'Mixed vegetable curry with bread', ingredients: ['Mixed vegetables', 'Pav bread', 'Butter', 'Spices'] },
      { name: 'Kadhi', calories: 200, protein: 8, description: 'Yogurt curry with gram flour', ingredients: ['Yogurt', 'Gram flour', 'Ginger', 'Green chili'] },
      { name: 'Undhiyu', calories: 300, protein: 12, description: 'Mixed vegetable curry', ingredients: ['Mixed vegetables', 'Coconut', 'Peanuts', 'Spices'] },
      { name: 'Bhindi Masala', calories: 180, protein: 5, description: 'Spiced okra curry', ingredients: ['Okra', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Aloo Gobi', calories: 200, protein: 6, description: 'Potato cauliflower curry', ingredients: ['Potato', 'Cauliflower', 'Onion', 'Spices'] },
      { name: 'Rajma', calories: 320, protein: 16, description: 'Kidney bean curry', ingredients: ['Kidney beans', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Chole', calories: 280, protein: 14, description: 'Chickpea curry', ingredients: ['Chickpeas', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Palak Paneer', calories: 340, protein: 18, description: 'Spinach with cottage cheese', ingredients: ['Spinach', 'Paneer', 'Onion', 'Spices'] }
    ],
    snacks: [
      { name: 'Bhel Puri', calories: 150, protein: 5, description: 'Puffed rice chaat', ingredients: ['Puffed rice', 'Sev', 'Chutney', 'Onion'] },
      { name: 'Kachori', calories: 200, protein: 6, description: 'Fried pastry with lentil filling', ingredients: ['Flour', 'Moong dal', 'Spices', 'Oil'] },
      { name: 'Vada Pav', calories: 250, protein: 8, description: 'Potato fritter in bread', ingredients: ['Potato', 'Pav bread', 'Gram flour', 'Chutneys'] },
      { name: 'Sev Puri', calories: 180, protein: 4, description: 'Crispy puris with toppings', ingredients: ['Puri', 'Sev', 'Potato', 'Chutneys'] },
      { name: 'Dahi Puri', calories: 160, protein: 6, description: 'Puris with yogurt and chutneys', ingredients: ['Puri', 'Yogurt', 'Potato', 'Chutneys'] },
      { name: 'Ragda Pattice', calories: 220, protein: 8, description: 'Potato patties with pea curry', ingredients: ['Potato', 'Green peas', 'Breadcrumbs', 'Chutneys'] },
      { name: 'Pani Puri', calories: 120, protein: 3, description: 'Crispy shells with flavored water', ingredients: ['Semolina', 'Spiced water', 'Potato', 'Chutneys'] },
      { name: 'Aloo Tikki', calories: 180, protein: 4, description: 'Spiced potato cutlets', ingredients: ['Potato', 'Breadcrumbs', 'Spices', 'Oil'] },
      { name: 'Samosa', calories: 200, protein: 5, description: 'Triangular pastry with filling', ingredients: ['Flour', 'Potato', 'Peas', 'Oil'] },
      { name: 'Dabeli', calories: 240, protein: 6, description: 'Spiced potato burger', ingredients: ['Pav bread', 'Potato', 'Tamarind chutney', 'Sev'] }
    ],
    dinner: [
      { name: 'Laal Maas', calories: 450, protein: 26, description: 'Spicy Rajasthani mutton curry', ingredients: ['Mutton', 'Red chili', 'Yogurt', 'Garlic'] },
      { name: 'Gatte ki Sabzi', calories: 280, protein: 12, description: 'Gram flour dumplings in curry', ingredients: ['Gram flour', 'Yogurt', 'Spices', 'Coriander'] },
      { name: 'Ker Sangri', calories: 200, protein: 6, description: 'Desert beans and berries curry', ingredients: ['Ker', 'Sangri', 'Spices', 'Oil'] },
      { name: 'Chicken Curry', calories: 400, protein: 24, description: 'Gujarati style chicken curry', ingredients: ['Chicken', 'Onion', 'Tomato', 'Spices'] },
      { name: 'Fish Curry', calories: 350, protein: 22, description: 'Coastal fish curry', ingredients: ['Fish', 'Coconut', 'Kokum', 'Spices'] },
      { name: 'Mutton Curry', calories: 420, protein: 25, description: 'Spiced mutton curry', ingredients: ['Mutton', 'Onion', 'Yogurt', 'Spices'] },
      { name: 'Dal Dhokli', calories: 300, protein: 14, description: 'Lentil curry with wheat dumplings', ingredients: ['Toor dal', 'Wheat flour', 'Vegetables', 'Spices'] },
      { name: 'Khichdi', calories: 250, protein: 10, description: 'Rice and lentil porridge', ingredients: ['Rice', 'Moong dal', 'Turmeric', 'Ghee'] },
      { name: 'Bharwan Karela', calories: 220, protein: 8, description: 'Stuffed bitter gourd', ingredients: ['Bitter gourd', 'Onion', 'Spices', 'Oil'] },
      { name: 'Aloo Jeera', calories: 180, protein: 4, description: 'Cumin flavored potatoes', ingredients: ['Potato', 'Cumin seeds', 'Turmeric', 'Oil'] }
    ]
  }
};

module.exports = foodData;