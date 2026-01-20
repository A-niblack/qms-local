import React, { useContext, useMemo } from 'react';
import { AppContext, ROLES } from '../../context/AppContext.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Reusable Card component ---
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      <Icon name={icon} className="h-6 w-6 text-white"/>
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// --- Reusable NavCard component ---
const NavCard = ({ title, icon, page, setCurrentPage }) => (
  <button 
    onClick={() => setCurrentPage(page)} 
    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all text-left w-full flex flex-col justify-between"
  >
    <div>
      <Icon name={icon} className="h-8 w-8 text-blue-600 mb-2"/>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <p className="text-sm text-blue-600 mt-4">Go to {title} &rarr;</p>
  </button>
);

// --- QC Dashboard for Admin, Engineer, Inspector ---
const QcDashboard = ({ setCurrentPage }) => {
  // Use `|| []` as a fallback to prevent .filter() on undefined
  const { shipments = [], inspections = [], gages = [], engineeringTasks = [], quarantineBatches = [] } = useContext(AppContext);

  const stats = useMemo(() => {
    const pendingCfq = shipments.filter(s => s.status === 'pending_cfq').length;
    const pendingEng = shipments.filter(s => s.status === 'pending_engineering').length;
    const quarantined = shipments.filter(s => s.status === 'quarantined').length;
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const gagesDueSoon = (gages || []).filter(g => {
      const dueDate = g.calibrationDueDate?.toDate?.();
      if (!dueDate) return false;
      return dueDate < thirtyDaysFromNow && dueDate > new Date();
    }).length;

    return { pendingCfq, pendingEng, quarantined, gagesDueSoon };
  }, [shipments, gages]);
  
  const recentActivity = useMemo(() => {
    // Combine and sort recent activities
    const allActivity = [
      ...(shipments || []).map(s => ({ ...s, type: 'Shipment', date: s.createdAt?.toDate() })),
      ...(inspections || []).map(i => ({ ...i, type: 'Inspection', date: i.inspectionDate?.toDate() })),
      ...(quarantineBatches || []).map(q => ({ ...q, type: 'Quarantine', date: q.quarantinedDate?.toDate() }))
    ];
    
    return allActivity
      .filter(a => a.date)
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);
  }, [shipments, inspections, quarantineBatches]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pending CFQ" value={stats.pendingCfq} icon="clipboard-check" color="bg-yellow-500" />
        <StatCard title="Engineering Review" value={stats.pendingEng} icon="search" color="bg-orange-500" />
        <StatCard title="Quarantined Batches" value={stats.quarantined} icon="shield-x" color="bg-red-500" />
        <StatCard title="Gages Due Calibration" value={stats.gagesDueSoon} icon="alert" color="bg-blue-500" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Cards */}
        <div className="lg:col-span-1 space-y-4">
          <NavCard title="Part Inspection" icon="clipboard-check" page="inspections" setCurrentPage={setCurrentPage}/>
          <NavCard title="Quarantine" icon="shield-x" page="quarantine" setCurrentPage={setCurrentPage}/>
          <NavCard title="Gages" icon="gauge" page="gages" setCurrentPage={setCurrentPage}/>
        </div>
        
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Part #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status / PO #</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(item => (
                  <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.partNumber}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'pending_cfq' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'pending_engineering' ? 'bg-orange-100 text-orange-800' :
                        item.status === 'quarantined' ? 'bg-red-100 text-red-800' :
                        item.status === 'passed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status || item.poNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

// --- Warranty Dashboard for Warranty Manager ---
const WarrantyDashboard = ({ setCurrentPage }) => {
  // Use `|| []` as a fallback
  const { warrantyClaims = [] } = useContext(AppContext);

  const stats = useMemo(() => {
    const openClaims = warrantyClaims.filter(c => c.status === 'Open').length;
    const inProgress = warrantyClaims.filter(c => c.status === 'In Progress').length;
    const accepted = warrantyClaims.filter(c => c.status === 'Accepted').length;
    const rejected = warrantyClaims.filter(c => c.status === 'Rejected').length;
    return { openClaims, inProgress, accepted, rejected };
  }, [warrantyClaims]);

  const chartData = [
    { name: 'Open', count: stats.openClaims },
    { name: 'In Progress', count: stats.inProgress },
    { name: 'Accepted', count: stats.accepted },
    { name: 'Rejected', count: stats.rejected },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Open Claims" value={stats.openClaims} icon="folder-open" color="bg-yellow-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon="search" color="bg-blue-500" />
        <StatCard title="Accepted Claims" value={stats.accepted} icon="check-circle" color="bg-green-500" />
        <StatCard title="Rejected Claims" value={stats.rejected} icon="x-circle" color="bg-red-500" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <NavCard title="Warranty Claims" icon="shield-alert" page="warranty" setCurrentPage={setCurrentPage}/>
          <NavCard title="Warranty Reports" icon="bar-chart-3" page="reports" setCurrentPage={setCurrentPage}/>
        </div>
        
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Claims Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

// --- Main Dashboard Component ---
const Dashboard = ({ setCurrentPage }) => {
  const { user, loading } = useContext(AppContext);

  if (loading || !user) {
    return <div className="text-center p-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Welcome, {user?.displayName || user?.email}!
      </h1>
      
      {/* Render the correct dashboard based on role */}
      {user.role === ROLES.WARRANTY_MANAGER 
        ? <WarrantyDashboard setCurrentPage={setCurrentPage} />
        : <QcDashboard setCurrentPage={setCurrentPage} />
      }
    </div>
  );
};

export default Dashboard;

