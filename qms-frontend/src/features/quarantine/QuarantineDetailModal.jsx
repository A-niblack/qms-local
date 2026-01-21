// src/features/quarantine/QuarantineDetailModal.jsx
// SNAKE_CASE NORMALIZED (REST API)

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { quarantineApi } from '../../services/api';

export default function QuarantineDetailModal({ batch, onClose, onUpdate }) {
  const { partTypes } = useContext(AppContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // local notes field for final disposition actions
  const [disposition_notes, setDispositionNotes] = useState('');

  const statusFlow = [
    { value: 'pending', label: 'Pending', next: ['under-review'] },
    { value: 'under-review', label: 'Under Review', next: ['disposition'] },
    { value: 'disposition', label: 'Disposition', next: ['released', 'scrapped', 'returned'] },
    { value: 'released', label: 'Released', next: [] },
    { value: 'scrapped', label: 'Scrapped', next: [] },
    { value: 'returned', label: 'Returned to Supplier', next: [] }
  ];

  const getPartTypeName = (part_type_id) => {
    const pt = partTypes?.find(p => p.id === part_type_id);
    return pt ? pt.part_number || pt.partNumber || pt.name : 'Unknown';
  };

  const getCurrentStatusInfo = () => {
    return statusFlow.find(s => s.value === batch.status) || statusFlow[0];
  };

  const getStatusBadgeColor = (status) => {
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

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      setError(null);

      // Snake_case-only payload
      const updateData = {
        status: newStatus
      };

      // If final disposition action, also set disposition fields
      if (['released', 'scrapped', 'returned'].includes(newStatus)) {
        updateData.disposition = newStatus;
        updateData.disposition_notes = disposition_notes || '';
      }

      await quarantineApi.update(batch.id, updateData);
      onUpdate();
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = getCurrentStatusInfo();
  const canProgress = statusInfo.next.length > 0;

  const part_type_id =
    batch.part_type_id ??
    // if your backend doesn't return part_type_id on quarantine batches,
    // you may only have shipment join fields or none; keep fallback
    batch?.shipment_part_type_id ??
    '';

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header bg-warning">
            <h5 className="modal-title">
              Quarantine Batch: Q-{batch.id.slice(-6).toUpperCase()}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Status Progress */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Current Status:</span>
                <span className={`badge bg-${getStatusBadgeColor(batch.status)} fs-6`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="progress" style={{ height: '25px' }}>
                {statusFlow.slice(0, 4).map((s, idx) => {
                  const currentIdx = statusFlow.findIndex(sf => sf.value === batch.status);
                  const isComplete =
                    idx < currentIdx || ['released', 'scrapped', 'returned'].includes(batch.status);
                  const isCurrent = s.value === batch.status;

                  return (
                    <div
                      key={s.value}
                      className={`progress-bar ${
                        isComplete
                          ? 'bg-success'
                          : isCurrent
                            ? `bg-${getStatusBadgeColor(s.value)}`
                            : 'bg-light text-dark'
                      }`}
                      style={{ width: '25%' }}
                    >
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Batch Details */}
            <div className="card mb-4">
              <div className="card-header">Batch Information</div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <small className="text-muted">Part Type</small>
                    <div><strong>{getPartTypeName(part_type_id)}</strong></div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <small className="text-muted">Quantity</small>
                    <div><strong>{batch.quantity || 'Not specified'}</strong></div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <small className="text-muted">Location</small>
                    <div>{batch.location || 'Not specified'}</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <small className="text-muted">Created</small>
                    <div>
                      {batch.created_at ? new Date(batch.created_at).toLocaleString() : '-'}
                      {batch.created_by_name && (
                        <>
                          <br />
                          <small className="text-muted">by {batch.created_by_name}</small>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">Reason for Quarantine</small>
                  <div className="p-2 bg-light rounded">{batch.reason || 'No reason provided'}</div>
                </div>

                {batch.notes && (
                  <div>
                    <small className="text-muted">Notes</small>
                    <div className="p-2 bg-light rounded">{batch.notes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Disposition fields if already decided (snake_case from DB) */}
            {(batch.disposition || batch.disposition_notes) && (
              <div className="card mb-4">
                <div className="card-header bg-light">Disposition Decision</div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted">Decision</small>
                      <div>
                        <span className={`badge bg-${getStatusBadgeColor(batch.disposition)}`}>
                          {(batch.disposition || '').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted">Decided At</small>
                      <div>
                        {batch.disposition_date
                          ? new Date(batch.disposition_date).toLocaleString()
                          : '—'}
                      </div>
                    </div>
                  </div>
                  {batch.disposition_notes && (
                    <div className="mt-3">
                      <small className="text-muted">Disposition Notes</small>
                      <div className="p-2 bg-light rounded">{batch.disposition_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {canProgress && (
              <div className="card">
                <div className="card-header">Actions</div>
                <div className="card-body">
                  {batch.status === 'disposition' ? (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Disposition Notes</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={disposition_notes}
                          onChange={(e) => setDispositionNotes(e.target.value)}
                          placeholder="Enter notes about the disposition decision..."
                        />
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-success"
                          onClick={() => handleStatusChange('released')}
                          disabled={loading}
                        >
                          {loading ? '...' : 'Release to Production'}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleStatusChange('scrapped')}
                          disabled={loading}
                        >
                          {loading ? '...' : 'Scrap'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleStatusChange('returned')}
                          disabled={loading}
                        >
                          {loading ? '...' : 'Return to Supplier'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex gap-2">
                      {statusInfo.next.map(nextStatus => {
                        const nextInfo = statusFlow.find(s => s.value === nextStatus);
                        return (
                          <button
                            key={nextStatus}
                            className={`btn btn-${getStatusBadgeColor(nextStatus)}`}
                            onClick={() => handleStatusChange(nextStatus)}
                            disabled={loading}
                          >
                            {loading ? '...' : `Move to ${nextInfo?.label || nextStatus}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}