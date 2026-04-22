import React from 'react';
import { useIndex } from '../../context/IndexContext';
import { Trash2, ExternalLink, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const { indexData, deleteIndex, stats, loading, refreshData } = useIndex();
  const [searchTerm, setSearchTerm] = React.useState('');
  const currentTime = new Date().toLocaleString();

  const filteredData = indexData.filter(item =>
    Object.values(item).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const statsCards = [
    { label: 'TOTAL FMS', value: stats.totalFms, color: 'text-indigo-600' },
    { label: 'TOTAL STAGES', value: stats.totalStages, color: 'text-pink-600' },
    { label: 'TOTAL DOERS', value: stats.totalDoers, color: 'text-blue-500' },
    { label: 'RUNNING FMS', value: stats.runningFms, color: 'text-green-600' },
    { label: 'NOT RUNNING FMS', value: stats.notRunningFms, color: 'text-red-600' },
  ];

  return (
    <div className="animate-fade-in pb-8">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827] tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 text-[15px] mt-1">Manage your systems and track performance.</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-lg text-[13px] font-semibold shadow-sm hover:bg-indigo-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <div className="px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-lg text-[13px] font-semibold shadow-sm">
            {currentTime}
          </div>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {statsCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center">
            <span className="text-[10px] text-gray-500 font-bold tracking-wider mb-2">{stat.label}</span>
            <span className={`text-[32px] font-bold leading-tight ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-800">Index Systems List</h2>
          <input
            type="text"
            placeholder="Search systems..."
            className="w-72 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto pb-4">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
              <tr>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">SN.</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-32">SHOP NAME</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">FMS NAME</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">FMS LINK</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-24">APP LINK</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px]">STAGES</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">DOERS</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">DOERS EMAIL</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">WHATSAPP</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">PC NAME</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">MIS COMPLETED</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[120px]">PROBLEM SOLVER</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">STATUS</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">TRAINING VIDEO</th>
                <th className="py-4 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="15" className="text-center py-20">
                    <RefreshCw className="animate-spin mx-auto text-indigo-500 mb-4" size={24} />
                    <p className="text-gray-500 text-[13px]">Updating from spreadsheet...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="15" className="text-center py-16 text-gray-500 text-[13px]">
                    No data found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 text-[13px] font-bold text-indigo-600">{index + 1}</td>
                    <td className="py-4 px-4 text-[13px] font-bold text-gray-800">{item.shopName}</td>
                    <td className="py-4 px-4 text-[13px] text-gray-700">{item.fmsName}</td>
                    <td className="py-4 px-4">
                      {item.fmsLink && (
                        <a href={item.fmsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-[11px] font-semibold transition-colors w-max">
                          <ExternalLink size={12} /> Link
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {item.appLink && (
                        <a href={item.appLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-[11px] font-semibold transition-colors w-max">
                          <ExternalLink size={12} /> Link
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4"><pre className="m-0 text-[11px] text-gray-600 font-sans whitespace-pre-wrap leading-relaxed">{item.stages}</pre></td>
                    <td className="py-4 px-4"><pre className="m-0 text-[11px] text-gray-600 font-sans whitespace-pre-wrap leading-relaxed">{item.doers}</pre></td>
                    <td className="py-4 px-4 text-[12px] text-gray-600">{item.doersEmail}</td>
                    <td className="py-4 px-4 text-center">
                      {item.whatsappMessages && (
                        <span className={`text-[12px] font-semibold ${item.whatsappMessages === 'YES' ? 'text-green-600' : 'text-gray-500'}`}>
                          {item.whatsappMessages}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-[12px] text-gray-600">{item.pcName}</td>
                    <td className="py-4 px-4 text-[12px] text-gray-600">{item.misCompleted}</td>
                    <td className="py-4 px-4 text-[12px] text-gray-600">{item.problemSolver}</td>
                    <td className="py-4 px-4 text-center">
                      {(item.status || item['Running/NotRunning']) && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${String(item.status || item['Running/NotRunning']).toLowerCase().includes('running') && !String(item.status || item['Running/NotRunning']).toLowerCase().includes('not')
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                          {item.status || item['Running/NotRunning']}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.trainingVideo && (
                        <a href={item.trainingVideo} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors inline-flex justify-center" title="Watch Video">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => deleteIndex(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-flex justify-center" title="Delete Row">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
