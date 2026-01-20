// src/features/gages/ToolManagement.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { gagesApi } from '../../services/api';

export default function ToolManagement() {
  const { gages, refreshData, user } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingGage, setEditingGage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    gageId: '',
    name: '',
    type: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    range: '',
    resolution: '',
    accuracy: '',
    location: '',
    calibrationDate: '',
    calibrationDueDate: '',
    calibrationInterval: '12',
    certificateNumber: '',
    status: 'active',
    notes: ''
  });

  const gageTypes = [
    'Caliper', 'Micrometer', 'Height Gage', 'Indicator', 
    'Pin Gage', 'Thread Gage', 'Ring Gage', 'CMM',
    'Surface Plate', 'Hardness Tester', 'Force Gage', 'Other'
  ];

  const resetForm = () => {
    setFormData({
      gageId: '',
      name: '',
      type: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      range: '',
      resolution: '',
      accuracy: '',
      location: '',
      calibrationDate: '',
      calibrationDueDate: '',
      calibrationInterval: '12',
      certificateNumber: '',
      status: 'active',
      notes: ''
    });
    setEditingGage(null);
    setError(null);
  };

  const handleOpenModal = (gage = null) => {
    if (gage) {
      setEditingGage(gage);
      setFormData({
        gageId: gage.gageId || '',
        name: gage.name || '',
        type: gage.type || '',
        manufacturer: gage.manufacturer || '',
        model: gage.model || '',
        serialNumber: gage.serialNumber || '',
        range: gage.range || '',
        resolution: gage.resolution || '',
        accuracy: gage.accuracy || '',
        location: gage.location || '',
        calibrationDate: gage.calibrationDate?.split('T')[0] || '',
        calibrationDueDate: gage.calibrationDueDate?.split('T')[0] || '',
        calibrationInterval: gage.calibrationInterval || '12',
        certificateNumber: gage.certificateNumber || '',
        status: gage.status || 'active',
        notes: gage.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCalibrationDateChange = (date) => {
    const interval = parseInt(formData.calibrationInterval, 10) || 12;
    const calDate = new Date(date);
    calDate.setMonth(calDate.getMonth() + interval);
    
    setFormData(prev => ({
      ...prev,
      calibrationDate: date,
      calibrationDueDate: calDate.toISOString().split('T')[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.gageId.trim() || !formData.name.trim()) {
      setError('Gage ID and Name are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const gageData = {
        ...formData,
        calibrationInterval: parseInt(formData.calibrationInterval, 10),
        updatedBy: user?.id
      };

      if (editingGage) {
        await gagesApi.update(editingGage.id, gageData);
      } else {
        gageData.createdBy = user?.id;
        await gagesApi.create(gageData);
      }

      await refreshData();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save gage');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gage) => {
    if (!window.confirm(`Delete gage "${gage.gageId}"?`)) return;

    try {
      setLoading(true);
      await gagesApi.delete(gage.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete gage');
    } finally {
      setLoading(false);
    }
  };

  // Calculate calibration status
  const getCalibrationStatus = (gage) => {
    if (!gage.calibrationDueDate) return { status: 'unknown', badge: 'secondary', label: 'Unknown' };
    
    const today = new Date();
    const dueDate = new Date(gage.calibrationDueDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return { status: 'overdue', badge: 'danger', label: 'Overdue' };
    if (daysUntilDue <= 30) return { status: 'due-soon', badge: 'warning', label: 'Due Soon' };
    return { status: 'current', badge: 'success', label: 'Current' };
  };

  // Filter gages
  const filteredGages = gages?.filter(g => {
    if (statusFilter !== 'all') {
      const calStatus = getCalibrationStatus(g);
      if (statusFilter === 'overdue' && calStatus.status !== 'overdue') return false;
      if (statusFilter === 'due-soon' && calStatus.status !== 'due-soon') return false;
      if (statusFilter === 'current' && calStatus.status !== 'current') return false;
      if (statusFilter === 'inactive' && g.status !== 'inactive') return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        g.gageId?.toLowerCase().includes(search) ||
        g.name?.toLowerCase().includes(search) ||
        g.serialNumber?.toLowerCase().includes(search) ||
        g.type?.toLowerCase().includes(search)
      );
    }
    return true;
  }) || [];

  // Summary counts
  const overdueCount = gages?.filter(g => getCalibrationStatus(g).status === 'overdue').length || 0;
  const dueSoonCount = gages?.filter(g => getCalibrationStatus(g).status === 'due-soon').length || 0;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Measuring Equipment Management</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add Gage
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h4>{gages?.length || 0}</h4>
              <small>Total Gages</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('overdue')}>
            <div className="card-body text-center">
              <h4>{overdueCount}</h4>
              <small>Overdue</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('due-soon')}>
            <div className="card-body text-center">
              <h4>{dueSoonCount}</h4>
              <small>Due within 30 days</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('current')}>
            <div className="card-body text-center">
              <h4>{(gages?.length || 0) - overdueCount - dueSoonCount}</h4>
              <small>Current</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search by ID, name, serial number, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="overdue">Overdue</option>
                <option value="due-soon">Due Soon (30 days)</option>
                <option value="current">Current</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted">{filteredGages.length} gages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gages Table */}
      {filteredGages.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No gages found.</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Add First Gage
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Gage ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Serial #</th>
                  <th>Location</th>
                  <th>Cal Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGages.map((gage) => {
                  const calStatus = getCalibrationStatus(gage);
                  return (
                    <tr key={gage.id} className={gage.status === 'inactive' ? 'table-secondary' : ''}>
                      <td><strong>{gage.gageId}</strong></td>
                      <td>{gage.name}</td>
                      <td>{gage.type || '-'}</td>
                      <td>{gage.serialNumber || '-'}</td>
                      <td>{gage.location || '-'}</td>
                      <td>
                        {gage.calibrationDate 
                          ? new Date(gage.calibrationDate).toLocaleDateString() 
                          : '-'}
                      </td>
                      <td>
                        {gage.calibrationDueDate 
                          ? new Date(gage.calibrationDueDate).toLocaleDateString() 
                          : '-'}
                      </td>
                      <td>
                        <span className={`badge bg-${calStatus.badge}`}>
                          {calStatus.label}
                        </span>
                        {gage.status === 'inactive' && (
                          <span className="badge bg-secondary ms-1">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleOpenModal(gage)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(gage)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingGage ? 'Edit Gage' : 'Add New Gage'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Gage ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.gageId}
                        onChange={(e) => setFormData({ ...formData, gageId: e.target.value })}
                        required
                        placeholder="e.g., CAL-001"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g., Digital Caliper"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Type</label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="">Select Type...</option>
                        {gageTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Manufacturer</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Model</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Range</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.range}
                        onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                        placeholder="e.g., 0-150mm"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Resolution</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.resolution}
                        onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                        placeholder="e.g., 0.01mm"
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Accuracy</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.accuracy}
                        onChange={(e) => setFormData({ ...formData, accuracy: e.target.value })}
                        placeholder="e.g., ±0.02mm"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Location</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., QC Lab, Production Floor"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="repair">Out for Repair</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>

                  <hr />
                  <h6>Calibration Information</h6>

                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Calibration Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.calibrationDate}
                        onChange={(e) => handleCalibrationDateChange(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Interval (months)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.calibrationInterval}
                        onChange={(e) => setFormData({ ...formData, calibrationInterval: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Due Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.calibrationDueDate}
                        onChange={(e) => setFormData({ ...formData, calibrationDueDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Certificate #</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.certificateNumber}
                        onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingGage ? 'Update' : 'Create')}
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
