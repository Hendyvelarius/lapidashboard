const jwt = require('jsonwebtoken');

// Middleware to verify and decode JWT token
const verifyToken = (req, res, next) => {
  try {
    const token = req.query.auth || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    // Decode the JWT token without verification for now (since we don't have the secret)
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    console.log('Decoded JWT Token:', JSON.stringify(decoded, null, 2));
    console.log('User Info:', decoded.user);
    console.log('Delegated To:', decoded.delegatedTo);

    // Add decoded token to request object
    req.user = decoded.user;
    req.delegatedTo = decoded.delegatedTo;
    req.tokenData = decoded;

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

module.exports = { verifyToken };
