// src/features/inspections/CfqInspectionModal.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { inspectionsApi, filesApi } from '../../services/api';

export default function CfqInspectionModal({ shipment, onClose, onSuccess }) {
  const { partTypes, inspectionPlans, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    type: 'cfq',
    sampleSize: '',
    characteristics: [],
    overallResult: 'pending',
    notes: '',
    images: []
  });

  // Get part type and inspection plan
  const partType = partTypes?.find(p => p.id === shipment?.partTypeId);
  const plan = inspectionPlans?.find(p => p.partTypeId === shipment?.partTypeId);

  // Initialize characteristics from plan or part type
  useEffect(() => {
    if (plan?.characteristics?.length > 0) {
      setFormData(prev => ({
        ...prev,
        characteristics: plan.characteristics.map(c => ({
          ...c,
          actualValue: '',
          result: 'pending'
        }))
      }));
    } else if (partType?.characteristics?.length > 0) {
      setFormData(prev => ({
        ...prev,
        characteristics: partType.characteristics.map(c => ({
          ...c,
          actualValue: '',
          result: 'pending'
        }))
      }));
    }
  }, [plan, partType]);

  const handleCharacteristicChange = (index, field, value) => {
    setFormData(prev => {
      const newChars = [...prev.characteristics];
      newChars[index] = { ...newChars[index], [field]: value };

      // Auto-calculate result for measurement types
      if (field === 'actualValue' && newChars[index].type === 'measurement') {
        const actual = parseFloat(value);
        const nominal = parseFloat(newChars[index].nominal);
        const upper = parseFloat(newChars[index].upperTolerance);
        const lower = parseFloat(newChars[index].lowerTolerance);

        if (!isNaN(actual) && !isNaN(nominal)) {
          const upperLimit = nominal + (upper || 0);
          const lowerLimit = nominal - Math.abs(lower || 0);
          
          if (actual >= lowerLimit && actual <= upperLimit) {
            newChars[index].result = 'pass';
          } else {
            newChars[index].result = 'fail';
          }
        }
      }

      return { ...prev, characteristics: newChars };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadedImages = [];
      
      for (const file of files) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} is not an image`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 5MB)`);
        }

        const result = await filesApi.upload(file, 'inspections');
        uploadedImages.push({
          url: result.url,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        });
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
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

  const calculateOverallResult = () => {
    if (formData.characteristics.length === 0) return 'pending';
    
    const hasFailure = formData.characteristics.some(c => c.result === 'fail');
    const allComplete = formData.characteristics.every(c => c.result !== 'pending');
    
    if (hasFailure) return 'fail';
    if (allComplete) return 'pass';
    return 'pending';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const overallResult = calculateOverallResult();

      const inspectionData = {
        shipmentId: shipment.id,
        partTypeId: shipment.partTypeId,
        type: 'cfq',
        sampleSize: formData.sampleSize ? parseInt(formData.sampleSize, 10) : null,
        characteristics: formData.characteristics,
        results: {
          overall: overallResult,
          passCount: formData.characteristics.filter(c => c.result === 'pass').length,
          failCount: formData.characteristics.filter(c => c.result === 'fail').length,
          pendingCount: formData.characteristics.filter(c => c.result === 'pending').length
        },
        images: formData.images,
        notes: formData.notes,
        status: overallResult === 'pending' ? 'in-progress' : 'completed',
        inspectorId: user?.id,
        inspectorName: user?.displayName || user?.email,
        completedAt: overallResult !== 'pending' ? new Date().toISOString() : null
      };

      await inspectionsApi.create(inspectionData);
      onSuccess();
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save inspection');
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result) => {
    const colors = { pass: 'success', fail: 'danger', pending: 'warning' };
    return colors[result] || 'secondary';
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              CFQ Inspection - {partType?.partNumber || 'Unknown Part'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              {/* Shipment Info */}
              <div className="card mb-3">
                <div className="card-body">
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
                      <small className="text-muted">Quantity</small>
                      <div>{shipment.quantity || '-'}</div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Sample Size</small>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={formData.sampleSize}
                        onChange={(e) => setFormData({ ...formData, sampleSize: e.target.value })}
                        min="1"
                        placeholder="# inspected"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Characteristics Table */}
              <div className="card mb-3">
                <div className="card-header">Inspection Characteristics</div>
                <div className="card-body">
                  {formData.characteristics.length === 0 ? (
                    <div className="alert alert-info mb-0">
                      No characteristics defined for this part type. 
                      Add characteristics in Part Type Management.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Characteristic</th>
                            <th>Type</th>
                            <th>Nominal</th>
                            <th>Tolerance</th>
                            <th>Actual Value</th>
                            <th>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.characteristics.map((char, index) => (
                            <tr key={char.id || index}>
                              <td>{char.name}</td>
                              <td>
                                <span className="badge bg-secondary">{char.type}</span>
                              </td>
                              <td>{char.nominal} {char.unit}</td>
                              <td>
                                {char.upperTolerance && `+${char.upperTolerance}`}
                                {char.lowerTolerance && ` / -${Math.abs(char.lowerTolerance)}`}
                              </td>
                              <td>
                                {char.type === 'measurement' ? (
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={char.actualValue}
                                    onChange={(e) => handleCharacteristicChange(index, 'actualValue', e.target.value)}
                                    step="0.001"
                                    style={{ width: '100px' }}
                                  />
                                ) : (
                                  <select
                                    className="form-select form-select-sm"
                                    value={char.result}
                                    onChange={(e) => handleCharacteristicChange(index, 'result', e.target.value)}
                                    style={{ width: '100px' }}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="pass">Pass</option>
                                    <option value="fail">Fail</option>
                                  </select>
                                )}
                              </td>
                              <td>
                                <span className={`badge bg-${getResultBadge(char.result)}`}>
                                  {char.result.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div className="card mb-3">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span>Photos</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="d-none"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? 'Uploading...' : '+ Add Photos'}
                  </button>
                </div>
                <div className="card-body">
                  {formData.images.length === 0 ? (
                    <p className="text-muted mb-0">No photos added.</p>
                  ) : (
                    <div className="row g-2">
                      {formData.images.map((img, index) => (
                        <div key={index} className="col-md-3">
                          <div className="position-relative">
                            <img
                              src={img.url}
                              alt={img.fileName}
                              className="img-thumbnail"
                              style={{ width: '100%', height: '150px', objectFit: 'cover' }}
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
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any observations, issues, or comments..."
                />
              </div>

              {/* Overall Result Preview */}
              <div className="alert alert-info">
                <strong>Overall Result: </strong>
                <span className={`badge bg-${getResultBadge(calculateOverallResult())}`}>
                  {calculateOverallResult().toUpperCase()}
                </span>
                <span className="ms-3">
                  Pass: {formData.characteristics.filter(c => c.result === 'pass').length} | 
                  Fail: {formData.characteristics.filter(c => c.result === 'fail').length} | 
                  Pending: {formData.characteristics.filter(c => c.result === 'pending').length}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Inspection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}