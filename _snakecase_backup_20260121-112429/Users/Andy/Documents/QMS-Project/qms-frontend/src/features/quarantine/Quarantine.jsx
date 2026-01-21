// src/features/quarantine/Quarantine.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { quarantineApi } from '../../services/api';
import QuarantineDetailModal from './QuarantineDetailModal';

export default function Quarantine() {
  const { quarantineBatches, partTypes, shipments, refreshData, user } = useContext(AppContext);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [newBatch, setNewBatch] = useState({
    shipmentId: '',
    partTypeId: '',
    quantity: '',
    reason: '',
    location: '',
    notes: ''
  });

  const getPartTypeName = (partTypeId) => {
    const pt = partTypes?.find(p => p.id === partTypeId);
    return pt ? pt.partNumber : 'Unknown';
  };

  const getShipmentInfo = (shipmentId) => {
    return shipments?.find(s => s.id === shipmentId);
  };

  // Filter batches
  const filteredBatches = quarantineBatches?.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  }) || [];

  const handleCreateBatch = async (e) => {
    e.preventDefault();

    if (!newBatch.reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const batchData = {
        ...newBatch,
        quantity: newBatch.quantity ? parseInt(newBatch.quantity, 10) : null,
        status: 'pending',
        createdBy: user?.id,
        createdByName: user?.displayName || user?.email
      };

      await quarantineApi.create(batchData);
      await refreshData();
      setShowNewModal(false);
      setNewBatch({
        shipmentId: '',
        partTypeId: '',
        quantity: '',
        reason: '',
        location: '',
        notes: ''
      });
    } catch (err) {
      console.error('Create error:', err);
      setError(err.message || 'Failed to create quarantine batch');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm('Delete this quarantine batch?')) return;

    try {
      setLoading(true);
      await quarantineApi.delete(batch.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete batch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'warning',
      'under-review': 'info',
      disposition: 'primary',
      released: 'success',
      scrapped: 'danger',
      returned: 'secondary'
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quarantine Management</h2>
        <button className="btn btn-warning" onClick={() => setShowNewModal(true)}>
          + New Quarantine
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Summary */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card bg-warning text-dark" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('pending')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.filter(b => b.status === 'pending').length || 0}</h4>
              <small>Pending</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('under-review')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.filter(b => b.status === 'under-review').length || 0}</h4>
              <small>Under Review</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-primary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('disposition')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.filter(b => b.status === 'disposition').length || 0}</h4>
              <small>Disposition</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('released')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.filter(b => b.status === 'released').length || 0}</h4>
              <small>Released</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('scrapped')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.filter(b => b.status === 'scrapped').length || 0}</h4>
              <small>Scrapped</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-secondary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')}>
            <div className="card-body text-center">
              <h4>{quarantineBatches?.length || 0}</h4>
              <small>Total</small>
            </div>
          </div>
        </div>
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No quarantine batches found.</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Part Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <strong>Q-{batch.id.slice(-6).toUpperCase()}</strong>
                    </td>
                    <td>{getPartTypeName(batch.partTypeId)}</td>
                    <td>{batch.quantity || '-'}</td>
                    <td>
                      <span title={batch.reason}>
                        {batch.reason?.length > 30 
                          ? batch.reason.substring(0, 30) + '...' 
                          : batch.reason || '-'}
                      </span>
                    </td>
                    <td>{batch.location || '-'}</td>
                    <td>
                      <span className={`badge bg-${getStatusBadge(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td>
                      <small>
                        {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : '-'}
                      </small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setShowDetailModal(batch)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(batch)}
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

      {/* New Batch Modal */}
      {showNewModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">New Quarantine Batch</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBatch}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label">Part Type</label>
                    <select
                      className="form-select"
                      value={newBatch.partTypeId}
                      onChange={(e) => setNewBatch({ ...newBatch, partTypeId: e.target.value })}
                    >
                      <option value="">Select Part Type...</option>
                      {partTypes?.filter(pt => pt.isActive !== false).map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.partNumber} - {pt.description || ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Related Shipment</label>
                    <select
                      className="form-select"
                      value={newBatch.shipmentId}
                      onChange={(e) => setNewBatch({ ...newBatch, shipmentId: e.target.value })}
                    >
                      <option value="">Select Shipment (optional)...</option>
                      {shipments?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.lotNumber} - {getPartTypeName(s.partTypeId)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newBatch.quantity}
                        onChange={(e) => setNewBatch({ ...newBatch, quantity: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newBatch.location}
                        onChange={(e) => setNewBatch({ ...newBatch, location: e.target.value })}
                        placeholder="e.g., Quarantine Area A"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Reason for Quarantine *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newBatch.reason}
                      onChange={(e) => setNewBatch({ ...newBatch, reason: e.target.value })}
                      required
                      placeholder="Describe why these parts are being quarantined..."
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={newBatch.notes}
                      onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Quarantine'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <QuarantineDetailModal
          batch={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onUpdate={() => {
            refreshData();
            setShowDetailModal(null);
          }}
        />
      )}
    </div>
  );
}
