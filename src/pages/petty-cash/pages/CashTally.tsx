// ============================================================
// CashTally.tsx - RBAC: Counter Access + Shop Filter
//
// Changes from original:
//   - hasCounterAccess() use karta hai counter check ke liye
//   - "Counter 1", "Cash Tally - Counter 1" dono formats support
//   - Shop dropdown: Admin ko sab shops, baaki ko sirf allowed shops
//   - Auto-select if user has exactly one shop
// ============================================================
import { useState, useEffect } from "react";
import Toast from "../components/Toast";
import { FaTimes, FaUser, FaShoppingCart, FaTruck, FaPlus } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

interface CashTallyProps {
  isOpen?: boolean;
  onClose?: () => void;
  counter?: number;
  initialData?: any;
}

export default function CashTally({
  isOpen = true,
  onClose = () => { },
  counter = 1,
  initialData,
}: CashTallyProps) {
  // ── RBAC ─────────────────────────────────────────────────
  const { hasCounterAccess, hasShopAccess, isAdmin, user } = useAuth();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    shopName: "",
    retailScanAmount: "",
    retail500: "",
    retail200: "",
    retail100: "",
    retail50: "",
    retail20: "",
    retail10: "",
    retail1: "",
    retailGpay: "",
    retailCard: "",
    retailPhonePe: "",
    retailPaytm: "",
    expense: "",
    wsCashBillingAmount: "",
    wsCreditBillingAmount: "",
    wsCreditReceipt: "",
    ws500: "",
    ws200: "",
    ws100: "",
    ws50: "",
    ws20: "",
    ws10: "",
    ws1: "",
    wsGpayCard: "",
    wsPhonePe: "",
    wsPaytm: "",
    wsCard: "",
    homeDelivery: "",
    retail1500: "",
    retail2200: "",
    retail3100: "",
    retail450: "",
    retail520: "",
    retail610: "",
    retail71: "",
    expenseGpayCard: "",
    voidSale: "",
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<string[]>([]);
  const [fetchedShopNames, setFetchedShopNames] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbx5dryxS1R5zp6myFfUlP1QPimufTqh5hcPcFMNcAJ-FiC-hyQL9mCkgHSbLkOiWTibeg/exec";

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheetName=Login&action=getSheetData`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const names = result.data
          .map((row: any[]) => row[0])
          .filter((name: string) => !!name && name.toString().trim() !== "Name");
        setEmployees(names);
      }
    } catch (error) {
      console.error("[CashTally] Error fetching employees:", error);
    }
  };

  const fetchShopNames = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheetName=Master&action=getSheetData`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        let shopNames: string[] = result.data
          .map((row: any[]) => row[3]) // Column D
          .filter((name: string) => !!name && name.toLowerCase() !== "shop name");

        shopNames = ["KUNAL ULWE", ...shopNames];
        let uniqueShops = Array.from(new Set(shopNames)) as string[];

        // [RBAC] Admin ko sab shops milenge, baaki ko sirf allowed
        if (!isAdmin() && user?.shops !== "all") {
          uniqueShops = uniqueShops.filter((shop) => hasShopAccess(shop));
          console.log("[CashTally] Shops after RBAC filter:", uniqueShops);
        }

        setFetchedShopNames(uniqueShops);

        // [RBAC] Ek hi shop hai to auto-select karo
        if (uniqueShops.length === 1) {
          setFormData((prev) => ({ ...prev, shopName: uniqueShops[0] }));
        }
      }
    } catch (error) {
      console.error("[CashTally] Error fetching shops:", error);
    }
  };

  const emptyForm = {
    date: new Date().toISOString().split("T")[0],
    name: "",
    shopName: "",
    retailScanAmount: "",
    retail500: "",
    retail200: "",
    retail100: "",
    retail50: "",
    retail20: "",
    retail10: "",
    retail1: "",
    retailGpay: "",
    retailCard: "",
    retailPhonePe: "",
    retailPaytm: "",
    expense: "",
    wsCashBillingAmount: "",
    wsCreditBillingAmount: "",
    wsCreditReceipt: "",
    ws500: "",
    ws200: "",
    ws100: "",
    ws50: "",
    ws20: "",
    ws10: "",
    ws1: "",
    wsGpayCard: "",
    wsPhonePe: "",
    wsPaytm: "",
    wsCard: "",
    homeDelivery: "",
    retail1500: "",
    retail2200: "",
    retail3100: "",
    retail450: "",
    retail520: "",
    retail610: "",
    retail71: "",
    expenseGpayCard: "",
    voidSale: "",
  };

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || emptyForm);
      fetchEmployees();
      fetchShopNames();
    }
  }, [isOpen, initialData]);

  const [retailActualSale, setRetailActualSale] = useState(0);
  const [retailDiff, setRetailDiff] = useState(0);
  const [wholesaleTotalSale, setWholesaleTotalSale] = useState(0);
  const [wholesaleDiff, setWholesaleDiff] = useState(0);
  const [homeDeliveryDiff, setHomeDeliveryDiff] = useState(0);

  useEffect(() => {
    const retailCashSum = [
      (Math.round(parseFloat(formData.retail500)) || 0) * 500,
      (Math.round(parseFloat(formData.retail200)) || 0) * 200,
      (Math.round(parseFloat(formData.retail100)) || 0) * 100,
      (Math.round(parseFloat(formData.retail50)) || 0) * 50,
      (Math.round(parseFloat(formData.retail20)) || 0) * 20,
      (Math.round(parseFloat(formData.retail10)) || 0) * 10,
      (Math.round(parseFloat(formData.retail1)) || 0) * 1,
    ].reduce((acc, val) => acc + val, 0);

    const actualSale =
      (Math.round(parseFloat(formData.retailScanAmount)) || 0) -
      (Math.round(parseFloat(formData.voidSale)) || 0);
    setRetailActualSale(actualSale);

    const retailGpay = Math.round(parseFloat(formData.retailGpay)) || 0;
    const retailCard = Math.round(parseFloat(formData.retailCard)) || 0;
    const retailPhonePe = Math.round(parseFloat(formData.retailPhonePe)) || 0;
    const retailPaytm = Math.round(parseFloat(formData.retailPaytm)) || 0;
    const retailExpense = Math.round(parseFloat(formData.expense)) || 0;

    const retailTotalPayments =
      retailCashSum + retailGpay + retailCard + retailPhonePe + retailPaytm + retailExpense;
    setRetailDiff(actualSale - retailTotalPayments);

    const wholesaleCashSum = [
      (Math.round(parseFloat(formData.ws500)) || 0) * 500,
      (Math.round(parseFloat(formData.ws200)) || 0) * 200,
      (Math.round(parseFloat(formData.ws100)) || 0) * 100,
      (Math.round(parseFloat(formData.ws50)) || 0) * 50,
      (Math.round(parseFloat(formData.ws20)) || 0) * 20,
      (Math.round(parseFloat(formData.ws10)) || 0) * 10,
      (Math.round(parseFloat(formData.ws1)) || 0) * 1,
    ].reduce((acc, val) => acc + val, 0);

    const totalWhoSale =
      (Math.round(parseFloat(formData.wsCashBillingAmount)) || 0) +
      (Math.round(parseFloat(formData.wsCreditReceipt)) || 0);
    setWholesaleTotalSale(totalWhoSale);

    const wsGpayCard = Math.round(parseFloat(formData.wsGpayCard)) || 0;
    const wsPhonePe = Math.round(parseFloat(formData.wsPhonePe)) || 0;
    const wsPaytm = Math.round(parseFloat(formData.wsPaytm)) || 0;
    const wsCard = Math.round(parseFloat(formData.wsCard)) || 0;

    const wholesaleTotalPayments =
      wholesaleCashSum + wsGpayCard + wsPhonePe + wsPaytm + wsCard;
    setWholesaleDiff(totalWhoSale - wholesaleTotalPayments);

    const homeDeliveryCashSum = [
      (Math.round(parseFloat(formData.retail1500)) || 0) * 500,
      (Math.round(parseFloat(formData.retail2200)) || 0) * 200,
      (Math.round(parseFloat(formData.retail3100)) || 0) * 100,
      (Math.round(parseFloat(formData.retail450)) || 0) * 50,
      (Math.round(parseFloat(formData.retail520)) || 0) * 20,
      (Math.round(parseFloat(formData.retail610)) || 0) * 10,
      (Math.round(parseFloat(formData.retail71)) || 0) * 1,
    ].reduce((acc, val) => acc + val, 0);

    const hdAmount = Math.round(parseFloat(formData.homeDelivery)) || 0;
    const homeDeliveryDiffValue = hdAmount - homeDeliveryCashSum;
    setHomeDeliveryDiff(homeDeliveryDiffValue);

    const totalDiffSum =
      actualSale - retailTotalPayments +
      (totalWhoSale - wholesaleTotalPayments) +
      homeDeliveryDiffValue;
    setTotalAmount(totalDiffSum);
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const timestamp = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const sheetName = `Cash Tally Counter ${counter}`;

      let generatedId = "CT-01";
      try {
        const idResponse = await fetch(
          `${SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}&action=getLastId`
        );
        const idResult = await idResponse.json();
        if (idResult.success && idResult.lastId) {
          const lastNumber = parseInt(idResult.lastId.split("-")[1]) || 0;
          generatedId = `CT-${String(lastNumber + 1).padStart(2, "0")}`;
        }
      } catch (error) {
        console.error("[CashTally] ID generation error:", error);
      }

      const rowData = [
        timestamp,
        generatedId,
        formData.date,
        formData.name,
        formData.shopName,
        formData.retailScanAmount,
        formData.retail500,
        formData.retail200,
        formData.retail100,
        formData.retail50,
        formData.retail20,
        formData.retail10,
        formData.retail1,
        formData.retailGpay,
        formData.retailPhonePe,
        formData.retailPaytm,
        formData.retailCard,
        formData.wsCashBillingAmount,
        formData.wsCreditBillingAmount,
        formData.wsCreditReceipt,
        formData.ws500,
        formData.ws200,
        formData.ws100,
        formData.ws50,
        formData.ws20,
        formData.ws10,
        formData.ws1,
        formData.wsGpayCard,
        formData.wsPhonePe,
        formData.wsPaytm,
        formData.wsCard,
        formData.expense,
        formData.homeDelivery,
        formData.retail1500,
        formData.retail2200,
        formData.retail3100,
        formData.retail450,
        formData.retail520,
        formData.retail610,
        formData.retail71,
        formData.voidSale,
        formData.expenseGpayCard,
      ];

      const formDataToSend = new URLSearchParams({
        sheetName,
        action: "insert",
        rowData: JSON.stringify(rowData),
      });

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        const existingEntries = JSON.parse(
          localStorage.getItem("cashTallyEntries") || "[]"
        );
        if (initialData) {
          const updated = existingEntries.map((entry: any) =>
            entry.id === initialData.id
              ? { ...formData, id: initialData.id }
              : entry
          );
          localStorage.setItem("cashTallyEntries", JSON.stringify(updated));
        } else {
          const newEntry = { id: Date.now().toString(), ...formData };
          localStorage.setItem(
            "cashTallyEntries",
            JSON.stringify([newEntry, ...existingEntries])
          );
        }

        setToast({ message: "Data saved successfully!", type: "success" });
        setTimeout(() => {
          onClose();
          setIsLoading(false);
        }, 1000);
      } else {
        setToast({
          message: "Failed to save data: " + result.error,
          type: "error",
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[CashTally] Submit error:", error);
      setToast({
        message: "Error submitting form. Please try again.",
        type: "error",
      });
      setIsLoading(false);
    }
  };

  // ── [RBAC] Counter access check ──────────────────────────────────────────
  // Agar user ko is counter ka access nahi hai to kuch show mat karo
  if (!hasCounterAccess(counter)) {
    console.warn(`[CashTally] User "${user?.name}" lacks access to Counter ${counter}`);
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="flex fixed inset-x-0 bottom-0 top-[168px] z-50 items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300">
      <div className="bg-[#f5f7fa] rounded-2xl shadow-2xl w-full max-w-6xl max-h-full overflow-y-auto relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-[#f5f7fa] border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            Cash Tally - Counter {counter}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-gray-600 text-xl" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <div className="space-y-8">
            {/* Basic Information */}
            <div className="bg-[#f5f7fa] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#2a5298] p-2 rounded-lg">
                  <FaUser className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Basic Information
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a5298] focus:border-transparent transition-all bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a5298] focus:border-transparent transition-all bg-white"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp, index) => (
                      <option key={index} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Shop Name
                  </label>
                  <select
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2a5298] focus:border-transparent transition-all bg-white"
                  >
                    <option value="">Select Shop Name</option>
                    {fetchedShopNames.map((shop, index) => (
                      <option key={index} value={shop}>
                        {shop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Retail Transactions */}
            <div className="bg-[#f5f7fa] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <FaShoppingCart className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Retail Transactions
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scan Amount
                  </label>
                  <input
                    type="number"
                    name="retailScanAmount"
                    value={formData.retailScanAmount}
                    onChange={handleChange}
                    placeholder="0"
                    step="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Actual Sale
                  </label>
                  <input
                    type="text"
                    value={retailActualSale}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diff.
                  </label>
                  <input
                    type="text"
                    value={retailDiff}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-red-600 font-bold"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cash Denominations
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {["500", "200", "100", "50", "20", "10", "1"].map((denom) => (
                      <div key={denom}>
                        <label className="block text-xs text-gray-600 mb-1">
                          ₹{denom}
                        </label>
                        <input
                          type="number"
                          name={`retail${denom}`}
                          value={(formData as any)[`retail${denom}`]}
                          onChange={handleChange}
                          placeholder="0"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {[
                  { name: "retailGpay", label: "GPay/UPI" },
                  { name: "retailCard", label: "Card Payments" },
                  { name: "retailPhonePe", label: "PhonePe" },
                  { name: "retailPaytm", label: "Paytm" },
                  { name: "expense", label: "General Expense" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleChange}
                      placeholder="0"
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Wholesale Transactions */}
            <div className="bg-[#f5f7fa] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <FaTruck className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Wholesale Transactions
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "wsCashBillingAmount", label: "Cash Billing" },
                  { name: "wsCreditBillingAmount", label: "Credit Billing" },
                  { name: "wsCreditReceipt", label: "Credit Receipt" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleChange}
                      placeholder="0"
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Total Who. Sale
                  </label>
                  <input
                    type="text"
                    value={wholesaleTotalSale}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-green-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diff.
                  </label>
                  <input
                    type="text"
                    value={wholesaleDiff}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-red-600 font-bold"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cash Denominations
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {["500", "200", "100", "50", "20", "10", "1"].map((denom) => (
                      <div key={denom}>
                        <label className="block text-xs text-gray-600 mb-1">
                          ₹{denom}
                        </label>
                        <input
                          type="number"
                          name={`ws${denom}`}
                          value={(formData as any)[`ws${denom}`]}
                          onChange={handleChange}
                          placeholder="0"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-center bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {[
                  { name: "wsGpayCard", label: "GPay/Card" },
                  { name: "wsPhonePe", label: "PhonePe" },
                  { name: "wsPaytm", label: "Paytm" },
                  { name: "wsCard", label: "Card Payments" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      name={field.name}
                      value={(formData as any)[field.name]}
                      onChange={handleChange}
                      placeholder="0"
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Home Delivery & Expenses */}
            <div className="bg-[#f5f7fa] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <FaPlus className="text-white text-lg" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Expenses & Other Transactions
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Home Delivery
                  </label>
                  <input
                    type="number"
                    name="homeDelivery"
                    value={formData.homeDelivery}
                    onChange={handleChange}
                    placeholder="0"
                    step="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Diff.
                  </label>
                  <input
                    type="text"
                    value={homeDeliveryDiff}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-red-600 font-bold"
                  />
                </div>

                {formData.homeDelivery &&
                  parseFloat(formData.homeDelivery) > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Home Delivery Cash Denominations
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                          ["1500", "500"],
                          ["2200", "200"],
                          ["3100", "100"],
                          ["450", "50"],
                          ["520", "20"],
                          ["610", "10"],
                          ["71", "1"],
                        ].map(([fieldKey, displayDenom]) => (
                          <div key={fieldKey}>
                            <label className="block text-xs text-gray-600 mb-1">
                              ₹{displayDenom}
                            </label>
                            <input
                              type="number"
                              name={`retail${fieldKey}`}
                              value={(formData as any)[`retail${fieldKey}`]}
                              onChange={handleChange}
                              placeholder="0"
                              step="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Void Sale
                  </label>
                  <input
                    type="number"
                    name="voidSale"
                    value={formData.voidSale}
                    onChange={handleChange}
                    placeholder="0"
                    step="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="mt-6 p-4 bg-[#f5f7fa] rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-700">
                Total Amount:
              </span>
              <span className="text-2xl font-bold text-[#2a5298]">
                ₹{Math.round(totalAmount)}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-[#2a5298] text-white rounded-lg font-semibold hover:bg-[#1e3d70] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Entry"
              )}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}