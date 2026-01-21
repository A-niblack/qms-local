// src/features/warranty/WarrantyModal.jsx
// SNAKE_CASE NORMALIZED

import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { warrantyApi, filesApi } from '../../services/api';

// Helper to get part number from either snake_case or camelCase
const getPartNumber = (pt) => pt.part_number || pt.partNumber || '';

export default function WarrantyModal({ claim, onClose, onSuccess }) {
  const { partTypes, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Form state uses snake_case to match backend
  const [formData, setFormData] = useState({
    claim_number: claim?.claim_number || '',
    part_type_id: claim?.part_type_id || '',
    customer_name: claim?.customer_name || '',
    customer_contact: claim?.customer_contact || '',
    customer_email: claim?.customer_email || '',
    customer_phone: claim?.customer_phone || '',
    serial_numbers: claim?.serial_numbers || '',
    purchase_date: claim?.purchase_date?.split('T')[0] || '',
    failure_date: claim?.failure_date?.split('T')[0] || '',
    failure_description: claim?.failure_description || '',
    failure_mode: claim?.failure_mode || '',
    root_cause: claim?.root_cause || '',
    corrective_action: claim?.corrective_action || '',
    resolution: claim?.resolution || '',
    cost: claim?.cost || claim?.credit_amount || '',
    priority: claim?.priority || 'medium',
    status: claim?.status || 'open',
    images: claim?.images || claim?.photos || [],
    attachments: claim?.attachments || [],
    notes: claim?.notes || ''
  });

  const statuses = [
    { value: 'open', label: 'Open' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'pending_parts', label: 'Pending Parts' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const failureModes = [
    'Dimensional Defect',
    'Material Defect',
    'Functional Failure',
    'Cosmetic Defect',
    'Assembly Error',
    'Shipping Damage',
    'Wear/Fatigue',
    'Corrosion',
    'Electrical Failure',
    'Other'
  ];

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploaded = [];

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 10MB)`);
        }

        const result = await filesApi.upload(file, 'warranty');
        uploaded.push({
          url: result.url,
          file_name: file.name,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        });
      }

      const images = uploaded.filter(f => f.file_type.startsWith('image/'));
      const attachments = uploaded.filter(f => !f.file_type.startsWith('image/'));

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...images],
        attachments: [...prev.attachments, ...attachments]
      }));
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const generateClaimNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `WC-${year}${month}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.failure_description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build snake_case payload for backend
      const claimData = {
        part_type_id: formData.part_type_id || null,
        claim_number: formData.claim_number || generateClaimNumber(),
        customer_name: formData.customer_name,
        customer_contact: formData.customer_contact,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        serial_numbers: formData.serial_numbers,
        failure_date: formData.failure_date || null,
        failure_description: formData.failure_description,
        failure_mode: formData.failure_mode,
        status: formData.status,
        notes: formData.notes
      };

      if (claim) {
        // For updates, include resolution fields
        claimData.resolution = formData.resolution;
        claimData.credit_amount = formData.cost ? parseFloat(formData.cost) : null;
        await warrantyApi.update(claim.id, claimData);
      } else {
        await warrantyApi.create(claimData);
      }

      onSuccess();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save warranty claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              {claim ? `Edit Claim: ${claim.claim_number || 'Draft'}` : 'New Warranty Claim'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              {/* Claim Info */}
              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">Claim Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.claim_number}
                    onChange={(e) => setFormData({ ...formData, claim_number: e.target.value })}
                    placeholder="Auto-generated"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Part Type</label>
                  <select
                    className="form-select"
                    value={formData.part_type_id}
                    onChange={(e) => setFormData({ ...formData, part_type_id: e.target.value })}
                  >
                    <option value="">Select Part Type...</option>
                    {partTypes?.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {getPartNumber(pt)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {priorities.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <hr />

              {/* Customer Info */}
              <h6>Customer Information</h6>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.customer_contact}
                    onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Serial Number(s)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.serial_numbers}
                    onChange={(e) => setFormData({ ...formData, serial_numbers: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Estimated Cost</label>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Purchase Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Failure Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.failure_date}
                    onChange={(e) => setFormData({ ...formData, failure_date: e.target.value })}
                  />
                </div>
              </div>

              <hr />

              {/* Issue Details */}
              <h6>Issue Details</h6>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Failure Mode</label>
                  <select
                    className="form-select"
                    value={formData.failure_mode}
                    onChange={(e) => setFormData({ ...formData, failure_mode: e.target.value })}
                  >
                    <option value="">Select Failure Mode...</option>
                    {failureModes.map(fm => (
                      <option key={fm} value={fm}>{fm}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.failure_description}
                  onChange={(e) => setFormData({ ...formData, failure_description: e.target.value })}
                  required
                  placeholder="Describe the issue in detail..."
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Root Cause</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.root_cause}
                    onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                    placeholder="Identified root cause..."
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Corrective Action</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.corrective_action}
                    onChange={(e) => setFormData({ ...formData, corrective_action: e.target.value })}
                    placeholder="Actions taken or planned..."
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Resolution</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.resolution}
                  onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                  placeholder="Final resolution details..."
                />
              </div>

              <hr />

              {/* Photos & Attachments */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Photos & Attachments</h6>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    className="d-none"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? 'Uploading...' : '+ Add Files'}
                  </button>
                </div>
              </div>

              {/* Images */}
              {formData.images.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted">Photos</small>
                  <div className="row g-2 mt-1">
                    {formData.images.map((img, index) => (
                      <div key={index} className="col-md-2">
                        <div className="position-relative">
                          <img
                            src={img.url}
                            alt={img.file_name || img.fileName}
                            className="img-thumbnail"
                            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-danger position-absolute top-0 end-0"
                            onClick={() => handleRemoveImage(index)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {formData.attachments.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted">Documents</small>
                  <ul className="list-group mt-1">
                    {formData.attachments.map((att, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-1">
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          {att.file_name || att.fileName}
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveAttachment(index)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.images.length === 0 && formData.attachments.length === 0 && (
                <p className="text-muted small">No files attached.</p>
              )}

              {/* Notes */}
              <div className="mt-3">
                <label className="form-label">Internal Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Internal notes (not visible to customer)..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (claim ? 'Update Claim' : 'Create Claim')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
