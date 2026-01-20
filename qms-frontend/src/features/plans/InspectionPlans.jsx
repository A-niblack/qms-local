// src/features/plans/InspectionPlans.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { inspectionPlansApi } from '../../services/api';

export default function InspectionPlans() {
  const { inspectionPlans, partTypes, refreshData, user } = useContext(AppContext);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    partTypeId: '',
    name: '',
    description: '',
    sampleSizeFormula: 'sqrt',
    defaultSampleSize: '',
    characteristics: [],
    isActive: true
  });

  const [newCharacteristic, setNewCharacteristic] = useState({
    name: '',
    type: 'measurement',
    unit: '',
    nominal: '',
    upperTolerance: '',
    lowerTolerance: '',
    isCritical: false
  });

  const sampleSizeFormulas = [
    { value: 'sqrt', label: 'Square Root (√n)' },
    { value: 'fixed', label: 'Fixed Size' },
    { value: 'aql', label: 'AQL Table' },
    { value: '100', label: '100% Inspection' }
  ];

  const resetForm = () => {
    setFormData({
      partTypeId: '',
      name: '',
      description: '',
      sampleSizeFormula: 'sqrt',
      defaultSampleSize: '',
      characteristics: [],
      isActive: true
    });
    setEditingPlan(null);
    setError(null);
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        partTypeId: plan.partTypeId || '',
        name: plan.name || '',
        description: plan.description || '',
        sampleSizeFormula: plan.sampleSizeFormula || 'sqrt',
        defaultSampleSize: plan.defaultSampleSize || '',
        characteristics: plan.characteristics || [],
        isActive: plan.isActive !== false
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleAddCharacteristic = () => {
    if (!newCharacteristic.name.trim()) {
      setError('Characteristic name is required');
      return;
    }

    setFormData(prev => ({
      ...prev,
      characteristics: [
        ...prev.characteristics,
        { ...newCharacteristic, id: Date.now().toString() }
      ]
    }));

    setNewCharacteristic({
      name: '',
      type: 'measurement',
      unit: '',
      nominal: '',
      upperTolerance: '',
      lowerTolerance: '',
      isCritical: false
    });
    setError(null);
  };

  const handleRemoveCharacteristic = (charId) => {
    setFormData(prev => ({
      ...prev,
      characteristics: prev.characteristics.filter(c => c.id !== charId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.partTypeId) {
      setError('Please select a part type');
      return;
    }

    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const planData = {
        ...formData,
        defaultSampleSize: formData.defaultSampleSize ? parseInt(formData.defaultSampleSize, 10) : null,
        updatedBy: user?.id
      };

      if (editingPlan) {
        await inspectionPlansApi.update(editingPlan.id, planData);
      } else {
        planData.createdBy = user?.id;
        await inspectionPlansApi.create(planData);
      }

      await refreshData();
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save inspection plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete inspection plan "${plan.name}"?`)) return;

    try {
      setLoading(true);
      await inspectionPlansApi.delete(plan.id);
      await refreshData();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete plan');
    } finally {
      setLoading(false);
    }
  };

  const getPartTypeName = (partTypeId) => {
    const pt = partTypes?.find(p => p.id === partTypeId);
    return pt ? pt.partNumber : 'Unknown';
  };

  // Active part types that don't have a plan yet (for new plans)
  const availablePartTypes = partTypes?.filter(pt => {
    if (pt.isActive === false) return false;
    if (editingPlan && editingPlan.partTypeId === pt.id) return true;
    return !inspectionPlans?.some(p => p.partTypeId === pt.id);
  }) || [];

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Inspection Plans</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + New Plan
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Plans List */}
      {inspectionPlans?.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <p className="text-muted mb-3">No inspection plans created yet.</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Create First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="row">
          {inspectionPlans?.map((plan) => (
            <div key={plan.id} className="col-lg-6 mb-4">
              <div className={`card h-100 ${plan.isActive === false ? 'border-secondary' : ''}`}>
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{plan.name}</strong>
                    {plan.isActive === false && (
                      <span className="badge bg-secondary ms-2">Inactive</span>
                    )}
                  </div>
                  <span className="badge bg-primary">
                    {getPartTypeName(plan.partTypeId)}
                  </span>
                </div>
                <div className="card-body">
                  {plan.description && (
                    <p className="text-muted small">{plan.description}</p>
                  )}

                  <div className="row mb-3">
                    <div className="col-6">
                      <small className="text-muted">Sample Size</small>
                      <div>
                        {sampleSizeFormulas.find(f => f.value === plan.sampleSizeFormula)?.label || 'Square Root'}
                        {plan.defaultSampleSize && ` (${plan.defaultSampleSize})`}
                      </div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Characteristics</small>
                      <div>{plan.characteristics?.length || 0} defined</div>
                    </div>
                  </div>

                  {/* Characteristics Preview */}
                  {plan.characteristics?.length > 0 && (
                    <div>
                      <small className="text-muted">Inspection Points:</small>
                      <ul className="list-unstyled small mb-0 mt-1">
                        {plan.characteristics.slice(0, 5).map((char, idx) => (
                          <li key={char.id || idx}>
                            {char.isCritical && <span className="text-danger">● </span>}
                            {char.name}
                            {char.nominal && ` (${char.nominal}${char.unit || ''})`}
                          </li>
                        ))}
                        {plan.characteristics.length > 5 && (
                          <li className="text-muted">+{plan.characteristics.length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="card-footer">
                  <div className="btn-group btn-group-sm w-100">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleOpenModal(plan)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(plan)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingPlan ? 'Edit Inspection Plan' : 'New Inspection Plan'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Part Type *</label>
                      <select
                        className="form-select"
                        value={formData.partTypeId}
                        onChange={(e) => setFormData({ ...formData, partTypeId: e.target.value })}
                        required
                        disabled={editingPlan}
                      >
                        <option value="">Select Part Type...</option>
                        {availablePartTypes.map((pt) => (
                          <option key={pt.id} value={pt.id}>
                            {pt.partNumber} - {pt.description || 'No description'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Plan Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
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
                      <label className="form-label">Sample Size Method</label>
                      <select
                        className="form-select"
                        value={formData.sampleSizeFormula}
                        onChange={(e) => setFormData({ ...formData, sampleSizeFormula: e.target.value })}
                      >
                        {sampleSizeFormulas.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Default Sample Size</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.defaultSampleSize}
                        onChange={(e) => setFormData({ ...formData, defaultSampleSize: e.target.value })}
                        min="1"
                      />
                    </div>
                    <div className="col-md-3 mb-3 d-flex align-items-end">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="planActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="planActive">Active</label>
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Characteristics */}
                  <h6>Inspection Characteristics</h6>

                  {/* Add Characteristic Form */}
                  <div className="card mb-3">
                    <div className="card-body bg-light">
                      <div className="row g-2 align-items-end">
                        <div className="col-md-2">
                          <label className="form-label small">Name</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newCharacteristic.name}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, name: e.target.value })}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label small">Type</label>
                          <select
                            className="form-select form-select-sm"
                            value={newCharacteristic.type}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, type: e.target.value })}
                          >
                            <option value="measurement">Measurement</option>
                            <option value="visual">Visual</option>
                            <option value="functional">Functional</option>
                            <option value="attribute">Attribute</option>
                          </select>
                        </div>
                        <div className="col-md-1">
                          <label className="form-label small">Unit</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newCharacteristic.unit}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, unit: e.target.value })}
                          />
                        </div>
                        <div className="col-md-1">
                          <label className="form-label small">Nominal</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newCharacteristic.nominal}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, nominal: e.target.value })}
                          />
                        </div>
                        <div className="col-md-1">
                          <label className="form-label small">+Tol</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newCharacteristic.upperTolerance}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, upperTolerance: e.target.value })}
                          />
                        </div>
                        <div className="col-md-1">
                          <label className="form-label small">-Tol</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={newCharacteristic.lowerTolerance}
                            onChange={(e) => setNewCharacteristic({ ...newCharacteristic, lowerTolerance: e.target.value })}
                          />
                        </div>
                        <div className="col-md-2">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="charCritical"
                              checked={newCharacteristic.isCritical}
                              onChange={(e) => setNewCharacteristic({ ...newCharacteristic, isCritical: e.target.checked })}
                            />
                            <label className="form-check-label small" htmlFor="charCritical">Critical</label>
                          </div>
                        </div>
                        <div className="col-md-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary w-100"
                            onClick={handleAddCharacteristic}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Characteristics List */}
                  {formData.characteristics.length === 0 ? (
                    <p className="text-muted">No characteristics added yet.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Nominal</th>
                            <th>Tolerance</th>
                            <th>Critical</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.characteristics.map((char) => (
                            <tr key={char.id}>
                              <td>{char.name}</td>
                              <td><span className="badge bg-secondary">{char.type}</span></td>
                              <td>{char.nominal} {char.unit}</td>
                              <td>
                                {char.upperTolerance && `+${char.upperTolerance}`}
                                {char.lowerTolerance && ` / -${char.lowerTolerance}`}
                              </td>
                              <td>
                                {char.isCritical && <span className="badge bg-danger">Critical</span>}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveCharacteristic(char.id)}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (editingPlan ? 'Update' : 'Create')}
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
