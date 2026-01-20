// src/features/admin/AdminCharacteristics.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { partTypesApi } from '../../services/api';

export default function AdminCharacteristics({ partTypeId, onClose }) {
  const { user } = useContext(AppContext);
  const [characteristics, setCharacteristics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCharacteristic, setNewCharacteristic] = useState({
    name: '',
    type: 'measurement',
    unit: '',
    nominal: '',
    upperTolerance: '',
    lowerTolerance: ''
  });

  // Load characteristics for this part type
  useEffect(() => {
    loadCharacteristics();
  }, [partTypeId]);

  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      // Characteristics are stored within the part type
      const partType = await partTypesApi.getOne(partTypeId);
      setCharacteristics(partType.characteristics || []);
    } catch (err) {
      console.error('Error loading characteristics:', err);
      setError('Failed to load characteristics');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharacteristic = async () => {
    if (!newCharacteristic.name.trim()) {
      setError('Characteristic name is required');
      return;
    }

    try {
      const charToAdd = {
        id: Date.now().toString(),
        ...newCharacteristic,
        createdAt: new Date().toISOString(),
        createdBy: user?.id
      };

      const updatedCharacteristics = [...characteristics, charToAdd];
      
      // Update part type with new characteristics
      await partTypesApi.update(partTypeId, {
        characteristics: updatedCharacteristics
      });

      setCharacteristics(updatedCharacteristics);
      setNewCharacteristic({
        name: '',
        type: 'measurement',
        unit: '',
        nominal: '',
        upperTolerance: '',
        lowerTolerance: ''
      });
      setError(null);
    } catch (err) {
      console.error('Error adding characteristic:', err);
      setError('Failed to add characteristic');
    }
  };

  const handleDeleteCharacteristic = async (charId) => {
    if (!window.confirm('Delete this characteristic?')) return;

    try {
      const updatedCharacteristics = characteristics.filter(c => c.id !== charId);
      
      await partTypesApi.update(partTypeId, {
        characteristics: updatedCharacteristics
      });

      setCharacteristics(updatedCharacteristics);
    } catch (err) {
      console.error('Error deleting characteristic:', err);
      setError('Failed to delete characteristic');
    }
  };

  const handleUpdateCharacteristic = async (charId, updates) => {
    try {
      const updatedCharacteristics = characteristics.map(c =>
        c.id === charId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      );

      await partTypesApi.update(partTypeId, {
        characteristics: updatedCharacteristics
      });

      setCharacteristics(updatedCharacteristics);
    } catch (err) {
      console.error('Error updating characteristic:', err);
      setError('Failed to update characteristic');
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-characteristics">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Inspection Characteristics</h5>
        {onClose && (
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Add New Characteristic Form */}
      <div className="card mb-3">
        <div className="card-header">Add New Characteristic</div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name *"
                value={newCharacteristic.name}
                onChange={(e) => setNewCharacteristic({ ...newCharacteristic, name: e.target.value })}
              />
            </div>
            <div className="col-md-2">
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
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Unit"
                value={newCharacteristic.unit}
                onChange={(e) => setNewCharacteristic({ ...newCharacteristic, unit: e.target.value })}
              />
            </div>
            <div className="col-md-1">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Nominal"
                value={newCharacteristic.nominal}
                onChange={(e) => setNewCharacteristic({ ...newCharacteristic, nominal: e.target.value })}
              />
            </div>
            <div className="col-md-1">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="+Tol"
                value={newCharacteristic.upperTolerance}
                onChange={(e) => setNewCharacteristic({ ...newCharacteristic, upperTolerance: e.target.value })}
              />
            </div>
            <div className="col-md-1">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="-Tol"
                value={newCharacteristic.lowerTolerance}
                onChange={(e) => setNewCharacteristic({ ...newCharacteristic, lowerTolerance: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary btn-sm w-100"
                onClick={handleAddCharacteristic}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Characteristics List */}
      {characteristics.length === 0 ? (
        <div className="alert alert-info">
          No characteristics defined. Add characteristics above.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Unit</th>
                <th>Nominal</th>
                <th>+Tolerance</th>
                <th>-Tolerance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {characteristics.map((char) => (
                <tr key={char.id}>
                  <td>{char.name}</td>
                  <td>
                    <span className={`badge bg-${
                      char.type === 'measurement' ? 'primary' :
                      char.type === 'visual' ? 'success' :
                      char.type === 'functional' ? 'warning' : 'secondary'
                    }`}>
                      {char.type}
                    </span>
                  </td>
                  <td>{char.unit || '-'}</td>
                  <td>{char.nominal || '-'}</td>
                  <td>{char.upperTolerance || '-'}</td>
                  <td>{char.lowerTolerance || '-'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteCharacteristic(char.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
