// src/features/warranty/WarrantyModal.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { warrantyApi, filesApi } from '../../services/api';

export default function WarrantyModal({ claim, onClose, onSuccess }) {
  const { partTypes, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    claimNumber: claim?.claimNumber || '',
    partTypeId: claim?.partTypeId || '',
    customerName: claim?.customerName || '',
    customerContact: claim?.customerContact || '',
    customerEmail: claim?.customerEmail || '',
    customerPhone: claim?.customerPhone || '',
    serialNumber: claim?.serialNumber || '',
    purchaseDate: claim?.purchaseDate?.split('T')[0] || '',
    failureDate: claim?.failureDate?.split('T')[0] || '',
    description: claim?.description || '',
    failureMode: claim?.failureMode || '',
    rootCause: claim?.rootCause || '',
    correctiveAction: claim?.correctiveAction || '',
    resolution: claim?.resolution || '',
    cost: claim?.cost || '',
    priority: claim?.priority || 'medium',
    status: claim?.status || 'open',
    images: claim?.images || [],
    attachments: claim?.attachments || [],
    notes: claim?.notes || ''
  });

  const statuses = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'pending-parts', label: 'Pending Parts' },
    { value: 'pending-approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
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
          fileName: file.name,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        });
      }

      const images = uploaded.filter(f => f.fileType.startsWith('image/'));
      const attachments = uploaded.filter(f => !f.fileType.startsWith('image/'));

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

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const claimData = {
        ...formData,
        claimNumber: formData.claimNumber || generateClaimNumber(),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        updatedBy: user?.id,
        updatedByName: user?.displayName || user?.email
      };

      if (claim) {
        await warrantyApi.update(claim.id, claimData);
      } else {
        claimData.createdBy = user?.id;
        claimData.createdByName = user?.displayName || user?.email;
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
              {claim ? `Edit Claim: ${claim.claimNumber || 'Draft'}` : 'New Warranty Claim'}
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
                    value={formData.claimNumber}
                    onChange={(e) => setFormData({ ...formData, claimNumber: e.target.value })}
                    placeholder="Auto-generated"
                  />
                </div>
                <div className="col-md-3 mb-3">
                  <label className="form-label">Part Type</label>
                  <select
                    className="form-select"
                    value={formData.partTypeId}
                    onChange={(e) => setFormData({ ...formData, partTypeId: e.target.value })}
                  >
                    <option value="">Select Part Type...</option>
                    {partTypes?.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.partNumber}
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
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.customerContact}
                    onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Serial Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
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
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Failure Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.failureDate}
                    onChange={(e) => setFormData({ ...formData, failureDate: e.target.value })}
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
                    value={formData.failureMode}
                    onChange={(e) => setFormData({ ...formData, failureMode: e.target.value })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    value={formData.rootCause}
                    onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                    placeholder="Identified root cause..."
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Corrective Action</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formData.correctiveAction}
                    onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
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
                            alt={img.fileName}
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
                          {att.fileName}
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
