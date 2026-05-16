import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Package,
  Image as ImageIcon,
  CheckCircle,
  X,
  FileText,
  ChevronDown,
  Search,
} from "lucide-react";
import { indentService } from "../../services/purchase_management/indentService";
import { storageUtils } from "../../utils/purchase_management/storage";

// Helper to format timestamp as DD/MM/YYYY HH:mm:ss
const formatTimestamp = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

// Helper to format date as DD/MM/YYYY
const formatDateOnly = (dateString?: string): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
};

// Helper to check if a string is truly empty (null, undefined, or whitespace)
const isTrulyEmpty = (val?: string): boolean => {
  if (!val) return true;
  const trimmed = val.trim();
  return trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined";
};

// ---------------------------------------------------------------------
// Indent Item Interface
// ---------------------------------------------------------------------
interface IndentItem {
  id: string;
  indentNumber: string;
  skuCode: string;
  itemName: string;
  brandName: string;
  bottlesPerCase: number;
  reorderQuantityPcs: number; // This is from column I
  reorderQuantityBox: number; // This is from column O
  shopName: string;
  orderBy: string;
  traderName: string;
  orderDate: string;
  transporterName?: string;
  status?: string;
  vendorName?: string;
  sizes?: string[];
  poQty?: number;
  receiverManager?: string;
  _rowIndex?: number;

  // From Lifting
  liftingData?: {
    transportCopy?: string;
    billCopy?: string;
    qty?: string;
    driverName?: string;
    driverWhatsapp?: string;
    vehicleNo?: string;
    liftingCompletedAt?: string;
  };

  // Lifting Date from column AF (actualAF)
  liftingDate?: string;

  // From Cross Check
  receiveStatus?: "All Okay" | "Not Okay";
  receivedQty?: string;
  remainingQty?: string;
  difference?: string;
  receiveRemarks?: string;

  // Planned & Actual
  plannedAE?: string;
  actualAF?: string;
  plannedAK?: string;
  actualAL?: string;
  actual6?: string;     // From column AW - set when lifting is completed
  planned6?: string;    // From column AV
  planned7?: string;    // From column BC - user requirement for receive pending
  actual7?: string;     // From column BD - user requirement for receive history
  transportDifference?: string;
  pendingReceivingQty?: string; // From column AS
}

interface ColumnVisibility {
  action: boolean;
  indentNumber: boolean;
  shopName: boolean;
  itemName: boolean;
  transporterName: boolean;
  transportCopy: boolean;
  billCopy: boolean;
  difference: boolean;
  remarks: boolean;
  traderName: boolean;
  pendingReceivingQty: boolean;
  liftingDate: boolean;
  liftingQty: boolean;
  orderQty: boolean;
  poQty: boolean;
  receivingQty: boolean;
  diff: boolean;
  remainingQty: boolean;
  receiverName: boolean;
}

// ---------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------
const TableRow = React.memo(
  ({
    indent,
    activeTab,
    isSelected,
    onSelect,
    editData,
    onEdit,
    diff,
    columnVisibility,
  }: {
    indent: IndentItem;
    activeTab: "pending" | "history";
    isSelected: boolean;
    onSelect: (id: string) => void;
    editData: { receivedQty: string; receiveRemarks: string; remainingQty?: string };
    onEdit: (id: string, field: "receivedQty" | "receiveRemarks" | "remainingQty", value: string) => void;
    diff: number;
    columnVisibility: ColumnVisibility;
  }) => {
    const isPending = activeTab === "pending";

    return (
      <tr className={`hover:bg-gray-50 ${isSelected ? "bg-purple-50" : ""}`}>
        {/* Action / Checkbox */}
        {columnVisibility.action && (
          <td className="px-6 py-4 whitespace-nowrap">
            {isPending ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(indent.id)}
                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
              />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </td>
        )}

        {/* Order qty */}
        {columnVisibility.orderQty && (
          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
            {indent.reorderQuantityPcs || 0}
          </td>
        )}

        {/* Po Qty */}
        {columnVisibility.poQty && (
          <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
            {indent.poQty || 0}
          </td>
        )}

        {/* Item Name */}
        {columnVisibility.itemName && (
          <td className="px-6 py-4 text-sm text-gray-900">
            <div className="font-medium">{indent.itemName}</div>
            <div className="text-xs text-gray-400">{indent.indentNumber}</div>
          </td>
        )}

        {/* Transporter Name */}
        {columnVisibility.transporterName && (
          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
            {indent.transporterName || "-"}
          </td>
        )}

        {/* Trader name */}
        {columnVisibility.traderName && (
          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
            {indent.traderName || "-"}
          </td>
        )}

        {/* Receiving Qty - from BF column */}
        {columnVisibility.receivingQty && (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="text-sm font-medium text-gray-900">
              {indent.receivedQty || "-"}
            </span>
          </td>
        )}

        {/* Diff - from BG column (difference field) */}
        {columnVisibility.diff && (
          <td className="px-6 py-4 whitespace-nowrap">
            {(() => {
              const raw = String(indent.difference || "").trim();
              const diffVal = raw === "" || raw === "." || raw === "-" ? 0 : (Number(raw) || 0);
              return (
                <span className={`text-sm font-bold ${diffVal === 0 ? "text-green-600" : "text-red-600"}`}>
                  {diffVal}
                </span>
              );
            })()}
          </td>
        )}

        {/* Remaining Qty = Order Qty (Pcs) - Receiving Qty (BF) */}
        {columnVisibility.remainingQty && (
          <td className="px-6 py-4 whitespace-nowrap">
            {isPending ? (
              <input
                type="number"
                value={editData?.remainingQty !== undefined ? editData.remainingQty : (() => {
                  const receivedQty = parseFloat(String(indent.receivedQty || "0")) || 0;
                  const orderQty = parseFloat(String(indent.reorderQuantityPcs || "0")) || 0;
                  return orderQty - receivedQty;
                })()}
                onChange={(e) => onEdit(indent.id, "remainingQty", e.target.value)}
                className="w-24 px-3 py-1.5 text-sm text-blue-600 font-medium border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="0"
              />
            ) : (
              (() => {
                const receivedQty = parseFloat(String(indent.receivedQty || "0")) || 0;
                const orderQty = parseFloat(String(indent.reorderQuantityPcs || "0")) || 0;
                const remaining = orderQty - receivedQty;
                return (
                  <span className={`text-sm font-bold ${remaining <= 0 ? "text-green-600" : "text-orange-500"}`}>
                    {remaining}
                  </span>
                );
              })()
            )}
          </td>
        )}

        {/* Receiver Name */}
        {columnVisibility.receiverName && (
          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
            {indent.receiverManager || "-"}
          </td>
        )}

        {/* Remarks */}
        {columnVisibility.remarks && (
          <td className="px-6 py-4 whitespace-nowrap">
            {isPending ? (
              <input
                type="text"
                value={editData?.receiveRemarks !== undefined ? editData.receiveRemarks : (indent.receiveRemarks || "")}
                onChange={(e) => onEdit(indent.id, "receiveRemarks", e.target.value)}
                className="w-48 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="Remarks..."
              />
            ) : (
              <span className="text-sm text-gray-500 italic">{indent.receiveRemarks || "-"}</span>
            )}
          </td>
        )}
      </tr>
    );
  }
);

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export const CrossCheckPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">(
    (localStorage.getItem("cross_check_active_tab") as "pending" | "history") || "pending"
  );
  const [showModal, setShowModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentItem | null>(null);
  const [receiveData, setReceiveData] = useState({
    receivedQty: "",
    difference: "",
    receiveRemarks: "",
    receiverName: "",
  });
  const [receiverNames, setReceiverNames] = useState<string[]>([]);
  const [indents, setIndents] = useState<IndentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState(
    localStorage.getItem("cross_check_search_term") || ""
  );
  const [filterField, setFilterField] = useState<
    "itemName" | "shopName" | "traderName" | ""
  >(
    (localStorage.getItem("cross_check_filter_field") as "itemName" | "shopName" | "traderName" | "") || ""
  );
  const [filterValue, setFilterValue] = useState(
    localStorage.getItem("cross_check_filter_value") || ""
  );
  const [filterOptions, setFilterOptions] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState(
    localStorage.getItem("cross_check_filter_search") || ""
  );
  const [startDate, setStartDate] = useState(
    localStorage.getItem("cross_check_start_date") || ""
  );
  const [endDate, setEndDate] = useState(
    localStorage.getItem("cross_check_end_date") || ""
  );
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Column filter states
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowEdits, setRowEdits] = useState<Record<string, { receivedQty: string; receiveRemarks: string; remainingQty?: string }>>({});
  const [poContacts, setPoContacts] = useState<any[]>([]);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    action: true,
    orderQty: true,
    poQty: true,
    itemName: true,
    transporterName: true,
    traderName: true,
    receivingQty: true,
    diff: true,
    remainingQty: true,
    receiverName: true,
    remarks: true,
    indentNumber: true,
    shopName: true,
    transportCopy: true,
    billCopy: true,
    difference: true,
    pendingReceivingQty: true,
    liftingDate: true,
    liftingQty: true,
  });

  const columnLabels = {
    action: "Action",
    orderQty: "Order qty",
    poQty: "Po Qty",
    itemName: "Item Name",
    transporterName: "Transporter Name",
    traderName: "Trader name",
    receivingQty: "Receiving Qty",
    diff: "Diff",
    receiverName: "Receiver Name",
    remarks: "Remarks",
  };

  // Helper function to process and validate image URLs
  const getImageUrl = (url?: string): string => {
    if (!url || url.trim() === "") {
      return "";
    }

    const trimmed = url.trim();

    // Handle Google Drive shared links
    if (trimmed.includes("drive.google.com")) {
      const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }

    // Handle direct links
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }

    if (trimmed.startsWith("data:")) {
      return trimmed;
    }

    // Default to https:// for other cases
    return `https://${trimmed}`;
  };

  // Handle viewing image in new tab
  const handleViewImage = (rawUrl: string) => {
    const url = getImageUrl(rawUrl);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // -----------------------------------------------------------------
  // Fetch ALL Indents from Google Sheets
  // -----------------------------------------------------------------
  const fetchIndents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [googleSheetData, poSheetData] = await Promise.all([
        indentService.getIndents(),
        indentService.getPOContactData()
      ]);

      setPoContacts(poSheetData);

      const saved = localStorage.getItem("indent_approval_data");
      const localData: IndentItem[] = saved ? JSON.parse(saved) : [];

      const mergedData = googleSheetData.map((googleItem) => {
        const localItem = localData.find((local) => local.id === googleItem.id);

        // Find PO contact info for this indent with robust matching
        const poInfo = poSheetData.find(po => 
          String(po.indentNumber || "").trim().toLowerCase() === String(googleItem.indentNumber || "").trim().toLowerCase()
        );

        const base = {
          ...googleItem,
          // Explicitly pull PO quantity from Column F (index 5) of PO sheet as per requirement
          poQty: poInfo ? Number(poInfo.poQty || 0) : (Number(googleItem.poQty) || 0),
          // Preference given to PO sheet data for Receiver Manager Name (J2:J)
          receiverManager: poInfo?.receiverManager || googleItem.receiverManager || "",
          traderName: poInfo?.traderName || googleItem.traderName || "",
          transporterName: poInfo?.transporterName || googleItem.transporterName || "",
        };

        if (localItem) {
          return {
            ...base,
            ...localItem,
            liftingData: localItem.liftingData || googleItem.liftingData,
            liftingDate: localItem.liftingDate || (googleItem as IndentItem).liftingDate || googleItem.actualAF,
            receiveStatus: localItem.receiveStatus || googleItem.receiveStatus,
            receivedQty: localItem.receivedQty || googleItem.receivedQty,
            difference: localItem.difference || googleItem.difference,
            receiveRemarks:
              localItem.receiveRemarks || googleItem.receiveRemarks,
            actualAF: !isTrulyEmpty(localItem.actualAF) ? localItem.actualAF : googleItem.actualAF,
            actualAL: !isTrulyEmpty(localItem.actualAL) ? localItem.actualAL : googleItem.actualAL,
            actual6: !isTrulyEmpty(localItem.actual6) ? localItem.actual6 : (googleItem as IndentItem).actual6,
            planned7: !isTrulyEmpty(localItem.planned7) ? localItem.planned7 : (googleItem as IndentItem).planned7,
            actual7: !isTrulyEmpty(localItem.actual7) ? localItem.actual7 : (googleItem as IndentItem).actual7,
          };
        }
        return {
          ...base,
          liftingDate: (googleItem as IndentItem).liftingDate || googleItem.actualAF,
          planned7: (googleItem as IndentItem).planned7,
          actual7: (googleItem as IndentItem).actual7,
        };
      });

      const userShopRaw = storageUtils.getCurrentUser()?.shopName || "";
      const allowedShops =
        userShopRaw && userShopRaw.toLowerCase() !== "all"
          ? userShopRaw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
          : null;
      const filtered = allowedShops
        ? mergedData.filter((i) =>
          allowedShops.includes((i.shopName || "").trim().toLowerCase())
        )
        : mergedData;
      setIndents(filtered);

      // Initialize row edits: receivingQty defaults to lifting qty, remarks MUST BE EMPTY
      const initialEdits: Record<string, { receivedQty: string; receiveRemarks: string }> = {};
      filtered.forEach(i => {
        initialEdits[i.id] = {
          receivedQty: i.receivedQty || i.liftingData?.qty || "",
          receiveRemarks: "" // Always empty for new edits as per user request
        };
      });
      setRowEdits(initialEdits);

    } catch (err: any) {
      console.error("Error fetching indents:", err);
      setError("Failed to load indents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndents();
  }, [fetchIndents]);

  // Check for success message after reload
  useEffect(() => {
    const msg = localStorage.getItem("cross_check_success_msg");
    if (msg) {
      setSuccessMessage(msg);
      localStorage.removeItem("cross_check_success_msg");
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  }, []);

  // Nuclear Fix: Derive current indents directly based on activeTab
  const currentIndents = useMemo(() => {
    // 1. Get base list for the active tab
    // Pending: BC (planned7) is NOT NULL AND BD (actual7) is NULL
    const baseList = activeTab === "pending"
      ? indents.filter((i) => !isTrulyEmpty(i.planned7) && isTrulyEmpty(i.actual7))
      : indents.filter((i) => !isTrulyEmpty(i.actual7));

    if (activeTab === "pending" && baseList.length > 0) {
      console.log("Pending Indents Sample (BC/BD Logic):", { id: baseList[0].id, planned7: baseList[0].planned7, actual7: baseList[0].actual7 });
    }

    // 2. Apply Search & Filters
    const filtered = baseList.filter((indent) => {
      const searchLower = searchTerm.toLowerCase();
      const searchMatch =
        indent.indentNumber?.toLowerCase().includes(searchLower) ||
        indent.skuCode?.toLowerCase().includes(searchLower) ||
        indent.itemName?.toLowerCase().includes(searchLower) ||
        indent.brandName?.toLowerCase().includes(searchLower) ||
        indent.traderName?.toLowerCase().includes(searchLower) ||
        indent.shopName?.toLowerCase().includes(searchLower) ||
        indent.orderBy?.toLowerCase().includes(searchLower);

      let fieldMatch = true;
      if (filterField && (filterValue.trim() || filterSearch.trim())) {
        const filterText = (filterValue.trim() || filterSearch.trim()).toLowerCase();
        const fieldValueLower = indent[filterField]?.toLowerCase() || "";
        fieldMatch = fieldValueLower.includes(filterText);
      }

      let dateMatch = true;
      if (startDate || endDate) {
        const indentDate = indent.actualAL
          ? new Date(indent.actualAL)
          : indent.liftingData?.liftingCompletedAt
            ? new Date(indent.liftingData.liftingCompletedAt)
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
          dateMatch = !startDate && !endDate;
        }
      }

      return searchMatch && fieldMatch && dateMatch;
    });

    // 3. Apply Stable Sorting
    return filtered.sort((a, b) => {
      if (activeTab === "pending") {
        const numA = parseInt(a.indentNumber?.replace(/\D/g, "") || "0");
        const numB = parseInt(b.indentNumber?.replace(/\D/g, "") || "0");
        return numA - numB;
      } else {
        return (b.actualAL || "").localeCompare(a.actualAL || "");
      }
    });
  }, [indents, activeTab, searchTerm, filterField, filterValue, filterSearch, startDate, endDate]);

  // For tab counts only (simplified)
  const pendingCount = useMemo(() =>
    indents.filter((i) => !isTrulyEmpty(i.planned7) && isTrulyEmpty(i.actual7)).length,
    [indents]);
  const historyCount = useMemo(() =>
    indents.filter((i) => !isTrulyEmpty(i.actual7)).length,
    [indents]);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cross_check_active_tab", activeTab);
    localStorage.setItem("cross_check_search_term", searchTerm);
    localStorage.setItem("cross_check_filter_field", filterField);
    localStorage.setItem("cross_check_filter_value", filterValue);
    localStorage.setItem("cross_check_filter_search", filterSearch);
    localStorage.setItem("cross_check_start_date", startDate);
    localStorage.setItem("cross_check_end_date", endDate);
  }, [activeTab, searchTerm, filterField, filterValue, filterSearch, startDate, endDate]);

  // Update filter options when filter field or active tab changes
  useEffect(() => {
    if (filterField) {
      const uniqueValues = Array.from(
        new Set(
          currentIndents
            .map((indent) => {
              const value = indent[filterField as keyof IndentItem];
              return value ? String(value).trim() : null;
            })
            .filter((value): value is string => value !== null && value !== "")
        )
      ).sort();
      setFilterOptions(uniqueValues);
    } else {
      setFilterOptions([]);
    }
  }, [filterField, activeTab, currentIndents]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentIndents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentIndents.map((indent, index) => 
        indent._rowIndex ? String(indent._rowIndex) : `${indent.id}-${index}`
      )));
    }
  };

  const handleRowEdit = (id: string, field: "receivedQty" | "receiveRemarks", value: string) => {
    setRowEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const calculateDiff = (uniqueKey: string) => {
    const indent = currentIndents.find((i, index) => {
      const k = i._rowIndex ? String(i._rowIndex) : `${i.id}-${index}`;
      return k === uniqueKey;
    });
    const edit = rowEdits[uniqueKey];
    if (!indent) return 0;
    
    const poQty = Number(indent.poQty || 0);
    const received = edit?.receivedQty !== undefined ? Number(edit.receivedQty) : Number(indent.receivedQty || 0);
    
    // User requirement: PO Qty - Receiving Qty
    return poQty - received;
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setErrorMessage("");

    const itemsToSubmit = Array.from(selectedIds).map(uniqueKey => {
      // Find by matching the uniqueKey logic we used in rendering
      const indent = currentIndents.find((i, index) => {
        const k = i._rowIndex ? String(i._rowIndex) : `${i.id}-${index}`;
        return k === uniqueKey;
      });
      
      const edit = rowEdits[uniqueKey];
      const now = formatTimestamp(new Date());
      
      const received = parseFloat(edit?.receivedQty !== undefined ? edit.receivedQty : (indent?.receivedQty || "0")) || 0;
      const orderQty = parseFloat(String(indent?.reorderQuantityPcs || "0")) || 0;
      
      // Calculate remaining qty for submission (use edit if present, else formula)
      const remainingVal = edit?.remainingQty !== undefined 
        ? edit.remainingQty 
        : String(orderQty - received);

      // Re-calculate diff for master status
      const expected = parseFloat(indent?.liftingData?.qty || "0") || 0;
      const diff = indent?.shopName?.includes("Kunal") || indent?.shopName?.includes("Balaji") 
        ? orderQty - received 
        : expected - received;

      return {
        id: indent!.id,
        updates: {
          actual7: now,
          receivedQty: String(received),
          receiveRemarks: edit?.receiveRemarks !== undefined ? edit.receiveRemarks : (indent?.receiveRemarks || ""),
          remainingQty: remainingVal,
          difference: String(diff),
          receiveStatus: (diff === 0 ? "All Okay" : "Not Okay") as "All Okay" | "Not Okay",
          shopName: indent!.shopName,
          itemName: indent!.itemName,
          receiverName: indent!.receiverManager || "System",
          isReceived: true
        },
        rowIndexOverride: indent!._rowIndex
      };
    });

    try {
      await indentService.updateIndentsBulkReceived(itemsToSubmit);

      setSuccessMessage(`${selectedIds.size} indents received successfully.`);
      setSelectedIds(new Set());

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error("Bulk submit failed:", e);
      setErrorMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // -----------------------------------------------------------------
  // Calculate Difference
  // -----------------------------------------------------------------
  const calculateDifference = (receivedQty: string, indent: IndentItem | null = selectedIndent) => {
    if (!indent) return "";
    const isSpecialShop =
      indent.shopName === "Kunal Ulwe Wines" ||
      indent.shopName === "Balaji Wines" ||
      indent.shopName === "Balaji";

    const received = parseFloat(receivedQty) || 0;

    if (isSpecialShop) {
      const orderQty = Number(indent.reorderQuantityPcs) || 0;
      return (orderQty - received).toString();
    } else {
      if (!indent.liftingData?.qty) return "";
      const expected = parseFloat(indent.liftingData.qty) || 0;
      return (expected - received).toString();
    }
  };

  const handleReceivedQtyChange = (value: string) => {
    const difference = calculateDifference(value);
    setReceiveData((prev) => ({
      ...prev,
      receivedQty: value,
      difference,
    }));
  };

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const handleCrossCheck = (indent: IndentItem) => {
    setSelectedIndent(indent);
    setReceiveData({
      receivedQty: indent.liftingData?.qty || "",
      difference: calculateDifference(indent.liftingData?.qty || "", indent),
      receiveRemarks: "", // Ensure this is empty by default
      receiverName: "",
    });
    setShowModal(true);
  };

  const handleSubmitReceive = async () => {
    if (!selectedIndent || !receiveData.receivedQty.trim() || !receiveData.receiverName) {
      if (!receiveData.receiverName) setErrorMessage("Please select a Receiver Name");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const now = formatTimestamp(new Date());
    const receiveStatus: "All Okay" | "Not Okay" =
      receiveData.difference === "0" ? "All Okay" : "Not Okay";

    const updateData = {
      actual7: now, // BD column
      actualAL: now, // AL column (for compatibility)
      receivedQty: receiveData.receivedQty,
      difference: receiveData.difference,
      receiveRemarks: receiveData.receiveRemarks,
      receiveStatus,
      shopName: selectedIndent.shopName,
      receiverName: receiveData.receiverName,
      isReceived: true,
    };

    // Perform background operations
    try {
      // Update Google Sheets
      await indentService.updateIndent(selectedIndent.id, updateData);

      // Update local state and localStorage after successful server update
      const updatedIndents = indents.map((i) =>
        i.id === selectedIndent.id ? { ...i, ...updateData } : i
      );
      setIndents(updatedIndents);

      const saved = localStorage.getItem("indent_approval_data");
      const localIndents: IndentItem[] = saved ? JSON.parse(saved) : [];
      const updatedLocal = localIndents.map((i) =>
        i.id === selectedIndent.id ? { ...i, ...updateData } : i
      );
      localStorage.setItem(
        "indent_approval_data",
        JSON.stringify(updatedLocal)
      );

      // Set success message and reload
      localStorage.setItem("cross_check_success_msg", `Cross check completed successfully for indent ${selectedIndent.indentNumber}.`);

      setShowModal(false);
      setSelectedIndent(null);
      setReceiveData({ receivedQty: "", difference: "", receiveRemarks: "", receiverName: "" });

      window.location.reload();
    } catch (error: any) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
      setErrorMessage("Failed to complete cross check. Please try again.");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };


  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center p-6 min-h-screen">
        <div className="w-10 h-10 rounded-full border-4 border-purple-600 animate-spin border-t-transparent" />
        <p className="mt-3 text-gray-600">Loading indents...</p>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-gray-50 md:p-6 w-full lg:w-[calc(100vw-280px)]">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Cross Check & Receive
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            Manage incoming stock and verify quantities against PO.
          </p>
        </div>

        {activeTab === "pending" && selectedIds.size > 0 && (
          <button
            onClick={handleBulkSubmit}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:scale-105 active:scale-95 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : `Submit Selected (${selectedIds.size})`}
          </button>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-800 rounded-xl border border-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchIndents} className="text-sm font-bold underline">Retry</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 mb-6 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-center gap-3">
          <X className="w-5 h-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button
            onClick={() => { setActiveTab("pending"); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === "pending" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => { setActiveTab("history"); setSelectedIds(new Set()); }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === "history" ? "bg-purple-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
              }`}
          >
            History ({historyCount})
          </button>
        </div>

        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Item, Indent, Trader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {columnVisibility.action && (
                  <th className="px-6 py-4">
                    {activeTab === "pending" ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.size === currentIndents.length && currentIndents.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 text-purple-600 rounded-lg border-gray-300 focus:ring-purple-500 transition-all cursor-pointer"
                      />
                    ) : (
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                    )}
                  </th>
                )}
                {columnVisibility.orderQty && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order qty</th>}
                {columnVisibility.poQty && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Po Qty</th>}
                {columnVisibility.itemName && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Item Name</th>}
                {columnVisibility.transporterName && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Transporter Name</th>}
                {columnVisibility.traderName && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Trader name</th>}
                {columnVisibility.receivingQty && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Receiving Qty</th>}
                {columnVisibility.diff && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Diff</th>}
                {columnVisibility.remainingQty && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Remaining Qty</th>}
                {columnVisibility.receiverName && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Receiver Name</th>}
                {columnVisibility.remarks && <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Remarks</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentIndents.map((indent, index) => {
                const uniqueKey = indent._rowIndex ? String(indent._rowIndex) : `${indent.id}-${index}`;
                return (
                  <TableRow
                    key={uniqueKey}
                    indent={indent}
                    activeTab={activeTab}
                    isSelected={selectedIds.has(uniqueKey)}
                    onSelect={(id) => {
                      const newSelected = new Set(selectedIds);
                      if (newSelected.has(uniqueKey)) {
                        newSelected.delete(uniqueKey);
                      } else {
                        newSelected.add(uniqueKey);
                      }
                      setSelectedIds(newSelected);
                    }}
                    editData={rowEdits[uniqueKey]}
                    onEdit={(id, field, value) => {
                      setRowEdits((prev) => ({
                        ...prev,
                        [uniqueKey]: { ...prev[uniqueKey], [field]: value },
                      }));
                    }}
                    diff={calculateDiff(uniqueKey)}
                    columnVisibility={columnVisibility}
                  />
                );
              })}
              {currentIndents.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Package className="w-12 h-12 opacity-20" />
                      <p className="font-medium text-lg">No records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};