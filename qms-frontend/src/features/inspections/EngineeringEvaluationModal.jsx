// src/features/inspections/EngineeringEvaluationModal.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { inspectionsApi, filesApi } from '../../services/api';

export default function EngineeringEvaluationModal({ shipment, onClose, onSuccess }) {
  const { partTypes, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    evaluationType: 'dimensional',
    findings: '',
    rootCause: '',
    recommendation: 'accept',
    correctiveAction: '',
    preventiveAction: '',
    images: [],
    attachments: []
  });

  const partType = partTypes?.find(p => p.id === shipment?.partTypeId);

  const evaluationTypes = [
    { value: 'dimensional', label: 'Dimensional Analysis' },
    { value: 'material', label: 'Material Analysis' },
    { value: 'functional', label: 'Functional Test' },
    { value: 'visual', label: 'Visual Inspection' },
    { value: 'destructive', label: 'Destructive Test' },
    { value: 'other', label: 'Other' }
  ];

  const recommendations = [
    { value: 'accept', label: 'Accept - Use as is' },
    { value: 'accept-deviation', label: 'Accept with Deviation' },
    { value: 'rework', label: 'Rework Required' },
    { value: 'return', label: 'Return to Supplier' },
    { value: 'scrap', label: 'Scrap' },
    { value: 'further-evaluation', label: 'Further Evaluation Needed' }
  ];

  const handleImageUpload = async (e) => {
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

        const result = await filesApi.upload(file, 'evaluations');
        uploaded.push({
          url: result.url,
          fileName: file.name,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        });
      }

      // Separate images from other attachments
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.findings.trim()) {
      setError('Findings are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const evaluationData = {
        shipmentId: shipment.id,
        partTypeId: shipment.partTypeId,
        type: 'engineering-evaluation',
        evaluationType: formData.evaluationType,
        findings: formData.findings,
        rootCause: formData.rootCause,
        recommendation: formData.recommendation,
        correctiveAction: formData.correctiveAction,
        preventiveAction: formData.preventiveAction,
        images: formData.images,
        attachments: formData.attachments,
        status: 'completed',
        engineerId: user?.id,
        engineerName: user?.displayName || user?.email,
        completedAt: new Date().toISOString()
      };

      await inspectionsApi.create(evaluationData);
      onSuccess();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-info text-white">
            <h5 className="modal-title">
              Engineering Evaluation - {partType?.partNumber || 'Unknown Part'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              {/* Shipment Reference */}
              <div className="card mb-3">
                <div className="card-body bg-light">
                  <div className="row">
                    <div className="col-md-3">
                      <small className="text-muted">Lot Number</small>
                      <div><strong>{shipment.lotNumber}</strong></div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">PO Number</small>
                      <div>{shipment.poNumber || '-'}</div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Supplier</small>
                      <div>{shipment.supplier || '-'}</div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Quantity</small>
                      <div>{shipment.quantity || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evaluation Type */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Evaluation Type *</label>
                  <select
                    className="form-select"
                    value={formData.evaluationType}
                    onChange={(e) => setFormData({ ...formData, evaluationType: e.target.value })}
                    required
                  >
                    {evaluationTypes.map(et => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Recommendation *</label>
                  <select
                    className="form-select"
                    value={formData.recommendation}
                    onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                    required
                  >
                    {recommendations.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Findings */}
              <div className="mb-3">
                <label className="form-label">Findings *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  placeholder="Describe the evaluation findings in detail..."
                  required
                />
              </div>

              {/* Root Cause */}
              <div className="mb-3">
                <label className="form-label">Root Cause Analysis</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.rootCause}
                  onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
                  placeholder="What is the suspected root cause of any issues found?"
                />
              </div>

              {/* Corrective & Preventive Actions */}
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Corrective Action</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.correctiveAction}
                    onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
                    placeholder="Immediate actions to correct the issue..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preventive Action</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.preventiveAction}
                    onChange={(e) => setFormData({ ...formData, preventiveAction: e.target.value })}
                    placeholder="Actions to prevent recurrence..."
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span>Photos & Attachments</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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
                <div className="card-body">
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
                    <div>
                      <small className="text-muted">Documents</small>
                      <ul className="list-group mt-1">
                        {formData.attachments.map((att, index) => (
                          <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              {att.fileName}
                            </a>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveAttachment(index)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {formData.images.length === 0 && formData.attachments.length === 0 && (
                    <p className="text-muted mb-0">No files attached.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-info" disabled={loading}>
                {loading ? 'Saving...' : 'Save Evaluation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
