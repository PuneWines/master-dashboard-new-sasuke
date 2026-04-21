// ============================================
// DUMMY FRONTEND - HARDCODED CREDENTIALS
// No backend connection required
// ============================================

// Hardcoded System URLs with Names
export const SYSTEMS = [
    { name: "Whatsapp Send Message", url: "/whatsapp_send_message" },
    { name: "Petty Cash Tally", url: "/petty_cash" },
    { name: "Purchase FMS", url: "/purchase_management" },
    { name: "Production Planning", url: "https://v0-production-planning-app-beta.vercel.app/" },
    { name: "Store FMS", url: "https://store-fms-botivate.vercel.app/" },
    { name: "Checklist Delegation", url: "/checklist_delegation/dashboard/admin" },
    { name: "HR Product", url: "/hr_product" },
    { name: "Maintenance", url: "https://new-demo-maintenance.vercel.app/" },
    { name: "MIS Dashboard", url: "https://demo-mis.vercel.app/" },
    { name: "Repair Management", url: "https://botivate-repair.vercel.app/" },
    { name: "Subscription Manager", url: "https://botivate-subscription-manager.vercel.app/" },
    { name: "Document Manager", url: "/document_manager" },
    { name: "Lead to Order", url: "https://lead-to-order-system.vercel.app/" },
    { name: "NBD CRR Software", url: "https://v0-nbd-crr-software.vercel.app/" },
    { name: "Retail Management", url: "https://botivate-retail.vercel.app/" },
    { name: "Inventory Management", url: "https://botivate-inventory.vercel.app/" },
    { name: "Analytics Dashboard", url: "https://exquisite-monstera-3b8503.netlify.app/" },
    { name: "Business Intelligence", url: "https://v0-business-intelligence-dashboard-three.vercel.app/" },
    { name: "TMT Production Setup", url: "https://v0-tmt-production-setup.vercel.app/" },
    { name: "O2D System", url: "https://botivate-o2-d.vercel.app/" },
    { name: "Order to Dispatch", url: "https://dummy-order2dispatch.vercel.app/" },
    { name: "OCR Google Search", url: "https://internsatbotivate.github.io/BotivateOCR_GoogleSearch/" },
    { name: "BotiScan", url: "https://botiscan.vercel.app/" },
    { name: "Furniture App", url: "https://furniture-app-beryl.vercel.app/" },
    { name: "New Inventory", url: "https://new-inventory-lime.vercel.app/" },
    { name: "Accounts FMS", url: "https://v0-accounts-fms-system.vercel.app/" },
    { name: "Freight FMS", url: "https://v0-freight-fms-build.vercel.app/" },
    { name: "Akshay Portfolio", url: "https://akshay-baradia-porfile.vercel.app/" },
    { name: "Thoughtly AI", url: "https://www.thoughtly.com/" },
];

// Hardcoded Login Credentials
const HARDCODED_USERS = [
    {
        username: "admin",
        password: "admin123",
        user_name: "Admin User",
        role: "admin",
        email_id: "admins@example.com",
        system_access: JSON.stringify(SYSTEMS.map(s => s.url))  // All systems access
    },
    {
        username: "user",
        password: "user123",
        user_name: "Regular User",
        role: "user",
        email_id: "user@example.com",
        system_access: JSON.stringify(SYSTEMS.slice(0, 10).map(s => s.url))  // Limited systems
    }
];

// Default System URL
export const SYSTEM_URL = SYSTEMS[0].url;

// Use the setting API that fetches all live users
import { fetchUserDetailsApi } from './settingApi';

export const LoginCredentialsApi = async (formData) => {
    const { username, password } = formData;
    
    try {
        // Fetch live users from Google Sheet
        const allUsers = await fetchUserDetailsApi();
        
        // Find matching user from live data
        const matchedUser = allUsers.find(
            user => user.user_id === username && user.password === password
        );

        if (matchedUser) {
            // Remove password from returned data for security
            const { password: _, ...userData } = matchedUser;
            return { data: userData };
        } else {
            return { error: "Invalid username or password" };
        }
    } catch (error) {
        console.error("[LoginApi] Error logging in:", error);
        return { error: "Network error during login" };
    }
};