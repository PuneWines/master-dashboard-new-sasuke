import React, { useState, useEffect, useMemo } from "react";
import { Filter, X, Send, Eye, Truck } from "lucide-react";
import { format } from "date-fns";
import { indentService, VendorMasterEntry, POContactEntry, TransporterVerificationEntry } from "../../services/purchase_management/indentService";
import { storageUtils } from "../../utils/purchase_management/storage";
import { generatePOPDF } from "../../utils/purchase_management/pdfGenerator";
import { SuccessAnimation } from "./SuccessAnimation";

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

const hasValue = (s?: string) => typeof s === "string" && s.trim() !== "";
const isProcessed = (i: any, processedSet: Set<string>) => 
  hasValue(i.transporterName) || hasValue(i.poNumber) || i.isPO === true || processedSet.has(i.indentNumber);

// Helper to round numbers
const formatNumber = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  return isNaN(num) ? value : Math.round(num);
};

interface POIndentItem {
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
  partyName: string;
  sizeML: number;
  bottlesPerCase: number;
  perDayAvgBoxSale: number;
  reorderQuantityBox: number;
  shopName: string;
  orderBy: string;
  closingStockBottle?: number;
  closingStockInBox?: number;
  shopManagerStatus?: string;
  remarks?: string;
  approvalDate?: string;
  poNumber?: string;
  transporterName?: string;
  poGeneratedAt?: string;
  poCopyLink?: string;
  remarksFrontend?: string;
  poQty?: number;
  isPO?: boolean;
  actualTimestamp1?: string;
  actualTimestamp2?: string;
  actualTimestamp3?: string;
  traderPhone?: string;
  transporterPhone?: string;
  traderVerificationLink?: string;
  transporterVerificationLink?: string;
  receiverManager?: string;
  _rowIndex?: number;
}

interface ColumnVisibility {
  action: boolean;
  indentNumber: boolean;
  approvalDate: boolean;        // ← Added here
  skuCode: boolean;
  itemName: boolean;
  brandName: boolean;
  moq: boolean;
  maxLevel: boolean;
  closingStock: boolean;
  reorderQuantityPcs: boolean;
  traderName: boolean;
  sizeML: boolean;
  reorderQuantityBox: boolean;
  shopName: boolean;
  status: boolean;
  remarks: boolean;
}

interface POGenerateModalProps {
  indent: POIndentItem;
  onClose: () => void;
  onConfirm: (
    transporterName: string,
    receiverManager: string,
    remarks: string,
    items: POIndentItem[],
    companyName: string,
    forcedPONumber: string
  ) => void;
  indents: POIndentItem[];
  processedIndentNumbers: Set<string>;
  isSubmitting?: boolean;
  preGeneratedPONumber: string; // Pass the number from parent
}

const POGenerateModal: React.FC<POGenerateModalProps> = ({
  indent,
  onClose,
  onConfirm,
  indents,
  processedIndentNumbers,
  isSubmitting = false,
  preGeneratedPONumber,
}) => {
  const today = new Date();

  const poNumber = preGeneratedPONumber;

  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (indent) {
      setCompanyName(indent.shopName);
    }
  }, [indent]);

  const [tradeName, setTradeName] = useState(indent.traderName || "");

  useEffect(() => {
    if (indent.traderName) {
      setTradeName(indent.traderName);
    }
  }, [indent]);


  const [transporterNames, setTransporterNames] = useState<string[]>([
    "Loading...",
  ]);
  const [transporterName, setTransporterName] = useState("");
  const [receiverManagers, setReceiverManagers] = useState<string[]>(["Loading..."]);
  const [receiverManager, setReceiverManager] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [transporters, managers] = await Promise.all([
          indentService.getTransporterNames(),
          indentService.getReceiverManagers()
        ]);
        setTransporterNames(transporters);
        setReceiverManagers(managers);
        console.log("Fetched transporters:", transporters);
        console.log("Fetched managers:", managers);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMaster();
  }, []);

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [localIndents, setLocalIndents] = useState<POIndentItem[]>(indents);

  const updateShopName = (id: string, newShopName: string) => {
    setLocalIndents((prevIndents: POIndentItem[]) =>
      prevIndents.map((item: POIndentItem) =>
        item.id === id ? { ...item, shopName: newShopName } : item
      )
    );
  };

  const traderIndents = localIndents.filter((i) => i.traderName === tradeName);

  const uniqueTraderNames = [
    ...new Set(
      localIndents
        .filter(
          (i) =>
            i.shopManagerStatus === "Approved" && !isProcessed(i, processedIndentNumbers)
        )
        .map((i: POIndentItem) => i.traderName)
        .filter(Boolean)
    ),
  ];

  const visibleTraderIndents = traderIndents.filter(
    (i: POIndentItem) =>
      !deletedIds.has(i.id) &&
      i.shopManagerStatus === "Approved" &&
      !isProcessed(i, processedIndentNumbers)
  );

  // Always include the selected indent, even if it doesn't match the filters
  const finalVisibleIndents =
    indent && !visibleTraderIndents.find((i) => i.id === indent.id)
      ? [indent, ...visibleTraderIndents]
      : visibleTraderIndents;

  const uniqueShopNames = Array.from(
    new Set(finalVisibleIndents.map((i) => i.shopName?.trim()).filter(Boolean))
  );
  const displayHeader = uniqueShopNames.length > 0 ? uniqueShopNames.join(" | ") : (companyName || indent.shopName);

  return (
    <div className="flex overflow-y-auto fixed inset-0 z-50 justify-center items-center p-2 bg-black bg-opacity-50 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[95vh] overflow-y-auto print:max-w-none print:shadow-none">
        <div className="p-3 sm:p-6 print:p-0">
          <header className="mb-4 sm:mb-8 text-center bg-[#1a2a44] py-4 sm:py-6 text-white print:bg-[#1a2a44]">
            <h2 className="text-lg sm:text-2xl font-bold text-white">
              {displayHeader}
            </h2>
          </header>

          {/* Top Row */}
          <div className="flex flex-col gap-4 mb-8 md:flex-row md:justify-between">
            <div>
              <p className="font-semibold">PO NUMBER</p>
              <p className="text-2xl font-bold">{poNumber}</p>
              <p className="text-sm text-gray-600">
                Date Issued: {format(today, "dd MMM yyyy")}
              </p>
            </div>

            <div className="text-right">
              <div className="flex gap-2 justify-end items-center">
                <span className="font-semibold">Trade Name:</span>
                <select
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="px-2 py-1 text-lg font-medium rounded border border-gray-300"
                >
                  <option value="">Select Trader</option>
                  {uniqueTraderNames.map((name: string) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* All Indents for Selected Trader */}
          {finalVisibleIndents.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-lg font-semibold">
                All Products for {tradeName}
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="overflow-x-auto w-full bg-pink-100 border border-gray-300 border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">INDENT NUMBER</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">SHOP NAME</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">PARTY NAME</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">ITEM NAME</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">BOX_CLOSING_QTY</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">MlS</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">B/CS</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">PER_DAY_AVG_BOX_SALE</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">ORDER BOX</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">ORDER QTY</th>
                      <th className="px-2 py-2 text-left border border-gray-300 text-xs font-bold uppercase">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalVisibleIndents.map((i, index) => (
                      <tr
                        key={`${i.indentNumber}-${i.traderName || i.partyName}-${i.shopName}-${index}`}
                        className="hover:bg-gray-50 text-sm"
                      >
                        <td className="px-2 py-2 border border-gray-300 whitespace-nowrap">{i.indentNumber}</td>
                        <td className="px-2 py-2 border border-gray-300">
                          <input
                            type="text"
                            value={i.shopName}
                            onChange={(e) => updateShopName(i.id, e.target.value)}
                            className="px-1 py-1 w-full text-xs rounded border border-gray-300"
                          />
                        </td>
                        <td className="px-2 py-2 border border-gray-300 whitespace-nowrap">{i.partyName || i.traderName}</td>
                        <td className="px-2 py-2 border border-gray-300 min-w-[150px]">{i.itemName}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.closingStock)}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.sizeML)}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.bottlesPerCase)}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.perDayAvgBoxSale)}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.reorderQuantityBox)}</td>
                        <td className="px-2 py-2 border border-gray-300 text-center">{formatNumber(i.reorderQuantityPcs)}</td>
                        <td className="px-4 py-2 border border-gray-300">
                          <button
                            onClick={() =>
                              setDeletedIds((prev: Set<string>) =>
                                new Set(prev).add(i.id)
                              )
                            }
                            className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="px-6 pb-6 border-t print:hidden">
            <div className="mt-6">
              <label className="flex gap-2 items-center mb-2 text-sm font-medium text-gray-700">
                <Truck className="w-4 h-4" />
                Transporter Name *
              </label>
              <select
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Transporter</option>
                {transporterNames.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label className="flex gap-2 items-center mb-2 text-sm font-medium text-gray-700">
                Receiver Manager *
              </label>
              <select
                value={receiverManager}
                onChange={(e) => setReceiverManager(e.target.value)}
                className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Receiver Manager</option>
                {receiverManagers.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6">
              <label className="flex gap-2 items-center mb-2 text-sm font-medium text-gray-700">
                Remarks1
              </label>
              <input
                type="text"
                placeholder="Enter your remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="px-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onConfirm(
                    transporterName,
                    receiverManager,
                    remarks,
                    finalVisibleIndents,
                    companyName,
                    poNumber
                  )
                }
                disabled={!transporterName.trim() || !receiverManager.trim() || isSubmitting}
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                  !transporterName.trim() || !receiverManager.trim() || isSubmitting
                    ? "bg-gray-400 cursor-not-allowed text-gray-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  "Generate & Send PO"
                )}
              </button>
            </div>
            <div className="flex gap-10 justify-center items-center mt-6">
              <div className="text-sm text-gray-500">Powered By Botivate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden; }
              .print\\:max-w-none, .print\\:max-w-none * { visibility: visible; }
              .print\\:max-w-none { position: absolute; left: 0; top: 0; width: 100%; }
              .print\\:bg-\\[\\#1a2a44\\] { background-color: #1a2a44 !important; -webkit-print-color-adjust: exact; }
              .print\\:shadow-none { box-shadow: none !important; }
            }
            ::-webkit-scrollbar { display: none; }
            scrollbar-width: none;
            -ms-overflow-style: none;
          `,
        }}
      />
    </div>
  );
};

// Main Component
interface TableRowProps {
  indent: POIndentItem;
  activeTab: "pending" | "history";
  columnVisibility: ColumnVisibility;
  handleGeneratePO: (indent: POIndentItem) => void;
  handleViewHistory: (indent: POIndentItem) => void;
}

const TableRow: React.FC<TableRowProps> = ({
  indent,
  activeTab,
  columnVisibility,
  handleGeneratePO,
  handleViewHistory
}) => (
  <tr className="hover:bg-gray-50">
    {columnVisibility.action && (
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {activeTab === "pending" ? (
            <button
              onClick={() => handleGeneratePO(indent)}
              className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm"
            >
              <Send className="w-4 h-4" />
              Generate PO
            </button>
          ) : (
            <button
              onClick={() => handleViewHistory(indent)}
              className="flex gap-1 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
          )}
        </div>
      </td>
    )}
    {columnVisibility.indentNumber && (
      <td className="px-6 py-4 font-medium">{indent.indentNumber}</td>
    )}
    {columnVisibility.approvalDate && (
      <td className="px-6 py-4">
        {indent.approvalDate
          ? format(new Date(indent.approvalDate), "dd/MM/yyyy")
          : "-"}
      </td>
    )}
    {columnVisibility.skuCode && (
      <td className="px-6 py-4">{indent.skuCode}</td>
    )}
    {columnVisibility.itemName && (
      <td className="px-6 py-4 min-w-[200px]">{indent.itemName}</td>
    )}
    {columnVisibility.brandName && (
      <td className="px-6 py-4 min-w-[150px]">{indent.brandName}</td>
    )}
    {columnVisibility.moq && <td className="px-6 py-4">{formatNumber(indent.moq)}</td>}
    {columnVisibility.maxLevel && (
      <td className="px-6 py-4">{formatNumber(indent.maxLevel)}</td>
    )}
    {columnVisibility.closingStock && (
      <td className="px-6 py-4">{formatNumber(indent.closingStock)}</td>
    )}
    {columnVisibility.reorderQuantityPcs && (
      <td className="px-6 py-4">
        {indent.bottlesPerCase && indent.reorderQuantityBox
          ? Math.round(indent.bottlesPerCase * indent.reorderQuantityBox)
          : formatNumber(indent.reorderQuantityPcs)}
      </td>
    )}
    {columnVisibility.traderName && (
      <td className="px-6 py-4 min-w-[150px]">{indent.traderName}</td>
    )}
    {columnVisibility.sizeML && (
      <td className="px-6 py-4">{formatNumber(indent.sizeML)}</td>
    )}
    {columnVisibility.reorderQuantityBox && (
      <td className="px-6 py-4">{formatNumber(indent.reorderQuantityBox)}</td>
    )}
    {columnVisibility.shopName && (
      <td className="px-6 py-4 min-w-[150px]">{indent.shopName}</td>
    )}
    {columnVisibility.status && (
      <td className="px-6 py-4 min-w-[150px]">
        <span
          className={`px-2 py-1 text-xs rounded-full ${indent.shopManagerStatus === "Approved"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
            }`}
        >
          {indent.shopManagerStatus || "Pending"}
        </span>
      </td>
    )}
    {columnVisibility.remarks && activeTab === "history" && (
      <td className="px-6 py-4 min-w-[200px]">
        {indent.remarksFrontend || indent.remarks || "-"}
      </td>
    )}
  </tr>
);

export const PurchaseOrderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<POIndentItem | null>(null);
  const [indents, setIndents] = useState<POIndentItem[]>([]);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [processedIndentNumbers, setProcessedIndentNumbers] = useState<Set<string>>(new Set());
  
  const [sentPickupQtyLinks, setSentPickupQtyLinks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sent_pickup_qty_links');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [vendorMasterData, setVendorMasterData] = useState<VendorMasterEntry[]>([]);
  const [poContactData, setPoContactData] = useState<POContactEntry[]>([]);
  const [transporterVerificationLinks, setTransporterVerificationLinks] = useState<TransporterVerificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [columnVisibility] = useState<ColumnVisibility>({
    action: true,
    indentNumber: true,
    approvalDate: true,          // ← Now visible by default
    skuCode: true,
    itemName: true,
    brandName: true,
    moq: true,
    maxLevel: true,
    closingStock: true,
    reorderQuantityPcs: true,
    traderName: true,
    sizeML: true,
    reorderQuantityBox: true,
    shopName: true,
    status: true,
    remarks: true,
  });

  // Get the next PO number in sequence
  const getNextPONumber = () => {
    const existingNumbers = indents
      .map((i) => i.poNumber)
      .filter(Boolean)
      .map((po) => {
        const match = po?.match(/PO-(\d{4})-(\d{3})/);
        return match ? parseInt(match[2], 10) : 0;
      });

    const highestNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = (highestNumber + 1).toString().padStart(3, "0");
    return `PO-${new Date().getFullYear()}-${nextNumber}`;
  };

  useEffect(() => {
    const fetchIndents = async () => {
      try {
        setLoading(true);
        setError(null);
        const [data, poSet, vendorMaster, poContacts, verificationLinks] = await Promise.all([
          indentService.getIndents(),
          indentService.getProcessedPOIndentNumbers(),
          indentService.getVendorMasterData(),
          indentService.getPOContactData(),
          indentService.getTransporterVerificationLinks(),
        ]);
        console.log("📊 Raw data length:", data.length);
        setIndents(data);
        setProcessedIndentNumbers(poSet);
        setVendorMasterData(vendorMaster);
        setPoContactData(poContacts);
        setTransporterVerificationLinks(verificationLinks);
        
        const userShopRaw = storageUtils.getCurrentUser()?.shopName || "";
        const allowedShops =
          userShopRaw && userShopRaw.toLowerCase() !== "all"
            ? userShopRaw
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
            : null;
        const filtered = allowedShops
          ? (data as POIndentItem[]).filter((i: POIndentItem) =>
            allowedShops.includes((i.shopName || "").trim().toLowerCase())
          )
          : (data as POIndentItem[]);
        setIndents(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load indents");
      } finally {
        setLoading(false);
      }
    };
    fetchIndents();
  }, []);

  // --- NEW: Polling Service for Pickup Qty Follow-up ---
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      console.log("🔍 Polling Transporter Verification for follow-up links...");
      try {
        const freshLinks = await indentService.getTransporterVerificationLinks();
        setTransporterVerificationLinks(freshLinks);

        // Check for links that haven't been sent yet
        for (const entry of freshLinks) {
          if (entry.formLink && !sentPickupQtyLinks.has(entry.formLink)) {
            // Find the transporter phone number from poContactData
            const contact = poContactData.find(c => c.indentNumber === entry.indentNumber);
            if (contact && contact.transporterPhone) {
              console.log(`🚀 Automatically sending Pickup Qty Form to ${contact.transporterPhone} for Indent ${entry.indentNumber}`);
              
              const message = `📦 *Pickup Qty Form Ready: ${entry.indentNumber}*\n\n` +
                `Transporter Verification complete. Please fill the Pickup Quantity details using the link below:\n\n` +
                `📝 *Pickup Qty Form:* ${entry.formLink}\n\n` +
                `Thank you!`;

              // Trigger send (reusing the logic from the modal but without the UI state updates)
              await sendWhatsAppSilent('transporter', contact.transporterPhone, message);
              
              // Mark as sent
              setSentPickupQtyLinks(prev => {
                const next = new Set(prev).add(entry.formLink);
                localStorage.setItem('sent_pickup_qty_links', JSON.stringify(Array.from(next)));
                return next;
              });
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [transporterVerificationLinks, sentPickupQtyLinks, poContactData]);

  const sendWhatsAppSilent = async (role: string, phone: string, message: string) => {
    const productId = import.meta.env.VITE_MAYTAPI_PRODUCT_ID || '654f0c29-bfe7-42f2-b5a9-81638a716206';
    const phoneId = import.meta.env.VITE_MAYTAPI_PHONE_ID || '102579';
    const token = import.meta.env.VITE_MAYTAPI_TOKEN || '9fcce0ed-0e27-423f-946f-14141bc6589a';
    
    let formattedPhone = phone.trim();
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const baseUrl = isLocal ? '/maytapi' : 'https://api.maytapi.com';
    const apiUrl = `${baseUrl}/api/${productId}/${phoneId}/sendMessage`;

    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-maytapi-key': token },
        body: JSON.stringify({ to_number: formattedPhone, type: 'text', message }),
      });
    } catch (e) {
      console.error("Silent WhatsApp send failed:", e);
    }
  };

  useEffect(() => {
    const duplicates = indents
      .map((i) => i.id)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx);
    if (duplicates.length > 0) console.warn("Duplicate IDs:", duplicates);
  }, [indents]);

  const handleGeneratePO = (indent: POIndentItem) => {
    setSelectedIndent(indent);
    setShowModal(true);
  };

  const handleViewHistory = (indent: POIndentItem) => {
    setSelectedIndent(indent);
    setShowHistoryModal(true);
  };

  const filterIndentsBySearch = (data: POIndentItem[]) => {
    return data.filter((indent) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (indent.indentNumber || "").toLowerCase().includes(searchLower) ||
        (indent.skuCode || "").toLowerCase().includes(searchLower) ||
        (indent.itemName || "").toLowerCase().includes(searchLower) ||
        (indent.brandName || "").toLowerCase().includes(searchLower) ||
        (indent.traderName || "").toLowerCase().includes(searchLower) ||
        (indent.shopName || "").toLowerCase().includes(searchLower) ||
        (indent.orderBy || "").toLowerCase().includes(searchLower)
      );
    });
  };

  const pendingIndents = useMemo(() => {
    const base = indents.filter(
      (i) =>
        i.shopManagerStatus === "Approved" && !isProcessed(i, processedIndentNumbers)
    );
    return filterIndentsBySearch(base);
  }, [indents, searchTerm, processedIndentNumbers]);

  const historyIndents = useMemo(() => {
    const base = indents.filter(
      (i) =>
        i.shopManagerStatus === "Approved" && isProcessed(i, processedIndentNumbers)
    );
    return filterIndentsBySearch(base);
  }, [indents, searchTerm, processedIndentNumbers]);

  const handleSubmitPO = async (
    transporterName: string,
    receiverManager: string,
    remarks: string,
    items: POIndentItem[],
    companyName: string,
    forcedPONumber?: string
  ) => {
    if (!selectedIndent && items.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage("");
    console.log("✅ Validation passed, preparing backend update");

    try {
      const poNumberForSubmit = forcedPONumber || getNextPONumber();
      let poCopyLink = "";
      let receiverSlipLink = "";

      // 1. Generate PDFs (Parallel)
      const tradeName = items[0]?.traderName || selectedIndent?.traderName || "";
      const basePoData = {
        poNumber: poNumberForSubmit,
        companyName,
        tradeName,
        transporterName: transporterName.trim(),
        items: items.map((i: POIndentItem) => ({
          indentNumber: i.indentNumber || "",
          itemName: i.itemName || "",
          reorderQuantityPcs: (i.reorderQuantityPcs || 0).toString(),
          reorderQuantityBox: (i.reorderQuantityBox || 0).toString(),
          sizeML: (i.sizeML || 0).toString(),
          closingStockPcs: (i.closingStockBottle || 0).toString(),
          closingStockBox: (i.closingStockInBox || 0).toString(),
        })),
        remarks: remarks.trim() || "Generated via system",
      };

      try {
        const [vendorUrl, receiverUrl] = await Promise.all([
          generatePOPDF({ ...basePoData, type: 'vendor' }),
          generatePOPDF({ ...basePoData, type: 'receiver' })
        ]);

        const processLink = (link: string) => {
          if (link && link.includes("uc?export=download&id=")) {
            const fileId = link.split("id=")[1];
            return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
          }
          return link;
        };

        poCopyLink = processLink(vendorUrl);
        receiverSlipLink = processLink(receiverUrl);
        
        console.log("✅ PDFs generated and uploaded", { poCopyLink, receiverSlipLink });
      } catch (error) {
        console.error("Error generating PDFs:", error);
      }

      const currentIndentNo = (items[0]?.indentNumber || "").trim();
      const currentShopName = (items[0]?.shopName || "").trim();
      console.log("🔗 PDFs generated and uploaded", { poCopyLink, receiverSlipLink });

      // 2. Prepare common updates
      const currentTime = new Date().toISOString();
      const currentDate = formatTimestamp(new Date());

      // ... existing phone lookup logic ...
      const traderNameKey = tradeName;
      const transporterNameKey = transporterName.trim();
      
      const vendorEntry = vendorMasterData.find(
        (v) => v.traderName.toLowerCase() === traderNameKey.toLowerCase()
      );
      const transporterEntry = vendorMasterData.find(
        (v) => v.transporterName.toLowerCase() === transporterNameKey.toLowerCase()
      );
      const currentReceiverManager = (receiverManager || selectedIndent.receiverManager || "").trim();
      const receiverEntry = vendorMasterData.find(
        (v) => v.receiverName.toLowerCase() === currentReceiverManager.toLowerCase()
      );

      const findPOContact = (nameKey: string, role: 'trader' | 'transporter' | 'receiver') => {
        const normalizedName = nameKey.toLowerCase().trim();
        if (!normalizedName) return null;
        let match = [...poContactData].reverse().find(p => 
          p.indentNumber.trim() === currentIndentNo && 
          p.shopName.trim() === currentShopName && 
          (role === 'trader' ? p.traderName : role === 'transporter' ? p.transporterName : p.receiverManager).toLowerCase().trim() === normalizedName
        );
        if (!match) {
          match = [...poContactData].reverse().find(p => 
            p.shopName.trim() === currentShopName && 
            (role === 'trader' ? p.traderName : role === 'transporter' ? p.transporterName : p.receiverManager).toLowerCase().trim() === normalizedName
          );
        }
        if (!match) {
          match = [...poContactData].reverse().find(p => 
            (role === 'trader' ? p.traderName : role === 'transporter' ? p.transporterName : p.receiverManager).toLowerCase().trim() === normalizedName
          );
        }
        return match;
      };

      const poTraderMatch = findPOContact(traderNameKey, 'trader');
      const poTransporterMatch = findPOContact(transporterNameKey, 'transporter');
      const poReceiverMatch = findPOContact(currentReceiverManager, 'receiver');

      const autoTraderPhone = poTraderMatch?.traderPhone || vendorEntry?.traderPhone || selectedIndent?.traderPhone || "";
      const autoTransporterPhone = poTransporterMatch?.transporterPhone || transporterEntry?.transporterPhone || selectedIndent?.transporterPhone || "";
      const autoReceiverPhone = poReceiverMatch?.receiverPhone || receiverEntry?.receiverPhone || vendorEntry?.receiverPhone || "";

      console.log(`🚀 Using PO Number: ${poNumberForSubmit} for ${items.length} items`);

      // 3. Update backend for each item
      const updatePromises = items.map(async (item) => {
        const itemUpdate = {
          transporterName: transporterName.trim(),
          receiverManager: receiverManager.trim(),
          poNumber: poNumberForSubmit,
          poGeneratedAt: currentTime,
          actualTimestamp1: currentDate,
          actualTimestamp2: currentDate,
          actualTimestamp3: currentDate,
          poCopyLink: poCopyLink,
          receiverSlipLink: receiverSlipLink,
          liftingFormLink: `${window.location.origin}/public/get-lifting?token=${btoa(item.indentNumber)}`,
          remarksFrontend: remarks.trim() || "",
          remarks: remarks.trim() || item.remarks || "",
          poQty: item.reorderQuantityPcs || 0,
          isPO: true,
          shopName: item.shopName,
          plannedAE: currentDate,
          traderName: item.traderName || item.partyName || "",
          skuCode: item.skuCode || "",
          traderPhone: autoTraderPhone,
          transporterPhone: autoTransporterPhone,
          receiverPhone: autoReceiverPhone,
        };

        try {
          await indentService.updateIndent(
            item.indentNumber,
            itemUpdate,
            { skuCode: item.skuCode, itemName: item.itemName },
            item._rowIndex
          );
          return { id: item.id, ...itemUpdate };
        } catch (error) {
          console.error(`❌ Error saving indent ${item.indentNumber}:`, error);
          throw error;
        }
      });

      const updateResults = await Promise.all(updatePromises);
      
      // === IMMEDIATE FEEDBACK ===
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);

      // 4. Update UI state
      setIndents((prev) =>
        prev.map((indent) => {
          const result = updateResults.find((r) => r.id === indent.id);
          return result ? { ...indent, ...result } : indent;
        })
      );

      setProcessedIndentNumbers((prev) => {
        const next = new Set(prev);
        items.forEach((item) => next.add(item.indentNumber));
        return next;
      });

      setShowModal(false);
      setSelectedIndent(null);

      // Define a base link for WhatsApp using the first item
      const baseLiftingLink = `${window.location.origin}/public/get-lifting?token=${btoa(items[0]?.indentNumber || "")}`;

      // --- Background tasks (Re-fetch & WhatsApp) ---
      (async () => {
        console.log("🔄 Background tasks starting...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const [freshIndents, freshPOContacts, freshVerificationLinks] = await Promise.all([
          indentService.getIndents(),
          indentService.getPOContactData(),
          indentService.getTransporterVerificationLinks()
        ]);
        
        setIndents(freshIndents);
        setPoContactData(freshPOContacts);
        setTransporterVerificationLinks(freshVerificationLinks);

        const freshIndent = freshIndents.find(i => i.indentNumber === currentIndentNo && i.shopName === currentShopName);
        const traderBKLink = freshIndent?.traderVerificationLink || "";
        const transporterBKLink = freshIndent?.transporterVerificationLink || "";

        const findPOContactFresh = (nameKey: string, role: 'trader' | 'transporter' | 'receiver', data: POContactEntry[]) => {
          const normalizedName = nameKey.toLowerCase().trim();
          if (!normalizedName) return null;
          return [...data].reverse().find(p => 
            p.indentNumber.trim() === currentIndentNo && 
            p.shopName.trim() === currentShopName && 
            (role === 'trader' ? p.traderName : role === 'transporter' ? p.transporterName : p.receiverManager).toLowerCase().trim() === normalizedName
          );
        };

        const freshTraderMatch = findPOContactFresh(traderNameKey, 'trader', freshPOContacts);
        const freshTransporterMatch = findPOContactFresh(transporterNameKey, 'transporter', freshPOContacts);
        const freshReceiverMatch = findPOContactFresh(currentReceiverManager, 'receiver', freshPOContacts);

        const finalTraderPhone = freshTraderMatch?.traderPhone || autoTraderPhone;
        const finalTransporterPhone = freshTransporterMatch?.transporterPhone || autoTransporterPhone;
        const finalReceiverPhone = freshReceiverMatch?.receiverPhone || autoReceiverPhone;
        
        const finalTraderLink = traderBKLink || `(Link not generated yet)`;
        const finalTransporterLink = transporterBKLink || `(Link not generated yet)`;
        
        // WhatsApp logic with DIFFERENT links
        const vendorSlipLine = poCopyLink ? `\n📎 PO Slip: ${poCopyLink}` : "";
        const receiverSlipLine = receiverSlipLink ? `\n📎 PO Slip: ${receiverSlipLink}` : "";

        const traderMsg = `🛒 *Purchase Order: ${poNumberForSubmit}*\n` +
          `Company: ${companyName}\n` +
          `Trade Name: ${traderNameKey}\n` +
          `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
          `Items: ${items.length} SKUs${vendorSlipLine}\n\n` +
          `📝 *Verification Form:* ${finalTraderLink}\n\n` +
          `✅ *Do you ACCEPT this order? Please confirm YES or NO.*`;

        const transporterMsg = `🚛 *Pickup Assignment: ${poNumberForSubmit}*\n` +
          `Transporter: ${transporterNameKey}\n` +
          `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
          `Items: ${items.length} SKUs${vendorSlipLine}\n\n` +
          `📝 *Verification Form:* ${finalTransporterLink}\n\n` +
          `📦 *Get Lifting Form:* ${baseLiftingLink}\n\n` +
          `*Note:* Once you submit the Verification form, you will receive the Pickup Quantity form link automatically.\n\n` +
          `📦 *Did you PICK UP this order? Reply YES (picked) or NO (not picked).*`;

        const itemDetails = items.map((i, idx) =>
          `${idx + 1}. ${i.itemName}\n` +
          `   Closing Stock: ${Math.round(i.closingStockBottle || 0)} Btl | ${Math.round(i.closingStockInBox || 0)} Box\n` +
          `   Order Qty: ${Math.round(i.reorderQuantityPcs || 0)} Pcs | ${Math.round(i.reorderQuantityBox || 0)} Box`
        ).join("\n\n");

        const receiverMsg = `📬 *New Delivery Incoming: ${poNumberForSubmit}*\n` +
          `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
          `From Trader: ${traderNameKey}\n\n` +
          `*Items Detail:*\n${itemDetails}${receiverSlipLine}\n\n` +
          `Please be ready to receive and verify.`;

        // Send messages...
        if (finalTraderPhone) indentService.addToWhatsappSheet(finalTraderPhone, traderMsg);
        if (finalTransporterPhone) indentService.addToWhatsappSheet(finalTransporterPhone, transporterMsg);
        if (finalReceiverPhone) indentService.addToWhatsappSheet(finalReceiverPhone, receiverMsg);
      })();

    } catch (err: any) {
      console.error("Submit error:", err);
      setErrorMessage("Failed to send PO. Please check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50 md:p-6 w-full lg:w-[calc(100vw-280px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          PO Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          Generate and manage Purchase Orders
        </p>
      </div>

      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-block w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin" />
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {!loading && !error && (
        <div>
          <div className="mb-4">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-4 md:space-x-8">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "pending"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  Pending ({pendingIndents.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  History ({historyIndents.length})
                </button>
              </nav>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search indents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    {columnVisibility.action && (
                      <th className="px-6 py-3">
                        <span>Action</span>
                      </th>
                    )}
                    {columnVisibility.indentNumber && <th className="px-6 py-3">Indent #</th>}
                    {columnVisibility.approvalDate && <th className="px-6 py-3">Appr. Date</th>}
                    {columnVisibility.skuCode && <th className="px-6 py-3">SKU</th>}
                    {columnVisibility.itemName && <th className="px-6 py-3 min-w-[200px]">Item</th>}
                    {columnVisibility.brandName && <th className="px-6 py-3">Brand</th>}
                    {columnVisibility.moq && <th className="px-6 py-3">MOQ</th>}
                    {columnVisibility.maxLevel && <th className="px-6 py-3">Max</th>}
                    {columnVisibility.closingStock && <th className="px-6 py-3">Stock</th>}
                    {columnVisibility.reorderQuantityPcs && <th className="px-6 py-3">Qty (Pcs)</th>}
                    {columnVisibility.traderName && <th className="px-6 py-3">Trader</th>}
                    {columnVisibility.sizeML && <th className="px-6 py-3">Size</th>}
                    {columnVisibility.reorderQuantityBox && <th className="px-6 py-3">Box</th>}
                    {columnVisibility.shopName && <th className="px-6 py-3">Shop</th>}
                    {columnVisibility.status && <th className="px-6 py-3">Status</th>}
                    {columnVisibility.remarks && activeTab === "history" && <th className="px-6 py-3">Remarks</th>}
                  </tr>
                </thead>
                <tbody key={activeTab} className="divide-y divide-gray-200">
                  {(activeTab === "pending" ? pendingIndents : historyIndents).map((indent) => (
                    <TableRow
                      key={`${activeTab}-${indent.id}-${indent.indentNumber}`}
                      indent={indent}
                      activeTab={activeTab}
                      columnVisibility={columnVisibility}
                      handleGeneratePO={handleGeneratePO}
                      handleViewHistory={handleViewHistory}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showModal && selectedIndent && (
            <POGenerateModal
              indent={selectedIndent}
              onClose={() => {
                setShowModal(false);
                setSelectedIndent(null);
              }}
              onConfirm={handleSubmitPO}
              indents={indents}
              processedIndentNumbers={processedIndentNumbers}
              isSubmitting={isSubmitting}
              preGeneratedPONumber={getNextPONumber()}
            />
          )}

          {showHistoryModal && selectedIndent && (
            <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-bold">PO Details</h2>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>
                          <strong>PO #:</strong> {selectedIndent.poNumber || "N/A"}
                        </span>
                        <span>
                          <strong>Transporter:</strong>{" "}
                          {selectedIndent.transporterName || "N/A"}
                        </span>
                        {selectedIndent.poCopyLink && (
                          <a
                            href={selectedIndent.poCopyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 underline hover:text-blue-800"
                          >
                            View PO Copy
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        setSelectedIndent(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Generated At</p>
                        <p className="font-medium">
                          {selectedIndent.poGeneratedAt
                            ? format(new Date(selectedIndent.poGeneratedAt), "dd MMM yyyy HH:mm")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Quantity (Pcs)</p>
                        <p className="font-medium">{selectedIndent.poQty || selectedIndent.reorderQuantityPcs}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Remarks</h3>
                      <p className="p-3 bg-gray-50 rounded italic text-gray-600">
                        {selectedIndent.remarksFrontend || "No remarks provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <SuccessAnimation
        visible={showSuccessAnimation}
        message="PO Generated & Messages Queued!"
        onComplete={() => setShowSuccessAnimation(false)}
      />
    </div>
  );
};

export default PurchaseOrderPage;