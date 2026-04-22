// ============================================
// DUMMY FRONTEND - HARDCODED SYSTEMS
// No backend connection required
// ============================================

// Hardcoded Systems Data
let HARDCODED_SYSTEMS = [
    { id: 1, systems: "Whatsapp Send Message", link: "/whatsapp_send_message" },
    { id: 2, systems: "Petty Cash Tally", link: "/petty_cash" },
    { id: 3, systems: "Checklist Delegation", link: "/checklist_delegation/dashboard/admin" },
    { id: 4, systems: "Purchase App", link: "/purchase_management" },
    { id: 5, systems: "Document Manager", link: "/document_manager" },
    { id: 6, systems: "HR Product", link: "/hr_product" },
    { id: 7, systems: "Index System", link: "/index_systems" },
];

/**
 * GET all systems (returns hardcoded data)
 */
export const fetchSystemsApi = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return HARDCODED_SYSTEMS;
};

/**
 * CREATE system (adds to local array)
 */
export const createSystemApi = async (payload) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const newSystem = {
        id: HARDCODED_SYSTEMS.length + 1,
        systems: payload.systems,
        link: payload.link || ""
    };
    HARDCODED_SYSTEMS.push(newSystem);
    return newSystem;
};

/**
 * UPDATE system (updates local array)
 */
export const updateSystemApi = async (id, payload) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    const index = HARDCODED_SYSTEMS.findIndex(s => s.id === id);
    if (index !== -1) {
        HARDCODED_SYSTEMS[index] = { ...HARDCODED_SYSTEMS[index], ...payload };
        return HARDCODED_SYSTEMS[index];
    }
    throw new Error("System not found");
};

/**
 * DELETE system (removes from local array)
 */
export const deleteSystemApi = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    HARDCODED_SYSTEMS = HARDCODED_SYSTEMS.filter(s => s.id !== id);
    return { success: true };
};
