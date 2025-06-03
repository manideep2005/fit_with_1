const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { sendWelcomeEmail } = require('./services/emailService');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set EJS as the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Validate inputs
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        if (!fullName) {
            return res.status(400).json({
                success: false,
                error: 'Full name is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        console.log('Signup request received:', { fullName, email });

        // Send welcome email
        await sendWelcomeEmail(email, fullName);

        res.json({
            success: true,
            message: 'Signup successful! Welcome email sent.'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error during signup. Please try again.'
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 