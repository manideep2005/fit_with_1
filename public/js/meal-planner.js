document.addEventListener('DOMContentLoaded', () => {
    const getSuggestionBtn = document.getElementById('get-suggestion-btn');
    const suggestionContainer = document.getElementById('suggestion-container');
    const suggestionContent = document.getElementById('suggestion-content');
    const finalMealPlanList = document.querySelector('#final-meal-plan ul');
    const saveMealPlanBtn = document.getElementById('save-meal-plan-btn');

    const calorieProgress = document.getElementById('calorie-progress');
    const caloriesConsumedSpan = document.getElementById('calories-consumed');
    const calorieGoal = parseFloat(document.getElementById('calorie-goal-value').textContent);

    const waterProgress = document.getElementById('water-progress');
    const waterConsumedSpan = document.getElementById('water-consumed');
    const waterGoal = parseFloat(document.getElementById('water-goal-value').textContent);

    let mealPlan = [];

    const updateProgress = () => {
        const totalCalories = mealPlan.reduce((sum, meal) => sum + meal.calories, 0);
        const totalWater = mealPlan.reduce((sum, meal) => sum + meal.water, 0);

        caloriesConsumedSpan.textContent = totalCalories;
        const caloriePercent = (totalCalories / calorieGoal) * 100;
        calorieProgress.style.width = `${caloriePercent}%`;
        calorieProgress.setAttribute('aria-valuenow', caloriePercent);

        waterConsumedSpan.textContent = totalWater.toFixed(1);
        const waterPercent = (totalWater / waterGoal) * 100;
        waterProgress.style.width = `${waterPercent}%`;
        waterProgress.setAttribute('aria-valuenow', waterPercent);
    };

    const renderMealPlan = () => {
        finalMealPlanList.innerHTML = '';
        mealPlan.forEach(meal => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span><strong>${meal.mealType}:</strong> ${meal.name} (${meal.calories} kcal, ${meal.water} L water)</span>
                <button class="btn btn-danger btn-sm remove-meal-btn" data-meal-id="${meal._id}">Remove</button>
            `;
            finalMealPlanList.appendChild(li);
        });
        updateProgress();
    };

    getSuggestionBtn.addEventListener('click', async () => {
        const mealType = document.getElementById('meal-type').value;
        try {
            const response = await fetch('/meal-planner/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mealType })
            });

            if (response.ok) {
                const suggestion = await response.json();
                suggestionContainer.style.display = 'block';
                suggestionContent.innerHTML = `
                    <h5>${suggestion.name}</h5>
                    <p>Calories: ${suggestion.calories} kcal</p>
                    <p>Water: ${suggestion.water} L</p>
                    <p>Region: ${suggestion.region}</p>
                    <button id="accept-suggestion" class="btn btn-success mr-2">Accept</button>
                    <button id="reject-suggestion" class="btn btn-danger">Reject</button>
                `;

                document.getElementById('accept-suggestion').addEventListener('click', () => {
                    mealPlan.push({ ...suggestion, mealType });
                    suggestionContainer.style.display = 'none';
                    renderMealPlan();
                });

                document.getElementById('reject-suggestion').addEventListener('click', () => {
                    suggestionContainer.style.display = 'none';
                });

            } else {
                const error = await response.json();
                alert(error.message);
            }
        } catch (error) {
            console.error('Error getting suggestion:', error);
            alert('Failed to get meal suggestion.');
        }
    });

    finalMealPlanList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-meal-btn')) {
            const mealId = e.target.dataset.mealId;
            mealPlan = mealPlan.filter(meal => meal._id !== mealId);
            renderMealPlan();
        }
    });

    saveMealPlanBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/meal-planner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mealPlan })
            });

            if (response.ok) {
                alert('Meal plan saved successfully!');
            } else {
                const error = await response.json();
                alert(error.message);
            }
        } catch (error) {
            console.error('Error saving meal plan:', error);
            alert('Failed to save meal plan.');
        }
    });

    // Initial render
    renderMealPlan();
});
