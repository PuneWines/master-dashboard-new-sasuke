import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type DocumentType =
  | "Personal"
  | "Company"
  | "Director"
  | "Employee"
  | "MADHURA"
  | "FRIENDS"
  | "OFFICE"
  | "BALAJI"
  | "TLS"
  | "TLS ULWE"
  | "KUNAL ULWE";

export interface Document {
  id: number
  name: string
  type: string
  documentType: DocumentType
  company: string
  date: string
  tags: string[]
  size: string
  sharedWith?: string
  sharedMethod?: "email" | "whatsapp"
  personName?: string
  companyName?: string
  directorName?: string
  needsRenewal?: boolean
  renewalDate?: string
}

interface DocumentContextType {
  documents: Document[]
  addDocument: (document: Omit<Document, "id" | "date">) => void
  getDocumentsByType: (type: DocumentType) => Document[]
  getDocumentStats: () => {
    total: number
    personal: number
    company: number
    director: number
    recent: number
    shared: number
    needsRenewal: number
  }
  getRecentDocuments: (limit?: number) => Document[]
  getSharedDocuments: () => Document[]
  getDocumentsNeedingRenewal: () => Document[]
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined)

const initialDocuments: Document[] = [
  {
    id: 1,
    name: "Invoice-May2023.pdf",
    type: "Invoice",
    documentType: "Company",
    company: "Acme Inc",
    date: "2023-05-15",
    tags: ["invoice", "important"],
    size: "1.2 MB",
    sharedWith: "john@example.com",
    sharedMethod: "email",
    companyName: "Acme Corporation",
    needsRenewal: true,
    renewalDate: "2024-05-15",
  },
  {
    id: 2,
    name: "Contract-2023.docx",
    type: "Contract",
    documentType: "Company",
    company: "XYZ Corp",
    date: "2023-04-20",
    tags: ["contract", "legal"],
    size: "2.5 MB",
    sharedWith: "+1234567890",
    sharedMethod: "whatsapp",
    companyName: "XYZ Corporation",
    needsRenewal: true,
    renewalDate: "2024-04-20",
  },
]

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [])

  const addDocument = (document: Omit<Document, "id" | "date">) => {
    const newDocument: Document = {
      ...document,
      id: documents.length + 1,
      date: new Date().toISOString().split("T")[0],
    }
    setDocuments([...documents, newDocument])
  }

  const getDocumentsByType = (type: DocumentType) => {
    return documents.filter((doc) => doc.documentType === type)
  }

  const getDocumentStats = () => {
    return {
      total: documents.length,
      personal: getDocumentsByType("Personal").length,
      company: getDocumentsByType("Company").length,
      director: getDocumentsByType("Director").length,
      recent: documents.filter((doc) => {
        const docDate = new Date(doc.date)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return docDate >= oneWeekAgo
      }).length,
      shared: documents.filter((doc) => doc.sharedWith).length,
      needsRenewal: documents.filter((doc) => doc.needsRenewal).length,
    }
  }

  const getRecentDocuments = (limit = 5) => {
    return [...documents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
  }

  const getSharedDocuments = () => {
    return documents.filter((doc) => doc.sharedWith)
  }

  const getDocumentsNeedingRenewal = () => {
    return documents.filter((doc) => doc.needsRenewal)
  }

  return (
    <DocumentContext.Provider
      value={{
        documents,
        addDocument,
        getDocumentsByType,
        getDocumentStats,
        getRecentDocuments,
        getSharedDocuments,
        getDocumentsNeedingRenewal,
      }}
    >
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocuments() {
  const context = useContext(DocumentContext)
  if (context === undefined) {
    throw new Error("useDocuments must be used within a DocumentProvider")
  }
  return context
}
