import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/document_manager/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/document_manager/ui/card";
import {
  ArrowLeft, Mail, Share2, Smartphone, User, Briefcase, Users,
} from "lucide-react";
import { Badge } from "../../components/document_manager/ui/badge";
import { useAuth } from "../../components/document_manager/auth-provider";

interface SharedDocument {
  id: string;
  timestamp: string;
  recipientName: string;
  documentName: string;
  documentType: string;
  category: string;
  serialNo: string;
  sourceSheet: string;
  shareMethod: string;
  email: string;
  mobileNumber: string;
  imageUrl?: string;
}

export default function DocSharedPage() {
  const navigate = useNavigate();
  const { isLoggedIn, userRole, userName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [filteredDocuments, setFilteredDocuments] = useState<SharedDocument[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    const fetchSharedDocuments = async () => {
      try {
        let isAdmin = false;
        if (userName) {
          const passResponse = await fetch(
            `https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec?sheet=Pass`
          );
          if (passResponse.ok) {
            const passData = await passResponse.json();
            if (passData.success && passData.data) {
              const userRow = passData.data.find(
                (row: any[]) => row[0]?.toString().toLowerCase() === userName.toLowerCase()
              );
              if (userRow && userRow[3]?.toString().toLowerCase() === "admin") {
                isAdmin = true;
              }
            }
          }
        }

        // Also check master admin flag
        if (!isAdmin && userRole?.toLowerCase() === "admin") {
          isAdmin = true;
        }

        const response = await fetch(
          `https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec?sheet=Shared Documents`
        );

        if (!response.ok) throw new Error("Failed to fetch shared documents");

        const data = await response.json();
        if (data.success && data.data) {
          const documents = data.data
            .slice(1)
            .map((row: any[], index: number) => {
              const rawDate = row[0]?.toString() || "";
              let displayDate = rawDate;
              let dateForSorting: Date = new Date(0);
              if (rawDate) {
                try {
                  const dateObj = new Date(rawDate);
                  if (!isNaN(dateObj.getTime())) {
                    displayDate = dateObj.toLocaleDateString("en-GB");
                    dateForSorting = dateObj;
                  }
                } catch (e) {}
              }
              return {
                id: `doc-${index}`,
                timestamp: displayDate,
                _sort: dateForSorting,
                recipientName: row[2] || "N/A",
                documentName: row[3] || "Unnamed Document",
                documentType: row[4] || "Personal",
                category: row[5] || "Uncategorized",
                serialNo: row[6] || "N/A",
                sourceSheet: row[8] || "Unknown",
                shareMethod: row[9] || "Email",
                email: row[1] || "No Email",
                mobileNumber: row[10] || "No Mobile",
                imageUrl: row[7] || undefined,
              };
            })
            .sort((a: any, b: any) => b._sort.getTime() - a._sort.getTime());

          if (isAdmin) {
            setFilteredDocuments(documents);
          } else {
            setFilteredDocuments(
              documents.filter((doc: SharedDocument) =>
                doc.recipientName.toLowerCase().includes(userName?.toLowerCase() || "")
              )
            );
          }
        }
      } catch (error) {
        console.error("Error fetching shared documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedDocuments();
  }, [isLoggedIn, userRole, userName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7569F6]"></div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1600px] mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mr-2 text-[#7569F6] hover:text-[#935DF6] hover:bg-[#935DF6]/10"
        >
          <Link to="/document_manager">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl md:text-2xl font-bold text-[#7569F6]">
          Shared Documents
        </h1>
      </div>

      <Card className="shadow-sm border-[#935DF6]/20">
        <CardHeader className="bg-[#935DF6]/5 border-b border-[#935DF6]/20 p-4 md:p-6">
          <CardTitle className="text-base md:text-lg text-[#7569F6] flex items-center">
            <Share2 className="h-5 w-5 mr-2 text-[#935DF6] flex-shrink-0" />
            {userRole === "admin" ? "All Shared Documents" : "Your Shared Documents"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-[#935DF6]/10">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 hover:bg-[#935DF6]/5 gap-3"
                >
                  <div className="flex items-center min-w-0">
                    {doc.documentType === "Personal" ? (
                      <User className="h-8 w-8 sm:h-10 sm:w-10 text-[#5477F6] mr-3 md:mr-4 flex-shrink-0" />
                    ) : doc.documentType === "Company" ? (
                      <Briefcase className="h-8 w-8 sm:h-10 sm:w-10 text-[#407FF6] mr-3 md:mr-4 flex-shrink-0" />
                    ) : (
                      <Users className="h-8 w-8 sm:h-10 sm:w-10 text-[#A555F7] mr-3 md:mr-4 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm md:text-base text-black">
                        {doc.documentName}
                      </p>
                      <p className="text-xs md:text-sm text-[#7569F6]/70 truncate">
                        {doc.category} • {doc.serialNo} • {doc.timestamp} • {doc.recipientName}
                      </p>
                      <div className="flex items-center mt-1 flex-wrap gap-1">
                        <Badge className="bg-[#5477F6]/10 text-[#5477F6] text-xs mr-2">
                          {doc.shareMethod === "Email" ? (
                            <><Mail className="h-3 w-3 mr-1 flex-shrink-0" />{doc.email}</>
                          ) : (
                            <><Smartphone className="h-3 w-3 mr-1 flex-shrink-0" />{doc.mobileNumber}</>
                          )}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs mr-2 ${doc.shareMethod === "Email" ? "bg-[#407FF6]/10 text-[#407FF6] border-[#407FF6]/30" : "bg-[#A555F7]/10 text-[#A555F7] border-[#A555F7]/30"}`}
                        >
                          {doc.shareMethod === "Email" ? (
                            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          ) : (
                            <Smartphone className="h-3 w-3 mr-1 flex-shrink-0" />
                          )}
                          {doc.shareMethod}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {userRole === "admin" && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-11 sm:ml-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#7569F6] border-[#7569F6]/50 hover:bg-[#7569F6]/10 w-full sm:w-auto"
                        onClick={() => navigate(`/document_manager/documents?search=${encodeURIComponent(doc.serialNo)}`)}
                      >
                        Share Again
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#7569F6]/70">
                <Share2 className="h-12 w-12 mx-auto mb-4 text-[#7569F6]/20" />
                <p>{userRole === "admin" ? "No shared documents found in the system." : "You haven't shared any documents yet."}</p>
                <Button
                  className="mt-4 bg-gradient-to-r from-[#5477F6] to-[#A555F7] hover:from-[#5477F6]/90 hover:to-[#A555F7]/90 text-white"
                  asChild
                >
                  <Link to="/document_manager/documents">Share Documents</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
