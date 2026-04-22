import React, { createContext, useContext, useState, useEffect } from 'react';

const IndexContext = createContext();

// Use centralized SCRIPT_URLS pattern like other modules
const SCRIPT_URL = import.meta.env.VITE_INDEX_SYSTEMS_ID 
  ? `https://script.google.com/macros/s/${import.meta.env.VITE_INDEX_SYSTEMS_ID}/exec`
  : '';

export const IndexProvider = ({ children }) => {
  const [indexData, setIndexData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchSheetData = async () => {
    if (!SCRIPT_URL) return;
    setLoading(true);
    try {
      const response = await fetch(SCRIPT_URL);
      const data = await response.json();
      setIndexData(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching sheet data:", err);
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  const addIndex = async (newItem) => {
    if (!SCRIPT_URL) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({
        action: 'add',
        ...newItem
      }).toString();
      await fetch(`${SCRIPT_URL}?${params}`, { method: 'GET', mode: 'no-cors' });
      setTimeout(fetchSheetData, 1500);
      return true;
    } catch (err) {
      console.error("Error saving to sheet:", err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteIndex = async (id) => {
    if (!SCRIPT_URL) return;
    if (window.confirm('Kya aap ise permanently delete karna chahte hain?')) {
      // UI se turant remove karo taaki user ko feel ho delete ho gaya
      setIndexData(prev => prev.filter(item => item.id !== id));
      
      try {
        const url = `${SCRIPT_URL}?action=delete&id=${id}`;
        // No-cors mode mein response read nahi kar sakte, par request sheet tak pahuch jayegi
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        
        // Final sync
        setTimeout(fetchSheetData, 2000);
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const stats = {
    totalFms: indexData.length,
    totalStages: indexData.reduce((acc, item) => acc + (item.stages ? String(item.stages).split('\n').length : 0), 0),
    totalDoers: indexData.reduce((acc, item) => acc + (item.doers ? String(item.doers).split('\n').length : 0), 0),
    runningFms: indexData.filter(item => {
      const statusV = item.status || item['Running/NotRunning'] || '';
      return String(statusV).toLowerCase().trim() === 'running';
    }).length,
    notRunningFms: indexData.filter(item => {
      const statusV = item.status || item['Running/NotRunning'] || '';
      const s = String(statusV).toLowerCase().trim();
      return s.includes('not running') || s.includes('notrunning') || s.includes('not-running');
    }).length,
  };

  return (
    <IndexContext.Provider value={{ indexData, loading, saving, error, addIndex, deleteIndex, stats, refreshData: fetchSheetData }}>
      {children}
    </IndexContext.Provider>
  );
};

export const useIndex = () => useContext(IndexContext);
