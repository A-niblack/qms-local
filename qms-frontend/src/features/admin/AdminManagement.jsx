// src/features/admin/AdminManagement.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

export default function AdminManagement() {
  const { user, allUsers, partTypes, inspectionPlans, shipments, inspections } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const stats = {
    totalUsers: allUsers?.length || 0,
    totalPartTypes: partTypes?.length || 0,
    totalInspectionPlans: inspectionPlans?.length || 0,
    totalShipments: shipments?.length || 0,
    totalInspections: inspections?.length || 0,
    pendingInspections: inspections?.filter(i => i.status === 'pending')?.length || 0,
    completedInspections: inspections?.filter(i => i.status === 'completed')?.length || 0,
    failedInspections: inspections?.filter(i => i.status === 'failed')?.length || 0
  };

  const usersByRole = {
    admin: allUsers?.filter(u => u.role === 'admin')?.length || 0,
    engineer: allUsers?.filter(u => u.role === 'engineer')?.length || 0,
    inspector: allUsers?.filter(u => u.role === 'inspector')?.length || 0,
    warranty_manager: allUsers?.filter(u => u.role === 'warranty_manager')?.length || 0
  };

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4">Admin Dashboard</h2>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({stats.totalUsers})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </li>
      </ul>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="row">
          {/* Summary Cards */}
          <div className="col-md-3 mb-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h5 className="card-title">Total Users</h5>
                <h2>{stats.totalUsers}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5 className="card-title">Part Types</h5>
                <h2>{stats.totalPartTypes}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h5 className="card-title">Shipments</h5>
                <h2>{stats.totalShipments}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <h5 className="card-title">Inspections</h5>
                <h2>{stats.totalInspections}</h2>
              </div>
            </div>
          </div>

          {/* Inspection Status */}
          <div className="col-md-6 mb-3">
            <div className="card">
              <div className="card-header">Inspection Status</div>
              <div className="card-body">
                <div className="d-flex justify-content-around">
                  <div className="text-center">
                    <h3 className="text-warning">{stats.pendingInspections}</h3>
                    <small>Pending</small>
                  </div>
                  <div className="text-center">
                    <h3 className="text-success">{stats.completedInspections}</h3>
                    <small>Completed</small>
                  </div>
                  <div className="text-center">
                    <h3 className="text-danger">{stats.failedInspections}</h3>
                    <small>Failed</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Users by Role */}
          <div className="col-md-6 mb-3">
            <div className="card">
              <div className="card-header">Users by Role</div>
              <div className="card-body">
                <div className="d-flex justify-content-around">
                  <div className="text-center">
                    <h3>{usersByRole.admin}</h3>
                    <small>Admins</small>
                  </div>
                  <div className="text-center">
                    <h3>{usersByRole.engineer}</h3>
                    <small>Engineers</small>
                  </div>
                  <div className="text-center">
                    <h3>{usersByRole.inspector}</h3>
                    <small>Inspectors</small>
                  </div>
                  <div className="text-center">
                    <h3>{usersByRole.warranty_manager}</h3>
                    <small>Warranty</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Display Name</th>
                    <th>Role</th>
                    <th>Tier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers?.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.displayName || '-'}</td>
                      <td>
                        <span className={`badge bg-${
                          u.role === 'admin' ? 'danger' :
                          u.role === 'engineer' ? 'primary' :
                          u.role === 'warranty_manager' ? 'info' : 'secondary'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td>{u.tier || 'free'}</td>
                      <td>
                        <span className={`badge bg-${u.isActive !== false ? 'success' : 'danger'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card">
          <div className="card-body">
            <p className="text-muted">Recent activity will be displayed here.</p>
            <p className="text-muted">Activity logging is available in the backend audit_log table.</p>
          </div>
        </div>
      )}
    </div>
  );
}
