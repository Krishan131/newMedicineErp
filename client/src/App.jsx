import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import LowStock from './pages/LowStock';
import SalesHistory from './pages/SalesHistory';
import ExpiryReport from './pages/ExpiryReport';
import PrivateRoute from './components/PrivateRoute';
import CustomerPrivateRoute from './components/CustomerPrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerRegister from './pages/customer/CustomerRegister';
import CustomerProfile from './pages/customer/CustomerProfile';
import RetailerProfile from './pages/RetailerProfile';

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/customer/register" element={<CustomerRegister />} />
                        <Route path="/customer/dashboard" element={<CustomerPrivateRoute><CustomerDashboard /></CustomerPrivateRoute>} />
                        <Route path="/customer/profile" element={<CustomerPrivateRoute><CustomerProfile /></CustomerPrivateRoute>} />
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/retailer/profile" element={<PrivateRoute><RetailerProfile /></PrivateRoute>} />
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
