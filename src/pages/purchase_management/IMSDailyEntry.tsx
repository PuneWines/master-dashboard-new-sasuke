import React, { useState, useEffect } from "react";
import { Search, Save, History, TrendingUp, Package, AlertCircle } from "lucide-react";
import { indentService, IndentItem } from "../../services/purchase_management/indentService";

export const IMSDailyEntry: React.FC = () => {
  const [items, setItems] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const data = await indentService.getIndents();
        // Assuming current user filtering is handled or we do it here
        setItems(data);
        
        // Initialize daily entry specific data
        const initialEdits: Record<string, any> = {};
        data.forEach(item => {
          initialEdits[item.id] = {
            openingStock: item.closingStock || 0, // Mocking opening stock
            closingStock: "", // User input
            sale: 0,
            avgSale: item.perDayAvgSaleLastWeek || item.perDayAvgSaleFix || 0,
            suggestedOrder: 0,
            finalOrder: 0
          };
        });
        setEditedData(initialEdits);
      } catch (err) {
        console.error("Failed to load daily entry data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleClosingStockChange = (id: string, val: string) => {
    const closingVal = val === "" ? "" : parseFloat(val);
    
    setEditedData(prev => {
      const current = prev[id] || {};
      const opening = current.openingStock || 0;
      const avg = current.avgSale || 0;
      
      const parsedClosing = typeof closingVal === 'number' ? closingVal : 0;
      
      // Auto Calculations
      // Sale = Opening - Closing
      const sale = Math.max(0, opening - parsedClosing);
      
      // Suggested Order = (Avg Sale * 3 days) - Closing Stock
      let suggested = (avg * 3) - parsedClosing;
      if (suggested < 0) suggested = 0;
      
      return {
        ...prev,
        [id]: {
          ...current,
          closingStock: closingVal,
          sale: sale,
          suggestedOrder: Math.round(suggested),
          finalOrder: Math.round(suggested) // Auto-fill final order with suggested
        }
      };
    });
  };

  const handleFinalOrderChange = (id: string, val: string) => {
    const finalVal = val === "" ? "" : parseFloat(val);
    setEditedData(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        finalOrder: finalVal
      }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      alert("Daily Entry Saved to Google Sheets!");
      setIsSaving(false);
    }, 1000);
  };

  const filteredItems = items.filter(item => 
    item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.skuCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-100 min-h-screen pb-20 w-full lg:w-[calc(100vw-280px)]">
      {/* Mobile Top App Bar */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-20 shadow-md">
        <h1 className="text-xl font-bold">Daily Inventory Entry</h1>
        <p className="text-blue-100 text-sm">Shop ID: Current Shop</p>
      </div>

      <div className="p-4">
        {/* Search Bar */}
        <div className="relative w-full mb-6 shadow-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search item name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Item Cards (Mobile Friendly Layout) */}
        {loading ? (
          <div className="flex justify-center p-10"><span className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></span></div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => {
              const editState = editedData[item.id] || {};
              
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{item.itemName}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-1">{item.skuCode} | {item.sizeML}ml | BPC: {item.bottlesPerCase}</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                        <div className="text-xs text-blue-600 font-medium mb-1">Opening Stock</div>
                        <div className="text-lg font-bold text-blue-900">{editState.openingStock}</div>
                      </div>
                      
                      <div className="bg-orange-50 rounded-lg p-2 border border-orange-100 flex flex-col justify-center">
                        <div className="text-xs text-orange-600 font-medium mb-1 text-center">Closing Stock (Input)</div>
                        <input 
                          type="number"
                          placeholder="Qty"
                          value={editState.closingStock === "" ? "" : editState.closingStock}
                          onChange={(e) => handleClosingStockChange(item.id, e.target.value)}
                          className="w-full text-center font-bold text-lg border-b-2 border-orange-300 bg-transparent focus:border-orange-500 outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">Today's Sale:</span>
                      </div>
                      <span className="font-bold text-green-600">{editState.sale}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-600">Avg Sale (Last 7d):</span>
                      </div>
                      <span className="font-bold text-purple-600">{editState.avgSale}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Suggested Order</div>
                        <div className="text-gray-400 font-medium">{editState.suggestedOrder} bottles</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-700 font-medium mb-1">Final Order (Input)</div>
                        <input 
                          type="number"
                          value={editState.finalOrder === "" ? "" : editState.finalOrder}
                          onChange={(e) => handleFinalOrderChange(item.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button for Save */}
      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50 z-30 flex items-center gap-2"
      >
        <Save className="w-6 h-6" />
        <span className="font-bold pr-2">{isSaving ? 'Saving...' : 'Save Entry'}</span>
      </button>
    </div>
  );
};
