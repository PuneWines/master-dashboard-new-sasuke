import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { indentService } from "../../services/purchase_management/indentService";
import { storageUtils } from "../../utils/purchase_management/storage";

import { SuccessAnimation } from "./SuccessAnimation";

// Helper to format timestamp as YYYY-MM-DD HH:mm:ss
const formatTimestamp = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Helper to round numbers
const formatNumber = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") return value;
  const num = Number(value);
  if (isNaN(num)) return value;
  // If it's an integer, return as is (optional) or always 2 decimals
  // User asked for "Only for 2 Digit number", usually means max 2 or exactly 2.
  // We'll use toFixed(2) but convert back to number to remove unnecessary zeros if integer.
  // Actually, let's keep it consistent:
  return parseFloat(num.toFixed(2));
};

// small debounce hook to avoid re-filtering on every keystroke
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface IndentItem {
  id: string;
  indentNumber: string;
  skuCode: string;
  itemName: string;
  brandName: string;
  moq: number;
  maxLevel: number;
  closingStock: number;
  reorderQuantityPcs: number;
  approved: string;
  traderName: string;
  liquor: string;
  size: string;
  sizeML: number;
  bottlesPerCase: number;
  reorderQuantityBox: number;
  shopName: string;
  orderBy: string;
  shopManagerStatus?: string;
  remarks?: string;
  approvalDate?: string;
  approvalName?: string;
  plannedDate?: string;
  approvedBy?: string;
  status?: string;
  actualTimestamp1?: string;
  _rowIndex?: number;
  timestamp?: string;
  shopId?: string;
  partyId?: string;
  brandId?: string;
  liquorType?: string;
  closingStockInBox?: number;
  closingStockBottle?: number;
  perDayAvgSaleFix?: number;
  perDayAvgSaleLastWeek?: number;
  partyName?: string;
}

interface ColumnVisibility {
  timestamp: boolean;
  shopId: boolean;
  shopName: boolean;
  indentNumber: boolean;
  partyId: boolean;
  traderName: boolean;
  brandId: boolean;
  brandName: boolean;
  skuCode: boolean;
  itemName: boolean;
  sizeML: boolean;
  bottlesPerCase: boolean;
  liquorType: boolean;
  closingStock: boolean;
  closingStockInBox: boolean;
  perDayAvgSaleFix: boolean;
  perDayAvgSaleLastWeek: boolean;
  reorderQuantityPcs: boolean;
  reorderQuantityBox: boolean;
  moq: boolean;
  maxLevel: boolean;
}

export const ApprovalPage: React.FC = () => {
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkItemsToApprove, setBulkItemsToApprove] = useState<IndentItem[]>([]);

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterField, setFilterField] = useState<
    "itemName" | "shopName" | "traderName" | ""
  >("");
  const [filterValue, setFilterValue] = useState("");
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentItem | null>(null);
  const [shopManagerStatus, setShopManagerStatus] = useState("Approved");
  const [remarks, setRemarks] = useState("");
  const [approvalNames, setApprovalNames] = useState<string[]>([]);
  const [selectedApprovalName, setSelectedApprovalName] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    total: 0,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    timestamp: true,
    shopId: true,
    shopName: true,
    indentNumber: true,
    partyId: true,
    traderName: true,
    brandId: true,
    brandName: true,
    skuCode: true,
    itemName: true,
    sizeML: true,
    bottlesPerCase: true,
    liquorType: true,
    closingStock: true,
    closingStockInBox: true,
    perDayAvgSaleFix: true,
    perDayAvgSaleLastWeek: true,
    reorderQuantityPcs: true,
    reorderQuantityBox: true,
    moq: true,
    maxLevel: true,
  });

  // Fetch approval names on component mount
  useEffect(() => {
    const fetchApprovalNames = async () => {
      try {
        const names = await indentService.getApprovalNames();
        setApprovalNames(names);
        if (names.length > 0) {
          setSelectedApprovalName(names[0]);
        }
      } catch (error) {
        console.error("Failed to fetch approval names:", error);
        // Fallback to default names
        setApprovalNames(["Ram Karan", "Shrawan"]);
        setSelectedApprovalName("Ram Karan");
      }
    };

    fetchApprovalNames();

    // Check for post-reload tab preference
    const postReloadTab = sessionStorage.getItem('postReloadTab');
    if (postReloadTab === 'history') {
      setActiveTab('history');
      sessionStorage.removeItem('postReloadTab');
    }
  }, []);

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await indentService.getIndents();
        const userShopRaw = storageUtils.getCurrentUser()?.shopName || "";
        const allowedShops =
          userShopRaw && userShopRaw.toLowerCase() !== "all"
            ? userShopRaw
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
            : null;
        const filtered = allowedShops
          ? data.filter((i: any) =>
            allowedShops.includes((i.shopName || "").trim().toLowerCase())
          )
          : data;
        // Attach timestamps for matching Indent Numbers from FMS (A: Timestamp, B: Indent Number)
        try {
          const map = await indentService.getTimestampsByIndent?.();
          if (map && typeof map === "object") {
            const withTs = filtered.map((it) => ({
              ...it,
              actualTimestamp1:
                map[it.indentNumber] || it.actualTimestamp1 || "",
            }));
            setIndents(withTs);
          } else {
            setIndents(filtered);
          }
        } catch (e) {
          // If fetching mapping fails, proceed with original data
          setIndents(filtered);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  const columnLabels = {
    timestamp: "Timestamp",
    shopId: "Shop ID",
    shopName: "Shop Name",
    indentNumber: "Indent No",
    partyId: "Party ID",
    traderName: "Party Name",
    brandId: "Brand ID",
    brandName: "Brand Name",
    skuCode: "Item ID / SKU Code",
    itemName: "Item Name",
    sizeML: "Size (Mls)",
    bottlesPerCase: "BPC",
    liquorType: "Liquor Type",
    closingStock: "Closing Stock in Bottle",
    closingStockInBox: "Closing Stock In Box",
    perDayAvgSaleFix: "Per Day Avg Sale Fix",
    perDayAvgSaleLastWeek: "Per day Avg Sale (Last Week)",
    reorderQuantityPcs: "Order In Bottles",
    reorderQuantityBox: "Order In Box",
    moq: "MOQ",
    maxLevel: "Max Level",
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleApprove = (indent: IndentItem) => {
    setSelectedIndent(indent);
    // Pre-fill with existing data if available
    setShopManagerStatus(indent.shopManagerStatus || "Approved");
    setRemarks(indent.remarks || "");
    setShowModal(true);
  };

  const getIndentKey = (indent: IndentItem) =>
    `${indent.indentNumber}|${indent.skuCode}|${indent.itemName}`;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisible = new Set(filteredIndents.map(getIndentKey));
      const allSelected = filteredIndents.every((i) =>
        prev.has(getIndentKey(i))
      );
      if (allSelected) {
        const next = new Set(prev);
        allVisible.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allVisible.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleInputChange = (indent: IndentItem, field: string, value: any) => {
    setIndents((prev) =>
      prev.map((i) => {
        if (getIndentKey(i) === getIndentKey(indent)) {
          const updated = { ...i, [field]: value };

          // Auto-calculate Box if Pcs changes
          if (field === 'reorderQuantityPcs' && i.bottlesPerCase > 0) {
            updated.reorderQuantityBox = Number((Number(value) / i.bottlesPerCase).toFixed(2));
          }
          // Auto-calculate Pcs if Box changes
          if (field === 'reorderQuantityBox' && i.bottlesPerCase > 0) {
            updated.reorderQuantityPcs = Math.round(Number(value) * i.bottlesPerCase);
          }

          return updated;
        }
        return i;
      })
    );
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;

    const items = indents.filter((indent) =>
      selectedIds.has(getIndentKey(indent))
    );
    setBulkItemsToApprove(items);
    setShowBulkModal(true);
  };

  const handleConfirmBulkApprove = async () => {
    if (!selectedApprovalName) {
      setError("Please select an approval name");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsApproving(true);

    const currentDate = formatTimestamp(new Date());
    const commonUpdates = {
      shopManagerStatus: "Approved",
      remarks: "",
      approvalDate: currentDate,
      approvalName: selectedApprovalName,
      approvedBy: selectedApprovalName,
      status: "approved",
      actualTimestamp1: currentDate,
    };

    // Prepare items for bulk update
    const bulkItems = bulkItemsToApprove.map((item) => ({
      id: item.indentNumber,
      updates: {
        ...commonUpdates,
        shopName: item.shopName,
        isApproval: true,
        reorderQuantityPcs: item.reorderQuantityPcs,
        traderName: item.traderName,
        reorderQuantityBox: item.reorderQuantityBox,
      },
      secondaryKeys: {
        skuCode: item.skuCode,
        itemName: item.itemName,
      },
      rowIndexOverride: item._rowIndex,
    }));

    try {
      // Use optimized bulk update service
      await indentService.updateIndentsBulk(bulkItems);

      // Update UI state after successful backend update
      setIndents((prev) =>
        prev.map((indent) =>
          selectedIds.has(getIndentKey(indent))
            ? { ...indent, ...commonUpdates }
            : indent
        )
      );

      setSelectedIds(new Set());
      setShowBulkModal(false);
      setBulkItemsToApprove([]);
      setShowSuccessAnimation(true);
      setActiveTab("history");

      // Reload page to ensure checkboxes and table state are fully synchronized with Google Sheets
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Bulk approval failed:", error);
      setError("Failed to approve. Sheet update did not complete.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSaveApproval = async () => {
    if (selectedIndent) {
      // Add validation for approval name
      if (!selectedApprovalName) {
        setError("Please select an approval name");
        setTimeout(() => setError(""), 3000);
        return;
      }

      setIsApproving(true);
      setError("");

      const currentDate = formatTimestamp(new Date());
      const updates = {
        shopManagerStatus,
        remarks,
        approvalDate: currentDate,
        approvalName: selectedApprovalName,
        approvedBy: selectedApprovalName,
        status:
          shopManagerStatus.toLowerCase() === "approved"
            ? "approved"
            : "rejected",
        actualTimestamp1: currentDate,
        reorderQuantityPcs: selectedIndent.reorderQuantityPcs,
        traderName: selectedIndent.traderName,
        reorderQuantityBox: selectedIndent.reorderQuantityBox,
      };

      // Perform API call
      try {
        // Update backend with all necessary fields
        await indentService.updateIndent(selectedIndent.indentNumber, {
          ...updates,
          shopName: selectedIndent.shopName,
          isApproval: true,
          indentNumber: selectedIndent.indentNumber,
        });

        // Update completed successfully - NOW update UI
        console.log("Approval submitted successfully");

        const updatedIndents = indents.map((indent) =>
          indent.indentNumber === selectedIndent.indentNumber
            ? {
              ...indent,
              ...updates,
            }
            : indent
        );
        setIndents(updatedIndents);
        setShowModal(false);
        setSelectedIndent(null);
        setShopManagerStatus("Approved");
        setRemarks("");
        setSelectedApprovalName(approvalNames[0] || "");

        // Show animation and switch tab
        setShowSuccessAnimation(true);
        setActiveTab("history");

        // Reload page to ensure checkboxes and table state are fully synchronized with Google Sheets
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error("Single approval failed:", error);
        setError("Failed to update approval. Please try again.");
        setTimeout(() => setError(""), 5000);
      } finally {
        setIsApproving(false);
      }
    }
  };

  const hasValue = (s?: string) => 
    typeof s === "string" && s.trim() !== "" && s.toLowerCase() !== "null" && s.toLowerCase() !== "undefined";
  
  // Pending: Planned 1 (plannedDate) is NOT NULL AND Actual 1 (approvalDate) IS NULL
  const pendingIndents = useMemo(() => indents.filter(
    (indent) => hasValue(indent.plannedDate) && !hasValue(indent.approvalDate)
  ), [indents]);

  // History: Planned 1 (plannedDate) is NOT NULL AND Actual 1 (approvalDate) IS NOT NULL
  const historyIndents = useMemo(() => indents.filter(
    (indent) => hasValue(indent.plannedDate) && hasValue(indent.approvalDate)
  ), [indents]);

  // Clear filter when changing tabs
  useEffect(() => {
    setFilterValue("");
    setFilterSearch("");
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  }, [activeTab]);

  // Update filter options when filter field or active tab changes
  useEffect(() => {
    if (filterField) {
      const sourceIndents = activeTab === "pending" ? pendingIndents : historyIndents;
      const uniqueValues = Array.from(
        new Set(
          sourceIndents
            .map((indent) => {
              const value = indent[filterField as keyof IndentItem];
              return value ? String(value).trim() : null;
            })
            .filter((value): value is string => value !== null && value !== "")
        )
      ).sort();
      setFilterOptions(uniqueValues);
      setFilterSearch("");
    } else {
      setFilterOptions([]);
    }
  }, [filterField, activeTab, pendingIndents, historyIndents]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (filterRef.current && target && !filterRef.current.contains(target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);


  // Get current tab data

  const currentTabIndents = useMemo(() => {
    return activeTab === "pending" ? pendingIndents : historyIndents;
  }, [activeTab, pendingIndents, historyIndents]);

  // Build filtered list with memoization
  const filteredIndentsAll = useMemo(() => {
    if (!currentTabIndents) return [];

    return currentTabIndents.filter((indent) => {
      // Text search
      const searchLower = debouncedSearch.toLowerCase();
      const searchMatch =
        indent.indentNumber.toLowerCase().includes(searchLower) ||
        indent.skuCode.toLowerCase().includes(searchLower) ||
        indent.itemName.toLowerCase().includes(searchLower) ||
        indent.brandName.toLowerCase().includes(searchLower) ||
        indent.traderName.toLowerCase().includes(searchLower) ||
        indent.liquor.toLowerCase().includes(searchLower) ||
        indent.shopName.toLowerCase().includes(searchLower) ||
        indent.orderBy.toLowerCase().includes(searchLower) ||
        (indent.shopManagerStatus &&
          indent.shopManagerStatus.toLowerCase().includes(searchLower));

      // Field filter
      let fieldMatch = true;
      if (filterField && (filterValue.trim() || filterSearch.trim())) {
        const filterText = (filterValue.trim() || filterSearch.trim()).toLowerCase();
        const fieldValue = (indent[filterField] as unknown as string) || "";
        fieldMatch = fieldValue.toLowerCase().includes(filterText);
      }

      // Date range filter
      let dateMatch = true;
      if (startDate || endDate) {
        const indentDate = indent.actualTimestamp1
          ? new Date(indent.actualTimestamp1)
          : null;
        if (indentDate) {
          if (startDate && new Date(startDate) > indentDate) {
            dateMatch = false;
          }
          if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (endOfDay < indentDate) {
              dateMatch = false;
            }
          }
        } else {
          // If there's no timestamp, only include if no date range is set
          dateMatch = !startDate && !endDate;
        }
      }

      return searchMatch && fieldMatch && dateMatch;
    });
  }, [
    currentTabIndents,
    debouncedSearch,
    filterField,
    filterValue,
    filterSearch,
    startDate,
    endDate,
  ]);

  // Pagination slice
  const filteredIndents = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredIndentsAll.slice(start, end);
  }, [filteredIndentsAll, pagination.page, pagination.pageSize]);

  // Update counts and reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, total: filteredIndentsAll.length }));
  }, [filteredIndentsAll.length]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    activeTab,
    debouncedSearch,
    filterField,
    filterValue,
    startDate,
    endDate,
  ]);
  useEffect(() => {
    console.log(filteredIndents, "currennt table indent");
  }, [activeTab, filteredIndents, currentTabIndents]);

  return (
    <div className="p-4 min-h-screen bg-white md:p-6 w-full lg:w-[calc(100vw-279px)] overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {activeTab === 'pending' ? 'Approval Index Sheet' : 'Approval Management'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            {activeTab === 'pending' ? 'View and approve detailed index tracking.' : 'Review and approve purchase indents'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading indents...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading indents
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-2 text-sm font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Main content – only when NOT loading & NOT error */}
      {!loading && !error && (
        <div>
          {/* Tabs */}
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-4 md:space-x-8">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${activeTab === "pending"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <Clock className="w-4 h-4" />
                  Pending ({pendingIndents.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${activeTab === "history"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  History ({historyIndents.length})
                </button>
              </nav>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="flex sticky top-0 z-20 flex-col gap-3 px-4 pt-3 pb-3 -mx-4 -mt-3 mb-4 bg-gray-50 sm:flex-row md:-mx-6 md:px-6">
            {/* Search Bar */}
            <div className="flex flex-col gap-3 w-full md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by indent, SKU, item, brand, trader, shop..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-2 pr-3 pl-9 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Date Range Filter */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start Date"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 w-full text-sm bg-white rounded-lg border border-gray-300 outline-none sm:w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="End Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="px-3 py-2 text-sm text-red-600 whitespace-nowrap hover:text-red-800"
                  >
                    Clear Dates
                  </button>
                )}
              </div>
            </div>{" "}
            {/* Close the search/date range container */}
            {/* Filter Dropdown and Approve Button */}
            <div className="flex gap-2 items-center">
              {activeTab === "pending" && (
                <button
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0 || isApproving}
                  className={`px-4 py-2 text-sm rounded-lg ${selectedIds.size === 0 || isApproving
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                >
                  {isApproving ? "Saving..." : "Approve"}
                </button>
              )}
              <div className="relative">
                <select
                  value={filterField}
                  onChange={(e) =>
                    setFilterField(
                      e.target.value as
                      | "itemName"
                      | "shopName"
                      | "traderName"
                      | ""
                    )
                  }
                  className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 appearance-none outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Filter by...</option>
                  <option value="itemName">Item Name</option>
                  <option value="shopName">Shop Name</option>
                  <option value="traderName">Trader Name</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none" />
              </div>
              {filterField && (
                <div ref={filterRef} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${filterField.replace(
                        "Name",
                        ""
                      )}...`}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      onFocus={() => setShowFilterDropdown(true)}
                      onClick={() => setShowFilterDropdown(true)}
                      className="px-3 py-2 pr-8 w-40 text-sm bg-white rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="absolute right-2 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
                  </div>

                  {/* Clear Filter Button */}
                  {(filterValue || filterSearch) && (
                    <button
                      onClick={() => {
                        setFilterValue("");
                        setFilterSearch("");
                      }}
                      className="absolute -top-2 -right-2 p-1 text-xs text-white bg-red-500 rounded-full transition-colors hover:bg-red-600"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Dropdown with searchable options */}
                  {showFilterDropdown && filterOptions.length > 0 && (
                    <div className="overflow-auto absolute z-10 mt-1 w-full max-h-60 bg-white rounded-lg border border-gray-200 shadow-lg">
                      {filterOptions
                        .filter((option: string) =>
                          option
                            .toLowerCase()
                            .includes(filterSearch.toLowerCase())
                        )
                        .map((option: string) => (
                          <div
                            key={option}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${filterValue === option ? "bg-blue-100" : ""
                              }`}
                            onClick={() => {
                              setFilterValue(option);
                              setFilterSearch(option);
                              setShowFilterDropdown(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Column Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="flex gap-2 justify-center items-center px-3 py-2 w-full text-sm text-white whitespace-nowrap bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:w-auto"
              >
                <Filter className="w-4 h-4" />
                Columns
              </button>

              {/* Column Filter Dropdown */}
              {showColumnFilter && (
                <>
                  {/* Backdrop for mobile */}
                  <div
                    className="fixed inset-0 z-30 bg-black bg-opacity-25 sm:hidden"
                    onClick={() => setShowColumnFilter(false)}
                  ></div>

                  <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 bottom-0 sm:bottom-auto top-auto sm:top-full sm:mt-2 w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 z-40 max-h-[70vh] sm:max-h-96 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Show/Hide Columns
                      </h3>
                      <button
                        onClick={() => setShowColumnFilter(false)}
                        className="text-gray-500 sm:hidden hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="overflow-y-auto p-4">
                      <div className="space-y-1">
                        {Object.keys(columnLabels).map((key) => (
                          <label
                            key={key}
                            className="flex gap-2 items-center p-2 rounded transition-colors cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={
                                columnVisibility[key as keyof ColumnVisibility]
                              }
                              onChange={() =>
                                toggleColumn(key as keyof ColumnVisibility)
                              }
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                              disabled={key === 'timestamp' && activeTab !== "history"}
                            />
                            <span className={`text-sm ${key === 'timestamp' && activeTab !== "history" ? 'text-gray-400' : 'text-gray-700'}`}>
                              {columnLabels[key as keyof typeof columnLabels]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-lg">
            <div className="overflow-x-auto w-full lg:w-[calc(100vw-16rem)]">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full min-w-[1200px] text-sm divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      {activeTab === "pending" && (
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            onChange={toggleSelectAllVisible}
                            checked={
                              filteredIndents.length > 0 &&
                              filteredIndents.every((i) =>
                                selectedIds.has(getIndentKey(i))
                              )
                            }
                          />
                        </th>
                      )}
                      {Object.keys(columnVisibility).map((key) => 
                        columnVisibility[key as keyof ColumnVisibility] && (
                          <th key={key} className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">
                            {columnLabels[key as keyof typeof columnLabels]}
                          </th>
                        )
                      )}
                      {activeTab === "history" && (
                        <>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Approval Date</th>
                          <th className="px-4 py-3 font-semibold tracking-wider text-left text-gray-700 uppercase whitespace-nowrap">Remarks</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIndents.map((indent, index) => (
                      <tr key={`${indent.indentNumber}-${index}`} className="hover:bg-gray-50">
                        {activeTab === "pending" && (
                          <td className="px-3 py-4">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(getIndentKey(indent))} 
                              onChange={() => toggleSelect(getIndentKey(indent))} 
                            />
                          </td>
                        )}
                        {columnVisibility.timestamp && (
                          <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                            {(() => {
                              const raw = (indent.timestamp && indent.timestamp !== "-" && indent.timestamp.toLowerCase() !== "null")
                                ? indent.timestamp
                                : (indent.actualTimestamp1 && indent.actualTimestamp1 !== "-" && indent.actualTimestamp1.toLowerCase() !== "null")
                                  ? indent.actualTimestamp1
                                  : null;
                              
                              if (!raw) return "-";
                              
                              const date = new Date(raw);
                              return isNaN(date.getTime()) ? raw : formatTimestamp(date);
                            })()}
                          </td>
                        )}
                        {columnVisibility.shopId && <td className="px-4 py-4">{indent.shopId}</td>}
                        {columnVisibility.shopName && <td className="px-4 py-4">{indent.shopName}</td>}
                        {columnVisibility.indentNumber && <td className="px-4 py-4">{indent.indentNumber}</td>}
                        {columnVisibility.partyId && <td className="px-4 py-4">{indent.partyId}</td>}
                        {columnVisibility.traderName && <td className="px-4 py-4">{indent.traderName}</td>}
                        {columnVisibility.brandId && <td className="px-4 py-4">{indent.brandId}</td>}
                        {columnVisibility.brandName && <td className="px-4 py-4">{indent.brandName}</td>}
                        {columnVisibility.skuCode && <td className="px-4 py-4">{indent.skuCode}</td>}
                        {columnVisibility.itemName && <td className="px-4 py-4">{indent.itemName}</td>}
                        {columnVisibility.sizeML && <td className="px-4 py-4">{formatNumber(indent.sizeML)}</td>}
                        {columnVisibility.bottlesPerCase && <td className="px-4 py-4">{formatNumber(indent.bottlesPerCase)}</td>}
                        {columnVisibility.liquorType && <td className="px-4 py-4">{indent.liquorType}</td>}
                        {columnVisibility.closingStock && <td className="px-4 py-4">{formatNumber(indent.closingStock)}</td>}
                        {columnVisibility.closingStockInBox && <td className="px-4 py-4">{formatNumber(indent.closingStockInBox)}</td>}
                        {columnVisibility.perDayAvgSaleFix && <td className="px-4 py-4">{formatNumber(indent.perDayAvgSaleFix)}</td>}
                        {columnVisibility.perDayAvgSaleLastWeek && <td className="px-4 py-4">{formatNumber(indent.perDayAvgSaleLastWeek)}</td>}
                        {columnVisibility.reorderQuantityPcs && <td className="px-4 py-4">{formatNumber(indent.reorderQuantityPcs)}</td>}
                        {columnVisibility.reorderQuantityBox && <td className="px-4 py-4">{formatNumber(indent.reorderQuantityBox)}</td>}
                        {columnVisibility.moq && <td className="px-4 py-4">{formatNumber(indent.moq)}</td>}
                        {columnVisibility.maxLevel && <td className="px-4 py-4">{formatNumber(indent.maxLevel)}</td>}
                        {activeTab === "history" && (
                          <>
                            <td className="px-4 py-4">{indent.shopManagerStatus}</td>
                            <td className="px-4 py-4">{indent.approvalDate}</td>
                            <td className="px-4 py-4">{indent.remarks}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approval Modal */}
      {showBulkModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl flex flex-col">
            <div className="flex sticky top-0 justify-between items-center p-4 bg-white border-b md:p-6 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                  Bulk Approval ({bulkItemsToApprove.length} items)
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkItemsToApprove([]);
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-6 md:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Approved By <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedApprovalName}
                      onChange={(e) => setSelectedApprovalName(e.target.value)}
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none pr-10"
                    >
                      <option value="">Select Approval Name</option>
                      {approvalNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 w-full">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> All selected items will be marked as "Approved" with the selected name and current timestamp.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Indent No</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Shop</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Qty</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bulkItemsToApprove.map((item) => (
                        <tr key={getIndentKey(item)} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.indentNumber}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.shopName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            <div className="truncate max-w-xs" title={item.itemName}>{item.itemName}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                            {formatNumber(item.reorderQuantityPcs)} Pcs
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 p-4 md:flex-row md:justify-end md:p-6 bg-gray-50 border-t">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkItemsToApprove([]);
                }}
                className="px-6 py-2.5 w-full text-gray-700 font-medium rounded-lg border border-gray-300 bg-white md:w-auto hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkApprove}
                disabled={!selectedApprovalName || isApproving}
                className="flex gap-2 justify-center items-center px-8 py-2.5 w-full text-white font-bold bg-purple-600 rounded-lg shadow-lg md:w-auto hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
              >
                {isApproving ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white animate-spin border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showModal && selectedIndent && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex sticky top-0 justify-between items-center p-4 bg-white rounded-t-xl border-b border-gray-200 md:p-6">
              <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                Approve Indent
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedIndent(null);
                  setShopManagerStatus("Approved");
                  setRemarks("");
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4 md:p-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Indent Number</label>
                <input type="text" value={selectedIndent.indentNumber} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">SKU Code</label>
                <input type="text" value={selectedIndent.skuCode} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Item Name</label>
                <input type="text" value={selectedIndent.itemName} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Brand Name</label>
                <input type="text" value={selectedIndent.brandName} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Reorder Quantity (Pcs)</label>
                <input type="text" value={selectedIndent.reorderQuantityPcs} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Reorder Quantity (Box)</label>
                <input type="text" value={selectedIndent.reorderQuantityBox} readOnly className="px-4 py-2 w-full text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Shop Manager Status <span className="text-red-500">*</span></label>
                <select value={shopManagerStatus} onChange={(e) => setShopManagerStatus(e.target.value)} className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Approved">Approved</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Approval Name <span className="text-red-500">*</span></label>
                <select value={selectedApprovalName} onChange={(e) => setSelectedApprovalName(e.target.value)} className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Select Approval Name</option>
                  {approvalNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Remarks</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter any remarks or comments..." rows={4} className="px-4 py-2 w-full text-sm rounded-lg border border-gray-300 outline-none resize-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button onClick={() => { setShowModal(false); setSelectedIndent(null); }} className="px-6 py-2 font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveApproval} disabled={isApproving} className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isApproving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SuccessAnimation
        visible={showSuccessAnimation}
        message="Approved Successfully!"
        onComplete={() => setShowSuccessAnimation(false)}
      />
    </div>
  );
};

export default ApprovalPage;
