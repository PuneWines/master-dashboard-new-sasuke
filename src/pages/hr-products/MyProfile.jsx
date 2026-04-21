import { toast } from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Building, Edit3, Save, X, 
  Printer, Shield, Briefcase, Info, BadgeCheck, Fingerprint, MapPinned,
  UserCircle, Smartphone, MailOpen, Landmark, UserSquare2, DollarSign
} from 'lucide-react';
import { SCRIPT_URLS } from '../../utils/envConfig';

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8 hover:shadow-md transition-shadow">
    <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center gap-3">
      <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
         <Icon size={20} className="text-indigo-600" />
      </div>
      <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">{title}</h3>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

const InfoField = ({ 
  label, 
  value, 
  icon: Icon, 
  name, 
  isEditable = false, 
  isEditing = false, 
  formData = {}, 
  onChange = () => {}, 
  onFocus = () => {} 
}) => (
  <div className="group">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-2">
      {Icon && <Icon size={12} className="text-indigo-400" />}
      {label}
    </label>
    {isEditable ? (
      <input
        type="text"
        name={name}
        value={formData[name] || ''}
        onChange={onChange}
        onFocus={onFocus}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
      />
    ) : (
      <p className="text-gray-900 font-bold text-base tracking-tight">{value || '---'}</p>
    )}
  </div>
);

const MyProfile = () => {

  const DUMMY_PROFILE = {
    joiningNo: 'EMP-DEMO-001',
    candidateName: 'John Doe',
    candidatePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    fatherName: 'Robert Doe',
    dateOfJoining: '2024-01-15',
    joiningPlace: 'New York Office',
    designation: 'Senior Product Designer',
    salary: '$85,000',
    currentAddress: '123 Avenue of the Americas, New York, NY 10020',
    addressAsPerAadhar: '123 Avenue of the Americas, New York, NY 10020',
    bodAsPerAadhar: '1992-05-24',
    gender: 'Male',
    mobileNo: '+1 (555) 001-2345',
    familyMobileNo: '+1 (555) 001-6789',
    relationWithFamily: 'Father',
    email: 'john.doe@example.com', 
    companyName: 'Botivate HR Solutions',
    aadharNo: '123456789012',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profileData, setProfileData] = useState(null);
  const [rowIndex, setRowIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const printRef = useRef();

  const getDirectDriveLink = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url === '-') return '';
    const idMatch = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
    if (idMatch && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
    }
    return url;
  };

  const normalizeId = (id) => {
    if (!id) return '';
    return id.toString().replace(/[^0-9]/g, '').replace(/^0+/, '');
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '---' || dateStr === '-') return '---';
    try {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) return dateStr;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) { return dateStr; }
  };

  const fetchJoiningData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch data');
      
      const rawData = result.data || [];
      if (rawData.length < 6) throw new Error('Insufficient data in sheet');

      const headers = rawData[5] || [];
      const getCol = (...aliases) => {
        for (const alias of aliases) {
          const idx = headers.findIndex(h => h?.toString().toLowerCase().trim() === alias.toLowerCase());
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const colMap = {
        joiningNo:          getCol('Joining No', 'Employee ID', 'Emp ID', 'EmpID'),
        candidateName:      getCol('Candidate Name', 'Name As Per Aadhar', 'Name', 'Employee Name', 'Full Name'),
        fatherName:         getCol("Father's Name", 'Father Name', 'Fathers Name'),
        dateOfJoining:      getCol('Date of Joining', 'DOJ', 'Joining Date'),
        joiningPlace:       getCol('Joining Place', 'Place of Joining', 'Location', 'Store Name', 'Joining Place'),
        designation:        getCol('Designation', 'Post', 'Role', 'Rank'),
        salary:             getCol('Salary', 'Monthly Salary', 'CTC'),
        candidatePhoto:     getCol('Candidate Photo', 'Photo', 'Profile Photo', 'Image', 'Emp Photo', 'Employee Photo'),
        currentAddress:     getCol('Current Address', 'Address'),
        addressAsPerAadhar: getCol('Address as per Aadhar', 'Permanent Address'),
        bodAsPerAadhar:     getCol('DOB as per Aadhar', 'Date of Birth', 'DOB', 'Birth Date', 'Birthdate', 'Emp DOB'),
        gender:             getCol('Gender', 'Sex'),
        mobileNo:           getCol('Mobile No', 'Mobile', 'Phone', 'Cell', 'Personal No'),
        familyMobileNo:     getCol('Family Mobile No', 'Emergency Contact', 'Family Mobile', 'Emergency No'),
        relationWithFamily: getCol('Relation with Family', 'Relation', 'Relationship'),
        bankAccNo:          getCol('Bank Acc No', 'Bank Account', 'A/C No', 'Account No'),
        ifscCode:           getCol('IFSC Code', 'IFSC', 'IFSC Code'),
        branchName:         getCol('Branch Name', 'Branch'),
        email:              getCol('Email', 'Email ID', 'Email Address'),
        esicNo:             getCol('ESIC No', 'ESIC'),
        companyName:        getCol('Company Name', 'Company', 'Organisation'),
        aadharCardNo:       getCol('Aadhar Card No', 'Aadhar No', 'Aadhaar No', 'Aadhar Number'),
      };

      const dataRows = rawData.slice(6);

      const cachedId   = (localStorage.getItem('employeeId') || '').trim();
      const userObjId  = (userData.joiningNo || userData.EmployeeID || userData.employeeId || userData.empId || '').trim();
      const searchId   = (cachedId || userObjId).toString();
      const nSearchId  = normalizeId(searchId);
      
      const searchName = (userData.Name || userData.name || userData.candidateName || userObjId || '').toString().toLowerCase().trim();

      const foundIndex = dataRows.findIndex(row => {
        const rowIdRaw = (colMap.joiningNo !== -1 ? row[colMap.joiningNo] : '') || '';
        const rowId    = rowIdRaw.toString().trim();
        const rowName  = (colMap.candidateName !== -1 ? row[colMap.candidateName] : '')?.toString().toLowerCase().trim() || '';

        const sameId   = nSearchId && normalizeId(rowId) === nSearchId;
        const sameName = searchName && (rowName === searchName || rowName.includes(searchName) || searchName.includes(rowName));

        return sameId || sameName;
      });

      if (foundIndex !== -1) {
        const row = dataRows[foundIndex];
        const profile = {
          joiningNo:          (colMap.joiningNo !== -1 ? row[colMap.joiningNo] : '') || '',
          candidateName:      (colMap.candidateName !== -1 ? row[colMap.candidateName] : '') || '',
          fatherName:         (colMap.fatherName !== -1 ? row[colMap.fatherName] : '') || '',
          dateOfJoining:      formatDate((colMap.dateOfJoining !== -1 ? row[colMap.dateOfJoining] : '')),
          joiningPlace:       (colMap.joiningPlace !== -1 ? row[colMap.joiningPlace] : '') || '',
          designation:        (colMap.designation !== -1 ? row[colMap.designation] : '') || '',
          salary:             (colMap.salary !== -1 ? row[colMap.salary] : '') || '',
          candidatePhoto:     getDirectDriveLink((colMap.candidatePhoto !== -1 ? row[colMap.candidatePhoto] : '') || ''),
          currentAddress:     (colMap.currentAddress !== -1 ? row[colMap.currentAddress] : '') || '',
          addressAsPerAadhar: (colMap.addressAsPerAadhar !== -1 ? row[colMap.addressAsPerAadhar] : '') || '',
          bodAsPerAadhar:     formatDate((colMap.bodAsPerAadhar !== -1 ? row[colMap.bodAsPerAadhar] : '')),
          gender:             (colMap.gender !== -1 ? row[colMap.gender] : '') || '',
          mobileNo:           (colMap.mobileNo !== -1 ? row[colMap.mobileNo] : '') || '',
          familyMobileNo:     (colMap.familyMobileNo !== -1 ? row[colMap.familyMobileNo] : '') || '',
          relationWithFamily: (colMap.relationWithFamily !== -1 ? row[colMap.relationWithFamily] : '') || '',
          email:              (colMap.email !== -1 ? row[colMap.email] : '') || '',
          companyName:        (colMap.companyName !== -1 ? row[colMap.companyName] : '') || '',
          bankAccNo:          (colMap.bankAccNo !== -1 ? row[colMap.bankAccNo] : '') || '',
          ifscCode:           (colMap.ifscCode !== -1 ? row[colMap.ifscCode] : '') || '',
          branchName:         (colMap.branchName !== -1 ? row[colMap.branchName] : '') || '',
          esicNo:             (colMap.esicNo !== -1 ? row[colMap.esicNo] : '') || '',
          aadharCardNo:       (colMap.aadharCardNo !== -1 ? row[colMap.aadharCardNo] : '') || '',
        };
        setProfileData(profile);
        setFormData(profile);
        setRowIndex(foundIndex + 7);
        setIsDemo(false);
        if (profile.joiningNo) localStorage.setItem("employeeId", profile.joiningNo);
      } else {
        setProfileData(DUMMY_PROFILE);
        setFormData(DUMMY_PROFILE);
        setIsDemo(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchJoiningData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const hasChanges = () => {
    if (!profileData || !formData) return false;
    return (
      formData.mobileNo !== profileData.mobileNo ||
      formData.email !== profileData.email ||
      formData.familyMobileNo !== profileData.familyMobileNo
    );
  };

  const handleSave = async () => {
    if (isDemo) {
      toast.error("Cannot save changes in demo mode");
      return;
    }

    if (!hasChanges()) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      const scriptURL = SCRIPT_URLS.HR_JOINING;
      
      const updates = [];
      if (formData.mobileNo !== profileData.mobileNo) {
        updates.push({ col: 18, val: formData.mobileNo });
      }
      if (formData.familyMobileNo !== profileData.familyMobileNo) {
        updates.push({ col: 19, val: formData.familyMobileNo });
      }
      if (formData.email !== profileData.email) {
        updates.push({ col: 26, val: formData.email });
      }

      for (const update of updates) {
        const response = await fetch(scriptURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            sheetName: 'JOINING',
            action: 'updateCell',
            rowIndex: rowIndex.toString(),
            columnIndex: update.col.toString(),
            value: update.val
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to update field');
      }

      setProfileData({ ...formData });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-indigo-600 font-black tracking-widest animate-pulse">SYNCHRONIZING PROFILE...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold">
          Failed to load profile data.
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const handleFieldFocus = () => {
    if (!isEditing) setIsEditing(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 p-6 md:p-10 print:p-0">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden border-b pb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Employee Profile</h1>
            {isDemo && (
              <span className="px-4 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-amber-100 shadow-sm animate-pulse">
                Demo Mode
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-2 font-medium text-lg">Manage your professional identity and personal records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-3 text-sm font-black text-gray-700 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:shadow-lg transition-all shadow-sm"
          >
            <Printer size={18} className="mr-2" />
            PRINT DATA
          </button>
          
          {isEditing ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setFormData({ ...profileData });
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="flex items-center px-6 py-3 text-sm font-black text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                <X size={18} className="mr-2" />
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges() || isSaving}
                className={`flex items-center px-8 py-3 text-sm font-black rounded-2xl shadow-md transition-all active:scale-95 ${
                  !hasChanges() || isSaving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 hover:shadow-xl'
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    SAVING...
                  </div>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    SAVE CHANGES
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-8 py-3 text-sm font-black bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-xl shadow-md transition-all active:scale-95"
            >
              <Edit3 size={18} className="mr-2" />
              EDIT PROFILE
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Profile Card Side */}
        <div className="lg:col-span-4 space-y-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white">
              <div className="h-32 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800"></div>
              <div className="px-8 pb-10">
                <div className="relative -mt-16 flex justify-center">
                  <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-2xl ring-8 ring-white overflow-hidden group">
                    {profileData.candidatePhoto ? (
                      <img 
                        src={profileData.candidatePhoto} 
                        alt="Profile" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.candidateName)}&background=6366f1&color=fff&size=512`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <User size={48} className="text-indigo-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center mt-6">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{profileData.candidateName}</h2>
                  <p className="text-indigo-600 font-bold text-sm mt-2 tracking-wide uppercase">{profileData.designation}</p>
                  <div className="inline-flex items-center mt-4 px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-full uppercase tracking-[0.2em] border border-indigo-100 shadow-sm">
                    <Fingerprint size={12} className="mr-2" />
                    {profileData.joiningNo}
                  </div>
                </div>
                
                <div className="mt-10 space-y-5 border-t border-gray-100 pt-8">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <Shield size={14} className="text-indigo-400" /> Status
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg font-black text-[10px] uppercase tracking-widest">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <Building size={14} className="text-indigo-400" /> Organization
                    </span>
                    <span className="font-bold text-gray-800 text-sm">{profileData.companyName || 'Not Set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={14} className="text-indigo-400" /> Joined Date
                    </span>
                    <span className="font-bold text-gray-800 text-sm">{profileData.dateOfJoining || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative group">
             <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <BadgeCheck size={160} />
             </div>
             <h4 className="font-black text-indigo-300 text-[10px] uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                <Shield size={14} /> Official Identification
             </h4>
             <div className="space-y-6 relative z-10">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                   <p className="text-indigo-200 text-[10px] uppercase font-black tracking-widest mb-1">Aadhar Card Number</p>
                   <p className="text-xl font-mono font-black tracking-[0.2em]">{profileData.aadharCardNo?.toString().replace(/.(?=.{4})/g, 'X') || 'XXXX XXXX XXXX'}</p>
                </div>
                <div className="flex justify-between items-end">
                   <div>
                      <p className="text-indigo-200 text-[10px] uppercase font-black tracking-widest mb-1">Verified Since</p>
                      <p className="text-base font-bold text-white">{profileData.dateOfJoining || '---'}</p>
                   </div>
                   <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <BadgeCheck size={20} className="text-white" />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Details Area */}
        <div className="lg:col-span-8 space-y-8">
          <Section title="Personal Details" icon={UserSquare2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <InfoField label="Full Legal Name" value={profileData.candidateName} icon={UserCircle} />
              <InfoField label="Father's Name" value={profileData.fatherName} icon={User} />
              <InfoField label="Date of Birth" value={profileData.bodAsPerAadhar} icon={Calendar} />
              <InfoField label="Gender Identity" value={profileData.gender} icon={BadgeCheck} />
            </div>
          </Section>

          <Section title="Contact Information" icon={Smartphone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <InfoField 
                label="Primary Phone" 
                value={profileData.mobileNo} 
                icon={Phone} 
                name="mobileNo" 
                isEditable={true} 
                isEditing={isEditing} 
                formData={formData} 
                onChange={handleInputChange} 
                onFocus={handleFieldFocus}
              />
              <InfoField 
                label="Email Address" 
                value={profileData.email} 
                icon={MailOpen} 
                name="email" 
                isEditable={true} 
                isEditing={isEditing} 
                formData={formData} 
                onChange={handleInputChange} 
                onFocus={handleFieldFocus}
              />
              <InfoField 
                label="Emergency Contact" 
                value={profileData.familyMobileNo} 
                icon={Phone} 
                name="familyMobileNo" 
                isEditable={true} 
                isEditing={isEditing} 
                formData={formData} 
                onChange={handleInputChange} 
                onFocus={handleFieldFocus}
              />
              <InfoField label="Relationship" value={profileData.relationWithFamily} icon={Info} />
            </div>
          </Section>

          <Section title="Address Records" icon={MapPinned}>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <MapPin size={12} className="text-indigo-400" /> Current Residence
                </label>
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 font-bold text-gray-800 leading-relaxed shadow-inner">
                  {profileData.currentAddress || 'No address registered.'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block flex items-center gap-2">
                  <Shield size={12} className="text-emerald-400" /> Permanent Address (Aadhar)
                </label>
                <div className="bg-emerald-50/20 p-6 rounded-2xl border border-emerald-50 font-bold text-gray-800 leading-relaxed shadow-inner">
                  {profileData.addressAsPerAadhar || 'No address registered.'}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Employment Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <InfoField label="Employment Place" value={profileData.joiningPlace} icon={MapPin} />
              <InfoField label="Organization" value={profileData.companyName} icon={Landmark} />
              <InfoField label="Joining Designation" value={profileData.designation} icon={BadgeCheck} />
              <InfoField label="Monthly Salary (Quoted)" value={profileData.salary ? `₹${profileData.salary}` : '---'} icon={DollarSign} />
            </div>
          </Section>

          <Section title="Bank & Statutory" icon={Landmark}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <InfoField label="Bank A/C Number" value={profileData.bankAccNo} icon={Fingerprint} />
              <InfoField label="IFSC Code" value={profileData.ifscCode} icon={Shield} />
              <InfoField label="Branch Name" value={profileData.branchName} icon={MapPin} />
              <InfoField label="ESIC Number" value={profileData.esicNo} icon={BadgeCheck} />
            </div>
          </Section>
        </div>
      </div>
      
      {/* Print Footer */}
      <div className="hidden print:block border-t-2 border-dashed border-gray-200 mt-16 pt-10 text-center">
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">HR MANAGEMENT SYSTEM - PRIVILEGED DOCUMENT</p>
        <p className="mt-2 text-xs text-gray-400 font-bold italic underline decoration-indigo-200">Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );

};

export default MyProfile;
