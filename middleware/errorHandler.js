/**
 * middleware/errorHandler.js — FlowPOS
 * Mount LAST in app.js: app.use(errorHandler)
 */

const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already in use` });
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: msg });
  }
  // JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Session expired' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;


/* ─────────────────────────────────────────────────────────────────────────────
   utils/api.js — adminApi additions
   Add these methods to your existing adminApi object.
   Matches the route paths in users.routes.js exactly.
───────────────────────────────────────────────────────────────────────────── */

/*

// In your existing utils/api.js, update adminApi:

export const adminApi = {
  // existing methods ...

  getUsers:      ()           => api.get('/admin/users'),
  createUser:    (data)       => api.post('/users', data),
  changeRole:    (id, role)   => api.patch(`/admin/users/${id}/role`,     { role }),
  toggleStatus:  (id)         => api.patch(`/admin/users/${id}/toggle`),
  resetPassword: (id, password) => api.patch(`/admin/users/${id}/password`, { password }),
  hardDelete:    (id)         => api.delete(`/admin/users/${id}`),
};

*/