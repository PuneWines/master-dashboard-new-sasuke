import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../../components/document_manager/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/document_manager/ui/card";
import {
  FileText, Plus, Share2, Upload, Clock, User, Briefcase, Users,
  ChevronRight, RefreshCw, Calendar, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../components/document_manager/auth-provider";
import { Progress } from "../../components/document_manager/ui/progress";
import { Badge } from "../../components/document_manager/ui/badge";
import { toast } from "../../components/document_manager/ui/use-toast";
import { Toaster } from "../../components/document_manager/ui/toaster";

const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbzakG24A52OLdDQ6KkxGPjR1kY5ZpjFTHM9goXv8-EeoO48Mg0r_1ByTUEjOrtJWxpmBA/exec";

type DocItem = {
  id: string;
  name: string;
  type: string;
  documentType: "Personal" | "Company" | "Director";
  date: string;
  renewalDate: string | null;
  needsRenewal: boolean;
  sharedWith: string;
  sharedMethod: string;
  sourceSheet: string;
  serialNo: string;
  imageUrl: string;
};

type DashboardStats = {
  total: number;
  recent: number;
  shared: number;
  needsRenewal: number;
  personal: number;
  company: number;
  director: number;
};

export default function DocDashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, userName, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, recent: 0, shared: 0, needsRenewal: 0, personal: 0, company: 0, director: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<DocItem[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocItem[]>([]);
  const [renewalDocuments, setRenewalDocuments] = useState<DocItem[]>([]);
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Good morning");

  const fetchDashboardData = async (currentUserName: string, isAdmin: boolean) => {
    const [documentsResponse, renewalsResponse, sharedResponse] = await Promise.all([
      fetch(`${SHEET_API_URL}?sheet=Documents`),
      fetch(`${SHEET_API_URL}?sheet=Updated Renewal`),
      fetch(`${SHEET_API_URL}?sheet=Shared Documents`),
    ]);
    const [documentsData, renewalsData, sharedData] = await Promise.all([
      documentsResponse.json(),
      renewalsResponse.json(),
      sharedResponse.json(),
    ]);

    let allDocuments: DocItem[] = [];
    let statsData: DashboardStats = { total: 0, recent: 0, shared: 0, needsRenewal: 0, personal: 0, company: 0, director: 0 };

    let sharedDocumentsCount = 0;
    let recentSharedDocuments: DocItem[] = [];

    if (sharedData.success && sharedData.data && sharedData.data.length > 1) {
      const filteredSharedData = isAdmin
        ? sharedData.data.slice(1)
        : sharedData.data.slice(1).filter((row: any[]) => {
            const sharedWithName = row[2]?.toString().trim();
            return sharedWithName && sharedWithName.toLowerCase() === currentUserName.toLowerCase();
          });
      sharedDocumentsCount = filteredSharedData.length;
      recentSharedDocuments = filteredSharedData.map((row: any[], index: number) => ({
        id: `shared-${index}-${row[6] || index}`,
        name: row[3] || "",
        type: row[5] || "",
        documentType: (row[4] as "Personal" | "Company" | "Director") || "Personal",
        date: row[0] || new Date().toISOString(),
        renewalDate: null,
        needsRenewal: false,
        sharedWith: row[1] || "",
        sharedMethod: row[9] === "Email" ? "email" : "whatsapp",
        sourceSheet: "Shared Documents",
        serialNo: row[6] || "",
        imageUrl: row[7] || "",
      })).slice(0, 5);
    }

    if (documentsData.success && documentsData.data) {
      const docs = documentsData.data.slice(1)
        .filter((doc: any[]) => {
          const isDeleted = doc[14]?.toString().trim().toLowerCase() === "deleted";
          if (isDeleted) return false;
          if (isAdmin) return true;
          const docUserName = doc[7]?.toString().trim();
          return docUserName && docUserName.toLowerCase() === currentUserName.toLowerCase();
        })
        .map((doc: any[], index: number) => {
          const serialNo = doc[1] || "";
          const docType = doc[4] || "Personal";
          const needsRenewal = doc[8] === "TRUE" || doc[8] === "Yes" || false;
          if (docType === "Personal") statsData.personal++;
          if (docType === "Company") statsData.company++;
          if (docType === "Director") statsData.director++;
          if (needsRenewal) statsData.needsRenewal++;
          return {
            id: `doc-${index}-${serialNo}`,
            name: doc[2] || "",
            type: doc[4] || "",
            documentType: docType as "Personal" | "Company" | "Director",
            date: doc[0] || new Date().toISOString(),
            renewalDate: doc[9] || null,
            needsRenewal,
            sharedWith: doc[12] || doc[13] || "",
            sharedMethod: doc[12] ? "email" : "whatsapp",
            sourceSheet: "Documents",
            serialNo,
            imageUrl: doc[11] || "",
          };
        });
      allDocuments = [...allDocuments, ...docs];
    }

    if (renewalsData.success && renewalsData.data) {
      const renewalDocs = renewalsData.data.slice(1)
        .filter((doc: any[]) => {
          if (isAdmin) return true;
          const docUserName = doc[10]?.toString().trim();
          return docUserName && docUserName.toLowerCase() === currentUserName.toLowerCase();
        })
        .map((doc: any[], index: number) => {
          const serialNo = doc[1] || "";
          const docType = doc[5] || "Personal";
          const renewalInfo = doc[9] || "";
          let needsRenewal = false;
          let renewalDate = null;
          if (renewalInfo) {
            const parsedDate = new Date(renewalInfo);
            if (!isNaN(parsedDate.getTime())) {
              needsRenewal = true;
              renewalDate = renewalInfo;
            } else {
              needsRenewal = renewalInfo === "TRUE" || renewalInfo === "Yes" || renewalInfo.toLowerCase().includes("renew");
            }
          }
          if (docType === "Personal") statsData.personal++;
          if (docType === "Company") statsData.company++;
          if (docType === "Director") statsData.director++;
          if (needsRenewal) statsData.needsRenewal++;
          return {
            id: `renewal-${index}-${serialNo}`,
            name: doc[3] || "",
            type: doc[5] || "",
            documentType: docType as "Personal" | "Company" | "Director",
            date: doc[0] || new Date().toISOString(),
            renewalDate,
            needsRenewal,
            sharedWith: doc[11] || doc[12] || "",
            sharedMethod: doc[11] ? "email" : "whatsapp",
            sourceSheet: "Updated Renewal",
            serialNo,
            imageUrl: doc[13] || "",
          };
        }).filter(Boolean);
      allDocuments = [...allDocuments, ...renewalDocs];
    }

    statsData.total = allDocuments.length;
    statsData.shared = sharedDocumentsCount;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    statsData.recent = allDocuments.filter((doc) => new Date(doc.date) >= oneWeekAgo).length;
    allDocuments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      stats: statsData,
      recentDocuments: allDocuments.slice(0, 10),
      sharedDocuments: recentSharedDocuments,
      renewalDocuments: allDocuments.filter((doc) => doc.needsRenewal).slice(0, 5),
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const setGreetingAndDate = () => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const isAdmin = userRole?.toLowerCase() === "admin";
      const data = await fetchDashboardData(userName || "", isAdmin);
      setStats(data.stats);
      setRecentDocuments(data.recentDocuments.map((d) => ({ ...d, date: formatDate(d.date), renewalDate: d.renewalDate ? formatDate(d.renewalDate) : null })));
      setSharedDocuments(data.sharedDocuments.map((d) => ({ ...d, date: formatDate(d.date), renewalDate: d.renewalDate ? formatDate(d.renewalDate) : null })));
      setRenewalDocuments(data.renewalDocuments.map((d) => ({ ...d, date: formatDate(d.date), renewalDate: d.renewalDate ? formatDate(d.renewalDate) : null })));
      setGreetingAndDate();
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({ title: "Error", description: "Failed to fetch dashboard data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    refreshData();
  }, [isLoggedIn]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  const totalDocs = stats.total || 1;
  const personalPct = Math.round((stats.personal / totalDocs) * 100);
  const companyPct = Math.round((stats.company / totalDocs) * 100);
  const directorPct = Math.round((stats.director / totalDocs) * 100);
  const renewalPct = Math.round((stats.needsRenewal / totalDocs) * 100);

  return (
    <div className="p-4 sm:p-6 md:p-8 pt-16 md:pt-8 max-w-[1600px] mx-auto">
      <Toaster />
      {/* Greeting */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-purple-800">
              {greeting}{userName && `, ${userName}`}!
            </h1>
            <p className="text-gray-500 text-sm md:text-base">{currentDate}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Documents", value: stats.total, icon: FileText, color: "purple", link: "/document_manager/documents" },
          { label: "Recent Uploads", value: stats.recent, icon: Upload, color: "pink", sub: "In the last 7 days" },
          { label: "Shared Documents", value: stats.shared, icon: Share2, color: "indigo", link: "/document_manager/shared" },
          { label: "Need Renewal", value: stats.needsRenewal, icon: RefreshCw, color: "rose", link: "/document_manager/documents/renewal" },
        ].map((card) => (
          <Card key={card.label} className={`shadow-sm bg-gradient-to-br from-${card.color}-50 to-${card.color}-100 border-${card.color}-200`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-${card.color}-600 mb-1`}>{card.label}</p>
                  <h3 className={`text-3xl font-bold text-${card.color}-800`}>{card.value}</h3>
                </div>
                <div className={`h-12 w-12 bg-${card.color}-200 rounded-full flex items-center justify-center`}>
                  <card.icon className={`h-6 w-6 text-${card.color}-700`} />
                </div>
              </div>
              <div className="mt-4">
                {card.link ? (
                  <Link to={card.link} className={`text-xs font-medium text-${card.color}-700 flex items-center hover:underline`}>
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                ) : (
                  <p className={`text-xs text-${card.color}-600`}>{card.sub}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg text-purple-800">Document Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {[
              { label: "Personal", pct: personalPct, count: stats.personal, color: "purple", icon: User },
              { label: "Company", pct: companyPct, count: stats.company, color: "pink", icon: Briefcase },
              { label: "Director", pct: directorPct, count: stats.director, color: "indigo", icon: Users },
              { label: "Renewal", pct: renewalPct, count: stats.needsRenewal, color: "rose", icon: RefreshCw },
            ].map((item) => (
              <div key={item.label} className="flex flex-col space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium flex items-center">
                    <item.icon className={`h-4 w-4 mr-1 text-${item.color}-600`} /> {item.label}
                  </span>
                  <span className="font-semibold">{item.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600`} style={{ width: `${item.pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.count} documents</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-purple-800 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-purple-600" /> Recent Activity
              </CardTitle>
              <Link to="/document_manager/documents" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div className={`mr-3 p-2 rounded-full flex-shrink-0 ${doc.documentType === "Personal" ? "bg-purple-100" : doc.documentType === "Company" ? "bg-pink-100" : "bg-indigo-100"}`}>
                      {doc.documentType === "Personal" ? <User className="h-5 w-5 text-purple-600" /> : doc.documentType === "Company" ? <Briefcase className="h-5 w-5 text-pink-600" /> : <Users className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{doc.name}</p>
                      <Badge className={`mr-2 text-xs ${doc.documentType === "Personal" ? "bg-purple-100 text-purple-800" : doc.documentType === "Company" ? "bg-pink-100 text-pink-800" : "bg-indigo-100 text-indigo-800"}`}>
                        {doc.documentType}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {recentDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No recent documents found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal + Shared */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-purple-800 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-rose-600" /> Documents Needing Renewal
              </CardTitle>
              <Link to="/document_manager/documents/renewal" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {renewalDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div className={`mr-3 p-2 rounded-full flex-shrink-0 ${doc.documentType === "Personal" ? "bg-purple-100" : doc.documentType === "Company" ? "bg-pink-100" : "bg-indigo-100"}`}>
                      {doc.documentType === "Personal" ? <User className="h-5 w-5 text-purple-600" /> : doc.documentType === "Company" ? <Briefcase className="h-5 w-5 text-pink-600" /> : <Users className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs bg-gray-100 text-gray-700">{doc.serialNo || "No Serial"}</Badge>
                        {doc.renewalDate ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-rose-500" />
                            <span className="text-xs text-rose-600 font-medium">{doc.renewalDate}</span>
                          </div>
                        ) : (
                          <Badge className="text-xs bg-rose-100 text-rose-800">Needs Renewal</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {renewalDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-purple-300" />
                  <p>No documents need renewal.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-purple-800 flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-indigo-600" /> Recently Shared
              </CardTitle>
              <Link to="/document_manager/shared" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[340px] overflow-y-auto">
              {sharedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center min-w-0">
                    <div className="mr-3 p-2 rounded-full bg-indigo-100 flex-shrink-0">
                      <Share2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{doc.name}</p>
                      <Badge variant="outline" className={`text-xs mr-2 ${doc.sharedMethod === "email" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {doc.sharedMethod === "email" ? "Email" : "WhatsApp"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {sharedDocuments.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <Share2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No shared documents found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
