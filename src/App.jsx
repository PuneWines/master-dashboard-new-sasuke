import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

// ── Components ──
import Layout      from "./components/hr-products/Layout";
import AdminLayout from "./components/AdminLayout";

// ── Shared Login ──
import LoginPage from "./pages/LoginPage";

// ── Master Dashboard Pages ──
import Dashboard from "./pages/Dashboard";
import AllUsers  from "./pages/AllUsers";
import WhatsappSendMessage from "./pages/whatsapp-send-message/WhatsappSendMessage";
import SettingsPage from "./pages/SettingsPage";

// ── Checklist / Delegation Pages (correct paths) ──
import ChecklistDashboard from "./pages/checklist_delegation/Dashboard";
import AdminAssignTask    from "./pages/checklist_delegation/AssignTask";
import DataPage           from "./pages/checklist_delegation/DataPage";
import AdminDataPage      from "./pages/checklist_delegation/admin-data-page";
import AccountDataPage    from "./pages/checklist_delegation/account-data-page";
import DelegationDataPage from "./pages/checklist_delegation/delegation";
import License            from "./pages/checklist_delegation/License";
import TrainingVideo      from "./pages/checklist_delegation/TrainingVideo";


// ── Document Manager Pages ──
import DocLayout from "./components/document_manager/Layout";
import DocDashboard from "./pages/document_manager/DashboardPage";
import DocAdd from "./pages/document_manager/AddDocumentPage";
import DocList from "./pages/document_manager/DocumentsPage";
import DocRenewal from "./pages/document_manager/RenewalPage";
import DocShared from "./pages/document_manager/SharedPage";
import DocLicense from "./pages/document_manager/LicensePage";

// ── Purchase Management Pages ──
import PurchaseLayout            from "./components/purchase_management/Layout";
import { Dashboard as PurchaseDashboard } from "./pages/purchase_management/Dashboard";
import { IndentPage as PurchaseIndent } from "./pages/purchase_management/IndentPage";
import { ApprovalPage as PurchaseApproval } from "./pages/purchase_management/ApprovalPage";
import { PurchaseOrderPage as PurchaseOrder } from "./pages/purchase_management/PurchaseOrderPage";
import { GetLiftingPage as PurchaseLifting } from "./pages/purchase_management/GetLiftingPage";
import { CrossCheckPage as PurchaseCrossCheck } from "./pages/purchase_management/CrossCheckPage";

// ── Petty Cash Pages ──
import PettyCashApp from "./pages/petty-cash/App";

// ── HR Pages ──
import AfterJoiningWork from "./pages/hr-products/AfterJoiningWork";
import AfterLeavingWork from "./pages/hr-products/AfterLeavingWork";
import Attendance       from "./pages/hr-products/Attendance";
import Attendancedaily  from "./pages/hr-products/Attendancedaily";
import CallTracker      from "./pages/hr-products/CallTracker";
import CompanyCalendar  from "./pages/hr-products/CompanyCalendar";
import HRDashboard      from "./pages/hr-products/Dashboard";
import Employee         from "./pages/hr-products/Employee";
import FindEnquiry      from "./pages/hr-products/FindEnquiry";
import Indent           from "./pages/hr-products/Indent";
import LeaveManagement  from "./pages/hr-products/LeaveManagement";
import LeaveRequest     from "./pages/hr-products/LeaveRequest";
import Leaving          from "./pages/hr-products/Leaving";
import MisReport        from "./pages/hr-products/MisReport";
import MyAttendance     from "./pages/hr-products/MyAttendance";
import MyProfile        from "./pages/hr-products/MyProfile";
import MySalary         from "./pages/hr-products/MySalary";
import Payroll          from "./pages/hr-products/Payroll";
import Report           from "./pages/hr-products/Report";
import SocialSite       from "./pages/hr-products/SocialSite";
import Advance          from "./pages/hr-products/Advance";
import AdminAdvance     from "./pages/hr-products/AdminAdvance";

// ─────────────────────────────────────────────
// ProtectedRoute — localStorage (HR + Master)
// ─────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const username = localStorage.getItem("user-name");
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();
  if (!username && !user) return <Navigate to="/login" replace />;
  return children;
};

// ─────────────────────────────────────────────
// AdminRoute — localStorage, Admin=Yes only
// ─────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const username = localStorage.getItem("user-name");
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();
  if (!username && !user) return <Navigate to="/login" replace />;
  if (user?.Admin !== "Yes") return <Navigate to="/home/users" replace />;
  return children;
};

// ─────────────────────────────────────────────
// SessionRoute — sessionStorage (Checklist App)
// Login localStorage se bhi check karta hai
// ─────────────────────────────────────────────
const SessionRoute = ({ children, allowedRoles = [] }) => {
  // Checklist app sessionStorage use karta hai
  const sessionUsername = sessionStorage.getItem("username");
  const sessionRole     = sessionStorage.getItem("role");

  // Master login localStorage use karta hai — dono support karo
  const localUsername = localStorage.getItem("user-name");
  const localUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();

  const isLoggedIn = !!sessionUsername || !!localUsername || !!localUser;
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  // Role check — sessionStorage se ya localStorage se
  const userRole = sessionRole || localUser?.Role || "";
  const userRoleLower = userRole?.toLowerCase() || "";
  const isAdminRole = userRoleLower.includes("admin");
  
  if (allowedRoles.length > 0 && !isAdminRole && !allowedRoles.includes(userRoleLower)) {
    return <Navigate to="/checklist_delegation/dashboard/admin" replace />;
  }
  return children;
};

// ─────────────────────────────────────────────
// HR Index Route
// ─────────────────────────────────────────────
const HRIndexRoute = () => {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  })();
  return user?.Admin === "Yes"
    ? <HRDashboard />
    : <Navigate to="/hr_product/my-profile" replace />;
};

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────
function App() {
  return (
    <div className="gradient-bg min-h-screen">
      <Router>
        <Toaster position="top-right" />
        <Routes>

          {/* ── Single Login ── */}
          <Route path="/"      element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* ════════════════════════════════════════
              MASTER DASHBOARD
              AdminLayout ke andar render hoga
          ════════════════════════════════════════ */}
          <Route
            path="/home/master"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/home/users"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AllUsers />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp_send_message"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <WhatsappSendMessage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ════════════════════════════════════════
              CHECKLIST / DELEGATION APP
              Inka apna AdminLayout component page level pe hai — 
              Ab master AdminLayout ke andar render hoga
          ════════════════════════════════════════ */}
          <Route
            path="/checklist_delegation/dashboard/admin"
            element={
              <SessionRoute>
                <AdminLayout>
                  <ChecklistDashboard />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/assign-task"
            element={
              <SessionRoute>
                <AdminLayout>
                  <AdminAssignTask />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/delegation"
            element={
              <SessionRoute>
                <AdminLayout>
                  <DelegationDataPage />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/data/:department"
            element={
              <SessionRoute>
                <AdminLayout>
                  <DataPage />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/data/admin"
            element={
              <SessionRoute allowedRoles={["admin"]}>
                <AdminLayout>
                  <AdminDataPage />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/license"
            element={
              <SessionRoute>
                <AdminLayout>
                  <License />
                </AdminLayout>
              </SessionRoute>
            }
          />
          <Route
            path="/checklist_delegation/dashboard/traning-video"
            element={
              <SessionRoute>
                <AdminLayout>
                  <TrainingVideo />
                </AdminLayout>
              </SessionRoute>
            }
          />

          {/* ════════════════════════════════════════
              HR APP
              Ab master AdminLayout ke andar render hoga
          ════════════════════════════════════════ */}
          <Route
            path="/hr_product"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Layout />
                </AdminLayout>
              </ProtectedRoute>
            }
          >
            <Route index                     element={<HRIndexRoute />} />
            <Route path="indent"             element={<Indent />} />
            <Route path="find-enquiry"       element={<FindEnquiry />} />
            <Route path="call-tracker"       element={<CallTracker />} />
            <Route path="after-joining-work" element={<AfterJoiningWork />} />
            <Route path="leaving"            element={<Leaving />} />
            <Route path="after-leaving-work" element={<AfterLeavingWork />} />
            <Route path="employee"           element={<Employee />} />
            <Route path="my-profile"         element={<MyProfile />} />
            <Route path="my-attendance"      element={<MyAttendance />} />
            <Route path="leave-request"      element={<LeaveRequest />} />
            <Route path="my-salary"          element={<MySalary />} />
            <Route path="company-calendar"   element={<CompanyCalendar />} />
            <Route path="leave-management"   element={<LeaveManagement />} />
            <Route path="attendance"         element={<Attendance />} />
            <Route path="attendancedaily"    element={<Attendancedaily />} />
            <Route path="report"             element={<Report />} />
            <Route path="payroll"            element={<Payroll />} />
            <Route path="misreport"          element={<MisReport />} />
            <Route path="social-site"        element={<SocialSite />} />
            <Route path="advance"           element={<Advance />} />
            <Route path="admin-advance"     element={<AdminAdvance />} />
          </Route>

          {/* ── Backward compatibility ── */}
          <Route path="/admin/dashboard"      element={<Navigate to="/checklist_delegation/dashboard/admin" replace />} />
          <Route path="/admin/assign-task"    element={<Navigate to="/checklist_delegation/dashboard/assign-task" replace />} />
          <Route path="/admin/license"        element={<Navigate to="/checklist_delegation/dashboard/license" replace />} />
          <Route path="/admin/traning-video"  element={<Navigate to="/checklist_delegation/dashboard/traning-video" replace />} />
          <Route path="/admin/*"              element={<Navigate to="/checklist_delegation/dashboard/admin" replace />} />
          <Route path="/user/*"               element={<Navigate to="/checklist_delegation/dashboard/admin" replace />} />

          {/* ════════════════════════════════════════
              DOCUMENT MANAGER
              Master AdminLayout ke andar render hoga
          ════════════════════════════════════════ */}
          <Route
            path="/document_manager"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <DocLayout />
                </AdminLayout>
              </ProtectedRoute>
            }
          >
            <Route index                     element={<DocDashboard />} />
            <Route path="documents"          element={<DocList />} />
            <Route path="documents/renewal"  element={<DocRenewal />} />
            <Route path="documents/add"      element={<DocAdd />} />
            <Route path="shared"             element={<DocShared />} />
            <Route path="documents/license"  element={<DocLicense />} />
          </Route>

          {/* ════════════════════════════════════════
              PURCHASE MANAGEMENT APP
              Nested-route + Sidebar pattern
              Auto-login from master localStorage
          ════════════════════════════════════════ */}
          <Route
            path="/purchase_management"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <PurchaseLayout />
                </AdminLayout>
              </ProtectedRoute>
            }
          >
            <Route index                      element={<PurchaseDashboard />} />
            <Route path="indent"              element={<PurchaseIndent />} />
            <Route path="approval"            element={<PurchaseApproval />} />
            <Route path="purchase-order"      element={<PurchaseOrder />} />
            <Route path="get-lifting"         element={<PurchaseLifting />} />
            <Route path="cross-check"         element={<PurchaseCrossCheck />} />
          </Route>

          {/* ════════════════════════════════════════
              PETTY CASH APP
              Flat-route wrapper inside AdminLayout
          ════════════════════════════════════════ */}
          <Route
            path="/petty_cash/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <PettyCashApp />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Settings Route */}
          <Route
            path="/settings"
            element={
              <AdminRoute>
                <AdminLayout>
                  <SettingsPage />
                </AdminLayout>
              </AdminRoute>
            }
          />

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </div>
  );
}

export default App;
