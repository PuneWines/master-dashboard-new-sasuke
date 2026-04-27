import { SCRIPT_URLS } from '../../utils/envConfig';

// ─────────────────────────────────────────────────────────────
// Fallback data (shown only when live fetch fails)
// ─────────────────────────────────────────────────────────────
const HARDCODED_USERS = [
    {
        id: "internal-1",
        employee_id: "EMP001",
        user_name: "Admin User",
        designation: "Owner",
        user_id: "admin",
        password: "admin123",
        role: "admin",
        email_id: "admin@example.com",
        number: "+91 98765 43210",
        shops_name: "All",
        master_page_access: ["All"],
        tab_system_access: {}
    }
];

// ─────────────────────────────────────────────────────────────
// Helper: format tab_system_access object → string for Sheet
// e.g. { "Petty Cash": ["Dashboard"] } → "Petty Cash : Dashboard"
// ─────────────────────────────────────────────────────────────
const formatTabAccess = (access) => {
    if (!access || typeof access !== 'object') return '';
    return Object.entries(access)
        .filter(([_, tabs]) => Array.isArray(tabs) && tabs.length > 0)
        .map(([system, tabs]) => `${system} : ${tabs.join(',')}`)
        .join('; ');
};

// ─────────────────────────────────────────────────────────────
// FETCH ALL USERS — live from Google Sheet
// ─────────────────────────────────────────────────────────────
export const fetchUserDetailsApi = async () => {
    try {
        console.log("[settingApi] Fetching live users direct URL:", SCRIPT_URLS.MASTER_LOGIN);

        const response = await fetch(`${SCRIPT_URLS.MASTER_LOGIN}?action=fetchUsers&t=${Date.now()}`, {
            method: 'GET',
            credentials: 'omit'  // prevent Google from returning Login HTML
        });

        const text = await response.text();

        // Diagnose HTML responses (wrong ID / access restricted)
        if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
            console.error("[settingApi] ❌ Google returned HTML — proxy or deployment issue.");
            console.error("[settingApi] HTML snippet:", text.substring(0, 400));
            console.warn("[settingApi] ⚠️ Showing fallback data. Fix deployment settings.");
            return HARDCODED_USERS;
        }

        let result;
        try {
            result = JSON.parse(text);
        } catch (parseErr) {
            console.error("[settingApi] JSON parse failed. Raw response:", text.substring(0, 400));
            return HARDCODED_USERS;
        }

        if (result.success && Array.isArray(result.data)) {
            console.log("[settingApi] ✅ Live data loaded:", result.data.length, "users");
            // Data from new script already has correct keys — return as-is
            return result.data.map(user => ({
                id:                 user.id || Math.random(),
                employee_id:        user.employee_id        || "",
                user_name:          user.user_name          || "Unknown",
                designation:        user.designation        || "",
                user_id:            user.user_id            || "",
                password:           user.password           || "",
                role:               user.role               || "Employee",
                email_id:           user.email_id           || "",
                number:             user.number             || "",
                shops_name:         user.shops_name         || "",
                master_page_access: Array.isArray(user.master_page_access) ? user.master_page_access : [],
                tab_system_access:  (user.tab_system_access && typeof user.tab_system_access === 'object')
                                        ? user.tab_system_access
                                        : {},
                admin_photo:        user.admin_photo || user['Admin Photo'] || user.AdminPhoto || user['admin photo'] || "",
                status:             user.status || user['Status'] || user.work_status || "Active"
            }));
        }

        console.warn("[settingApi] Script returned:", result);
    } catch (err) {
        console.error("[settingApi] Network error:", err.message);
    }

    console.warn("[settingApi] Returning hardcoded fallback.");
    return HARDCODED_USERS;
};

// ─────────────────────────────────────────────────────────────
// CREATE USER — POST to Google Sheet
// Using Standard Content-Type to get readable JSON response
// ─────────────────────────────────────────────────────────────
export const createUserApi = async (formData) => {
    try {
        const payload = JSON.stringify({
            action: 'createUser',
            data: {
                employee_id:        formData.employee_id  || "",
                user_name:          formData.user_name    || "",
                designation:        formData.designation  || "",
                user_id:            formData.user_id      || "",
                password:           formData.password     || "",
                role:               formData.role         || "Employee",
                master_page_access: Array.isArray(formData.master_page_access)
                                        ? formData.master_page_access
                                        : [],
                tab_system_access:  formData.tab_system_access || {},
                shops_name:         formData.shops_name   || "",
                email_id:           formData.email_id     || "",
                number:             formData.number       || "",
                status:             formData.status       || "Active"
            }
        });

        console.log("[settingApi] Creating user, payload:", JSON.parse(payload));

        const response = await fetch(SCRIPT_URLS.MASTER_LOGIN, {
            method: 'POST',
            // DO NOT use mode: 'no-cors' so we can read error/success messages
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });

        const text = await response.text();

        // Check if GAS returned an unhandled HTML error page
        if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
            console.error("[settingApi] ❌ Google returned HTML for POST. Deployment Error.");
            return { success: false, error: "Deployment error. Check Google Apps Script." };
        }

        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("[settingApi] Post JSON parse failed:", text);
            return { success: false, error: "Invalid JSON response from server." };
        }

        if (result.success) {
            console.log("[settingApi] ✅ Create user successful.");
            return { success: true };
        } else {
            console.error("[settingApi] Google returned error:", result.error);
            return { success: false, error: result.error };
        }

    } catch (err) {
        console.error("[settingApi] Create user error:", err);
        return { success: false, error: err.toString() };
    }
};

// ─────────────────────────────────────────────────────────────
// DELETE USER — POST to Google Sheet
// ─────────────────────────────────────────────────────────────
export const deleteUserByIdApi = async (id) => {
    try {
        console.log("[settingApi] Deleting user ID:", id);
        
        const payload = JSON.stringify({
            action: 'deleteUser',
            id: id
        });

        const response = await fetch(SCRIPT_URLS.MASTER_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });

        const text = await response.text();
        const result = JSON.parse(text);

        if (result.success) {
            console.log("[settingApi] ✅ User deleted successfully.");
            return { success: true };
        } else {
            console.error("[settingApi] Delete error:", result.error);
            return { success: false, error: result.error };
        }
    } catch (err) {
        console.error("[settingApi] Delete user network error:", err);
        return { success: false, error: err.toString() };
    }
};

// ─────────────────────────────────────────────────────────────
// UPDATE USER — POST to Google Sheet
// ─────────────────────────────────────────────────────────────
export const updateUserDataApi = async ({ id, updatedUser }) => {
    try {
        console.log("[settingApi] Updating user unit:", id);

        const payload = JSON.stringify({
            action: 'updateUser',
            id: id,
            data: {
                employee_id:        updatedUser.employee_id  || "",
                user_name:          updatedUser.user_name    || "",
                designation:        updatedUser.designation  || "",
                user_id:            updatedUser.user_id      || "",
                password:           updatedUser.password     || "",
                role:               updatedUser.role         || "Employee",
                master_page_access: Array.isArray(updatedUser.master_page_access)
                                        ? updatedUser.master_page_access
                                        : [],
                tab_system_access:  updatedUser.tab_system_access || {},
                shops_name:         updatedUser.shops_name   || "",
                email_id:           updatedUser.email_id     || "",
                number:             updatedUser.number       || "",
                admin_photo:        updatedUser.admin_photo  || "",
                status:             updatedUser.status       || "Active"
            }
        });

        const response = await fetch(SCRIPT_URLS.MASTER_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: payload
        });

        const text = await response.text();
        const result = JSON.parse(text);

        if (result.success) {
            console.log("[settingApi] ✅ User updated successfully.");
            return { success: true };
        } else {
            console.error("[settingApi] Update error:", result.error);
            return { success: false, error: result.error };
        }
    } catch (err) {
        console.error("[settingApi] Update user network error:", err);
        return { success: false, error: err.toString() };
    }
};

export const patchSystemAccessApi = async ({ id, system_access }) => {
    console.log("[settingApi] patchAccess stub called for:", id, system_access);
    return { success: true };
};
