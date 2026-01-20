// src/features/admin/PartTypeManagement.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { partTypesApi, filesApi } from '../../services/api';
import AdminCharacteristics from './AdminCharacteristics';

export default function PartTypeManagement() {
  const { partTypes, refreshData, user, canAccessFeature } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingPartType, setEditingPartType] = useState(null);
  const [showCharacteristics, setShowCharacteristics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    partNumber: '',
    description: '',
    supplier: '',
    category: '',
    drawingNumber: '',
    revision: '',
    isActive: true,
    drawingUrl: '',
    drawingFileName: ''
  });

  const resetForm = () => {
    setFormData({
      partNumber: '',
      description: '',
      supplier: '',
      category: '',
      drawingNumber: '',
      revision: '',
      isActive: true,
      drawingUrl: '',
      drawingFileName: ''
    });
    setEditingPartType(null);
    setError(null);
  };

  const handleOpenModal = (partType = null) => {
    if (partType) {
      setEditingPartType(partType);
      setFormData({
        partNumber: partType.partNumber || '',
        description: partType.description || '',
        supplier: partType.supplier || '',
        category: partType.category || '',
        drawingNumber: partType.drawingNumber || '',
        revision: partType.revision || '',
        isActive: partType.isActive !== false,
        drawingUrl: partType.drawingUrl || '',
        drawingFileName: partType.drawingFileName || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and image files are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploadProgress('Uploading...');
      const result = await filesApi.upload(file, 'drawings');
      
      setFormData(prev => ({
        ...prev,
        drawingUrl: result.url,
        drawingFileName: file.name
      }));
      setUploadProgress(null);
      setError(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file');
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.partNumber.trim()) {
      setError('Part number is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dataToSave = {
        ...formData,
        updatedBy: user?.id
      };

      if (editingPartType) {
        await partTypesApi.update(editingPartType.id, dataToSave);
      } else {
        dataToSave.createdBy = user?.id;
        await partTypesApi.create(dataToSave);
      }

      await refreshData();
      handleCloseModal();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save part type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (partType) => {
    if (!window.confirm(`Delete part type "${partType.partNumber}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await partTypesApi.delete(partType.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete part type');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (partType) => {
    try {
      await partTypesApi.update(partType.id, {
        isActive: !partType.isActive
      });
      await refreshData();
    } catch (err) {
      console.error('Toggle error:', err);
      setError(err.message || 'Failed to update part type');
    }
  };

  // If showing characteristics for a part type
  if (showCharacteristics) {
    return (
      <div className="container-fluid py-4">
        <AdminCharacteristics
          partTypeId={showCharacteristics.id}
          onClose={() => setShowCharacteristics(null)}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Part Type Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => handleOpenModal()}
          disabled={loading}
        >
          + Add Part Type
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Part Types Table */}
      <div className="card">
        <div className="card-body">
          {partTypes?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">No part types defined yet.</p>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                Create First Part Type
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Supplier</th>
                    <th>Category</th>
                    <th>Drawing</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {partTypes?.map((pt) => (
                    <tr key={pt.id} className={pt.isActive === false ? 'table-secondary' : ''}>
                      <td>
                        <strong>{pt.partNumber}</strong>
                        {pt.revision && <small className="text-muted"> Rev {pt.revision}</small>}
                      </td>
                      <td>{pt.description || '-'}</td>
                      <td>{pt.supplier || '-'}</td>
                      <td>{pt.category || '-'}</td>
                      <td>
                        {pt.drawingUrl ? (
                          <a
                            href={pt.drawingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge bg-${pt.isActive !== false ? 'success' : 'secondary'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleActive(pt)}
                        >
                          {pt.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => setShowCharacteristics(pt)}
                            title="Manage Characteristics"
                          >
                            Chars
                          </button>
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleOpenModal(pt)}
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(pt)}
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingPartType ? 'Edit Part Type' : 'Add Part Type'}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger">{error}</div>
                  )}
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Part Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.partNumber}
                        onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Revision</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.revision}
                        onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Supplier</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Drawing Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.drawingNumber}
                        onChange={(e) => setFormData({ ...formData, drawingNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Drawing File</label>
                      <input
                        type="file"
                        className="form-control"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                      {uploadProgress && (
                        <small className="text-muted">{uploadProgress}</small>
                      )}
                      {formData.drawingFileName && (
                        <small className="text-success d-block">
                          Uploaded: {formData.drawingFileName}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="isActive">
                      Active
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingPartType ? 'Update' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
