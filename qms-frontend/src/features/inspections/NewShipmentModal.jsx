// src/features/inspections/NewShipmentModal.jsx
// SNAKE_CASE NORMALIZED

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { shipmentsApi } from '../../services/api';

// Helper to get values from either snake_case or camelCase
const getPartNumber = (pt) => pt.part_number || pt.partNumber || '';
const getIsActive = (pt) => pt.is_active !== undefined ? pt.is_active : (pt.isActive !== false);

export default function NewShipmentModal({ onClose, onSuccess }) {
  const { partTypes, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    part_type_id: '',
    shipment_number: '',
    po_number: '',
    quantity: '',
    supplier: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Filter only active part types (handle both snake_case and camelCase)
  const activePartTypes = partTypes?.filter(pt => getIsActive(pt)) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.part_type_id) {
      setError('Please select a part type');
      return;
    }

    if (!formData.shipment_number.trim()) {
      setError('Lot number is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const shipmentData = {
        part_type_id: formData.part_type_id,
        shipment_number: formData.shipment_number,
        po_number: formData.po_number,
        quantity: formData.quantity ? parseInt(formData.quantity, 10) : null,
        supplier: formData.supplier,
        received_date: formData.received_date || null,
        notes: formData.notes,
        status: 'pending'
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
  const handlePartTypeChange = (part_type_id) => {
    const selectedPart = partTypes?.find(p => p.id === part_type_id);
    setFormData(prev => ({
      ...prev,
      part_type_id,
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
                  value={formData.part_type_id}
                  onChange={(e) => handlePartTypeChange(e.target.value)}
                  required
                >
                  <option value="">Select Part Type...</option>
                  {activePartTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {getPartNumber(pt)} - {pt.description || 'No description'}
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
                    value={formData.shipment_number}
                    onChange={(e) => handleChange('shipment_number', e.target.value)}
                    placeholder="e.g., LOT-2026-001"
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">PO Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.po_number}
                    onChange={(e) => handleChange('po_number', e.target.value)}
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
                    value={formData.received_date}
                    onChange={(e) => handleChange('received_date', e.target.value)}
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
