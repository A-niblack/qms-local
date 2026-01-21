// src/features/gages/ToolManagement.jsx
// SNAKE_CASE NORMALIZED (REST API)
// Calendar date picker via react-datepicker
// Calculates calibration_interval_days = Days(next_calibration_date - today)

import React, { useMemo, useState, useContext } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { AppContext } from '../../context/AppContext';
import { gagesApi } from '../../services/api';

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYYYYMMDD(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetweenTodayAnd(date) {
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const ms = end - start;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function ToolManagement() {
  const { gages, refreshData } = useContext(AppContext);

  const [showModal, setShowModal] = useState(false);
  const [editingGage, setEditingGage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Snake_case form state
  const [formData, setFormData] = useState({
    gage_id: '',
    name: '',
    type: '',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    // range handled in follow-up #3 (this file still includes placeholders)
    range_min: '',
    range_max: '',
    resolution: '',
    accuracy: '',
    location: '',
    calibration_date: '',          // YYYY-MM-DD
    next_calibration_date: '',     // YYYY-MM-DD
    calibration_interval_days: '', // computed days
    calibration_provider: '',
    certificate_number: '',
    status: 'active',
    notes: ''
  });

  const gageTypes = [
    'Caliper', 'Micrometer', 'Height Gage', 'Indicator',
    'Pin Gage', 'Thread Gage', 'Ring Gage', 'CMM',
    'Surface Plate', 'Hardness Tester', 'Force Gage', 'Other'
  ];

  const computedIntervalDays = useMemo(() => {
    const due = toDateOrNull(formData.next_calibration_date);
    const d = daysBetweenTodayAnd(due);
    return d;
  }, [formData.next_calibration_date]);

  const resetForm = () => {
    setFormData({
      gage_id: '',
      name: '',
      type: '',
      manufacturer: '',
      model_number: '',
      serial_number: '',
      range_min: '',
      range_max: '',
      resolution: '',
      accuracy: '',
      location: '',
      calibration_date: '',
      next_calibration_date: '',
      calibration_interval_days: '',
      calibration_provider: '',
      certificate_number: '',
      status: 'active',
      notes: ''
    });
    setEditingGage(null);
    setUploadError(null);
  };

  const handleOpenModal = (gage = null) => {
    if (gage) {
      setEditingGage(gage);
      setFormData({
        gage_id: gage.gage_id || '',
        name: gage.name || '',
        type: gage.type || '',
        manufacturer: gage.manufacturer || '',
        model_number: gage.model_number || '',
        serial_number: gage.serial_number || '',
        range_min: gage.range_min ?? '',
        range_max: gage.range_max ?? '',
        resolution: gage.resolution ?? '',
        accuracy: gage.accuracy ?? '',
        location: gage.location || '',
        calibration_date: gage.calibration_date ? formatYYYYMMDD(new Date(gage.calibration_date)) : '',
        next_calibration_date: gage.next_calibration_date ? formatYYYYMMDD(new Date(gage.next_calibration_date)) : '',
        calibration_interval_days: gage.calibration_interval_days ?? '',
        calibration_provider: gage.calibration_provider || '',
        certificate_number: gage.certificate_number || '',
        status: gage.status || 'active',
        notes: gage.notes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!String(formData.gage_id).trim() || !String(formData.name).trim()) {
      setUploadError('Gage ID and Name are required');
      return;
    }

    try {
      setLoading(true);
      setUploadError(null);

      const due = toDateOrNull(formData.next_calibration_date);
      const intervalDays = daysBetweenTodayAnd(due);

      const payload = {
        ...formData,
        // ensure numeric types where appropriate
        range_min: formData.range_min === '' ? null : Number(formData.range_min),
        range_max: formData.range_max === '' ? null : Number(formData.range_max),
        calibration_interval_days: intervalDays === null ? null : Math.max(0, intervalDays)
      };

      if (editingGage) {
        await gagesApi.update(editingGage.id, payload);
      } else {
        await gagesApi.create(payload);
      }

      await refreshData();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      setUploadError(err.message || 'Failed to save gage');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gage) => {
    if (!window.confirm(`Delete gage "${gage.gage_id}"?`)) return;

    try {
      setLoading(true);
      await gagesApi.delete(gage.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setUploadError(err.message || 'Failed to delete gage');
    } finally {
      setLoading(false);
    }
  };

  const getCalibrationStatus = (gage) => {
    if (!gage.next_calibration_date) return { status: 'unknown', badge: 'secondary', label: 'Unknown' };

    const today = new Date();
    const dueDate = new Date(gage.next_calibration_date);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const daysUntilDue = Math.round((end - start) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return { status: 'overdue', badge: 'danger', label: 'Overdue' };
    if (daysUntilDue <= 30) return { status: 'due-soon', badge: 'warning', label: 'Due Soon' };
    return { status: 'current', badge: 'success', label: 'Current' };
  };

  const filteredGages = (gages || []).filter(g => {
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
        String(g.gage_id || '').toLowerCase().includes(search) ||
        String(g.name || '').toLowerCase().includes(search) ||
        String(g.serial_number || '').toLowerCase().includes(search) ||
        String(g.type || '').toLowerCase().includes(search)
      );
    }
    return true;
  });

  const overdueCount = (gages || []).filter(g => getCalibrationStatus(g).status === 'overdue').length;
  const dueSoonCount = (gages || []).filter(g => getCalibrationStatus(g).status === 'due-soon').length;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Measuring Equipment Management</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add Gage
        </button>
      </div>

      {uploadError && (
        <div className="alert alert-danger alert-dismissible fade show">
          {uploadError}
          <button type="button" className="btn-close" onClick={() => setUploadError(null)}></button>
        </div>
      )}

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
                      <td><strong>{gage.gage_id}</strong></td>
                      <td>{gage.name}</td>
                      <td>{gage.type || '-'}</td>
                      <td>{gage.serial_number || '-'}</td>
                      <td>{gage.location || '-'}</td>
                      <td>{gage.calibration_date ? new Date(gage.calibration_date).toLocaleDateString() : '-'}</td>
                      <td>{gage.next_calibration_date ? new Date(gage.next_calibration_date).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className={`badge bg-${calStatus.badge}`}>{calStatus.label}</span>
                        {gage.status === 'inactive' && (
                          <span className="badge bg-secondary ms-1">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-primary" onClick={() => handleOpenModal(gage)}>
                            Edit
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => handleDelete(gage)} disabled={loading}>
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

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingGage ? 'Edit Gage' : 'Add New Gage'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {uploadError && <div className="alert alert-danger">{uploadError}</div>}

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Gage ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.gage_id}
                        onChange={(e) => setFormData({ ...formData, gage_id: e.target.value })}
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
                        {gageTypes.map(t => <option key={t} value={t}>{t}</option>)}
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
                        value={formData.model_number}
                        onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Serial Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Follow-up #3 will improve range UI; kept here already as min/max inputs */}
                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Range Min</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.range_min}
                        onChange={(e) => setFormData({ ...formData, range_min: e.target.value })}
                        step="any"
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Range Max</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.range_max}
                        onChange={(e) => setFormData({ ...formData, range_max: e.target.value })}
                        step="any"
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Resolution</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.resolution}
                        onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Accuracy</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.accuracy}
                        onChange={(e) => setFormData({ ...formData, accuracy: e.target.value })}
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
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Calibration Date</label>
                      <DatePicker
                        className="form-control"
                        selected={toDateOrNull(formData.calibration_date)}
                        onChange={(date) => setFormData({ ...formData, calibration_date: formatYYYYMMDD(date) })}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        isClearable
                        showPopperArrow={false}
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Due Date</label>
                      <DatePicker
                        className="form-control"
                        selected={toDateOrNull(formData.next_calibration_date)}
                        onChange={(date) => setFormData({ ...formData, next_calibration_date: formatYYYYMMDD(date) })}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select date"
                        isClearable
                        showPopperArrow={false}
                        minDate={new Date()}
                      />
                      <small className="text-muted">
                        Days until due (sent as <code>calibration_interval_days</code>):{' '}
                        {computedIntervalDays === null ? '—' : Math.max(0, computedIntervalDays)}
                      </small>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="form-label">Certificate #</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.certificate_number}
                        onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
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
