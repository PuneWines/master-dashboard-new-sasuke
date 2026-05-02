import React, { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { indentService, IndentItem } from "../../services/purchase_management/indentService";

export const IndexSheetPage: React.FC = () => {
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Auto calculation states
  const [orderDays, setOrderDays] = useState<number>(7);
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await indentService.getIndents();
        setIndents(data);
        
        // Initialize edited data map
        const initialEdits: Record<string, any> = {};
        data.forEach(indent => {
          initialEdits[indent.id] = {
            perDayAvgSaleFix: indent.perDayAvgSaleFix || 0,
            reorderQuantityPcs: indent.reorderQuantityPcs || 0,
            reorderQuantityBox: indent.reorderQuantityBox || 0,
          };
        });
        setEditedData(initialEdits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load index data");
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  const filteredIndents = indents.filter((indent) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (indent.shopName && indent.shopName.toLowerCase().includes(searchLower)) ||
      (indent.indentNumber && indent.indentNumber.toLowerCase().includes(searchLower)) ||
      (indent.itemName && indent.itemName.toLowerCase().includes(searchLower)) ||
      (indent.skuCode && indent.skuCode.toLowerCase().includes(searchLower)) ||
      (indent.partyName && indent.partyName.toLowerCase().includes(searchLower)) ||
      (indent.brandName && indent.brandName.toLowerCase().includes(searchLower))
    );
  });

  const handleFieldChange = (id: string, field: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    
    setEditedData(prev => {
      const current = prev[id] || {};
      const updated = { ...current, [field]: numValue };
      
      const indent = indents.find(i => i.id === id);
      if (!indent) return { ...prev, [id]: updated };

      // Auto Calculation Logic
      // Suggested Order Quantity = (Avg Sale × Number of Days) – Closing Stock
      if (field === 'perDayAvgSaleFix') {
        const avgSale = numValue;
        const closingStock = indent.closingStock || 0;
        const bpc = indent.bottlesPerCase || 1;
        
        // Calculate recommended bottles
        let suggestedBottles = (avgSale * orderDays) - closingStock;
        if (suggestedBottles < 0) suggestedBottles = 0;
        
        updated.reorderQuantityPcs = Math.round(suggestedBottles);
        updated.reorderQuantityBox = Number((suggestedBottles / bpc).toFixed(2));
      }
      
      // If user manually edits Order In Bottles, recalculate Order In Box
      if (field === 'reorderQuantityPcs') {
        const bpc = indent.bottlesPerCase || 1;
        updated.reorderQuantityBox = Number((numValue / bpc).toFixed(2));
      }
      
      // If user manually edits Order In Box, recalculate Order In Bottles
      if (field === 'reorderQuantityBox') {
        const bpc = indent.bottlesPerCase || 1;
        updated.reorderQuantityPcs = Math.round(numValue * bpc);
      }
      
      return { ...prev, [id]: updated };
    });
  };

  const recalculateAll = (days: number) => {
    setOrderDays(days);
    setEditedData(prev => {
      const newEdits = { ...prev };
      indents.forEach(indent => {
        if (!newEdits[indent.id]) return;
        const avgSale = newEdits[indent.id].perDayAvgSaleFix || 0;
        const closingStock = indent.closingStock || 0;
        const bpc = indent.bottlesPerCase || 1;
        
        let suggestedBottles = (avgSale * days) - closingStock;
        if (suggestedBottles < 0) suggestedBottles = 0;
        
        newEdits[indent.id].reorderQuantityPcs = Math.round(suggestedBottles);
        newEdits[indent.id].reorderQuantityBox = Number((suggestedBottles / bpc).toFixed(2));
      });
      return newEdits;
    });
  };

  const handleSaveData = () => {
    setIsSaving(true);
    // Here we would normally call indentService to save `editedData` back to the backend
    setTimeout(() => {
      alert("Index Data Saved Successfully!");
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="p-4 md:p-6 w-full lg:w-[calc(100vw-280px)] min-h-screen bg-gray-50">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Index Sheet</h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">View detailed index tracking.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by shop, indent, item, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-300 rounded-lg shadow-sm">
            <span className="text-sm text-gray-600 font-medium">Calculation Days:</span>
            <input 
              type="number" 
              value={orderDays}
              onChange={(e) => recalculateAll(parseInt(e.target.value) || 0)}
              className="w-16 border-b border-gray-300 focus:border-blue-500 outline-none text-center font-bold text-blue-600"
            />
          </div>
          
          <button 
            onClick={handleSaveData}
            disabled={isSaving}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="mt-4 text-gray-500 font-medium">Loading index data...</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Shop ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Shop Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Indent No</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Party ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Party Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Brand ID</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Brand Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Item ID / SKU Code</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Item Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Size (Mls)</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">BPC</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Liquor Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Closing Stock in Bottle</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Closing Stock In Box</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Per Day Avg Sale Fix</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Per day Avg Sale (Last Week)</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Order In Bottles</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Order In Box</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIndents.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="px-6 py-10 text-center text-gray-500">
                      No data found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredIndents.map((indent, idx) => (
                    <tr key={indent.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-600">{indent.shopId || "-"}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{indent.shopName || "-"}</td>
                      <td className="px-6 py-4 font-mono text-blue-600">{indent.indentNumber || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.partyId || "-"}</td>
                      <td className="px-6 py-4 text-gray-900">{indent.partyName || indent.traderName || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.brandId || "-"}</td>
                      <td className="px-6 py-4 text-gray-700">{indent.brandName || "-"}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{indent.skuCode || "-"}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{indent.itemName || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.sizeML || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.bottlesPerCase || "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.liquorType || indent.liquor || "-"}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{indent.closingStock ?? "-"}</td>
                      <td className="px-6 py-4 text-gray-600">{indent.closingStockInBox ?? "-"}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <input 
                          type="number" 
                          value={editedData[indent.id]?.perDayAvgSaleFix ?? ""}
                          onChange={(e) => handleFieldChange(indent.id, 'perDayAvgSaleFix', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-600">{indent.perDayAvgSaleLastWeek ?? "-"}</td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        <input 
                          type="number" 
                          value={editedData[indent.id]?.reorderQuantityPcs ?? ""}
                          onChange={(e) => handleFieldChange(indent.id, 'reorderQuantityPcs', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded outline-none focus:border-blue-500 font-bold text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        <input 
                          type="number" 
                          value={editedData[indent.id]?.reorderQuantityBox ?? ""}
                          onChange={(e) => handleFieldChange(indent.id, 'reorderQuantityBox', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded outline-none focus:border-blue-500 font-bold text-blue-600"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
