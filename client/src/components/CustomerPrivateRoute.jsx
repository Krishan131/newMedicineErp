import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const CustomerPrivateRoute = ({ children }) => {
    const { customer, customerLoading } = useContext(AuthContext);

    if (customerLoading) return <div>Loading...</div>;

    return customer ? children : <Navigate to="/login" />;
};

export default CustomerPrivateRoute;
