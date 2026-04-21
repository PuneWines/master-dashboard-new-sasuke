// ============================================
// DUMMY FRONTEND - HARDCODED ATTENDANCE DATA
// No backend connection required
// ============================================

// Hardcoded Attendance Data
const HARDCODED_ATTENDANCE = [
    { employee_id: "EMP001", status: "IN", monthly_attendance: 22 },
    { employee_id: "EMP002", status: "IN", monthly_attendance: 20 },
    { employee_id: "EMP003", status: "OUT", monthly_attendance: 18 },
    { employee_id: "EMP004", status: "IN", monthly_attendance: 21 },
    { employee_id: "EMP005", status: "OUT", monthly_attendance: 15 },
];

export const fetchAttendanceSummaryApi = async (fromDate, toDate) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
        data: {
            data: HARDCODED_ATTENDANCE
        }
    };
};
