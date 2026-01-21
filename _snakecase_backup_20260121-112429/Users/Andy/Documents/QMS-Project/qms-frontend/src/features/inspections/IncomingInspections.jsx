// src/features/inspections/IncomingInspections.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { shipmentsApi, inspectionsApi } from '../../services/api';
import NewShipmentModal from './NewShipmentModal';
import CfqInspectionModal from './CfqInspectionModal';
import EngineeringEvaluationModal from './EngineeringEvaluationModal';

export default function IncomingInspections() {
  const { 
    shipments, 
    inspections, 
    partTypes, 
    inspectionPlans,
    quarantineBatches,
    refreshData, 
    user 
  } = useContext(AppContext);
  
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [showCfqModal, setShowCfqModal] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get part type name by ID
  const getPartTypeName = (partTypeId) => {
    const pt = partTypes?.find(p => p.id === partTypeId);
    return pt ? pt.partNumber : 'Unknown';
  };

  // Get inspection plan for a part type
  const getInspectionPlan = (partTypeId) => {
    return inspectionPlans?.find(p => p.partTypeId === partTypeId);
  };

  // Get inspections for a shipment
  const getShipmentInspections = (shipmentId) => {
    return inspections?.filter(i => i.shipmentId === shipmentId) || [];
  };

  // Filter and search shipments
  const filteredShipments = shipments?.filter(s => {
    // Status filter
    if (filter !== 'all' && s.status !== filter) return false;
    
    // Search filter
    if (searchTerm) {
      const partType = partTypes?.find(p => p.id === s.partTypeId);
      const searchLower = searchTerm.toLowerCase();
      return (
        s.lotNumber?.toLowerCase().includes(searchLower) ||
        s.poNumber?.toLowerCase().includes(searchLower) ||
        partType?.partNumber?.toLowerCase().includes(searchLower) ||
        s.supplier?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  }) || [];

  // Sort by date (newest first)
  const sortedShipments = [...filteredShipments].sort((a, b) => {
    const dateA = new Date(a.receivedDate || a.createdAt);
    const dateB = new Date(b.receivedDate || b.createdAt);
    return dateB - dateA;
  });

  const handleDeleteShipment = async (shipment) => {
    if (!window.confirm(`Delete shipment ${shipment.lotNumber}? This will also delete all associated inspections.`)) {
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
      await shipmentsApi.update(shipment.id, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
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
      'in-progress': 'info',
      completed: 'success',
      failed: 'danger',
      quarantined: 'dark',
      released: 'primary'
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Incoming Inspections</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewShipment(true)}
        >
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
                placeholder="Search by lot, PO, part number, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="quarantined">Quarantined</option>
                <option value="released">Released</option>
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
        <div className="col-md-2">
          <div className="card bg-warning text-dark">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'pending').length || 0}</h4>
              <small>Pending</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'in-progress').length || 0}</h4>
              <small>In Progress</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'completed').length || 0}</h4>
              <small>Completed</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'failed').length || 0}</h4>
              <small>Failed</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-dark text-white">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'quarantined').length || 0}</h4>
              <small>Quarantined</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h4>{shipments?.filter(s => s.status === 'released').length || 0}</h4>
              <small>Released</small>
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
            const plan = getInspectionPlan(shipment.partTypeId);
            
            return (
              <div key={shipment.id} className="col-lg-6 mb-4">
                <div className={`card h-100 ${shipment.status === 'quarantined' ? 'border-danger' : ''}`}>
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{getPartTypeName(shipment.partTypeId)}</strong>
                      <span className={`badge bg-${getStatusBadge(shipment.status)} ms-2`}>
                        {shipment.status}
                      </span>
                    </div>
                    <small className="text-muted">
                      {shipment.receivedDate ? new Date(shipment.receivedDate).toLocaleDateString() : 'No date'}
                    </small>
                  </div>
                  <div className="card-body">
                    <div className="row mb-2">
                      <div className="col-6">
                        <small className="text-muted">Lot Number</small>
                        <div>{shipment.lotNumber || '-'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">PO Number</small>
                        <div>{shipment.poNumber || '-'}</div>
                      </div>
                    </div>
                    <div className="row mb-2">
                      <div className="col-6">
                        <small className="text-muted">Quantity</small>
                        <div>{shipment.quantity || '-'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Supplier</small>
                        <div>{shipment.supplier || '-'}</div>
                      </div>
                    </div>

                    {/* Inspections for this shipment */}
                    {shipmentInspections.length > 0 && (
                      <div className="mt-3">
                        <small className="text-muted">Inspections ({shipmentInspections.length})</small>
                        <div className="list-group list-group-flush mt-1">
                          {shipmentInspections.slice(0, 3).map((insp) => (
                            <div key={insp.id} className="list-group-item px-0 py-1 d-flex justify-content-between">
                              <small>{insp.type || 'Inspection'}</small>
                              <span className={`badge bg-${getStatusBadge(insp.status)}`}>
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
                          onClick={() => handleUpdateStatus(shipment, 'in-progress')}
                        >
                          Start
                        </button>
                      )}
                      {shipment.status === 'in-progress' && (
                        <>
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleUpdateStatus(shipment, 'completed')}
                          >
                            Complete
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleUpdateStatus(shipment, 'failed')}
                          >
                            Fail
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