// src/features/quarantine/Quarantine.jsx
// SNAKE_CASE NORMALIZED (REST API)

import React, { useMemo, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { quarantineApi } from '../../services/api';
import QuarantineDetailModal from './QuarantineDetailModal';

export default function Quarantine() {
  const { quarantineBatches, partTypes, shipments, refreshData } = useContext(AppContext);

  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Optional helper UI: select a part type to filter shipment dropdown
  const [selected_part_type_id, setSelectedPartTypeId] = useState('');

  const [newBatch, setNewBatch] = useState({
    shipment_id: '',
    quantity: '',
    reason: '',
    defect_type: '',
    location: '',
    notes: ''
  });

  const getPartNumberById = (part_type_id) => {
    const pt = partTypes?.find(p => p.id === part_type_id);
    return pt?.part_number || pt?.partNumber || pt?.name || 'Unknown';
  };

  const getBatchPartLabel = (batch) => {
    // Prefer data directly returned by backend join
    if (batch.part_number) return batch.part_number;
    if (batch.part_type_id) return getPartNumberById(batch.part_type_id);
    return 'Unknown';
  };

  const filteredBatches = (quarantineBatches || []).filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  const filteredShipmentsForDropdown = useMemo(() => {
    const list = shipments || [];
    if (!selected_part_type_id) return list;
    return list.filter(s => s.part_type_id === selected_part_type_id);
  }, [shipments, selected_part_type_id]);

  const handleCreateBatch = async (e) => {
    e.preventDefault();

    if (!newBatch.reason.trim()) {
      setError('Reason is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        shipment_id: newBatch.shipment_id || null,
        quantity: newBatch.quantity ? parseInt(newBatch.quantity, 10) : null,
        reason: newBatch.reason,
        defect_type: newBatch.defect_type || '',
        location: newBatch.location || '',
        notes: newBatch.notes || ''
      };

      await quarantineApi.create(payload);
      await refreshData();

      setShowNewModal(false);
      setSelectedPartTypeId('');
      setNewBatch({
        shipment_id: '',
        quantity: '',
        reason: '',
        defect_type: '',
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
              <h4>{(quarantineBatches || []).filter(b => b.status === 'pending').length}</h4>
              <small>Pending</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('under-review')}>
            <div className="card-body text-center">
              <h4>{(quarantineBatches || []).filter(b => b.status === 'under-review').length}</h4>
              <small>Under Review</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-primary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('disposition')}>
            <div className="card-body text-center">
              <h4>{(quarantineBatches || []).filter(b => b.status === 'disposition').length}</h4>
              <small>Disposition</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('released')}>
            <div className="card-body text-center">
              <h4>{(quarantineBatches || []).filter(b => b.status === 'released').length}</h4>
              <small>Released</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('scrapped')}>
            <div className="card-body text-center">
              <h4>{(quarantineBatches || []).filter(b => b.status === 'scrapped').length}</h4>
              <small>Scrapped</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-secondary text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')}>
            <div className="card-body text-center">
              <h4>{(quarantineBatches || []).length}</h4>
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
                  <th>Shipment</th>
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
                    <td><strong>Q-{batch.id.slice(-6).toUpperCase()}</strong></td>
                    <td>{getBatchPartLabel(batch)}</td>
                    <td>{batch.shipment_number || '-'}</td>
                    <td>{batch.quantity ?? '-'}</td>
                    <td>
                      <span title={batch.reason}>
                        {batch.reason?.length > 30 ? batch.reason.substring(0, 30) + '...' : (batch.reason || '-')}
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
                        {batch.created_at ? new Date(batch.created_at).toLocaleDateString() : '-'}
                      </small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary" onClick={() => setShowDetailModal(batch)}>
                          View
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => handleDelete(batch)} disabled={loading}>
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
                    <label className="form-label">Filter Shipments by Part Type (optional)</label>
                    <select
                      className="form-select"
                      value={selected_part_type_id}
                      onChange={(e) => setSelectedPartTypeId(e.target.value)}
                    >
                      <option value="">All Part Types...</option>
                      {(partTypes || [])
                        .filter(pt => pt.is_active !== false && pt.isActive !== false)
                        .map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {(pt.part_number || pt.partNumber)} - {pt.description || ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Related Shipment</label>
                    <select
                      className="form-select"
                      value={newBatch.shipment_id}
                      onChange={(e) => setNewBatch({ ...newBatch, shipment_id: e.target.value })}
                    >
                      <option value="">Select Shipment (optional)...</option>
                      {filteredShipmentsForDropdown.map((s) => (
                        <option key={s.id} value={s.id}>
                          {(s.shipment_number || '-')}{' '}
                          - {(s.part_type_id ? getPartNumberById(s.part_type_id) : 'Unknown')}
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
                    <label className="form-label">Defect Type (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newBatch.defect_type}
                      onChange={(e) => setNewBatch({ ...newBatch, defect_type: e.target.value })}
                      placeholder="e.g., Dimensional, Cosmetic, Material..."
                    />
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
