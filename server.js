const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

// Connect Database
// Connect Database
connectDB();



const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Define Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/customer', require('./routes/customerRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));




const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
