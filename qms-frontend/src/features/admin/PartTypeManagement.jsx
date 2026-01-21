// src/features/admin/PartTypeManagement.jsx
// MIGRATED FROM FIREBASE TO REST API
// UPDATED: snake_case payload alignment with backend

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

  // Form state uses snake_case to match backend
  const [formData, setFormData] = useState({
    part_number: '',
    name: '',
    description: '',
    supplier: '',
    category: '',
    drawing_number: '',
    revision: '',
    is_active: true,
    drawing_url: '',
    drawing_file_name: ''
  });

  const resetForm = () => {
    setFormData({
      part_number: '',
      name: '',
      description: '',
      supplier: '',
      category: '',
      drawing_number: '',
      revision: '',
      is_active: true,
      drawing_url: '',
      drawing_file_name: ''
    });
    setEditingPartType(null);
    setError(null);
  };

  const handleOpenModal = (partType = null) => {
    if (partType) {
      setEditingPartType(partType);
      // Map from backend snake_case response to form state
      setFormData({
        part_number: partType.part_number || partType.partNumber || '',
        name: partType.name || '',
        description: partType.description || '',
        supplier: partType.supplier || '',
        category: partType.category || '',
        drawing_number: partType.drawing_number || partType.drawingNumber || '',
        revision: partType.revision || '',
        is_active: partType.is_active !== undefined ? partType.is_active : (partType.isActive !== false),
        drawing_url: partType.drawing_url || partType.drawingUrl || '',
        drawing_file_name: partType.drawing_file_name || partType.drawingFileName || ''
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
        drawing_url: result.url,
        drawing_file_name: file.name
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
    
    if (!formData.part_number.trim()) {
      setError('Part number is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build snake_case payload for backend
      const dataToSave = {
        part_number: formData.part_number,
        name: formData.name || formData.part_number, // fallback to part_number if name empty
        description: formData.description,
        supplier: formData.supplier,
        category: formData.category,
        drawing_number: formData.drawing_number,
        revision: formData.revision,
        is_active: formData.is_active,
        drawing_url: formData.drawing_url,
        drawing_file_name: formData.drawing_file_name,
        updated_by: user?.id
      };

      if (editingPartType) {
        await partTypesApi.update(editingPartType.id, dataToSave);
      } else {
        dataToSave.created_by = user?.id;
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
    const partNum = partType.part_number || partType.partNumber;
    if (!window.confirm(`Delete part type "${partNum}"? This cannot be undone.`)) {
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
      const currentActive = partType.is_active !== undefined ? partType.is_active : partType.isActive;
      await partTypesApi.update(partType.id, {
        part_number: partType.part_number || partType.partNumber,
        name: partType.name,
        description: partType.description,
        category: partType.category,
        is_active: !currentActive
      });
      await refreshData();
    } catch (err) {
      console.error('Toggle error:', err);
      setError(err.message || 'Failed to update part type');
    }
  };

  // Helper to get display values (handles both snake_case and camelCase from backend)
  const getPartNumber = (pt) => pt.part_number || pt.partNumber || '';
  const getIsActive = (pt) => pt.is_active !== undefined ? pt.is_active : (pt.isActive !== false);
  const getDrawingUrl = (pt) => pt.drawing_url || pt.drawingUrl || '';

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
                    <tr key={pt.id} className={!getIsActive(pt) ? 'table-secondary' : ''}>
                      <td>
                        <strong>{getPartNumber(pt)}</strong>
                        {pt.revision && <small className="text-muted"> Rev {pt.revision}</small>}
                      </td>
                      <td>{pt.description || '-'}</td>
                      <td>{pt.supplier || '-'}</td>
                      <td>{pt.category || '-'}</td>
                      <td>
                        {getDrawingUrl(pt) ? (
                          <a
                            href={getDrawingUrl(pt)}
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
                          className={`badge bg-${getIsActive(pt) ? 'success' : 'secondary'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleActive(pt)}
                        >
                          {getIsActive(pt) ? 'Active' : 'Inactive'}
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
                        value={formData.part_number}
                        onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Defaults to part number if empty"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Revision</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.revision}
                        onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
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
                      <label className="form-label">Drawing Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.drawing_number}
                        onChange={(e) => setFormData({ ...formData, drawing_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
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
                    {formData.drawing_file_name && (
                      <small className="text-success d-block">
                        Uploaded: {formData.drawing_file_name}
                      </small>
                    )}
                  </div>

                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isActive"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
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
