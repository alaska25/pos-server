/**
 * utils/api.js — FlowPOS (adminApi section)
 *
 * Replace your existing adminApi export with this.
 * Paths match routes/admin/userManagementRoutes.js exactly.
 *
 * Base URL assumed: /api  (set in your axios instance)
 */

// ── Keep your existing axios instance (api) as-is ──
// import api from './api';  ← already imported wherever you use this

export const adminApi = {

  /* ── User management ── */
  getUsers: () =>
    api.get('/admin/users'),

  // create user still lives at /api/users (your existing userRoutes.js)
  createUser: (data) =>
    api.post('/users', data),

  changeRole: (id, role) =>
    api.patch(`/admin/users/${id}/role`, { role }),

  toggleStatus: (id) =>
    api.patch(`/admin/users/${id}/toggle`),

  resetPassword: (id, newPassword) =>
  api.patch(`/admin/users/${id}/password`, { newPassword }),

  getHealth: () => api.get('/admin/health'),

  hardDelete: (id) =>
    api.delete(`/admin/users/${id}`),
};