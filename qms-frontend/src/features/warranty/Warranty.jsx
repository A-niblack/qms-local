// src/features/warranty/Warranty.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { warrantyApi } from '../../services/api';
import WarrantyModal from './WarrantyModal';

export default function Warranty() {
  const { warrantyClaims, partTypes, refreshData, user } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getPartTypeName = (partTypeId) => {
    const pt = partTypes?.find(p => p.id === partTypeId);
    return pt ? pt.partNumber : 'Unknown';
  };

  // Filter claims
  const filteredClaims = warrantyClaims?.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        c.claimNumber?.toLowerCase().includes(search) ||
        c.customerName?.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search) ||
        getPartTypeName(c.partTypeId).toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  // Sort by date (newest first)
  const sortedClaims = [...filteredClaims].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const handleOpenModal = (claim = null) => {
    setEditingClaim(claim);
    setShowModal(true);
  };

  const handleDelete = async (claim) => {
    if (!window.confirm(`Delete warranty claim "${claim.claimNumber}"?`)) return;

    try {
      setLoading(true);
      await warrantyApi.delete(claim.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete claim');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: 'primary',
      'in-progress': 'info',
      'pending-parts': 'warning',
      'pending-approval': 'secondary',
      approved: 'success',
      rejected: 'danger',
      closed: 'dark'
    };
    return colors[status] || 'secondary';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'secondary',
      medium: 'warning',
      high: 'danger',
      critical: 'danger'
    };
    return colors[priority] || 'secondary';
  };

  // Summary stats
  const stats = {
    total: warrantyClaims?.length || 0,
    open: warrantyClaims?.filter(c => c.status === 'open').length || 0,
    inProgress: warrantyClaims?.filter(c => c.status === 'in-progress').length || 0,
    pendingApproval: warrantyClaims?.filter(c => c.status === 'pending-approval').length || 0,
    closed: warrantyClaims?.filter(c => c.status === 'closed').length || 0
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Warranty Claims</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + New Claim
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col">
          <div className="card bg-primary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('open')}>
            <div className="card-body text-center py-2">
              <h4 className="mb-0">{stats.open}</h4>
              <small>Open</small>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-info text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('in-progress')}>
            <div className="card-body text-center py-2">
              <h4 className="mb-0">{stats.inProgress}</h4>
              <small>In Progress</small>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-warning text-dark" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('pending-approval')}>
            <div className="card-body text-center py-2">
              <h4 className="mb-0">{stats.pendingApproval}</h4>
              <small>Pending Approval</small>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-dark text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('closed')}>
            <div className="card-body text-center py-2">
              <h4 className="mb-0">{stats.closed}</h4>
              <small>Closed</small>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card bg-secondary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')}>
            <div className="card-body text-center py-2">
              <h4 className="mb-0">{stats.total}</h4>
              <small>Total</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by claim #, customer, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="pending-parts">Pending Parts</option>
                <option value="pending-approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted">{sortedClaims.length} claims</span>
            </div>
          </div>
        </div>
      </div>

      {/* Claims List */}
      {sortedClaims.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No warranty claims found.</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Create First Claim
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Customer</th>
                  <th>Part Type</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td>
                      <strong>{claim.claimNumber || `WC-${claim.id.slice(-6).toUpperCase()}`}</strong>
                    </td>
                    <td>{claim.customerName || '-'}</td>
                    <td>{getPartTypeName(claim.partTypeId)}</td>
                    <td>
                      <span title={claim.description}>
                        {claim.description?.length > 40
                          ? claim.description.substring(0, 40) + '...'
                          : claim.description || '-'}
                      </span>
                    </td>
                    <td>
                      {claim.priority && (
                        <span className={`badge bg-${getPriorityBadge(claim.priority)}`}>
                          {claim.priority}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusBadge(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td>
                      <small>
                        {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : '-'}
                      </small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => handleOpenModal(claim)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(claim)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <WarrantyModal
          claim={editingClaim}
          onClose={() => {
            setShowModal(false);
            setEditingClaim(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingClaim(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
