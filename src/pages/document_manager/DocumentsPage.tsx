import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "../../components/document_manager/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/document_manager/ui/card";
import { Checkbox } from "../../components/document_manager/ui/checkbox";
import { Input } from "../../components/document_manager/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/document_manager/ui/table";
import { ArrowLeft, Download, FileText, Mail, MoreHorizontal, Search, Smartphone, Trash2, User, Briefcase, Users, Plus, RefreshCw, Image as ImageIcon, Loader2, Check, X as XIcon } from "lucide-react";
import { toast } from "../../components/document_manager/ui/use-toast";
import { Toaster } from "../../components/document_manager/ui/toaster";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/document_manager/ui/dropdown-menu";
import { Badge } from "../../components/document_manager/ui/badge";
import { EmailShareDialog } from "../../components/document_manager/email-share-dialog";
import { WhatsAppShareDialog } from "../../components/document_manager/whatsapp-share-dialog";
import { useAuth } from "../../components/document_manager/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/document_manager/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/document_manager/ui/dialog";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec";

interface DocItem {
  id: number; timestamp: string; serialNo: string; name: string;
  documentType: string; category: string; company: string; tags: string[];
  personName: string; needsRenewal: boolean; renewalDate: string;
  imageUrl: string; email: string; mobile: string; sourceSheet: string; isDeleted: boolean;
}
type DocumentFilter = "All" | "Personal" | "Company" | "Director" | "Renewal";

const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return "";
  try {
    let date: Date;
    if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateString.split("/");
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else { date = new Date(dateString); }
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch { return dateString; }
};

const formatDateTimeDisplay = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    if (hours === "00" && minutes === "00" && seconds === "00") {
      const now = new Date();
      return `${day}/${month}/${year} || ${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}:${now.getSeconds().toString().padStart(2,"0")}`;
    }
    return `${day}/${month}/${year} || ${hours}:${minutes}:${seconds}`;
  } catch { return dateString; }
};

const isDatePastToday = (dateString: string): boolean => {
  if (!dateString) return false;
  try {
    const [datePart] = dateString.split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const renewalDate = new Date(year, month - 1, day);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return renewalDate < today;
  } catch { return false; }
};

const LoadingSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Loading Documents</h3>
        <p className="text-sm text-gray-500">Please wait while we fetch your documents...</p>
      </div>
    </div>
  </div>
);

export default function DocDocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, userRole, userName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [shareMethod, setShareMethod] = useState<"email" | "whatsapp" | "both" | null>(null);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("All");
  const [mounted, setMounted] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<DocumentFilter>("All");
  const [editingRenewalDocId, setEditingRenewalDocId] = useState<number | null>(null);
  const [tempRenewalDate, setTempRenewalDate] = useState<Date | undefined>(undefined);
  const [tempNeedsRenewal, setTempNeedsRenewal] = useState<boolean>(false);
  const [emailData, setEmailData] = useState({ to: "", name: "", subject: "", message: "" });
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    setMounted(true);
    setCurrentUserRole(userRole);
    const search = searchParams.get("search");
    if (search) setSearchTerm(search);
    const filter = searchParams.get("filter") as DocumentFilter;
    if (filter && ["Personal", "Company", "Director", "Renewal"].includes(filter)) setCurrentFilter(filter);
    if (documents.length === 0) fetchDocuments();
  }, [isLoggedIn]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const [documentsResponse, renewalsResponse, masterResponse] = await Promise.all([
        fetch(`${SCRIPT_URL}?sheet=Documents`),
        fetch(`${SCRIPT_URL}?sheet=Updated Renewal`),
        fetch(`${SCRIPT_URL}?sheet=Master`),
      ]);
      const [documentsData, renewalsData, masterData] = await Promise.all([
        documentsResponse.json(), renewalsResponse.json(), masterResponse.json(),
      ]);

      if (masterData.success && masterData.data) {
        const types = masterData.data.slice(1).map((row: any[]) => row[0]).filter((t: string) => t)
          .filter((v: string, i: number, s: string[]) => s.indexOf(v) === i);
        setDocumentTypes(types);
      }

      let allDocs: DocItem[] = [];
      const serialNoMap = new Map<string, DocItem>();

      const processDocument = (doc: DocItem) => {
        if (!doc.serialNo) { allDocs.push(doc); return; }
        const existingDoc = serialNoMap.get(doc.serialNo);
        if (existingDoc) {
          if (new Date(doc.timestamp) > new Date(existingDoc.timestamp)) {
            const mergedDoc = { ...existingDoc, ...doc, tags: [...new Set([...existingDoc.tags, ...doc.tags])] };
            serialNoMap.set(doc.serialNo, mergedDoc);
            const index = allDocs.findIndex((d) => d.id === existingDoc.id);
            if (index !== -1) allDocs[index] = mergedDoc;
          }
        } else { serialNoMap.set(doc.serialNo, doc); allDocs.push(doc); }
      };

      if (documentsData.success && documentsData.data) {
        documentsData.data.slice(1).map((doc: any[], index: number) => ({
          id: index + 1, timestamp: doc[0] ? new Date(doc[0]).toISOString() : new Date().toISOString(),
          serialNo: doc[1] || "", name: doc[2] || "", documentType: doc[3] || "Personal",
          category: doc[4] || "", company: doc[5] || "",
          tags: doc[6] ? String(doc[6]).split(",").map((t: string) => t.trim()) : [],
          personName: doc[7] || "", needsRenewal: doc[8] === "TRUE" || doc[8] === "Yes" || false,
          renewalDate: formatDateToDDMMYYYY(doc[9] || ""),
          imageUrl: doc[11] || "", email: doc[12] || "", mobile: doc[13] ? String(doc[13]) : "",
          sourceSheet: "Documents",
          isDeleted: doc[14] && ["DELETED","Deleted","deleted"].includes(doc[14]),
        })).filter((doc: DocItem) => !doc.isDeleted).forEach(processDocument);
      }

      if (renewalsData.success && renewalsData.data) {
        renewalsData.data.slice(1).map((doc: any[], index: number) => {
          const renewalInfo = doc[9] || "";
          let needsRenewal = false; let renewalDate = "";
          if (renewalInfo) {
            const parsedDate = new Date(renewalInfo);
            if (!isNaN(parsedDate.getTime())) { needsRenewal = true; renewalDate = formatDateToDDMMYYYY(renewalInfo); }
            else { needsRenewal = renewalInfo === "TRUE" || renewalInfo === "Yes" || renewalInfo.toLowerCase().includes("renew"); }
          }
          return {
            id: index + 1000000, timestamp: doc[0] ? new Date(doc[0]).toISOString() : new Date().toISOString(),
            serialNo: doc[1] || "", name: doc[3] || "", documentType: "Renewal",
            category: doc[5] || "", company: doc[6] || "",
            tags: doc[7] ? String(doc[7]).split(",").map((t: string) => t.trim()) : [],
            personName: doc[10] || "", needsRenewal, renewalDate,
            imageUrl: doc[13] || "", email: doc[11] || "", mobile: doc[12] ? String(doc[12]) : "",
            sourceSheet: "Updated Renewal",
            isDeleted: doc[14] && ["DELETED","Deleted","deleted"].includes(doc[14]),
          };
        }).filter((doc: DocItem) => !doc.isDeleted).forEach(processDocument);
      }

      allDocs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      allDocs = allDocs.map((doc, index) => ({ ...doc, id: index + 1 }));

      if (userRole?.toLowerCase() === "admin") { setDocuments(allDocs); return; }
      if (userName) {
        allDocs = allDocs.filter((doc) => doc.personName && doc.personName.toLowerCase() === userName.toLowerCase());
      }
      setDocuments(allDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({ title: "Error", description: "Failed to fetch documents", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDeleteDocument = async (docId: number) => {
    try {
      setIsLoading(true);
      const docToDelete = documents.find((doc) => doc.id === docId);
      if (!docToDelete) return;
      const formData = new FormData();
      formData.append("action", "markDeleted"); formData.append("sheetName", docToDelete.sourceSheet);
      formData.append("serialNo", docToDelete.serialNo); formData.append("timestamp", docToDelete.timestamp);
      formData.append("deletionMarker", "DELETED");
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
        setSelectedDocs((prev) => prev.filter((id) => id !== docId));
        toast({ title: "Success", description: "Document marked as deleted" });
      } else { throw new Error(result.message || "Failed to delete document"); }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete document", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDownloadDocument = (imageUrl: string, documentName: string) => {
    if (!imageUrl) { toast({ title: "No image available", description: "This document doesn't have an image to download", variant: "destructive" }); return; }
    const fileId = imageUrl.match(/[-\w]{25,}/)?.[0];
    if (!fileId) {
      const link = document.createElement("a"); link.href = imageUrl;
      link.setAttribute("download", `${documentName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else { window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, "_blank", "noopener,noreferrer"); }
    toast({ title: "Download started", description: `Downloading ${documentName}` });
  };

  const handleSaveRenewalDate = async (docId: number) => {
    setIsLoading(true);
    try {
      const docToUpdate = documents.find((doc) => doc.id === docId);
      if (!docToUpdate) return;
      const formattedDate = tempRenewalDate ? formatDateToDDMMYYYY(tempRenewalDate.toISOString()) : "";
      const formData = new FormData();
      formData.append("action", "updateRenewal"); formData.append("sheetName", "Updated Renewal");
      formData.append("documentId", docId.toString()); formData.append("documentName", docToUpdate.name);
      formData.append("documentType", docToUpdate.documentType); formData.append("category", docToUpdate.category);
      formData.append("company", docToUpdate.company); formData.append("personName", docToUpdate.personName);
      formData.append("needsRenewal", tempNeedsRenewal.toString()); formData.append("renewalDate", formattedDate);
      formData.append("email", docToUpdate.email); formData.append("mobile", docToUpdate.mobile);
      formData.append("imageUrl", docToUpdate.imageUrl); formData.append("originalSerialNo", docToUpdate.serialNo);
      formData.append("timestamp", new Date().toISOString());
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) {
        setDocuments((prev) => [{ ...docToUpdate, needsRenewal: tempNeedsRenewal, renewalDate: formattedDate }, ...prev.filter((doc) => doc.id !== docId)]);
        toast({ title: "Success", description: "Renewal information updated successfully" });
      } else { toast({ title: "Error", description: result.message || "Failed to update renewal", variant: "destructive" }); }
    } catch { toast({ title: "Error", description: "Error updating renewal", variant: "destructive" }); }
    finally { setEditingRenewalDocId(null); setTempRenewalDate(undefined); setTempNeedsRenewal(false); setIsLoading(false); }
  };

  const handleShareEmail = async (emailData: { to: string; name: string; subject: string; message: string; }) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("action", "shareViaEmail"); formData.append("recipientEmail", emailData.to);
      formData.append("recipientName", emailData.name || ""); formData.append("subject", emailData.subject);
      formData.append("message", emailData.message);
      formData.append("documents", JSON.stringify(selectedDocItems.map((doc) => ({
        id: doc.id.toString(), name: doc.name, serialNo: doc.serialNo,
        documentType: doc.documentType, category: doc.category, imageUrl: doc.imageUrl, sourceSheet: doc.sourceSheet,
      }))));
      await fetch(SCRIPT_URL, { method: "POST", body: formData });
      toast({ title: "Success", description: "Email sent successfully!" });
      setSelectedDocs([]);
    } catch (error) {
      toast({ title: "Error", description: "Network error. Please check your connection.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleShareWhatsApp = async (number: string) => {
    try {
      setIsLoading(true);
      const formattedNumber = number.replace(/\D/g, "");
      const formData = new FormData();
      formData.append("action", "shareViaWhatsApp"); formData.append("recipientNumber", formattedNumber);
      formData.append("documents", JSON.stringify(selectedDocItems.map((doc) => ({
        id: doc.id.toString(), name: doc.name, serialNo: doc.serialNo,
        documentType: doc.documentType, category: doc.category, imageUrl: doc.imageUrl, sourceSheet: doc.sourceSheet, mobile: formattedNumber,
      }))));
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      const result = await response.json();
      if (result.success) { toast({ title: "Success", description: `WhatsApp message prepared for ${formattedNumber}` }); return true; }
      throw new Error(result.message || "Failed to share via WhatsApp");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to share via WhatsApp", variant: "destructive" });
      return false;
    } finally { setIsLoading(false); }
  };

  const handleFilterChange = (value: string) => {
    setCurrentFilter(value as DocumentFilter);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (value === "All") { newSearchParams.delete("filter"); } else { newSearchParams.set("filter", value); }
    setSearchParams(newSearchParams);
  };

  const filteredDocuments = documents.filter((doc) => !doc.isDeleted).filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.email).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.mobile).toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.serialNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = currentFilter === "All" || (currentFilter === "Renewal" && doc.needsRenewal) || doc.category === currentFilter;
    const matchesDocumentType = selectedDocumentType === "All" || doc.documentType === selectedDocumentType;
    return matchesSearch && matchesFilter && matchesDocumentType;
  });

  const selectedDocItems = documents.filter((doc) => selectedDocs.includes(doc.id));
  const handleCheckboxChange = (id: number) => setSelectedDocs((prev) => prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]);

  const handleEmailShareClick = () => {
    if (selectedDocs.length === 0) { toast({ title: "No documents selected", description: "Please select at least one document", variant: "destructive" }); return; }
    setEmailData({ to: "", name: "", subject: "", message: "" }); setShareMethod("email");
  };
  const handleWhatsAppShareClick = () => {
    if (selectedDocs.length === 0) { toast({ title: "No documents selected", description: "Please select at least one document", variant: "destructive" }); return; }
    const firstDoc = documents.find((doc) => selectedDocs.includes(doc.id));
    setWhatsappNumber(firstDoc?.mobile || ""); setShareMethod("whatsapp");
  };

  if (!mounted || !isLoggedIn) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1200px] mx-auto h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-b from-indigo-50 to-white relative">
      <Toaster />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 sticky top-0 z-10 py-2 border-b border-indigo-100">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50">
            <Link to="/document_manager"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-indigo-800 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />All Documents
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <Select onValueChange={(value) => setSelectedDocumentType(value)} value={selectedDocumentType} disabled={isLoading || documentTypes.length === 0}>
            <SelectTrigger className="w-[180px] border-indigo-300 focus:ring-indigo-500"><SelectValue placeholder="Document Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Document Types</SelectItem>
              {documentTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-indigo-500" />
            <Input placeholder="Search documents..." className="pl-8 border-indigo-300 focus:border-indigo-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoading} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select onValueChange={handleFilterChange} value={currentFilter} disabled={isLoading}>
              <SelectTrigger className="w-[180px] border-indigo-300 focus:ring-indigo-500"><SelectValue placeholder="Filter by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Documents</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Company">Company</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-1 sm:flex-none">
              {currentUserRole?.toLowerCase() === "admin" && (
                <>
                  <Button size="sm" disabled={selectedDocs.length === 0 || isLoading} onClick={handleEmailShareClick} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex-1 sm:flex-none">
                    <Mail className="h-4 w-4 mr-2" />Email
                  </Button>
                  <Button size="sm" disabled={selectedDocs.length === 0 || isLoading} onClick={handleWhatsAppShareClick} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-1 sm:flex-none">
                    <Smartphone className="h-4 w-4 mr-2" />WhatsApp
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {isLoading && documents.length === 0 ? <LoadingSpinner /> : (
          <Card className="shadow-sm h-full flex flex-col border border-indigo-100 w-full">
            <CardHeader className="bg-indigo-50 border-b border-indigo-100 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg text-indigo-800 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-600 flex-shrink-0" />
                  {currentFilter === "All" ? "All Documents" : `${currentFilter} Documents`}
                </CardTitle>
                <Button variant="outline" size="sm" className="border-indigo-300 text-indigo-700 hover:bg-white hover:text-indigo-800" asChild>
                  <Link to="/document_manager/documents/add"><Plus className="h-4 w-4 mr-2" />Add New</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto w-full">
              <Table className="w-full">
                <TableHeader className="bg-indigo-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 p-2 md:p-4">
                      <Checkbox checked={selectedDocs.length > 0 && selectedDocs.length === filteredDocuments.length}
                        onCheckedChange={() => {
                          if (selectedDocs.length === filteredDocuments.length) setSelectedDocs([]);
                          else setSelectedDocs(filteredDocuments.map((doc) => doc.id));
                        }} />
                    </TableHead>
                    <TableHead className="w-20 p-2 md:p-4">Actions</TableHead>
                    <TableHead className="w-24 p-2 md:p-4">Serial No</TableHead>
                    <TableHead className="min-w-[180px] p-2 md:p-4">Document Name</TableHead>
                    <TableHead className="min-w-[120px] p-2 md:p-4">Document Type</TableHead>
                    <TableHead className="min-w-[100px] hidden md:table-cell p-2 md:p-4">Category</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell p-2 md:p-4">Name</TableHead>
                    <TableHead className="min-w-[180px] hidden md:table-cell p-2 md:p-4">Renewal</TableHead>
                    <TableHead className="w-12 hidden lg:table-cell p-2 md:p-4">Image</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length > 0 ? filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-indigo-50/50">
                      <TableCell className="p-2 md:p-4"><Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => handleCheckboxChange(doc.id)} /></TableCell>
                      <TableCell className="text-right p-2 md:p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-indigo-100">
                            {currentUserRole?.toLowerCase() === "admin" && (
                              <>
                                <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => { if (selectedDocs.length === 0) setSelectedDocs([doc.id]); setEmailData({ to: "", name: "", subject: "", message: "" }); setShareMethod("email"); }}>
                                  <Mail className="h-4 w-4 mr-2 text-indigo-500" />Email
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => { if (selectedDocs.length === 0) setSelectedDocs([doc.id]); setWhatsappNumber(doc.mobile || ""); setShareMethod("whatsapp"); }}>
                                  <Smartphone className="h-4 w-4 mr-2 text-indigo-500" />WhatsApp
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => handleDownloadDocument(doc.imageUrl, doc.name)}>
                              <Download className="h-4 w-4 mr-2 text-indigo-500" />Download
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600" onClick={() => handleDeleteDocument(doc.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="p-2 md:p-4 font-mono text-sm">{doc.serialNo || "-"}</TableCell>
                      <TableCell className="p-2 md:p-4">
                        <div className="flex items-center min-w-0">
                          {doc.category === "Personal" ? <User className="h-4 w-4 mr-2 text-indigo-500 flex-shrink-0" /> : doc.category === "Company" ? <Briefcase className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" /> : <Users className="h-4 w-4 mr-2 text-purple-500 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-medium truncate text-sm md:text-base">{doc.name}</div>
                            <div className="md:hidden text-xs text-gray-500 truncate">{doc.serialNo} • {doc.category}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 md:p-4"><Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">{doc.documentType || "N/A"}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell p-2 md:p-4">
                        <Badge className={`${doc.category === "Personal" ? "bg-indigo-100 text-indigo-800" : doc.category === "Company" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>{doc.category || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell p-2 md:p-4">{doc.personName || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell p-2 md:p-4">
                        {editingRenewalDocId === doc.id ? (
                          <div className="flex flex-col gap-2 items-start max-w-[180px]">
                            <div className="flex items-center gap-1">
                              <Checkbox id={`dmRenewalEdit-${doc.id}`} checked={tempNeedsRenewal}
                                onCheckedChange={(checked: boolean) => { setTempNeedsRenewal(checked); if (!checked) setTempRenewalDate(undefined); }} className="border-indigo-300" />
                              <label htmlFor={`dmRenewalEdit-${doc.id}`} className="text-xs font-medium">Needs Renewal</label>
                            </div>
                            {tempNeedsRenewal && (
                              <input type="date" className="h-8 text-xs border rounded px-2 w-full" onChange={(e) => e.target.value && setTempRenewalDate(new Date(e.target.value))} />
                            )}
                            <div className="flex gap-1 mt-1">
                              <Button variant="outline" size="sm" onClick={() => handleSaveRenewalDate(doc.id)} className="h-7 px-2 border-indigo-300 text-indigo-700" disabled={isLoading}>
                                <Check className="h-3 w-3 mr-1" />Save
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setEditingRenewalDocId(null); setTempRenewalDate(undefined); setTempNeedsRenewal(false); }} className="h-7 px-2 text-indigo-700" disabled={isLoading}>
                                <XIcon className="h-3 w-3 mr-1" />Cancel
                              </Button>
                            </div>
                          </div>
                        ) : doc.needsRenewal ? (
                          <Badge className={`flex items-center gap-1 ${isDatePastToday(doc.renewalDate) ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            <RefreshCw className="h-3 w-3" /><span className="font-mono text-xs">{doc.renewalDate || "Required"}</span>
                          </Badge>
                        ) : <span className="text-gray-500 text-sm">-</span>}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell p-2 md:p-4">
                        {doc.imageUrl ? <a href={doc.imageUrl} target="_blank" rel="noopener noreferrer"><ImageIcon className="h-5 w-5 text-indigo-600" /></a> : "-"}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-indigo-200 mb-4" />
                          <p className="mb-4">{searchTerm || currentFilter !== "All" ? "No documents found matching your criteria." : "No documents found."}</p>
                          {!searchTerm && currentFilter === "All" && (
                            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white" asChild>
                              <Link to="/document_manager/documents/add"><Plus className="h-4 w-4 mr-2" />Add New Document</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden mt-4">
        {filteredDocuments.length > 0 && (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className={`shadow-sm overflow-hidden border-indigo-100 border-l-4 ${doc.category === "Personal" ? "border-l-indigo-500" : doc.category === "Company" ? "border-l-blue-500" : "border-l-purple-500"}`}>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => handleCheckboxChange(doc.id)} className="mr-3" />
                    {doc.category === "Personal" ? <User className="h-5 w-5 mr-2 text-indigo-500 flex-shrink-0" /> : doc.category === "Company" ? <Briefcase className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" /> : <Users className="h-5 w-5 mr-2 text-purple-500 flex-shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate text-sm">{doc.name}</div>
                      <div className="text-xs text-gray-500 truncate">Serial: {doc.serialNo || "N/A"} • {doc.category}</div>
                      <div className="text-xs text-gray-500 truncate font-mono">{doc.timestamp ? formatDateTimeDisplay(doc.timestamp) : "No Date"}</div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-indigo-100">
                      {currentUserRole?.toLowerCase() === "admin" && (
                        <>
                          <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => { if (selectedDocs.length === 0) setSelectedDocs([doc.id]); setEmailData({ to: doc.email || "", name: doc.personName || "", subject: `Document: ${doc.name}`, message: `Please find attached the document "${doc.name}" (Serial No: ${doc.serialNo}).` }); setShareMethod("email"); }}>
                            <Mail className="h-4 w-4 mr-2 text-indigo-500" />Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => { if (selectedDocs.length === 0) setSelectedDocs([doc.id]); setWhatsappNumber(doc.mobile || ""); setShareMethod("whatsapp"); }}>
                            <Smartphone className="h-4 w-4 mr-2 text-indigo-500" />WhatsApp
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem className="cursor-pointer text-indigo-700 hover:bg-indigo-50" onClick={() => handleDownloadDocument(doc.imageUrl, doc.name)}>
                        <Download className="h-4 w-4 mr-2 text-indigo-500" />Download
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-red-600 hover:bg-red-50 focus:text-red-600" onClick={() => handleDeleteDocument(doc.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Email Share Dialog */}
      <EmailShareDialog open={shareMethod === "email"} onOpenChange={(open) => !open && setShareMethod(null)}
        emailData={emailData} setEmailData={setEmailData} selectedDocuments={selectedDocItems} onShare={handleShareEmail} />

      {/* WhatsApp Share Dialog */}
      <WhatsAppShareDialog open={shareMethod === "whatsapp"} onOpenChange={(open) => !open && setShareMethod(null)}
        whatsappNumber={whatsappNumber} setWhatsappNumber={setWhatsappNumber} selectedDocuments={selectedDocItems} onShare={handleShareWhatsApp} />

      {/* Share Both Dialog */}
      <Dialog open={shareMethod === "both"} onOpenChange={(open) => !open && setShareMethod(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Share Documents via Email and WhatsApp</DialogTitle>
            <DialogDescription>Fill in the details to share the selected documents via both email and WhatsApp.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dm-both-name" className="text-right">Recipient Name</label>
              <Input id="dm-both-name" value={emailData.name} onChange={(e) => setEmailData({ ...emailData, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dm-both-email" className="text-right">Email Address</label>
              <Input id="dm-both-email" type="email" value={emailData.to} onChange={(e) => setEmailData({ ...emailData, to: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dm-both-mobile" className="text-right">WhatsApp Number</label>
              <Input id="dm-both-mobile" type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dm-both-subject" className="text-right">Subject</label>
              <Input id="dm-both-subject" value={emailData.subject} onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="dm-both-message" className="text-right">Message</label>
              <textarea id="dm-both-message" value={emailData.message} onChange={(e) => setEmailData({ ...emailData, message: e.target.value })} className="col-span-3 min-h-[100px] border rounded-md p-2" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={async () => { await handleShareEmail(emailData); await handleShareWhatsApp(whatsappNumber); setShareMethod(null); }} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
              Share Both
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
