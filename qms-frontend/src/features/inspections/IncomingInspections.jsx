// src/features/inspections/IncomingInspections.jsx
// SNAKE_CASE + DB-ENUM SHIPMENT STATUS NORMALIZED

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { shipmentsApi } from '../../services/api';
import NewShipmentModal from './NewShipmentModal';
import CfqInspectionModal from './CfqInspectionModal';
import EngineeringEvaluationModal from './EngineeringEvaluationModal';

export default function IncomingInspections() {
  const {
    shipments,
    inspections,
    partTypes,
    inspectionPlans,
    refreshData
  } = useContext(AppContext);

  const [showNewShipment, setShowNewShipment] = useState(false);
  const [showCfqModal, setShowCfqModal] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getPartTypeName = (part_type_id) => {
    const pt = partTypes?.find(p => p.id === part_type_id);
    return pt ? (pt.part_number || pt.partNumber || 'Unknown') : 'Unknown';
  };

  const getInspectionPlan = (part_type_id) => {
    // Your inspectionPlans response may include part_type_id; normalize if needed
    return inspectionPlans?.find(p => p.part_type_id === part_type_id) || null;
  };

  const getShipmentInspections = (shipment_id) => {
    return inspections?.filter(i => i.shipment_id === shipment_id) || [];
  };

  const filteredShipments = shipments?.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const partType = partTypes?.find(p => p.id === s.part_type_id);

      return (
        String(s.shipment_number || '').toLowerCase().includes(searchLower) ||
        String(s.po_number || '').toLowerCase().includes(searchLower) ||
        String(partType?.part_number || partType?.partNumber || '').toLowerCase().includes(searchLower) ||
        String(s.supplier || '').toLowerCase().includes(searchLower) ||
        String(s.supplier_lot || '').toLowerCase().includes(searchLower)
      );
    }

    return true;
  }) || [];

  const sortedShipments = [...filteredShipments].sort((a, b) => {
    const dateA = new Date(a.received_date || a.created_at || 0);
    const dateB = new Date(b.received_date || b.created_at || 0);
    return dateB - dateA;
  });

  const handleDeleteShipment = async (shipment) => {
    if (!window.confirm(`Delete shipment ${shipment.shipment_number || shipment.id}? This will also delete all associated inspections.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await shipmentsApi.delete(shipment.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (shipment, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      await shipmentsApi.update(shipment.id, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      await refreshData();
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'warning',
      in_inspection: 'info',
      approved: 'success',
      rejected: 'danger',
      partial: 'primary'
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Incoming Inspections</h2>
        <button className="btn btn-primary" onClick={() => setShowNewShipment(true)}>
          + New Shipment
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control"
                placeholder="Search by shipment #, PO, part number, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_inspection">In Inspection</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div className="col-md-4 text-end">
              <span className="text-muted">
                Showing {sortedShipments.length} of {shipments?.length || 0} shipments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        {[
          ['pending', 'Pending', 'warning', (shipments || []).filter(s => s.status === 'pending').length],
          ['in_inspection', 'In Inspection', 'info', (shipments || []).filter(s => s.status === 'in_inspection').length],
          ['approved', 'Approved', 'success', (shipments || []).filter(s => s.status === 'approved').length],
          ['rejected', 'Rejected', 'danger', (shipments || []).filter(s => s.status === 'rejected').length],
          ['partial', 'Partial', 'primary', (shipments || []).filter(s => s.status === 'partial').length],
        ].map(([key, label, color, count]) => (
          <div className="col-md-2" key={key}>
            <div className={`card bg-${color} ${color === 'warning' ? 'text-dark' : 'text-white'}`}>
              <div className="card-body text-center">
                <h4>{count}</h4>
                <small>{label}</small>
              </div>
            </div>
          </div>
        ))}
        <div className="col-md-2">
          <div className="card bg-secondary text-white" style={{ cursor: 'pointer' }} onClick={() => setFilter('all')}>
            <div className="card-body text-center">
              <h4>{shipments?.length || 0}</h4>
              <small>Total</small>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments List */}
      {sortedShipments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No shipments found.</p>
            <button className="btn btn-primary" onClick={() => setShowNewShipment(true)}>
              Create First Shipment
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {sortedShipments.map((shipment) => {
            const shipmentInspections = getShipmentInspections(shipment.id);
            const plan = getInspectionPlan(shipment.part_type_id);

            return (
              <div key={shipment.id} className="col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{getPartTypeName(shipment.part_type_id)}</strong>
                      <span className={`badge bg-${getStatusBadge(shipment.status)} ms-2`}>
                        {shipment.status}
                      </span>
                    </div>
                    <small className="text-muted">
                      {shipment.received_date ? new Date(shipment.received_date).toLocaleDateString() : 'No date'}
                    </small>
                  </div>

                  <div className="card-body">
                    <div className="row mb-2">
                      <div className="col-6">
                        <small className="text-muted">Shipment #</small>
                        <div>{shipment.shipment_number || '-'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">PO Number</small>
                        <div>{shipment.po_number || '-'}</div>
                      </div>
                    </div>

                    <div className="row mb-2">
                      <div className="col-6">
                        <small className="text-muted">Quantity</small>
                        <div>{shipment.quantity ?? '-'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Supplier</small>
                        <div>{shipment.supplier || '-'}</div>
                      </div>
                    </div>

                    {shipmentInspections.length > 0 && (
                      <div className="mt-3">
                        <small className="text-muted">Inspections ({shipmentInspections.length})</small>
                        <div className="list-group list-group-flush mt-1">
                          {shipmentInspections.slice(0, 3).map((insp) => (
                            <div key={insp.id} className="list-group-item px-0 py-1 d-flex justify-content-between">
                              <small>{insp.inspection_type || 'Inspection'}</small>
                              <span className={`badge bg-${getStatusBadge(
                                // inspections.status is different enum than shipments; keep neutral badge
                                insp.status === 'passed' ? 'approved'
                                  : insp.status === 'failed' ? 'rejected'
                                  : 'in_inspection'
                              )}`}>
                                {insp.status}
                              </span>
                            </div>
                          ))}
                          {shipmentInspections.length > 3 && (
                            <small className="text-muted">+{shipmentInspections.length - 3} more</small>
                          )}
                        </div>
                      </div>
                    )}

                    {plan && (
                      <div className="mt-3">
                        <small className="text-muted">Plan</small>
                        <div>{plan.name}</div>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <div className="btn-group btn-group-sm w-100">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setShowCfqModal(shipment)}
                        title="CFQ Inspection"
                      >
                        CFQ
                      </button>

                      <button
                        className="btn btn-outline-info"
                        onClick={() => setShowEvalModal(shipment)}
                        title="Engineering Evaluation"
                      >
                        Eval
                      </button>

                      {shipment.status === 'pending' && (
                        <button
                          className="btn btn-outline-success"
                          onClick={() => handleUpdateStatus(shipment, 'in_inspection')}
                        >
                          Start
                        </button>
                      )}

                      {shipment.status === 'in_inspection' && (
                        <>
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleUpdateStatus(shipment, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleUpdateStatus(shipment, 'rejected')}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleUpdateStatus(shipment, 'partial')}
                          >
                            Partial
                          </button>
                        </>
                      )}

                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleDeleteShipment(shipment)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showNewShipment && (
        <NewShipmentModal
          onClose={() => setShowNewShipment(false)}
          onSuccess={() => {
            setShowNewShipment(false);
            refreshData();
          }}
        />
      )}

      {showCfqModal && (
        <CfqInspectionModal
          shipment={showCfqModal}
          onClose={() => setShowCfqModal(null)}
          onSuccess={() => {
            setShowCfqModal(null);
            refreshData();
          }}
        />
      )}

      {showEvalModal && (
        <EngineeringEvaluationModal
          shipment={showEvalModal}
          onClose={() => setShowEvalModal(null)}
          onSuccess={() => {
            setShowEvalModal(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}
