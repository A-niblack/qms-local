// src/features/admin/UserManagement.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext, ROLES, TIERS } from '../../context/AppContext';
import { usersApi } from '../../services/api';

export default function UserManagement() {
  const { allUsers, refreshData, user: currentUser } = useContext(AppContext);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleUpdateUser = async (userId, updates) => {
    try {
      setLoading(true);
      setError(null);
      
      await usersApi.update(userId, updates);
      await refreshData();
      
      setSuccess('User updated successfully');
      setEditingUser(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userToToggle) => {
    // Prevent deactivating yourself
    if (userToToggle.id === currentUser?.id) {
      setError('You cannot deactivate your own account');
      return;
    }

    await handleUpdateUser(userToToggle.id, {
      isActive: !userToToggle.isActive
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    // Prevent changing your own role
    if (userId === currentUser?.id) {
      setError('You cannot change your own role');
      return;
    }

    await handleUpdateUser(userId, { role: newRole });
  };

  const handleTierChange = async (userId, newTier) => {
    await handleUpdateUser(userId, { tier: newTier });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'danger';
      case ROLES.ENGINEER: return 'primary';
      case ROLES.INSPECTOR: return 'success';
      case ROLES.WARRANTY_MANAGER: return 'info';
      default: return 'secondary';
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case TIERS.ENTERPRISE: return 'danger';
      case TIERS.PROFESSIONAL: return 'warning';
      case TIERS.BASIC: return 'info';
      case TIERS.FREE: return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>User Management</h2>
        <span className="badge bg-info">{allUsers?.length || 0} Users</span>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {allUsers?.length === 0 ? (
            <p className="text-muted text-center">No users found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Display Name</th>
                    <th>Role</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers?.map((u) => (
                    <tr key={u.id} className={u.isActive === false ? 'table-secondary' : ''}>
                      <td>
                        {u.email}
                        {u.id === currentUser?.id && (
                          <span className="badge bg-primary ms-2">You</span>
                        )}
                      </td>
                      <td>{u.displayName || '-'}</td>
                      <td>
                        {editingUser?.id === u.id ? (
                          <select
                            className="form-select form-select-sm"
                            value={editingUser.role}
                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            disabled={u.id === currentUser?.id}
                          >
                            {Object.values(ROLES).map((role) => (
                              <option key={role} value={role}>
                                {role.replace('_', ' ').toUpperCase()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge bg-${getRoleBadgeColor(u.role)}`}>
                            {u.role?.replace('_', ' ').toUpperCase() || 'INSPECTOR'}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingUser?.id === u.id ? (
                          <select
                            className="form-select form-select-sm"
                            value={editingUser.tier || TIERS.FREE}
                            onChange={(e) => setEditingUser({ ...editingUser, tier: e.target.value })}
                          >
                            {Object.values(TIERS).map((tier) => (
                              <option key={tier} value={tier}>
                                {tier.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge bg-${getTierBadgeColor(u.tier)}`}>
                            {(u.tier || TIERS.FREE).toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge bg-${u.isActive !== false ? 'success' : 'danger'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleActive(u)}
                          title={u.id === currentUser?.id ? 'Cannot deactivate yourself' : 'Click to toggle'}
                        >
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                        </small>
                      </td>
                      <td>
                        {editingUser?.id === u.id ? (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-success"
                              onClick={() => handleUpdateUser(u.id, {
                                role: editingUser.role,
                                tier: editingUser.tier
                              })}
                              disabled={loading}
                            >
                              {loading ? '...' : 'Save'}
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setEditingUser(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditingUser({ ...u })}
                            disabled={loading}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Role Legend */}
      <div className="card mt-4">
        <div className="card-header">Role Permissions</div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <span className="badge bg-danger me-2">Admin</span>
              <small>Full system access</small>
            </div>
            <div className="col-md-3">
              <span className="badge bg-primary me-2">Engineer</span>
              <small>Plans, evaluations, reports</small>
            </div>
            <div className="col-md-3">
              <span className="badge bg-success me-2">Inspector</span>
              <small>Inspections, shipments</small>
            </div>
            <div className="col-md-3">
              <span className="badge bg-info me-2">Warranty</span>
              <small>Warranty claims only</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
