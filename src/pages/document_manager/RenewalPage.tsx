import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "../../components/document_manager/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/document_manager/ui/card";
import { Input } from "../../components/document_manager/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/document_manager/ui/table";
import { ArrowLeft, Download, FileText, MoreHorizontal, Search, User, Briefcase, Users, Plus, RefreshCw, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "../../components/document_manager/ui/use-toast";
import { Toaster } from "../../components/document_manager/ui/toaster";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/document_manager/ui/dropdown-menu";
import { Badge } from "../../components/document_manager/ui/badge";
import { Checkbox } from "../../components/document_manager/ui/checkbox";
import { useAuth } from "../../components/document_manager/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/document_manager/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/document_manager/ui/dialog";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec";

interface DocItem {
  id: number; timestamp: string; serialNo: string; name: string;
  documentType: string; category: string; company: string; tags: string[];
  personName: string; needsRenewal: boolean; renewalDate: string;
  imageUrl: string; email: string; mobile: string;
}
type DocumentFilter = "Renewal" | "Overdue" | "Today" | "Upcoming";

const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return "";
  try {
    if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{1,2}$/)) return dateString;
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
    return `${day}/${month}/${year}`;
  } catch { return dateString; }
};

const formatImageUrl = (url: string): string => {
  if (!url) return "";
  if (url.includes("uc?export=view")) return url;
  if (url.includes("drive.google.com/file/d/")) {
    const fileId = url.split("/file/d/")[1].split("/")[0];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  return url;
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-12 w-12 text-[#7569F6] animate-spin" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Loading Documents</h3>
        <p className="text-sm text-gray-500">Please wait while we fetch your documents...</p>
      </div>
    </div>
  </div>
);

export default function DocRenewalPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, userRole, userName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<DocumentFilter>("Renewal");
  const [editingRenewalDoc, setEditingRenewalDoc] = useState<DocItem | null>(null);
  const [tempRenewalDate, setTempRenewalDate] = useState<Date | undefined>(undefined);
  const [tempRenewalTime, setTempRenewalTime] = useState<string>("");
  const [tempNeedsRenewal, setTempNeedsRenewal] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  const getRenewalStatus = (renewalDate: string): "upcoming" | "today" | "overdue" => {
    if (!renewalDate) return "upcoming";
    try {
      const [datePart, timePart] = renewalDate.split(" ");
      const dateParts = datePart.includes("/") ? datePart.split("/").map(Number) : datePart.split("-").map(Number).reverse();
      if (dateParts.length !== 3) return "upcoming";
      const renewalDateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
      if (timePart) { const [h, m] = timePart.split(":").map(Number); renewalDateObj.setHours(h, m, 0, 0); }
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      if (renewalDateObj < todayStart) return "overdue";
      if (renewalDateObj >= todayStart && renewalDateObj < todayEnd) return "today";
      return "upcoming";
    } catch { return "upcoming"; }
  };

  const handleViewImage = (url: string) => {
    try { window.open(formatImageUrl(url), "_blank"); }
    catch { toast({ title: "Error", description: "Could not open image", variant: "destructive" }); }
  };

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    setMounted(true);
    fetchDocuments();
  }, [isLoggedIn]);

  useEffect(() => {
    const filter = searchParams.get("filter") as DocumentFilter;
    if (filter) setCurrentFilter(filter);
  }, [searchParams]);

  const fetchDocuments = async () => {
    if (documents.length === 0) setIsLoading(true);
    try {
      const docsResponse = await fetch(`${SCRIPT_URL}?sheet=Documents`);
      const docsData = await docsResponse.json();
      let docs: DocItem[] = [];
      if (docsData.success && docsData.data) {
        docs = docsData.data.slice(1)
          .filter((doc: any[]) => !doc[14] || !doc[14].toString().toLowerCase().includes("deleted"))
          .map((doc: any[], index: number) => ({
            id: index + 1,
            timestamp: doc[0] ? new Date(doc[0]).toISOString() : new Date().toISOString(),
            serialNo: doc[1] || "", name: doc[2] || "", documentType: doc[3] || "Personal",
            category: doc[4] || "", company: doc[5] || "",
            tags: doc[6] ? String(doc[6]).split(",").map((t: string) => t.trim()) : [],
            personName: doc[7] || "", needsRenewal: doc[8] === "TRUE" || doc[8] === "Yes" || false,
            renewalDate: formatDateToDDMMYYYY(doc[9] || ""),
            imageUrl: doc[11] || "", email: doc[12] || "", mobile: doc[13] ? String(doc[13]) : "",
          }))
          .filter((doc: DocItem) => userRole?.toLowerCase() === "admin" || doc.personName?.toLowerCase() === userName?.toLowerCase());
        docs.sort((a: DocItem, b: DocItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({ title: "Error", description: "Failed to fetch documents", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    setUploadingImage(true);
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (error) => reject(error);
      });
      const formData = new FormData();
      formData.append("action", "uploadFile"); formData.append("fileName", file.name);
      formData.append("mimeType", file.type); formData.append("folderId", "1TqXpAf0NxGmiByDyndT-9dpdRvRyUD23");
      formData.append("base64Data", base64String);
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success || !result.fileUrl) throw new Error(result.message || "Upload failed");
      return formatImageUrl(result.fileUrl);
    } finally { setUploadingImage(false); }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
      const imageUrl = await handleImageUpload(file);
      if (imageUrl) setTempImageUrl(imageUrl);
    }
  };

  const handleSaveRenewalDate = async () => {
    if (!editingRenewalDoc) return;
    setIsLoading(true);
    try {
      let newImageUrl = editingRenewalDoc.imageUrl;
      if (selectedImage) {
        try { newImageUrl = await handleImageUpload(selectedImage); }
        catch { toast({ title: "Upload Error", description: "Failed to upload image.", variant: "destructive" }); return; }
      }
      if (tempNeedsRenewal && !newImageUrl) {
        toast({ title: "Error", description: "Image is required for document renewal", variant: "destructive" }); return;
      }
      const formattedDate = tempRenewalDate
        ? `${tempRenewalDate.getDate().toString().padStart(2,"0")}/${(tempRenewalDate.getMonth()+1).toString().padStart(2,"0")}/${tempRenewalDate.getFullYear()}`
        : "";
      const renewalDateTime = `${formattedDate}${tempRenewalTime ? " " + tempRenewalTime : ""}`;
      const formData = new FormData();
      formData.append("action", "updateRenewal"); formData.append("sheetName", "Documents");
      formData.append("serialNo", editingRenewalDoc.serialNo); formData.append("renewalDate", renewalDateTime);
      formData.append("imageUrl", newImageUrl || "");
      const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Failed to update renewal");
      setDocuments((prev) => prev.map((doc) => doc.id === editingRenewalDoc.id
        ? { ...doc, needsRenewal: tempNeedsRenewal, renewalDate: renewalDateTime, imageUrl: newImageUrl || doc.imageUrl, timestamp: new Date().toISOString() }
        : doc
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      toast({ title: "Success", description: "Renewal updated successfully" });
      setEditingRenewalDoc(null); setTempRenewalDate(undefined); setTempNeedsRenewal(false);
      setSelectedImage(null); setPreviewImage(null); setTempImageUrl(null); setTempRenewalTime("");
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error updating renewal", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleCancelRenewalEdit = () => {
    setEditingRenewalDoc(null); setTempRenewalDate(undefined); setTempNeedsRenewal(false);
    setSelectedImage(null); setPreviewImage(null); setTempImageUrl(null);
  };

  const handleEditRenewalClick = (doc: DocItem) => {
    setEditingRenewalDoc(doc);
    if (doc.renewalDate) {
      const [datePart, timePart] = doc.renewalDate.split(" ");
      if (datePart) { const [day, month, year] = datePart.split("/"); setTempRenewalDate(new Date(`${year}-${month}-${day}`)); }
      if (timePart) setTempRenewalTime(timePart);
    }
    setTempNeedsRenewal(doc.needsRenewal);
    setTempImageUrl(doc.imageUrl || null);
  };

  const handleDownloadDocument = (imageUrl: string, documentName: string) => {
    if (!imageUrl) { toast({ title: "No image available", description: "This document doesn't have an image to download", variant: "destructive" }); return; }
    let downloadUrl = imageUrl;
    if (imageUrl.includes("drive.google.com")) {
      const fileId = imageUrl.match(/[-\w]{25,}/)?.[0];
      if (fileId) downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    const link = document.createElement("a"); link.href = downloadUrl;
    link.setAttribute("download", `${documentName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.jpg`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast({ title: "Download started", description: `Downloading ${documentName}` });
  };

  const handleFilterChange = (value: DocumentFilter) => {
    setCurrentFilter(value);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (value === "Renewal") newSearchParams.delete("filter"); else newSearchParams.set("filter", value);
    setSearchParams(newSearchParams);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.serialNo.toLowerCase().includes(searchTerm.toLowerCase());
    if (!doc.needsRenewal || !doc.renewalDate) return false;
    try {
      const [datePart, timePart] = doc.renewalDate.split(" ");
      const dateParts = datePart.includes("/") ? datePart.split("/").map(Number) : datePart.split("-").map(Number).reverse();
      if (dateParts.length !== 3) return false;
      const renewalDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
      if (timePart) { const [h, m] = timePart.split(":").map(Number); renewalDate.setHours(h, m, 0, 0); }
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      if (currentFilter === "Renewal") return matchesSearch;
      if (currentFilter === "Overdue") return matchesSearch && renewalDate < todayStart;
      if (currentFilter === "Upcoming") return matchesSearch && renewalDate > todayEnd;
      if (currentFilter === "Today") return matchesSearch && renewalDate >= todayStart && renewalDate < todayEnd;
      return matchesSearch;
    } catch { return false; }
  });

  if (!mounted || !isLoggedIn) return <LoadingSpinner />;

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1200px] mx-auto">
      <Toaster />

      {/* Renewal Update Dialog */}
      <Dialog open={!!editingRenewalDoc} onOpenChange={(open) => !open && handleCancelRenewalEdit()}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle className="text-[#7569F6] flex items-center"><RefreshCw className="h-5 w-5 mr-2" />Update Document Renewal</DialogTitle>
            <DialogDescription>Update the renewal information for this document</DialogDescription>
          </DialogHeader>
          {editingRenewalDoc && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Serial No:</span>
                <span className="col-span-3 font-mono">{editingRenewalDoc.serialNo}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Document:</span>
                <span className="col-span-3">{editingRenewalDoc.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="dm-renewal-check" className="text-sm font-medium text-gray-700">Needs Renewal:</label>
                <div className="col-span-3 flex items-center">
                  <Checkbox id="dm-renewal-check" checked={tempNeedsRenewal}
                    onCheckedChange={(checked: boolean) => { setTempNeedsRenewal(checked); if (!checked) setTempRenewalDate(undefined); }} className="mr-2" />
                  <label htmlFor="dm-renewal-check" className="text-sm">This document requires renewal</label>
                </div>
              </div>
              {tempNeedsRenewal && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="dm-renewal-date-pick" className="text-sm font-medium text-gray-700">Renewal Date:</label>
                    <div className="col-span-3">
                      <input id="dm-renewal-date-pick" type="date" className="w-full border rounded-md px-3 py-2 text-sm"
                        onChange={(e) => e.target.value && setTempRenewalDate(new Date(e.target.value))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="dm-renewal-time-pick" className="text-sm font-medium text-gray-700">Renewal Time:</label>
                    <div className="col-span-3">
                      <input id="dm-renewal-time-pick" type="time" className="w-full border rounded-md px-3 py-2 text-sm"
                        value={tempRenewalTime} onChange={(e) => setTempRenewalTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">New Image:</label>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor="dm-renewal-image" className={`text-sm font-medium ${!tempImageUrl ? "text-red-600" : "text-[#7569F6]"} cursor-pointer hover:text-[#935DF6] flex items-center gap-1 border border-input rounded-md px-3 py-2`}>
                          <ImageIcon className="h-4 w-4" />
                          {uploadingImage ? "Uploading..." : tempImageUrl ? "Change Image" : "Upload Image*"}
                        </label>
                        <input id="dm-renewal-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploadingImage} />
                        {previewImage && (
                          <button type="button" onClick={() => handleViewImage(previewImage)} className="text-sm text-[#5477F6] hover:underline">Preview</button>
                        )}
                      </div>
                      {!tempImageUrl && tempNeedsRenewal && <p className="text-xs text-red-600 mt-1">Image is required for renewal</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancelRenewalEdit} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleSaveRenewalDate} disabled={isLoading || (tempNeedsRenewal && !tempImageUrl)} className="bg-[#7569F6] hover:bg-[#935DF6]">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2 text-[#7569F6] hover:text-[#935DF6] hover:bg-[#7569F6]/10">
            <Link to="/document_manager"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-[#7569F6] flex items-center">
            <RefreshCw className="h-6 w-6 mr-2 text-[#7569F6]" />Renewal Documents
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Search documents..." className="pl-8 border-gray-300 focus:border-[#7569F6]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoading} />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select onValueChange={handleFilterChange} value={currentFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Renewal">Needs Renewal</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="Upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-[#7569F6] text-[#7569F6] hover:bg-[#7569F6]/10" asChild>
              <Link to="/document_manager/documents/add"><Plus className="h-4 w-4 mr-2" />Add New</Link>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="shadow-sm border-[#7569F6]/20">
              <CardHeader className="bg-[#7569F6]/5 border-b border-[#7569F6]/20 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg text-[#7569F6] flex items-center">
                    <RefreshCw className="h-5 w-5 mr-2 text-[#7569F6] flex-shrink-0" />
                    {currentFilter === "Renewal" ? "Documents Needing Renewal" : currentFilter === "Overdue" ? "Overdue Renewals" : currentFilter === "Today" ? "Renewals Due Today" : "Upcoming Renewals"}
                  </CardTitle>
                  {currentFilter === "Renewal" && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#935DF6] mr-1"></div><span className="text-xs">Upcoming</span></div>
                      <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-400 mr-1"></div><span className="text-xs">Today</span></div>
                      <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div><span className="text-xs">Overdue</span></div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#7569F6]/5">
                      <TableRow>
                        <TableHead className="text-right p-2 md:p-4">Actions</TableHead>
                        <TableHead className="p-2 md:p-4">Serial No</TableHead>
                        <TableHead className="p-2 md:p-4">Document Name</TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4">Document Type</TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4">Category</TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4">Name</TableHead>
                        <TableHead className="hidden lg:table-cell p-2 md:p-4">Entry Date</TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4">Renewal</TableHead>
                        <TableHead className="hidden md:table-cell p-2 md:p-4">Image</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.length > 0 ? filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-[#7569F6]/5">
                          <TableCell className="text-right p-2 md:p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#7569F6] hover:bg-[#7569F6]/10"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-[#7569F6]/20">
                                <DropdownMenuItem className="cursor-pointer text-[#7569F6] hover:bg-[#7569F6]/10" onClick={() => handleDownloadDocument(doc.imageUrl, doc.name)}>
                                  <Download className="h-4 w-4 mr-2" />Download
                                </DropdownMenuItem>
                                {userRole?.toLowerCase() === "admin" && (
                                  <DropdownMenuItem className="cursor-pointer text-[#7569F6] hover:bg-[#7569F6]/10" onClick={() => handleEditRenewalClick(doc)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />Update Renewal
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="p-2 md:p-4 font-mono text-sm">{doc.serialNo || "-"}</TableCell>
                          <TableCell className="p-2 md:p-4">
                            <div className="flex items-center min-w-0">
                              {doc.category === "Personal" ? <User className="h-4 w-4 mr-2 text-[#7569F6] flex-shrink-0" /> : doc.category === "Company" ? <Briefcase className="h-4 w-4 mr-2 text-[#5477F6] flex-shrink-0" /> : <Users className="h-4 w-4 mr-2 text-[#935DF6] flex-shrink-0" />}
                              <div className="font-medium truncate text-sm md:text-base">{doc.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell p-2 md:p-4">{doc.documentType || "-"}</TableCell>
                          <TableCell className="hidden md:table-cell p-2 md:p-4">
                            <Badge className={`${doc.category === "Personal" ? "bg-[#7569F6]/10 text-[#7569F6]" : doc.category === "Company" ? "bg-[#5477F6]/10 text-[#5477F6]" : "bg-[#935DF6]/10 text-[#935DF6]"}`}>{doc.category || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell p-2 md:p-4">{doc.personName || "-"}</TableCell>
                          <TableCell className="hidden lg:table-cell p-2 md:p-4 font-mono text-sm">{doc.timestamp ? formatDateTimeDisplay(doc.timestamp) : "-"}</TableCell>
                          <TableCell className="hidden md:table-cell p-2 md:p-4">
                            {doc.needsRenewal ? (
                              <Badge className={`${getRenewalStatus(doc.renewalDate) === "overdue" ? "bg-red-100 text-red-800" : getRenewalStatus(doc.renewalDate) === "today" ? "bg-yellow-100 text-yellow-800" : "bg-[#935DF6]/10 text-[#935DF6]"} flex items-center gap-1`}>
                                <RefreshCw className="h-3 w-3" /><span className="font-mono text-xs">{doc.renewalDate ? (doc.renewalDate.includes(" ") ? doc.renewalDate : `${doc.renewalDate} 00:00`) : "Required"}</span>
                              </Badge>
                            ) : <span className="text-gray-500 text-sm">-</span>}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell p-2 md:p-4">
                            {doc.imageUrl ? <button type="button" onClick={() => handleViewImage(doc.imageUrl)} className="text-[#5477F6] hover:underline"><ImageIcon className="h-5 w-5 mr-1" /></button> : "-"}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                            <div className="flex flex-col items-center justify-center py-8">
                              <FileText className="h-12 w-12 text-gray-300 mb-4" />
                              <p className="mb-4">{searchTerm ? "No documents found matching your criteria." : "No documents found."}</p>
                              <Button className="bg-[#7569F6] hover:bg-[#935DF6]" asChild>
                                <Link to="/document_manager/documents/add"><Plus className="h-4 w-4 mr-2" />Add New Document</Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden mt-4">
            {filteredDocuments.length > 0 && (
              <div className="space-y-3">
                {filteredDocuments.map((doc) => (
                  <Card key={doc.id} className={`shadow-sm overflow-hidden border-[#7569F6]/20 border-l-4 ${doc.category === "Personal" ? "border-l-[#7569F6]" : doc.category === "Company" ? "border-l-[#5477F6]" : "border-l-[#935DF6]"}`}>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          {doc.category === "Personal" ? <User className="h-5 w-5 mr-2 text-[#7569F6] flex-shrink-0" /> : doc.category === "Company" ? <Briefcase className="h-5 w-5 mr-2 text-[#5477F6] flex-shrink-0" /> : <Users className="h-5 w-5 mr-2 text-[#935DF6] flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-medium truncate text-sm">{doc.name}</div>
                            <div className="text-xs text-gray-500 truncate">Serial: {doc.serialNo || "N/A"} • {doc.category}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#7569F6] hover:bg-[#7569F6]/10"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-[#7569F6]/20">
                            <DropdownMenuItem className="cursor-pointer text-[#7569F6] hover:bg-[#7569F6]/10" onClick={() => handleDownloadDocument(doc.imageUrl, doc.name)}>
                              <Download className="h-4 w-4 mr-2" />Download
                            </DropdownMenuItem>
                            {userRole?.toLowerCase() === "admin" && (
                              <DropdownMenuItem className="cursor-pointer text-[#7569F6] hover:bg-[#7569F6]/10" onClick={() => handleEditRenewalClick(doc)}>
                                <RefreshCw className="h-4 w-4 mr-2" />Update Renewal
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {doc.needsRenewal && (
                        <Badge className={`${getRenewalStatus(doc.renewalDate) === "overdue" ? "bg-red-100 text-red-800" : getRenewalStatus(doc.renewalDate) === "today" ? "bg-yellow-100 text-yellow-800" : "bg-[#935DF6]/10 text-[#935DF6]"} flex items-center gap-1 mt-2`}>
                          <RefreshCw className="h-3 w-3" /><span className="font-mono text-xs">{doc.renewalDate ? (doc.renewalDate.includes(" ") ? doc.renewalDate : `${doc.renewalDate} 00:00`) : "Required"}</span>
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
