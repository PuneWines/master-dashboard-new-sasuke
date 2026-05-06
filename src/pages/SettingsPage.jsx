import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Settings, 
  Shield, 
  UserPlus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  ChevronRight,
  Monitor,
  Layout,
  Mail,
  Phone,
  Briefcase,
  Store,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { fetchUserDetailsApi, deleteUserByIdApi, updateUserDataApi, createUserApi } from '../redux/api/settingApi';

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Constants for checkboxes
  // Constants for checkboxes - Synchronized with Top Navbar
  const masterPages = [
    'HOME', 
    'Whatsapp Send Message', 
    'Petty Cash Tally', 
    'Checklist Delegation', 
    'Purchase App', 
    'Document Manager', 
    'HR Product'
  ];
  
  const tabSystems = {
    'Petty Cash Tally': ['Dashboard', 'Petty Cash Form', 'Cash Tally', 'Counter 1', 'Counter 2', 'Counter 3', 'Reports'],
    'Checklist Delegation': ['Dashboard', 'Assign Task', 'Delegation', 'Data', 'OFFICE', 'MADHURA', 'FRIENDS', 'KUNAL ULWE', 'TLS ULWE', 'BALAJI', 'TLS', 'License', 'Training Video'],
    'HR Product': {
      'Admin': [
        'Dashboard', 'Indent', 'Find Enquiry', 'Call Tracker', 
        'After Joining Work', 'Leaving', 'After Leaving Work', 
        'Employee', 'Leave Management', 'Attendance', 
        'Attendance Monthly', 'Attendance Daily', 
        'Payroll', 'MIS Report', 'Admin Advance'
      ],
      'Employee': ['My Profile', 'My Attendance', 'Leave Request', 'My Salary', 'Advance', 'Company Calendar']
    },
    'Purchase App': ['Dashboard', 'Indent', 'Approval', 'Generate & Send PO', 'Trader Verification', 'Transporter Verification', 'Get Lifting', 'Cross Check & Receive'],
    'Document Manager': ['Dashboard', 'Add Document', 'All Documents', 'Renewal', 'Shared', 'License']
  };

  const initialFormState = {
    employee_id: '',
    user_name: '',
    designation: '',
    user_id: '',
    password: '',
    role: 'Employee',
    hr_product_role: 'Admin', // Dynamic role for HR Product
    master_page_access: [],
    tab_system_access: {},
    email_id: '',
    number: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await fetchUserDetailsApi();
    setUsers(data);
    setLoading(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      ...initialFormState,
      ...user,
      master_page_access: user.master_page_access || [],
      tab_system_access: user.tab_system_access || {}
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUserByIdApi(id);
      loadUsers();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
        let result;
        if (editingUser) {
          result = await updateUserDataApi({ id: editingUser.id, updatedUser: formData });
          if (result.success) {
            toast.success('User updated successfully!');
            setIsModalOpen(false);
            await loadUsers();
            setFormData(initialFormState);
            setEditingUser(null);
          } else {
            toast.error(result.error || 'Failed to update user');
          }
        } else {
          result = await createUserApi(formData);
          if (result.success) {
            toast.success('Account created successfully!');
            setIsModalOpen(false);
            await loadUsers();
            setFormData(initialFormState);
          } else {
            toast.error(result.error || 'Failed to save to sheet');
          }
        }
    } catch (err) {
        toast.error('An error occurred during submission');
        console.error("Submit Error:", err);
    } finally {
        setSubmitting(false);
    }
  };

  const toggleMasterAccess = (page) => {
    if (formData.role === 'admin') return; // Prevent toggle for admin
    
    setFormData(prev => ({
      ...prev,
      master_page_access: prev.master_page_access.includes(page)
        ? prev.master_page_access.filter(p => p !== page)
        : [...prev.master_page_access, page]
    }));
  };

  const toggleTabAccess = (system, tab) => {
    if (formData.role === 'admin') return;

    setFormData(prev => {
      const currentTabs = prev.tab_system_access[system] || [];
      let newTabs = currentTabs.includes(tab)
        ? currentTabs.filter(t => t !== tab)
        : [...currentTabs, tab];
      
      // Automation: For Checklist Delegation, selecting a shop page should auto-enable 'Data'
      if (system === 'Checklist Delegation' && !currentTabs.includes(tab)) {
          const shopTabs = ['OFFICE', 'MADHURA', 'FRIENDS', 'KUNAL ULWE', 'TLS ULWE', 'BALAJI', 'TLS'];
          if (shopTabs.includes(tab) && !newTabs.includes('Data')) {
              newTabs.push('Data');
          }
      }

      return {
        ...prev,
        tab_system_access: {
          ...prev.tab_system_access,
          [system]: newTabs
        }
      };
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Placeholder (Parent AdminLayout handles this usually, but page might have its own internal navigation) */}
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Area */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">User Settings</h1>
              <p className="text-gray-500 mt-1">Manage employees, roles and system access permissions</p>
            </div>
            <button 
              onClick={() => { setEditingUser(null); setFormData(initialFormState); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition shadow-lg shadow-blue-200"
            >
              <UserPlus className="w-5 h-5" />
              Add New User
            </button>
          </div>

          {/* Users Table Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-8">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">User Management</h2>
            </div>
            <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-20 shadow-sm border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">EMP ID</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">User Name</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Designation</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Login ID</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Password</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Role</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Work Status</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Master Page Access</th>
                    <th className="px-4 py-4 whitespace-nowrap min-w-[200px] bg-gray-50">Tab System Access</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Gmail ID</th>
                    <th className="px-4 py-4 whitespace-nowrap bg-gray-50">Number</th>
                    <th className="px-4 py-4 text-center sticky right-0 bg-gray-50 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] border-l border-gray-100 z-30">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/50 transition group">
                      <td className="px-4 py-4 font-mono text-xs text-gray-600 font-bold whitespace-nowrap">{user.employee_id || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 shadow-sm">
                            {(user.user_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-gray-800 whitespace-nowrap">{user.user_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 whitespace-nowrap">{user.designation || '-'}</span>
                      </td>
                      <td className="px-4 py-4 font-bold text-xs text-blue-600 whitespace-nowrap">{user.user_id || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 group/pass whitespace-nowrap">
                          <p className="text-xs font-mono text-gray-400">
                            {user.showPass ? user.password : '••••••'}
                          </p>
                          <button 
                            onClick={() => {
                              setUsers(users.map(u => u.id === user.id ? {...u, showPass: !u.showPass} : u));
                            }}
                            className="p-1 hover:text-blue-600 text-gray-300 transition opacity-0 group-hover/pass:opacity-100"
                          >
                            {user.showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {user.role || 'Employee'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.status === 'Inactive' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                            {user.master_page_access && user.master_page_access.length > 0 ? (
                                user.master_page_access.map((mod, i) => (
                                    <span key={i} className="text-[10px] bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded border border-sky-200">
                                        {mod}
                                    </span>
                                ))
                            ) : <span className="text-gray-400 text-xs italic">-</span>}
                          </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[200px] max-w-[300px]">
                           {user.tab_system_access && Object.keys(user.tab_system_access).length > 0 ? (
                               Object.entries(user.tab_system_access).map(([sys, tabs], i) => (
                                   <div key={i} className="text-[10px] bg-gray-50 border border-gray-200 p-1.5 rounded-md shadow-sm">
                                       <span className="font-bold text-gray-700 uppercase">{sys}: </span> 
                                       <span className="text-gray-500 font-medium leading-relaxed">{tabs.join(', ')}</span>
                                   </div>
                               ))
                           ) : <span className="text-gray-400 text-xs italic">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
                          {user.email_id ? <><Mail className="w-3.5 h-3.5 text-blue-500" /> {user.email_id}</> : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
                          {user.number ? <><Phone className="w-3.5 h-3.5 text-green-500" /> {user.number}</> : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 sticky right-0 bg-white group-hover:bg-blue-50 border-l border-gray-100 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] transition-colors">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      </div>

      {/* Modern Modal / User Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{editingUser ? 'Edit User' : 'Create New User'}</h2>
                  <p className="text-sm text-gray-500 font-bold">Fill in employee details and set access levels</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                
                {/* Left Column: Basic Details */}
                <div className="space-y-8">
                  <section>
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                      <Users className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Employee Identity</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Employee ID</label>
                        <div className="relative">
                          <input 
                            required
                            name="employee_id"
                            placeholder="EMP-XXX"
                            className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-mono"
                            value={formData.employee_id}
                            onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Full User Name</label>
                        <input 
                          required
                          name="user_name"
                          placeholder="John Wick"
                          className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                          value={formData.user_name}
                          onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                      <Lock className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Credentials</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Login User ID</label>
                        <div className="relative">
                          <input 
                            required
                            name="user_id"
                            placeholder="john.user"
                            className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                            value={formData.user_id}
                            onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                          />
                          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Password</label>
                        <div className="relative">
                          <input 
                            required
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 pr-10 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                          />
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                      <Briefcase className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Role & Position</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Role Type</label>
                        <select 
                          className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition cursor-pointer appearance-none font-bold"
                          value={formData.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            if (newRole === 'admin') {
                                // Auto-select everything for Admin based on role-specific logic
                                const allTabs = {};
                                Object.keys(tabSystems).forEach(sys => {
                                    if (sys === 'HR Product') {
                                        allTabs[sys] = tabSystems[sys]['Admin']; // Only Admin pages for Admin role
                                    } else if (typeof tabSystems[sys] === 'object' && !Array.isArray(tabSystems[sys])) {
                                        allTabs[sys] = [...new Set(Object.values(tabSystems[sys]).flat())];
                                    } else {
                                        allTabs[sys] = tabSystems[sys];
                                    }
                                });
                                
                                setFormData({
                                    ...formData,
                                    role: newRole,
                                    hr_product_role: 'Admin',
                                    master_page_access: masterPages,
                                    tab_system_access: allTabs
                                });
                            } else {
                                // Clear everything for Employee and set HR role to Employee
                                setFormData({
                                    ...formData,
                                    role: newRole,
                                    hr_product_role: 'Employee',
                                    master_page_access: [],
                                    tab_system_access: {}
                                });
                            }
                          }}
                        >
                          <option value="Employee">Employee</option>
                          <option value="admin">Administrator / Owner</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">Designation</label>
                        <input 
                          name="designation"
                          placeholder="Manager, Supervisor..."
                          className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                          value={formData.designation}
                          onChange={(e) => setFormData({...formData, designation: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-600 px-1 italic">
                          Work Status
                        </label>
                        <select 
                          className={`w-full border-2 p-3 rounded-xl focus:ring-2 outline-none transition cursor-pointer appearance-none font-bold ${
                            formData.status === 'Inactive'
                              ? 'bg-red-50 border-red-300 text-red-700 focus:ring-red-300/30 focus:border-red-500'
                              : 'bg-green-50 border-green-300 text-green-700 focus:ring-green-300/30 focus:border-green-500'
                          }`}
                          value={formData.status || 'Active'}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                        >
                          <option value="Active">✅ Active</option>
                          <option value="Inactive">🔴 Inactive</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-6 text-blue-600">
                      <Mail className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Contact & Placement</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-600 px-1 italic">Email (Gmail preferred)</label>
                            <input 
                              type="email"
                              name="email_id"
                              placeholder="example@gmail.com"
                              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                              value={formData.email_id}
                              onChange={(e) => setFormData({...formData, email_id: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-bold text-gray-600 px-1 italic">Phone Number</label>
                            <input 
                              name="number"
                              placeholder="+91 XXXXX XXXXX"
                              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                              value={formData.number}
                              onChange={(e) => setFormData({...formData, number: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                  </section>
                </div>

                {/* Right Column: Access Control */}
                <div className="space-y-8 bg-gray-50 rounded-3xl p-8 border border-gray-100 italic">
                  
                  <section>
                    <div className="flex items-center gap-2 mb-6 text-sky-700">
                      <Monitor className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Master Page Access</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {masterPages.map(page => (
                        <label key={page} className={`flex items-center gap-2 group ${formData.role === 'admin' ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                          <div 
                            onClick={() => toggleMasterAccess(page)}
                            className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                              formData.master_page_access.includes(page) 
                              ? 'bg-blue-600 border-blue-600 shadow-sm' 
                              : 'bg-white border-gray-300 group-hover:border-blue-500'
                            } ${formData.role === 'admin' ? 'bg-blue-700' : ''}`}
                          >
                            {formData.master_page_access.includes(page) && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                          </div>
                          <span className={`text-sm font-bold ${formData.role === 'admin' ? 'text-blue-700' : 'text-gray-600'}`}>{page}</span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-2 text-sky-700">
                      <Layout className="w-5 h-5" />
                      <h3 className="font-bold text-lg">Tab System Access</h3>
                    </div>
                    
                    <div className="space-y-6">
                      {Object.keys(tabSystems).map(system => {
                        // Only show if the system is checked in "Master Page Access"
                        if (!formData.master_page_access.includes(system)) return null;

                        const isHRProduct = system === 'HR Product';
                        let availableTabs = [];
                        
                        if (isHRProduct) {
                          // Derive the role strictly from the main Role Type
                          const currentRole = formData.role === 'admin' ? 'Admin' : 'Employee';
                          availableTabs = tabSystems[system][currentRole] || [];
                        } else {
                          availableTabs = tabSystems[system];
                        }

                        return (
                          <div key={system} className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-4">
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest px-1">
                                {system} <span className="text-[10px] text-gray-400 ml-2 italic">({formData.role === 'admin' ? 'Admin' : 'Employee'} View)</span>
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-2">
                              {availableTabs.map(tab => (
                                <label key={tab} className={`flex items-center gap-2 group ${formData.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                  <div 
                                    onClick={() => toggleTabAccess(system, tab)}
                                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                      (formData.tab_system_access[system] || []).includes(tab) 
                                      ? 'bg-blue-600 border-blue-600' 
                                      : 'bg-gray-100 border-gray-300'
                                    } ${formData.role === 'admin' ? 'bg-blue-500' : ''}`}
                                  >
                                    {(formData.tab_system_access[system] || []).includes(tab) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                  </div>
                                  <span className={`text-xs font-bold transition ${formData.role === 'admin' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`}>{tab}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
                      <button 
                        type="submit"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className={`flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 ${submitting ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                {editingUser ? 'Save Changes' : 'Create Account'}
                            </>
                        )}
                      </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default SettingsPage;
