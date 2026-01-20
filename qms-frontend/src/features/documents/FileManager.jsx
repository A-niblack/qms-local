// src/features/documents/FileManager.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../context/AppContext';
import { drawingsApi, filesApi } from '../../services/api';

export default function FileManager() {
  const { drawings, refreshData, user } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const fileInputRef = useRef(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'drawing',
    description: '',
    version: '1.0',
    file: null
  });

  const categories = [
    { value: 'drawing', label: 'Drawings' },
    { value: 'specification', label: 'Specifications' },
    { value: 'procedure', label: 'Procedures' },
    { value: 'report', label: 'Reports' },
    { value: 'certificate', label: 'Certificates' },
    { value: 'other', label: 'Other' }
  ];

  // Filter drawings
  const filteredDrawings = drawings?.filter(d => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        d.name?.toLowerCase().includes(search) ||
        d.fileName?.toLowerCase().includes(search) ||
        d.description?.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, '') // Use filename without extension as default name
      }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!uploadForm.file) {
      setError('Please select a file');
      return;
    }

    if (!uploadForm.name.trim()) {
      setError('Document name is required');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Upload file first
      const uploadResult = await filesApi.upload(uploadForm.file, 'documents');

      // Create drawing/document record
      await drawingsApi.create({
        name: uploadForm.name,
        fileName: uploadForm.file.name,
        fileUrl: uploadResult.url,
        fileType: uploadForm.file.type,
        fileSize: uploadForm.file.size,
        category: uploadForm.category,
        description: uploadForm.description,
        version: uploadForm.version,
        uploadedBy: user?.id,
        uploadedByName: user?.displayName || user?.email
      });

      await refreshData();
      setShowUploadModal(false);
      setUploadForm({
        name: '',
        category: 'drawing',
        description: '',
        version: '1.0',
        file: null
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await drawingsApi.delete(doc.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('image')) return '🖼️';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    return '📁';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Document Manager</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowUploadModal(true)}
        >
          + Upload Document
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
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted">{filteredDrawings.length} documents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredDrawings.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No documents found.</p>
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              Upload First Document
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrawings.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <span className="me-2">{getFileIcon(doc.fileType)}</span>
                      <strong>{doc.name}</strong>
                      {doc.description && (
                        <small className="text-muted d-block">{doc.description}</small>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-secondary">
                        {categories.find(c => c.value === doc.category)?.label || doc.category}
                      </span>
                    </td>
                    <td>{doc.version || '-'}</td>
                    <td>{formatFileSize(doc.fileSize)}</td>
                    <td>
                      <small>
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                        <br />
                        <span className="text-muted">{doc.uploadedByName || '-'}</span>
                      </small>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-primary"
                          >
                            View
                          </a>
                        )}
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => handleDelete(doc)}
                          disabled={loading}
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
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Document</h5>
                <button type="button" className="btn-close" onClick={() => setShowUploadModal(false)}></button>
              </div>
              <form onSubmit={handleUpload}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label">File *</label>
                    <input
                      type="file"
                      className="form-control"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.dwg,.dxf"
                    />
                    {uploadForm.file && (
                      <small className="text-success">
                        Selected: {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                      </small>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Document Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={uploadForm.category}
                        onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                      >
                        {categories.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Version</label>
                      <input
                        type="text"
                        className="form-control"
                        value={uploadForm.version}
                        onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                        placeholder="e.g., 1.0, Rev A"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Optional description..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
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
