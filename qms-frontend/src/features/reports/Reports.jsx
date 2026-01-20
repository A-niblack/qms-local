// src/features/reports/Reports.jsx
// MIGRATED FROM FIREBASE TO REST API

import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export default function Reports() {
  const { 
    shipments, 
    inspections, 
    partTypes, 
    quarantineBatches, 
    warrantyClaims,
    gages 
  } = useContext(AppContext);
  
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('30'); // days

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Filter data by date range
  const filterByDate = (items, dateField = 'createdAt') => {
    if (!items) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(dateRange, 10));
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.createdAt);
      return itemDate >= cutoff;
    });
  };

  // Overview Stats
  const overviewStats = useMemo(() => {
    const filteredShipments = filterByDate(shipments);
    const filteredInspections = filterByDate(inspections);
    const filteredQuarantine = filterByDate(quarantineBatches);
    const filteredWarranty = filterByDate(warrantyClaims);

    return {
      totalShipments: filteredShipments.length,
      pendingShipments: filteredShipments.filter(s => s.status === 'pending').length,
      completedShipments: filteredShipments.filter(s => s.status === 'completed').length,
      failedShipments: filteredShipments.filter(s => s.status === 'failed').length,
      
      totalInspections: filteredInspections.length,
      passedInspections: filteredInspections.filter(i => i.results?.overall === 'pass').length,
      failedInspections: filteredInspections.filter(i => i.results?.overall === 'fail').length,
      
      activeQuarantine: filteredQuarantine.filter(q => !['released', 'scrapped', 'returned'].includes(q.status)).length,
      
      openWarranty: filteredWarranty.filter(w => w.status !== 'closed').length,
      
      overdueGages: gages?.filter(g => {
        if (!g.calibrationDueDate) return false;
        return new Date(g.calibrationDueDate) < new Date();
      }).length || 0
    };
  }, [shipments, inspections, quarantineBatches, warrantyClaims, gages, dateRange]);

  // Inspection Results by Part Type
  const inspectionsByPartType = useMemo(() => {
    const filteredInspections = filterByDate(inspections);
    const byPartType = {};

    filteredInspections.forEach(insp => {
      const partType = partTypes?.find(p => p.id === insp.partTypeId);
      const name = partType?.partNumber || 'Unknown';
      
      if (!byPartType[name]) {
        byPartType[name] = { name, pass: 0, fail: 0, pending: 0, total: 0 };
      }
      
      byPartType[name].total++;
      if (insp.results?.overall === 'pass') byPartType[name].pass++;
      else if (insp.results?.overall === 'fail') byPartType[name].fail++;
      else byPartType[name].pending++;
    });

    return Object.values(byPartType).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [inspections, partTypes, dateRange]);

  // Shipment Status Distribution
  const shipmentStatusData = useMemo(() => {
    const filteredShipments = filterByDate(shipments);
    const statusCounts = {};
    
    filteredShipments.forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [shipments, dateRange]);

  // Inspections Over Time
  const inspectionsOverTime = useMemo(() => {
    const filteredInspections = filterByDate(inspections);
    const byDate = {};

    filteredInspections.forEach(insp => {
      const date = new Date(insp.createdAt || insp.completedAt).toLocaleDateString();
      if (!byDate[date]) {
        byDate[date] = { date, pass: 0, fail: 0, total: 0 };
      }
      byDate[date].total++;
      if (insp.results?.overall === 'pass') byDate[date].pass++;
      else if (insp.results?.overall === 'fail') byDate[date].fail++;
    });

    return Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [inspections, dateRange]);

  // Quarantine by Reason (simplified)
  const quarantineByStatus = useMemo(() => {
    const filtered = filterByDate(quarantineBatches);
    const statusCounts = {};
    
    filtered.forEach(q => {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [quarantineBatches, dateRange]);

  // Pass Rate Calculation
  const passRate = useMemo(() => {
    const total = overviewStats.passedInspections + overviewStats.failedInspections;
    if (total === 0) return 0;
    return ((overviewStats.passedInspections / total) * 100).toFixed(1);
  }, [overviewStats]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>QC Reports & Analytics</h2>
        <div className="d-flex gap-2">
          <select
            className="form-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <select
            className="form-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="overview">Overview Dashboard</option>
            <option value="inspections">Inspection Analysis</option>
            <option value="quality">Quality Metrics</option>
            <option value="quarantine">Quarantine Report</option>
          </select>
        </div>
      </div>

      {/* Overview Dashboard */}
      {reportType === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="row mb-4">
            <div className="col-md-2">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.totalShipments}</h3>
                  <small>Shipments</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h3>{passRate}%</h3>
                  <small>Pass Rate</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.totalInspections}</h3>
                  <small>Inspections</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-warning text-dark">
                <div className="card-body text-center">
                  <h3>{overviewStats.activeQuarantine}</h3>
                  <small>In Quarantine</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.overdueGages}</h3>
                  <small>Overdue Gages</small>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card bg-secondary text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.openWarranty}</h3>
                  <small>Open Warranty</small>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">Shipment Status Distribution</div>
                <div className="card-body">
                  {shipmentStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={shipmentStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {shipmentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted text-center">No data available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">Inspections by Part Type</div>
                <div className="card-body">
                  {inspectionsByPartType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={inspectionsByPartType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="pass" fill="#28a745" name="Pass" />
                        <Bar dataKey="fail" fill="#dc3545" name="Fail" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted text-center">No data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Inspection Analysis */}
      {reportType === 'inspections' && (
        <>
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.passedInspections}</h3>
                  <small>Passed</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.failedInspections}</h3>
                  <small>Failed</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h3>{overviewStats.totalInspections}</h3>
                  <small>Total</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h3>{passRate}%</h3>
                  <small>Pass Rate</small>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Inspections Over Time</div>
            <div className="card-body">
              {inspectionsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={inspectionsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#0088FE" name="Total" />
                    <Line type="monotone" dataKey="pass" stroke="#28a745" name="Pass" />
                    <Line type="monotone" dataKey="fail" stroke="#dc3545" name="Fail" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center py-5">No inspection data available for the selected period</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quality Metrics */}
      {reportType === 'quality' && (
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">Quality Summary</div>
              <div className="card-body">
                <table className="table">
                  <tbody>
                    <tr>
                      <td>First Pass Yield</td>
                      <td className="text-end"><strong>{passRate}%</strong></td>
                    </tr>
                    <tr>
                      <td>Total Inspections</td>
                      <td className="text-end">{overviewStats.totalInspections}</td>
                    </tr>
                    <tr>
                      <td>Defects Found</td>
                      <td className="text-end text-danger">{overviewStats.failedInspections}</td>
                    </tr>
                    <tr>
                      <td>Parts in Quarantine</td>
                      <td className="text-end text-warning">{overviewStats.activeQuarantine}</td>
                    </tr>
                    <tr>
                      <td>Open Warranty Claims</td>
                      <td className="text-end">{overviewStats.openWarranty}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-4">
            <div className="card">
              <div className="card-header">Top Defect Part Types</div>
              <div className="card-body">
                {inspectionsByPartType.filter(p => p.fail > 0).length > 0 ? (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Part Type</th>
                        <th className="text-end">Failures</th>
                        <th className="text-end">Fail Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectionsByPartType
                        .filter(p => p.fail > 0)
                        .sort((a, b) => b.fail - a.fail)
                        .slice(0, 5)
                        .map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.name}</td>
                            <td className="text-end text-danger">{p.fail}</td>
                            <td className="text-end">
                              {((p.fail / p.total) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted text-center">No failures recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quarantine Report */}
      {reportType === 'quarantine' && (
        <>
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">Quarantine Status Distribution</div>
                <div className="card-body">
                  {quarantineByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={quarantineByStatus}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {quarantineByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted text-center">No quarantine data</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-header">Active Quarantine Batches</div>
                <div className="card-body">
                  {quarantineBatches?.filter(q => !['released', 'scrapped', 'returned'].includes(q.status)).length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Part Type</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quarantineBatches
                            ?.filter(q => !['released', 'scrapped', 'returned'].includes(q.status))
                            .map(q => {
                              const pt = partTypes?.find(p => p.id === q.partTypeId);
                              const days = Math.floor((new Date() - new Date(q.createdAt)) / (1000 * 60 * 60 * 24));
                              return (
                                <tr key={q.id}>
                                  <td>Q-{q.id.slice(-6).toUpperCase()}</td>
                                  <td>{pt?.partNumber || 'Unknown'}</td>
                                  <td>{q.quantity || '-'}</td>
                                  <td><span className="badge bg-warning">{q.status}</span></td>
                                  <td>{days}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-success text-center">No active quarantine batches</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
