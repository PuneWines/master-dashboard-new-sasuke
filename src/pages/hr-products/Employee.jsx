import { toast } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Filter, Search, Clock, CheckCircle, Upload, X, Save, Check } from 'lucide-react';
import useDataStore from '../../store/dataStore';
import { SCRIPT_URLS } from '../../utils/envConfig';

const Employee = () => {
  //  const { employeeData, leavingData } = useDataStore();
  const [activeTab, setActiveTab] = useState('joining');
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningData, setJoiningData] = useState([]);
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [nextEmployeeId, setNextEmployeeId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [editingRows, setEditingRows] = useState({});
  const [joiningFormData, setJoiningFormData] = useState({
    nameAsPerAadhar: '', fatherName: '', dateOfJoining: '', joiningPlace: '', designation: '', salary: '',
    aadharFrontPhoto: null, aadharBackPhoto: null, panCard: null, candidatePhoto: null, currentAddress: '',
    addressAsPerAadhar: '', dobAsPerAadhar: '', gender: '', mobileNo: '', familyMobileNo: '', relationshipWithFamily: '',
    pastPfId: '', currentBankAc: '', ifscCode: '', branchName: '', bankPassbookPhoto: null, personalEmail: '',
    esicNo: '', highestQualification: '', pfEligible: '', esicEligible: '', joiningCompanyName: '', emailToBeIssue: '',
    issueMobile: '', issueLaptop: '', aadharCardNo: '', modeOfAttendance: '', qualificationPhoto: null, paymentMode: '',
    salarySlip: null, resumeCopy: null
  });

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const fetchMasterData = async () => {
    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=Master&action=fetch`
      );
      const result = await response.json();
      if (result.success && result.data) {
        const companyNames = result.data.slice(1).map(row => row[0]).filter(Boolean);
        setCompanies(companyNames);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const generateNextEmployeeId = async () => {
    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`
      );
      const result = await response.json();
      if (result.success && result.data && result.data.length > 6) {
        const dataRows = result.data.slice(6);
        const employeeIds = dataRows.map(row => row[1]).filter(id => id && id.startsWith('JN-'));
        let maxId = 0;
        employeeIds.forEach(id => {
          const num = parseInt(id.replace('JN-', ''));
          if (!isNaN(num) && num > maxId) maxId = num;
        });
        return `JN-${String(maxId + 1).padStart(3, '0')}`;
      }
      return 'JN-001';
    } catch (error) {
      console.error('Error generating employee ID:', error);
      return 'JN-001';
    }
  };

  const handleJoiningInputChange = (e) => {
    const { name, value } = e.target;
    setJoiningFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setJoiningFormData(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; const MAX_HEIGHT = 1200;
          let width = img.width; let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const uploadFileToDrive = async (originalFile, folderId) => {
    try {
      let fileToProcess = originalFile;
      if (originalFile.type.startsWith('image/')) {
        try { fileToProcess = await compressImage(originalFile); } catch(e) {}
      }
      const reader = new FileReader();
      const base64Data = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileToProcess);
      });
      const params = new URLSearchParams();
      params.append('action', 'uploadFile');
      params.append('sheetName', 'JOINING');
      params.append('base64Data', base64Data);
      params.append('fileName', fileToProcess.name);
      params.append('mimeType', fileToProcess.type);
      params.append('folderId', folderId);
      const response = await fetch(SCRIPT_URLS.HR_JOINING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'File upload failed');
      let finalUrl = data.fileUrl;
      if (finalUrl && typeof finalUrl === 'object') finalUrl = finalUrl.fileUrl || finalUrl;
      else if (finalUrl && typeof finalUrl === 'string' && finalUrl.startsWith('{') && finalUrl.includes('fileUrl=')) {
        const match = finalUrl.match(/fileUrl=([^,}]+)/);
        if (match && match[1]) finalUrl = match[1].trim();
      }
      return finalUrl || '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

  const postToJoiningSheet = async (rowData) => {
    try {
      const params = new URLSearchParams();
      params.append('sheetName', 'JOINING');
      params.append('action', 'insert');
      params.append('rowData', JSON.stringify(rowData));
      const response = await fetch(SCRIPT_URLS.HR_JOINING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Server returned unsuccessful response');
      return data;
    } catch (error) {
      throw new Error(`Failed to update sheet: ${error.message}`);
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const uploadPromises = {};
      const fileFields = ['aadharFrontPhoto', 'aadharBackPhoto', 'bankPassbookPhoto', 'qualificationPhoto', 'salarySlip', 'resumeCopy', 'candidatePhoto'];
      const folderIds = {
        aadharFrontPhoto: '13hi-xRLOEksb7GH9CthczzlNJTWuD4X3',
        aadharBackPhoto: '16u6IPq0RtljUIVuZLy7VC_V-nq1I8ZYT',
        bankPassbookPhoto: '19LaYkWtsRQ4sZgYiOG5CvzlIoPWJ_ER8',
        qualificationPhoto: '16EmIG-gZYAT2kRFPaINGPdj3AbP-KE-5',
        salarySlip: '13ZTy1kafDuRwlGVCjehDh6RaqslMguQi',
        resumeCopy: '1rnJ2V4Jmy-pbjZ2qiXBugsmJ7GzypFov',
        candidatePhoto: '145FIQRxwN_omuW2XPHx-Bbk8kFOpzosd'
      };
      for (const field of fileFields) {
        uploadPromises[field] = joiningFormData[field] ? uploadFileToDrive(joiningFormData[field], folderIds[field]) : Promise.resolve('');
      }
      const uploadedUrls = await Promise.all(Object.values(uploadPromises).map(p => p.catch(() => '')));
      const fileUrls = {};
      Object.keys(uploadPromises).forEach((field, index) => { fileUrls[field] = uploadedUrls[index]; });
      
      const now = new Date();
      const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const rowData = [];
      rowData[0] = formattedTimestamp;
      rowData[1] = nextEmployeeId;
      rowData[2] = ''; // Indent No
      rowData[3] = ''; // Candidate Enquiry No
      rowData[4] = joiningFormData.nameAsPerAadhar;
      rowData[5] = joiningFormData.fatherName;
      rowData[6] = formatDOB(joiningFormData.dateOfJoining);
      rowData[7] = joiningFormData.joiningPlace;
      rowData[8] = joiningFormData.designation;
      rowData[9] = joiningFormData.salary;
      rowData[10] = fileUrls.aadharFrontPhoto;
      rowData[11] = fileUrls.aadharBackPhoto;
      rowData[12] = fileUrls.candidatePhoto;
      rowData[13] = joiningFormData.currentAddress;
      rowData[14] = joiningFormData.addressAsPerAadhar;
      rowData[15] = formatDOB(joiningFormData.dobAsPerAadhar);
      rowData[16] = joiningFormData.gender;
      rowData[17] = joiningFormData.mobileNo;
      rowData[18] = joiningFormData.familyMobileNo;
      rowData[19] = joiningFormData.relationshipWithFamily;
      rowData[20] = joiningFormData.pastPfId;
      rowData[21] = joiningFormData.currentBankAc;
      rowData[22] = joiningFormData.ifscCode;
      rowData[23] = joiningFormData.branchName;
      rowData[24] = fileUrls.bankPassbookPhoto;
      rowData[25] = joiningFormData.personalEmail;
      rowData[26] = joiningFormData.esicNo;
      rowData[27] = joiningFormData.highestQualification;
      rowData[28] = joiningFormData.pfEligible;
      rowData[29] = joiningFormData.esicEligible;
      rowData[30] = joiningFormData.joiningCompanyName;
      rowData[31] = joiningFormData.emailToBeIssue;
      rowData[32] = joiningFormData.issueMobile;
      rowData[33] = joiningFormData.issueLaptop;
      rowData[34] = joiningFormData.aadharCardNo;
      rowData[35] = joiningFormData.modeOfAttendance;
      rowData[36] = fileUrls.qualificationPhoto;
      rowData[37] = joiningFormData.paymentMode;
      rowData[38] = fileUrls.salarySlip;
      rowData[39] = fileUrls.resumeCopy;
      rowData[43] = ''; 

      await postToJoiningSheet(rowData);
      toast.success('Employee added successfully!');
      setShowJoiningModal(false);
      
      // Reset form
      setJoiningFormData({
        nameAsPerAadhar: '', fatherName: '', dateOfJoining: '', joiningPlace: '', designation: '', salary: '',
        aadharFrontPhoto: null, aadharBackPhoto: null, panCard: null, candidatePhoto: null, currentAddress: '',
        addressAsPerAadhar: '', dobAsPerAadhar: '', gender: '', mobileNo: '', familyMobileNo: '', relationshipWithFamily: '',
        pastPfId: '', currentBankAc: '', ifscCode: '', branchName: '', bankPassbookPhoto: null, personalEmail: '',
        esicNo: '', highestQualification: '', pfEligible: '', esicEligible: '', joiningCompanyName: '', emailToBeIssue: '',
        issueMobile: '', issueLaptop: '', aadharCardNo: '', modeOfAttendance: '', qualificationPhoto: null, paymentMode: '',
        salarySlip: null, resumeCopy: null
      });

      fetchJoiningData();
    } catch (error) {
      toast.error(`Failed to submit joining form: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingRows(prev => {
      const newRows = { ...prev };
      if (newRows[item.employeeId]) {
        delete newRows[item.employeeId];
      } else {
        const formatForInput = (dateStr) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return dateStr;
        };
        newRows[item.employeeId] = {
          candidateName: item.candidateName || '',
          dateOfJoining: formatForInput(item.dateOfJoining) || '',
          mobileNo: item.mobileNo || '',
          fatherName: item.fatherName || '',
          joiningPlace: item.joiningPlace || '',
          designation: item.designation || '',
          salary: item.salary || ''
        };
      }
      return newRows;
    });
  };

  const handleEditChange = (e, employeeId) => {
    const { name, value } = e.target;
    setEditingRows(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [name]: value
      }
    }));
  };

  const submitSelectedEdits = async () => {
    setLoading(true);
    try {
      const allUpdates = [];

      for (const empId of Object.keys(editingRows)) {
        const item = joiningData.find(d => d.employeeId === empId);
        if (!item) continue;
        
        const empFormData = editingRows[empId];
        const { candidateName, dateOfJoining, mobileNo, fatherName, joiningPlace, designation, salary } = empFormData;

        const formatForInput = (dateStr) => {
          if (!dateStr) return '';
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
          return dateStr;
        };

        if (candidateName !== item.candidateName) allUpdates.push({ rowIndex: item.rowIndex, col: item.colNameAsPerAadhar, val: candidateName });
        if (dateOfJoining !== formatForInput(item.dateOfJoining)) Object.is(dateOfJoining, '') ? null : allUpdates.push({ rowIndex: item.rowIndex, col: item.colDateOfJoining, val: formatDOB(dateOfJoining) });
        if (mobileNo !== item.mobileNo) allUpdates.push({ rowIndex: item.rowIndex, col: item.colMobileNo, val: mobileNo });
        if (fatherName !== item.fatherName) allUpdates.push({ rowIndex: item.rowIndex, col: item.colFatherName, val: fatherName });
        if (joiningPlace !== item.joiningPlace) allUpdates.push({ rowIndex: item.rowIndex, col: item.colJoiningPlace, val: joiningPlace });
        if (designation !== item.designation) allUpdates.push({ rowIndex: item.rowIndex, col: item.colDesignation, val: designation });
        if (salary !== item.salary?.toString()) allUpdates.push({ rowIndex: item.rowIndex, col: item.colSalary, val: salary });
      }

      for (const update of allUpdates) {
        if (!update.col) continue;
        await fetch(SCRIPT_URLS.HR_JOINING, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            sheetName: "JOINING",
            action: "updateCell",
            rowIndex: update.rowIndex.toString(),
            columnIndex: update.col.toString(),
            value: update.val
          }).toString()
        });
      }
      
      toast.success('Selected employees updated successfully!');
      setEditingRows({});
      fetchJoiningData();
    } catch(err) {
      toast.error('Update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoiningData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=JOINING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Raw JOINING API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from JOINING sheet');
      }

      // Handle both array formats (direct data or result.data)
      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Get headers from row 6 (index 5 in 0-based array)
      const headers = rawData[5];

      // Process data starting from row 7 (index 6)
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      const getIndex = (headerName) => {
        const index = headers.findIndex(h =>
          h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
        );
        if (index === -1) {
          console.warn(`Column "${headerName}" not found in sheet`);
        }
        return index;
      };

      const processedData = dataRows.map((row, index) => ({
        employeeId: row[getIndex('Employee ID')] || '',
        candidateName: row[getIndex('Name As Per Aadhar')] || '',
        fatherName: row[getIndex('Father Name')] || '',
        dateOfJoining: row[getIndex('Date Of Joining')] || '',
        joiningPlace: row[getIndex('Joining Place')] || '',
        designation: row[getIndex('Designation')] || '',
        salary: row[getIndex('Salary')] || '',
        mobileNo: row[getIndex('Mobile No.')] || '',
        status: row[getIndex('Status')] || '',
        rowIndex: index + 7,
        colNameAsPerAadhar: getIndex('Name As Per Aadhar') + 1,
        colFatherName: getIndex('Father Name') + 1,
        colDateOfJoining: getIndex('Date Of Joining') + 1,
        colJoiningPlace: getIndex('Joining Place') + 1,
        colDesignation: getIndex('Designation') + 1,
        colSalary: getIndex('Salary') + 1,
        colMobileNo: getIndex('Mobile No.') + 1,
      }));

      setJoiningData(processedData);


    } catch (error) {
      console.error('Error fetching joining data:', error);
      setError(error.message);
      toast.error(`Failed to load joining data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchLeavingData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${SCRIPT_URLS.HR_JOINING}?sheet=LEAVING&action=fetch`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data from LEAVING sheet');
      }

      const rawData = result.data || result;

      if (!Array.isArray(rawData)) {
        throw new Error('Expected array data not received');
      }

      // Process data starting from row 7 (index 6) - skip headers
      const dataRows = rawData.length > 6 ? rawData.slice(6) : [];

      const processedData = dataRows.map(row => ({
        timestamp: row[0] || '',
        employeeId: row[1] || '',
        name: row[2] || '',
        dateOfLeaving: row[3] || '',
        mobileNo: row[4] || '',
        reasonOfLeaving: row[5] || '',
        firmName: row[6] || '',
        fatherName: row[7] || '',
        dateOfJoining: row[8] || '',
        workingLocation: row[9] || '',
        designation: row[10] || '',
        salary: row[11] || '',
        plannedDate: row[12] || '',
        actual: row[13] || ''
      }));


      setLeavingData(processedData);

      // const historyTasks = processedData.filter(
      //   task => task.plannedDate && task.actual
      // );
      // setHistoryData(historyTasks);

    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
      toast.error(`Failed to load leaving data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchJoiningData();
    fetchMasterData();
    fetchLeavingData();
  }, []);

  // Active employees (not in leaving data)
  // const joiningEmployees = employeeData.filter(employee => 
  //   !leavingData.some(leaving => leaving.employeeId === employee.employeeId)
  // );

  // // Employees who have left
  // const leavingEmployees = leavingData;

  const filteredJoiningData = joiningData.filter(item => {
    const matchesSearch = item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredLeavingData = leavingData.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ">Employee</h1>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md space-x-2">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300   rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white  text-gray-500 "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 " />
          </div>
          {Object.keys(editingRows).length > 0 && activeTab === 'joining' && (
            <button
              onClick={submitSelectedEdits}
              disabled={loading}
              className="inline-flex shrink-0 items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none"
            >
              {loading ? 'Saving...' : 'Save Selected'}
            </button>
          )}
          <button 
              onClick={async () => {
                const nextId = await generateNextEmployeeId();
                setNextEmployeeId(nextId);
                setShowJoiningModal(true);
              }}
              className="inline-flex shrink-0 items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              New Joining
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300 ">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'joining'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('joining')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Joining ({filteredJoiningData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'leaving'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('leaving')}
            >
              <Clock size={16} className="inline mr-2" />
              Leaving ({filteredLeavingData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'joining' && (
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-white border-separate border-spacing-0">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Joining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white ">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading pending calls...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchJoiningData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredJoiningData.map((item, index) => {
                    const isEditing = !!editingRows[item.employeeId];
                    const rowEditData = editingRows[item.employeeId] || {};
                    return (
                    <tr key={index} className="hover:bg-white hover:bg-opacity-5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isEditing}
                            onChange={() => handleEditClick(item)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="candidateName" value={rowEditData.candidateName} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-32" />
                        ) : item.candidateName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="date" name="dateOfJoining" value={rowEditData.dateOfJoining} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-32" />
                        ) : (item.dateOfJoining ? formatDOB(item.dateOfJoining) : '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="mobileNo" value={rowEditData.mobileNo} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-28" />
                        ) : item.mobileNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="fatherName" value={rowEditData.fatherName} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-32" />
                        ) : item.fatherName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="joiningPlace" value={rowEditData.joiningPlace} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-28" />
                        ) : (item.joiningPlace || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="text" name="designation" value={rowEditData.designation} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-28" />
                        ) : item.designation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isEditing ? (
                          <input type="number" name="salary" value={rowEditData.salary} onChange={(e) => handleEditChange(e, item.employeeId)} className="border p-1 rounded w-24" />
                        ) : item.salary}
                      </td>
                    </tr>
                  )})}

                </tbody>
              </table>
              {!tableLoading && filteredJoiningData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">No joining employees found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaving' && (
            <div className="overflow-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-white border-separate border-spacing-0">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Joining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Of Leaving</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason Of Leaving</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white ">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading pending calls...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchLeavingData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredLeavingData.map((item, index) => (
                    <tr key={index} className="hover:bg-white ">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.dateOfJoining ? formatDOB(item.dateOfJoining) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.dateOfLeaving ? formatDOB(item.dateOfLeaving) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobileNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.fatherName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.workingLocation || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reasonOfLeaving}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tableLoading && filteredLeavingData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">No leaving employees found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showJoiningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-300 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-900">Direct Employee Joining Form</h3>
              <button onClick={() => setShowJoiningModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJoiningSubmit} className="p-6 space-y-6">
              {/* Section 1: Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input type="text" value={nextEmployeeId} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indent No</label>
                  <input type="text" value="" disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name As Per Aadhar *</label>
                  <input type="text" name="nameAsPerAadhar" value={joiningFormData.nameAsPerAadhar} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                  <input type="text" name="fatherName" value={joiningFormData.fatherName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Birth *</label>
                  <input type="date" name="dobAsPerAadhar" value={joiningFormData.dobAsPerAadhar} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={joiningFormData.gender} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No. *</label>
                  <input type="tel" name="mobileNo" value={joiningFormData.mobileNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Email *</label>
                  <input type="email" name="personalEmail" value={joiningFormData.personalEmail} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Mobile Number *</label>
                  <input name="familyMobileNo" value={joiningFormData.familyMobileNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship With Family *</label>
                  <input name="relationshipWithFamily" value={joiningFormData.relationshipWithFamily} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Section 3: Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Address *</label>
                  <textarea name="currentAddress" value={joiningFormData.currentAddress} onChange={handleJoiningInputChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address as per Aadhar *</label>
                  <textarea name="addressAsPerAadhar" value={joiningFormData.addressAsPerAadhar} onChange={handleJoiningInputChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>

              {/* Section 4: Employment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Of Joining *</label><input type="date" name="dateOfJoining" value={joiningFormData.dateOfJoining} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Joining Place</label><input type="text" name="joiningPlace" value={joiningFormData.joiningPlace} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label><input type="text" name="designation" value={joiningFormData.designation} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Salary</label><input type="number" name="salary" value={joiningFormData.salary} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joining Company Name *</label>
                  <select name="joiningCompanyName" value={joiningFormData.joiningCompanyName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required>
                    <option value="">Select Company</option>
                    {companies.map((company, index) => <option key={index} value={company}>{company}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mode of Attendance *</label><input name="modeOfAttendance" value={joiningFormData.modeOfAttendance} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
              </div>

              {/* Section 5: Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Aadhar Number *</label><input type="text" name="aadharCardNo" value={joiningFormData.aadharCardNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium mb-1">Current Account No*</label><input name="currentBankAc" value={joiningFormData.currentBankAc} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">IFSC Code*</label><input name="ifscCode" value={joiningFormData.ifscCode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Branch Name*</label><input name="branchName" value={joiningFormData.branchName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Mode *</label><input name="paymentMode" value={joiningFormData.paymentMode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2" /></div>
              </div>

              {/* Section 6: Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Email Issue</label><select name="emailToBeIssue" value={joiningFormData.emailToBeIssue} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Mobile Issue</label><select name="issueMobile" value={joiningFormData.issueMobile} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Laptop Issue</label><select name="issueLaptop" value={joiningFormData.issueLaptop} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Past PF No</label><input name="pastPfId" value={joiningFormData.pastPfId} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">ESIC No</label><input name="esicNo" value={joiningFormData.esicNo} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Highest Qualification</label><input name="highestQualification" value={joiningFormData.highestQualification} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">PF Eligible</label><select name="pfEligible" value={joiningFormData.pfEligible} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
                <div><label className="block text-sm font-medium mb-1">ESIC Eligible</label><select name="esicEligible" value={joiningFormData.esicEligible} onChange={handleJoiningInputChange} className="w-full border rounded-md px-3 py-2"><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              </div>

              {/* Section 8: Document Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { field: 'candidatePhoto', label: 'Candidate Photo' },
                  { field: 'aadharFrontPhoto', label: 'Aadhar Card' },
                  { field: 'aadharBackPhoto', label: 'Pan Card' },
                  { field: 'bankPassbookPhoto', label: 'Photo Of Front Bank Passbook' },
                  { field: 'qualificationPhoto', label: 'Qualification Photo' },
                  { field: 'salarySlip', label: 'Salary Slip', accept: 'image/*,application/pdf' },
                  { field: 'resumeCopy', label: 'Upload Resume', accept: 'image/*,application/pdf' },
                ].map((upload) => (
                  <div key={upload.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{upload.label}</label>
                    <div className="flex items-center space-x-2">
                      <input type="file" accept={upload.accept || "image/*"} onChange={(e) => handleFileChange(e, upload.field)} className="hidden" id={`upload-${upload.field}`} />
                      <label htmlFor={`upload-${upload.field}`} className="flex items-center px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50 text-gray-700">
                        <Upload size={16} className="mr-2" /> Upload
                      </label>
                      {joiningFormData[upload.field] && <span className="text-sm text-gray-700 truncate max-w-[150px]">{joiningFormData[upload.field].name}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button type="button" onClick={() => setShowJoiningModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 flex items-center ${submitting ? 'opacity-90 cursor-not-allowed' : ''}`}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Employee;
