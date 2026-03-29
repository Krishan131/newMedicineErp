import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import LowStock from './pages/LowStock';
import SalesHistory from './pages/SalesHistory';
import ExpiryReport from './pages/ExpiryReport';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

import CustomerDashboard from './pages/customer/CustomerDashboard';

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
                        <Route path="/low-stock" element={<PrivateRoute><LowStock /></PrivateRoute>} />
                        <Route path="/sales-history" element={<PrivateRoute><SalesHistory /></PrivateRoute>} />
                        <Route path="/expiry-report" element={<PrivateRoute><ExpiryReport /></PrivateRoute>} />
                    </Routes>
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
