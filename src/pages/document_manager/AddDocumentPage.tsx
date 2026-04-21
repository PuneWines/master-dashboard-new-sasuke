import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/document_manager/ui/button";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "../../components/document_manager/ui/card";
import { Input } from "../../components/document_manager/ui/input";
import { Label } from "../../components/document_manager/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/document_manager/ui/select";
import { ArrowLeft, FileText, Plus, Trash2, Upload, RefreshCw } from "lucide-react";
import { useAuth } from "../../components/document_manager/auth-provider";
import { useDocuments, type DocumentType } from "../../components/document_manager/document-context";
import { toast } from "../../components/document_manager/ui/use-toast";
import { Toaster } from "../../components/document_manager/ui/toaster";
import { Switch } from "../../components/document_manager/ui/switch";
import { Loader2 } from "lucide-react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec";

export default function DocAddDocumentPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    } else {
      fetchMasterData();
    }
    setIsLoading(false);
  }, [isLoggedIn]);

  const fetchMasterData = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?sheet=Master&action=fetch`);
      if (!response.ok) throw new Error(`Failed to fetch master data: ${response.status}`);
      const result = await response.json();
      if (!result.success || !result.data) throw new Error(result.error || "Failed to fetch master data");
      const types = Array.from(new Set(result.data.slice(1).map((row: string[]) => row[0]).filter(Boolean))) as string[];
      const cats = Array.from(new Set(result.data.slice(1).map((row: string[]) => row[1]).filter(Boolean))) as string[];
      setDocumentTypes(types);
      setCategories(cats);
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast({ title: "Error", description: "Failed to load document types and categories" });
    }
  };

  const [multipleFiles, setMultipleFiles] = useState<Array<{
    id: number; name: string; type: string; documentType: DocumentType;
    file: File | null; entityName: string; needsRenewal: boolean;
    renewalDate: string; renewalTime: string;
  }>>([{
    id: 1, name: "", type: "", documentType: "Personal",
    file: null, entityName: "", needsRenewal: false, renewalDate: "", renewalTime: "",
  }]);

  const formatDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const updatedFiles = [...multipleFiles];
      updatedFiles[index] = { ...updatedFiles[index], file: e.target.files[0] };
      setMultipleFiles(updatedFiles);
    }
  };

  const handleMultipleInputChange = (
    index: number,
    field: "name" | "type" | "documentType" | "entityName" | "renewalDate" | "renewalTime",
    value: string
  ) => {
    const updatedFiles = [...multipleFiles];
    updatedFiles[index] = { ...updatedFiles[index], [field]: value };
    setMultipleFiles(updatedFiles);
  };

  const handleRenewalToggle = (index: number, value: boolean) => {
    const updatedFiles = [...multipleFiles];
    updatedFiles[index] = { ...updatedFiles[index], needsRenewal: value };
    setMultipleFiles(updatedFiles);
  };

  const addFileRow = () => {
    setMultipleFiles([...multipleFiles, {
      id: Date.now(), name: "", type: "", documentType: "Personal",
      file: null, entityName: "", needsRenewal: false, renewalDate: "", renewalTime: "",
    }]);
  };

  const removeFileRow = (id: number) => {
    if (multipleFiles.length > 1) {
      setMultipleFiles(multipleFiles.filter((file) => file.id !== id));
    }
  };

  const getSerialPrefix = (documentType: DocumentType): string => {
    switch (documentType) {
      case "Personal": return "PN";
      case "Company": return "CN";
      case "Director": return "DN";
      case "Employee": return "EN";
      case "MADHURA": return "MN";
      case "FRIENDS": return "FN";
      case "OFFICE": return "ON";
      case "BALAJI": return "BN";
      case "TLS": return "TN";
      case "TLS ULWE": return "TUN";
      case "KUNAL ULWE": return "KUN";
      default: return "DN";
    }
  };

  const uploadFileToGoogleDrive = async (file: File): Promise<string> => {
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });

    const formData = new FormData();
    formData.append("action", "uploadFile");
    formData.append("fileName", file.name);
    formData.append("mimeType", file.type);
    formData.append("folderId", "1TqXpAf0NxGmiByDyndT-9dpdRvRyUD23");
    formData.append("base64Data", base64String);

    const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (result.success && result.fileUrl) return result.fileUrl;
    throw new Error(result.error || "File upload failed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const serialResponse = await fetch(`${SCRIPT_URL}?action=getNextSerials`);
      if (!serialResponse.ok) throw new Error(`Failed to fetch serial numbers: ${serialResponse.status}`);
      const serialData = await serialResponse.json();
      if (!serialData.success) throw new Error(serialData.error || "Failed to get next serial numbers");

      let nextPersonal = serialData.nextSerials.personal;
      let nextCompany = serialData.nextSerials.company;
      let nextDirector = serialData.nextSerials.director;
      let nextEmployee = serialData.nextSerials.employee;
      let nextMadhura = serialData.nextSerials.madhura;
      let nextFriends = serialData.nextSerials.friends;
      let nextOffice = serialData.nextSerials.office;
      let nextBalaji = serialData.nextSerials.balaji;
      let nextTls = serialData.nextSerials.tls;
      let nextTlsUlwe = serialData.nextSerials.tlsUlwe;
      let nextKunalUlwe = serialData.nextSerials.kunalUlwe;

      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

      for (const file of multipleFiles) {
        let serialNumber = "";
        const prefix = getSerialPrefix(file.documentType);
        if (file.documentType === "Personal") { serialNumber = `${prefix}-${String(nextPersonal++).padStart(3,"0")}`; }
        else if (file.documentType === "Company") { serialNumber = `${prefix}-${String(nextCompany++).padStart(3,"0")}`; }
        else if (file.documentType === "Director") { serialNumber = `${prefix}-${String(nextDirector++).padStart(3,"0")}`; }
        else if (file.documentType === "Employee") { serialNumber = `${prefix}-${String(nextEmployee++).padStart(3,"0")}`; }
        else if (file.documentType === "MADHURA") { serialNumber = `${prefix}-${String(nextMadhura++).padStart(3,"0")}`; }
        else if (file.documentType === "FRIENDS") { serialNumber = `${prefix}-${String(nextFriends++).padStart(3,"0")}`; }
        else if (file.documentType === "OFFICE") { serialNumber = `${prefix}-${String(nextOffice++).padStart(3,"0")}`; }
        else if (file.documentType === "BALAJI") { serialNumber = `${prefix}-${String(nextBalaji++).padStart(3,"0")}`; }
        else if (file.documentType === "TLS") { serialNumber = `${prefix}-${String(nextTls++).padStart(3,"0")}`; }
        else if (file.documentType === "TLS ULWE") { serialNumber = `${prefix}-${String(nextTlsUlwe++).padStart(3,"0")}`; }
        else if (file.documentType === "KUNAL ULWE") { serialNumber = `${prefix}-${String(nextKunalUlwe++).padStart(3,"0")}`; }

        let fileLink = "";
        if (file.file) fileLink = await uploadFileToGoogleDrive(file.file);

        const renewalDateTime = file.needsRenewal && file.renewalDate && file.renewalTime
          ? `${formatDateToDDMMYYYY(file.renewalDate)} ${file.renewalTime}` : "";

        const rowData = [
          timestamp, serialNumber, file.name, file.type, file.documentType,
          "", "", file.entityName, file.needsRenewal ? "Yes" : "No", renewalDateTime,
          `${((file.file?.size || 0) / 1024 / 1024).toFixed(2)} MB`, fileLink, "", "",
        ];

        const formData = new FormData();
        formData.append("sheetName", "Documents");
        formData.append("action", "insert");
        formData.append("rowData", JSON.stringify(rowData));

        const response = await fetch(SCRIPT_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (!result || !result.success) throw new Error(result?.error || "Document submission failed");
      }

      toast({ title: "Success", description: "Documents have been added successfully." });
      setMultipleFiles([{ id: 1, name: "", type: "", documentType: "Personal", file: null, entityName: "", needsRenewal: false, renewalDate: "", renewalTime: "" }]);
      navigate("/document_manager/documents");
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const getEntityLabel = (documentType: DocumentType): string => {
    switch (documentType) {
      case "Personal": return "Person Name";
      case "Company": return "Company Name";
      case "Director": return "Director Name";
      default: return "Entity Name";
    }
  };

  const getEntityPlaceholder = (documentType: DocumentType): string => {
    switch (documentType) {
      case "Personal": return "Enter person name";
      case "Company": return "Enter company name";
      case "Director": return "Enter director name";
      default: return "Enter name";
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      <Toaster />
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50">
          <Link to="/document_manager">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Add New Documents</h1>
      </div>

      <div className="max-w-5xl mx-auto">
        <Card className="shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-white border-b p-4 md:p-6">
              <CardTitle className="text-base md:text-lg text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600 flex-shrink-0" />
                Document Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4 md:p-6 bg-gray-50">
              {multipleFiles.map((fileItem, index) => (
                <div key={fileItem.id} className="p-3 md:p-4 border rounded-lg bg-white relative shadow-sm">
                  <div className="absolute right-2 top-2">
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => removeFileRow(fileItem.id)}
                      disabled={multipleFiles.length === 1}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="font-medium mb-3 md:mb-4 text-gray-700 pr-8">Document #{index + 1}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="space-y-2">
                      <Label htmlFor={`dm-name-${index}`} className="text-sm font-medium text-gray-700">Document Name *</Label>
                      <Input
                        id={`dm-name-${index}`} placeholder="Enter document name"
                        value={fileItem.name} required className="border-gray-300 text-sm bg-white"
                        onChange={(e) => handleMultipleInputChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`dm-type-${index}`} className="text-sm font-medium text-gray-700">Document Type *</Label>
                      <Select value={fileItem.type} onValueChange={(value) => handleMultipleInputChange(index, "type", value)} required>
                        <SelectTrigger id={`dm-type-${index}`} className="border-gray-300 text-sm bg-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`dm-doc-type-${index}`} className="text-sm font-medium text-gray-700">Category *</Label>
                      <Select
                        value={fileItem.documentType}
                        onValueChange={(value: DocumentType) => {
                          const updatedFiles = [...multipleFiles];
                          updatedFiles[index] = { ...updatedFiles[index], documentType: value, entityName: "" };
                          setMultipleFiles(updatedFiles);
                        }}
                        required
                      >
                        <SelectTrigger id={`dm-doc-type-${index}`} className="border-gray-300 text-sm bg-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3 md:mb-4">
                    <Label htmlFor={`dm-entity-${index}`} className="text-sm font-medium text-gray-700">
                      {getEntityLabel(fileItem.documentType)}
                    </Label>
                    <Input
                      id={`dm-entity-${index}`}
                      placeholder={getEntityPlaceholder(fileItem.documentType)}
                      value={fileItem.entityName} required className="border-gray-300 text-sm bg-white"
                      onChange={(e) => handleMultipleInputChange(index, "entityName", e.target.value)}
                    />
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                        <Label htmlFor={`dm-renewal-${index}`} className="text-sm font-medium text-gray-700">
                          Document Needs Renewal
                        </Label>
                      </div>
                      <Switch
                        id={`dm-renewal-${index}`}
                        checked={fileItem.needsRenewal}
                        onCheckedChange={(checked) => handleRenewalToggle(index, checked)}
                      />
                    </div>
                    {fileItem.needsRenewal && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor={`dm-renewal-date-${index}`} className="text-sm font-medium text-gray-700">Renewal Date *</Label>
                          <Input
                            id={`dm-renewal-date-${index}`} type="date"
                            value={fileItem.renewalDate} className="border-gray-300 text-sm bg-white"
                            required={fileItem.needsRenewal}
                            onChange={(e) => handleMultipleInputChange(index, "renewalDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dm-renewal-time-${index}`} className="text-sm font-medium text-gray-700">Renewal Time *</Label>
                          <Input
                            id={`dm-renewal-time-${index}`} type="time"
                            value={fileItem.renewalTime} className="border-gray-300 text-sm bg-white"
                            required={fileItem.needsRenewal}
                            onChange={(e) => handleMultipleInputChange(index, "renewalTime", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor={`dm-file-${index}`} className="text-sm font-medium text-gray-700">Upload File *</Label>
                      <Input
                        id={`dm-file-${index}`} type="file" required className="border-gray-300 text-sm bg-white"
                        onChange={(e) => handleMultipleFileChange(e, index)}
                      />
                      {fileItem.file && (
                        <p className="text-xs text-gray-500 truncate">
                          Selected: {fileItem.file.name} ({(fileItem.file.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button" variant="outline" onClick={addFileRow}
                className="w-full border-dashed border-2 border-blue-300 text-blue-700 hover:bg-blue-50 h-12"
              >
                <Plus className="mr-2 h-4 w-4 flex-shrink-0" /> Add Another Document
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 border-t bg-white p-4 md:p-6">
              <Button
                variant="outline" type="button"
                onClick={() => navigate("/document_manager")}
                className="border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4 flex-shrink-0" />Submit Documents ({multipleFiles.length})</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
