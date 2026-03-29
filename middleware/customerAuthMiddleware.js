const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const token = req.header('x-customer-token');

    if (!token) {
        return res.status(401).json({ msg: 'No customer token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.customer) {
            return res.status(401).json({ msg: 'Invalid customer token' });
        }

        req.customer = decoded.customer;
        next();
    } catch (err) {
        return res.status(401).json({ msg: 'Customer token is not valid' });
    }
};
