// src/features/inspections/NewShipmentModal.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { shipmentsApi } from '../../services/api';

export default function NewShipmentModal({ onClose, onSuccess }) {
  const { partTypes, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    partTypeId: '',
    lotNumber: '',
    poNumber: '',
    quantity: '',
    supplier: '',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Filter only active part types
  const activePartTypes = partTypes?.filter(pt => pt.isActive !== false) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.partTypeId) {
      setError('Please select a part type');
      return;
    }

    if (!formData.lotNumber.trim()) {
      setError('Lot number is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const shipmentData = {
        ...formData,
        quantity: formData.quantity ? parseInt(formData.quantity, 10) : null,
        status: 'pending',
        createdBy: user?.id,
        createdAt: new Date().toISOString()
      };

      await shipmentsApi.create(shipmentData);
      onSuccess();
    } catch (err) {
      console.error('Create shipment error:', err);
      setError(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Auto-fill supplier when part type is selected
  const handlePartTypeChange = (partTypeId) => {
    const selectedPart = partTypes?.find(p => p.id === partTypeId);
    setFormData(prev => ({
      ...prev,
      partTypeId,
      supplier: selectedPart?.supplier || prev.supplier
    }));
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">New Shipment</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="mb-3">
                <label className="form-label">Part Type *</label>
                <select
                  className="form-select"
                  value={formData.partTypeId}
                  onChange={(e) => handlePartTypeChange(e.target.value)}
                  required
                >
                  <option value="">Select Part Type...</option>
                  {activePartTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.partNumber} - {pt.description || 'No description'}
                    </option>
                  ))}
                </select>
                {activePartTypes.length === 0 && (
                  <small className="text-warning">
                    No active part types available. Please create part types first.
                  </small>
                )}
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Lot Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.lotNumber}
                    onChange={(e) => handleChange('lotNumber', e.target.value)}
                    placeholder="e.g., LOT-2026-001"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">PO Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.poNumber}
                    onChange={(e) => handleChange('poNumber', e.target.value)}
                    placeholder="e.g., PO-12345"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    min="1"
                    placeholder="Number of units"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Received Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.receivedDate}
                    onChange={(e) => handleChange('receivedDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Supplier</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="Supplier name"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}