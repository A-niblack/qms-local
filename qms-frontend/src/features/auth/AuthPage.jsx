// src/features/auth/AuthPage.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import { healthApi } from '../../services/api';

export default function AuthPage() {
  const { login, register, authError } = useContext(AppContext);
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState({ checked: false, online: false });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      await healthApi.check();
      setApiStatus({ checked: true, online: true });
    } catch (err) {
      console.error('API health check failed:', err);
      setApiStatus({ checked: true, online: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.email, formData.password, formData.displayName);
      }

      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData({
      email: '',
      password: '',
      displayName: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">PDI Quality</h2>
                  <p className="text-muted">Quality Management System</p>
                </div>

                {/* API Status */}
                {apiStatus.checked && (
                  <div className={`alert ${apiStatus.online ? 'alert-success' : 'alert-danger'} py-2 mb-3`}>
                    <small>
                      {apiStatus.online 
                        ? '✓ Connected to server' 
                        : '✗ Cannot connect to server. Make sure backend is running.'}
                    </small>
                  </div>
                )}

                {!apiStatus.checked && (
                  <div className="alert alert-info py-2 mb-3">
                    <small>Checking server connection...</small>
                  </div>
                )}

                {/* Error Display */}
                {(error || authError) && (
                  <div className="alert alert-danger" role="alert">
                    {error || authError}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  {!isLogin && (
                    <div className="mb-3">
                      <label className="form-label">Display Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.displayName}
                        onChange={(e) => handleChange('displayName', e.target.value)}
                        placeholder="Your name"
                        disabled={loading}
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>

                  {!isLogin && (
                    <div className="mb-3">
                      <label className="form-label">Confirm Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary w-100 mb-3"
                    disabled={loading || !apiStatus.online}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        {isLogin ? 'Signing in...' : 'Creating account...'}
                      </>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={toggleMode}
                    disabled={loading}
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : 'Already have an account? Sign in'}
                  </button>
                </div>

                {/* Demo Credentials */}
                {isLogin && apiStatus.online && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <small className="text-muted d-block mb-2">
                      <strong>Demo Credentials:</strong>
                    </small>
                    <small className="text-muted d-block">
                      Email: <code>admin@qms.local</code>
                    </small>
                    <small className="text-muted d-block">
                      Password: <code>admin123</code>
                    </small>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mt-2"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          email: 'admin@qms.local',
                          password: 'admin123'
                        });
                      }}
                      disabled={loading}
                    >
                      Fill Demo Credentials
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-muted mt-3">
              <small>QMS App © {new Date().getFullYear()}</small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
