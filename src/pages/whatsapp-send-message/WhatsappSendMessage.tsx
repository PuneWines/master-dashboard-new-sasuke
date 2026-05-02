import React, { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';

// ─── GAS Web App URL (your deployed script) ──────────────────────────────────
const GAS_URL = import.meta.env.VITE_WHATSAPP_API_URL;

// ─── User Sheet ID (for history read) ────────────────────────────────────────
const USER_SHEET_ID = '1UEzymu5KMzTy6Ox7bZ4JwPiPCP_vSqZrCl4f-m7Nu_M';

// ─── Maytapi credentials (from .env) ────────────────────────────────────────
const MAYTAPI_PRODUCT_ID = import.meta.env.VITE_MAYTAPI_PRODUCT_ID ?? '654f0c29-bfe7-42f2-b5a9-81638a716206';
const MAYTAPI_PHONE_ID = import.meta.env.VITE_MAYTAPI_PHONE_ID ?? '102579';
const MAYTAPI_TOKEN = import.meta.env.VITE_MAYTAPI_TOKEN ?? '9fcce0ed-0e27-423f-946f-14141bc6589a';

const MAYTAPI_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? `/maytapi/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage?token=${MAYTAPI_TOKEN}`
    : `https://api.maytapi.com/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage?token=${MAYTAPI_TOKEN}`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SendResult {
    number: string;
    status: 'Sent' | 'Failed' | 'Sending';
    error?: string;
}

interface NewContactState {
    shopName: string;
    name: string;
    number: string;
    isNewShop: boolean;
    newShopName: string;
}

// History row: A=Timestamp, B=ShopName, C=Message, D=Names, E=Numbers, F=Status, G=FileLink
interface HistoryRow {
    timestamp: string;
    shopName: string;
    message: string;
    names: string;
    numbers: string;
    status: string;
    fileLink: string;
}

// ─── Unified GAS Request Helper (Fetch via Proxy) ────────────────────────────
async function requestGAS(params: Record<string, any>, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    if (!GAS_URL) {
        throw new Error('VITE_WHATSAPP_API_URL is not configured in .env file.');
    }

    try {
        let url = GAS_URL;
        let options: RequestInit = {
            method,
            headers: { 'Content-Type': 'text/plain' },
            redirect: 'follow'
        };

        if (method === 'GET') {
            const qs = Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');
            url += (url.includes('?') ? '&' : '?') + qs;
        } else {
            options.body = JSON.stringify(params);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        let text = await response.text();

        // Strip JSONP wrapper if present (e.g. callback([...]))
        // This handles cases where GAS returns a callback string instead of pure JSON
        const trimmed = text.trim();
        if (trimmed.match(/^[a-zA-Z0-9_]+\(/) && (trimmed.endsWith(')') || trimmed.endsWith(');'))) {
            text = trimmed.replace(/^[a-zA-Z0-9_]+\(/, '').replace(/\);?$/, '');
        }

        // Diagnose HTML responses (wrong ID / access restricted)
        if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
            console.error("[WhatsappSendMessage] ❌ GAS returned HTML — deployment or proxy issue.");
            throw new Error("Invalid response from server (HTML). Check GAS deployment.");
        }

        return JSON.parse(text);
    } catch (err: any) {
        console.error("[WhatsappSendMessage] GAS Request failed:", err);
        throw err;
    }
}

// ─── Fetch history from User sheet via GAS (action=getHistory) – reads A:G ────
async function fetchHistoryFromGAS(): Promise<HistoryRow[]> {
    try {
        const data = await requestGAS({ action: 'getHistory', sheetId: USER_SHEET_ID });
        if (!Array.isArray(data)) return [];
        return data.map((row: any[]) => ({
            timestamp: row[0] ?? '',
            shopName: row[1] ?? '',
            message: row[2] ?? '',
            names: row[3] ?? '',
            numbers: row[4] ?? '',
            status: row[5] ?? '',
            fileLink: row[6] ?? '',
        }));
    } catch (err) {
        console.error("History fetch failed:", err);
        return [];
    }
}

// ─── Send WhatsApp message via Maytapi directly ───────────────────────────────
async function sendViaMaytapi(
    number: string,
    message: string,
    fileData?: { base64: string; mimeType: string; fileName: string } | null,
    driveUrl?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        let payload: Record<string, any>;

        if (fileData && driveUrl) {
            // Send as media message with Drive URL
            payload = {
                to_number: '91' + number.trim(),
                type: 'media',
                message: driveUrl,
                text: message,
            };
        } else if (fileData && !driveUrl) {
            // Fallback: send base64 for images < 1MB, otherwise text-only
            const isImage = fileData.mimeType.startsWith('image/');
            if (isImage && fileData.base64.length < 1_000_000) {
                payload = {
                    to_number: '91' + number.trim(),
                    type: 'media',
                    message: `data:${fileData.mimeType};base64,${fileData.base64}`,
                    text: message,
                };
            } else {
                // Can't send non-image or large file without URL, send text only
                payload = {
                    to_number: '91' + number.trim(),
                    type: 'text',
                    message: message,
                    text: message,
                };
            }
        } else {
            // Plain text message
            payload = {
                to_number: '91' + number.trim(),
                type: 'text',
                message: message,
                text: message,
            };
        }

        const res = await fetch(MAYTAPI_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (json.success === true) return { success: true };
        return { success: false, error: json.message || 'Maytapi failed' };

    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isWithinLast30Days(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return date >= cutoff;
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────────
const WhatsappSendMessage: React.FC = () => {
    // ── Form state ──────────────────────────────────────────────────────────
    const [messageBody, setMessageBody] = useState<string>('');
    const [shopNames, setShopNames] = useState<string[]>([]);
    const [selectedShop, setSelectedShop] = useState<string>('');
    const [contacts, setContacts] = useState<any[][]>([]);
    const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [status, setStatus] = useState<{ message: string; type: string }>({ message: '', type: '' });
    const [sendResults, setSendResults] = useState<SendResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoadingShops, setIsLoadingShops] = useState<boolean>(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [newContact, setNewContact] = useState<NewContactState>(
        { shopName: '', name: '', number: '', isNewShop: false, newShopName: '' }
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── History state ────────────────────────────────────────────────────────
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
    const [historyError, setHistoryError] = useState<string>('');
    const [historyShopFilter, setHistoryShopFilter] = useState<string>('');

    useEffect(() => { fetchShopNames(); }, []);

    // ─────────────────────────────────────────────────────────────────────────
    const fetchShopNames = async () => {
        setIsLoadingShops(true);
        setStatus({ message: '', type: '' });
        try {
            const data = await requestGAS({ action: 'getShopNames' });
            setShopNames(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setStatus({ message: `⚠️ Could not load shops: ${err.message}`, type: 'error' });
        } finally {
            setIsLoadingShops(false);
        }
    };

    const loadHistory = async () => {
        setIsHistoryLoading(true);
        setHistoryError('');
        try {
            const rows = await fetchHistoryFromGAS();
            setHistoryRows(rows);
        } catch (err: any) {
            setHistoryError(`⚠️ Could not load history: ${err.message}`);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleToggleHistory = () => {
        const next = !showHistory;
        setShowHistory(next);
        setHistoryShopFilter('');
        if (next) loadHistory();
    };

    const handleShopChange = async (e: ChangeEvent<HTMLSelectElement>) => {
        const shop = e.target.value;
        setSelectedShop(shop);
        setSelectedContacts([]);
        setSendResults([]);
        if (!shop) { setContacts([]); return; }

        setIsLoadingContacts(true);
        try {
            const data = await requestGAS({ action: 'getContactsByShop', shopName: shop });
            setContacts(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setStatus({ message: `⚠️ Could not load contacts: ${err.message}`, type: 'error' });
            setContacts([]);
        } finally {
            setIsLoadingContacts(false);
        }
    };

    const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) =>
        setSelectedContacts(e.target.checked ? contacts.map((_, i) => i) : []);

    const handleContactToggle = (i: number) =>
        setSelectedContacts(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileNames(Array.from(files).map(f => f.name));
        } else {
            setFileNames([]);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        // We can't directly modify FileList, so we need to clear and re-set
        // For simplicity, we remove from display; the actual FileList stays but we track indices to skip
        setFileNames(prev => prev.filter((_, i) => i !== indexToRemove));
        // If all removed, also clear the input
        if (fileNames.length <= 1) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setFileNames([]);
        }
    };

    const fileToBase64 = (file: File): Promise<string> =>
        new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res((r.result as string).split(',')[1]);
            r.onerror = rej;
            r.readAsDataURL(file);
        });

    // ─── Main Submit ──────────────────────────────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!messageBody.trim()) { setStatus({ message: 'Message cannot be empty.', type: 'error' }); return; }
        if (!selectedShop) { setStatus({ message: 'Please select a Shop Name first.', type: 'error' }); return; }
        if (selectedContacts.length === 0) { setStatus({ message: 'Please select at least one contact.', type: 'error' }); return; }

        if (!MAYTAPI_PRODUCT_ID || !MAYTAPI_PHONE_ID || !MAYTAPI_TOKEN) {
            setStatus({ message: '⚠️ Maytapi credentials missing. Check .env file.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setSendResults([]);

        const names = selectedContacts.map(i => contacts[i][1] as string);
        const numbers = selectedContacts.map(i => contacts[i][2] as string);

        // ── Multiple File handling ──────────────────────────────────────────
        const rawFiles = fileInputRef.current?.files;
        const validFiles: File[] = [];

        if (rawFiles && rawFiles.length > 0) {
            // Only process files whose names are still in fileNames (not removed by user)
            for (let f = 0; f < rawFiles.length; f++) {
                const file = rawFiles[f];
                if (!fileNames.includes(file.name)) continue; // user removed this file
                if (file.size > 5 * 1024 * 1024) {
                    setStatus({ message: `❌ File "${file.name}" is too large! Max 5 MB per file.`, type: 'error' });
                    setIsSubmitting(false);
                    return;
                }
                validFiles.push(file);
            }
        }

        // ── Build file payloads ──────────────────────────────────────────────
        const filePayloads: { base64: string; mimeType: string; fileName: string }[] = [];

        if (validFiles.length > 0) {
            setStatus({ message: `⏳ Reading ${validFiles.length} file(s)...`, type: 'loading' });
            for (const file of validFiles) {
                const base64 = await fileToBase64(file);
                filePayloads.push({ base64, mimeType: file.type, fileName: file.name });
            }
        }

        // ── Save to GAS User sheet & Get Drive URLs ─────────────────────────
        const namesStr = names.join(', ');
        const numbersStr = numbers.join(', ');
        const driveLinks: string[] = [];

        if (filePayloads.length > 0) {
            setStatus({ message: `⏳ Uploading ${filePayloads.length} file(s) to Drive & saving record...`, type: 'loading' });
            for (let f = 0; f < filePayloads.length; f++) {
                const fp = filePayloads[f];
                try {
                    const gasRes = await requestGAS({
                        action: 'submitFormData',
                        message: f === 0 ? messageBody : `[File ${f + 1}/${filePayloads.length}]`,
                        shopName: selectedShop,
                        names: namesStr,
                        numbers: numbersStr,
                        file: { name: fp.fileName, type: fp.mimeType, data: fp.base64 },
                    }, 'POST');
                    driveLinks.push(gasRes?.fileUrl || '');
                } catch {
                    driveLinks.push('');
                }
            }
        } else {
            // No files — just save the text record
            setStatus({ message: '⏳ Saving record to Sheet...', type: 'loading' });
            await requestGAS({
                action: 'submitFormData',
                message: messageBody,
                shopName: selectedShop,
                names: namesStr,
                numbers: numbersStr,
                file: null,
            }, 'POST');
        }

        // ── Send to each contact via Maytapi ────────────────────────────────
        setStatus({ message: `📤 Sending to ${numbers.length} contact(s)...`, type: 'loading' });

        const initial: SendResult[] = numbers.map(n => ({ number: n, status: 'Sending' }));
        setSendResults([...initial]);

        // ── Build Single Message Box ───────────────────────────────────────
        let finalMessage = messageBody.trim();
        if (filePayloads.length > 0) {
            finalMessage += `\n\n📂 *Attached Files:*`;
            for (let f = 0; f < filePayloads.length; f++) {
                finalMessage += `\n${f + 1}️⃣ *${filePayloads[f].fileName}*`;
                if (driveLinks[f]) {
                    finalMessage += `\n🔗 View/Download: ${driveLinks[f]}`;
                }
                if (f < filePayloads.length - 1) finalMessage += '\n';
            }
        }

        const firstFile = filePayloads.length > 0 ? filePayloads[0] : null;
        const firstLink = driveLinks.length > 0 ? driveLinks[0] : undefined;

        for (let i = 0; i < numbers.length; i++) {
            const number = String(numbers[i]).trim();
            const contactName = String(names[i] || '').trim();
            if (!number) continue;

            // Personalize the message for each contact
            let personalizedMessage = finalMessage
                .replace(/\$\(User Name\)/gi, contactName)
                .replace(/\$\(Name\)/gi, contactName)
                .replace(/\{\{Name\}\}/gi, contactName);

            // 1️⃣ Send the single combined message
            const result = await sendViaMaytapi(number, personalizedMessage, firstFile, firstLink);

            setSendResults(prev => {
                const updated = [...prev];
                updated[i] = {
                    number,
                    status: result.success ? 'Sent' : 'Failed',
                    error: result.error,
                };
                return updated;
            });

            if (i < numbers.length - 1) await new Promise(r => setTimeout(r, 1000));
        }

        setStatus({ message: `✅ Done! All messages sent. Form will refresh in 4 seconds...`, type: 'success' });

        // Auto-refresh the page after 4 seconds
        setTimeout(() => {
            window.location.reload();
        }, 4000);

        // ── Reset form ──────────────────────────────────────────────────────
        setMessageBody('');
        setSelectedShop('');
        setContacts([]);
        setSelectedContacts([]);
        setFileNames([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsSubmitting(false);
    };

    // ─── Add Contact ──────────────────────────────────────────────────────────
    const handleAddContact = async () => {
        const { name, number, isNewShop, newShopName, shopName: existingShop } = newContact;
        const shop = (isNewShop ? newShopName : existingShop).trim();
        if (!shop || !name.trim() || !number.trim()) {
            setStatus({ message: 'All fields are required.', type: 'error' }); return;
        }
        setIsSubmitting(true);
        try {
            await requestGAS({ action: 'addNewContact', shopName: shop, name: name.trim(), number: number.trim() }, 'POST');
            setStatus({ message: '✅ Contact Added!', type: 'success' });
            setIsModalOpen(false);
            setNewContact({ shopName: '', name: '', number: '', isNewShop: false, newShopName: '' });
            await fetchShopNames();
            if (selectedShop === shop)
                await handleShopChange({ target: { value: shop } } as ChangeEvent<HTMLSelectElement>);
            setTimeout(() => setStatus({ message: '', type: '' }), 3000);
        } catch (err: any) {
            setStatus({ message: `❌ ${err.message}`, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Filtered History (last 30 days + shop filter) ────────────────────────
    const filteredHistory = historyRows.filter(row => {
        if (!isWithinLast30Days(row.timestamp)) return false;
        if (historyShopFilter && row.shopName !== historyShopFilter) return false;
        return true;
    });

    // Unique shop names from history (for filter dropdown)
    const historyShopOptions = Array.from(new Set(
        historyRows
            .filter(r => isWithinLast30Days(r.timestamp))
            .map(r => r.shopName)
            .filter(Boolean)
    )).sort();

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gray-50 flex justify-center p-4 py-8">
            <div className={`bg-white rounded-xl shadow-xl p-8 w-full border border-gray-100 transition-all duration-300 ${showHistory ? 'max-w-6xl' : 'max-w-4xl'}`}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-1 bg-green-500 h-8 rounded-full" />
                        <h2 className="text-2xl font-bold text-gray-800">📩 WhatsApp Message Form</h2>
                    </div>

                    {/* History Toggle Button */}
                    <button
                        type="button"
                        id="btn-toggle-history"
                        onClick={handleToggleHistory}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow transition-all active:scale-95 ${showHistory
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-green-500 text-white hover:bg-green-600 shadow-green-200 shadow-md'
                            }`}
                    >
                        {showHistory ? (
                            <><span>⬅️</span> Back to Form</>
                        ) : (
                            <><span>📄</span> History</>
                        )}
                    </button>
                </div>

                {/* ══════════════════ HISTORY VIEW ══════════════════ */}
                {showHistory ? (
                    <div className="space-y-4">

                        {/* Shop Filter Dropdown */}
                        <div className="flex flex-wrap items-end gap-4 bg-green-50 border border-green-100 rounded-xl p-4">
                            <div className="flex-1 min-w-[220px] space-y-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    🏪 Filter by Shop
                                </label>
                                <select
                                    id="history-shop-filter"
                                    className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-green-400 cursor-pointer shadow-sm"
                                    value={historyShopFilter}
                                    onChange={e => setHistoryShopFilter(e.target.value)}
                                >
                                    <option value="">— All Shops —</option>
                                    {historyShopOptions.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    📅 Last 30 Days
                                </span>
                                <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                                    {filteredHistory.length} Record{filteredHistory.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={loadHistory}
                                    disabled={isHistoryLoading}
                                    className="px-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
                                    title="Refresh"
                                >
                                    {isHistoryLoading ? '⏳' : '🔄'} Refresh
                                </button>
                            </div>
                        </div>

                        {/* History Table */}
                        {historyError ? (
                            <div className="p-8 text-center text-red-500 font-semibold bg-red-50 rounded-xl border border-red-100">
                                {historyError}
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                                    <table className="w-full border-collapse min-w-[800px] text-sm">
                                        <thead className="sticky top-0 bg-green-500 text-white z-10">
                                            <tr>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider whitespace-nowrap w-40">🕐 Timestamp</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider whitespace-nowrap">🏪 Shop Name</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider">💬 Message</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider">👤 Names</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider whitespace-nowrap">📱 Numbers</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider whitespace-nowrap w-24">✅ Status</th>
                                                <th className="p-3 text-left font-bold text-xs uppercase tracking-wider whitespace-nowrap w-24">📎 File</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {isHistoryLoading ? (
                                                <tr>
                                                    <td colSpan={7} className="p-16 text-center text-gray-400 font-semibold animate-pulse">
                                                        ⏳ Loading history records...
                                                    </td>
                                                </tr>
                                            ) : filteredHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-16 text-center text-gray-400 italic">
                                                        {historyRows.length === 0
                                                            ? 'No records found in the User sheet.'
                                                            : 'No records found for the selected filter in the last 30 days.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredHistory.map((row, i) => (
                                                    <tr key={i} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-green-50/40`}>
                                                        <td className="p-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                                                            {formatDate(row.timestamp)}
                                                        </td>
                                                        <td className="p-3 font-bold text-gray-800 whitespace-nowrap">
                                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                                                                {row.shopName || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-gray-600 max-w-[260px]">
                                                            <p className="truncate" title={row.message}>{row.message || '—'}</p>
                                                        </td>
                                                        <td className="p-3 text-gray-700 max-w-[180px]">
                                                            <p className="truncate" title={row.names}>{row.names || '—'}</p>
                                                        </td>
                                                        <td className="p-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                                                            {row.numbers || '—'}
                                                        </td>
                                                        <td className="p-3 whitespace-nowrap">
                                                            {row.status ? (
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${row.status.toLowerCase().includes('sent')
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : row.status.toLowerCase().includes('fail')
                                                                        ? 'bg-red-100 text-red-600'
                                                                        : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                    {row.status}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {row.fileLink && row.fileLink.startsWith('http') ? (
                                                                <a
                                                                    href={row.fileLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline underline-offset-2 font-semibold text-xs transition-colors"
                                                                >
                                                                    📎 View File
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                ) : (
                    /* ══════════════════ FORM VIEW ══════════════════ */
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Message */}
                        <div className="space-y-2">
                            <label className="block font-bold text-gray-700 text-sm">
                                Message <span className="text-gray-400 font-normal ml-2 text-xs">(Use <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">$(User Name)</code> to insert contact's name)</span>
                            </label>
                            <textarea
                                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none transition-all min-h-[120px] text-gray-700 shadow-sm"
                                placeholder="Dear $(User Name),&#10;Any Massage! ..."
                                value={messageBody}
                                onChange={e => setMessageBody(e.target.value)}
                                required
                            />
                        </div>

                        {/* Shop Dropdown */}
                        <div className="space-y-2">
                            <label className="block font-bold text-gray-700 text-sm">
                                🏪 Shop Name{isLoadingShops && <span className="text-green-500 font-normal ml-2">(Loading...)</span>}
                            </label>
                            <select
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-400 outline-none cursor-pointer bg-white text-gray-700 shadow-sm"
                                value={selectedShop}
                                onChange={handleShopChange}
                            >
                                <option value="">-- Select Shop First --</option>
                                {shopNames.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {shopNames.length === 0 && !isLoadingShops && (
                                <p className="text-xs text-orange-500 mt-1">
                                    ⚠️ No shops loaded. Make sure your GAS <code className="bg-orange-50 px-1 rounded">doGet(e)</code> handles <code className="bg-orange-50 px-1 rounded">?action=getShopNames&amp;callback=xxx</code>.
                                </p>
                            )}
                        </div>

                        {/* Contacts Table */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="max-h-[280px] overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-green-50 text-green-700 z-10">
                                        <tr>
                                            <th className="p-3 text-center border-b border-green-100 w-12">
                                                <input type="checkbox" className="w-4 h-4 accent-green-500 cursor-pointer"
                                                    checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                                                    onChange={handleSelectAll} />
                                            </th>
                                            <th className="p-3 text-left border-b border-green-100 font-bold text-sm">Name</th>
                                            <th className="p-3 text-left border-b border-green-100 font-bold text-sm">Number</th>
                                            <th className="p-3 text-left border-b border-green-100 font-bold text-sm w-24">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {contacts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                                                    {isLoadingContacts ? '⏳ Loading contacts...'
                                                        : selectedShop ? 'No contacts found for this shop.'
                                                            : 'Please select a shop first...'}
                                                </td>
                                            </tr>
                                        ) : contacts.map((row, i) => {
                                            const result = sendResults.find(r => r.number === String(row[2]));
                                            return (
                                                <tr key={i} className="hover:bg-green-50/30 transition-colors">
                                                    <td className="p-3 text-center">
                                                        <input type="checkbox" className="w-4 h-4 accent-green-500 cursor-pointer"
                                                            checked={selectedContacts.includes(i)}
                                                            onChange={() => handleContactToggle(i)} />
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-700 font-medium">{row[1]}</td>
                                                    <td className="p-3 text-sm text-gray-500 font-mono">{row[2]}</td>
                                                    <td className="p-3 text-xs font-semibold">
                                                        {result?.status === 'Sent' && <span className="text-green-600">✅ Sent</span>}
                                                        {result?.status === 'Failed' && <span className="text-red-500" title={result.error}>❌ Failed</span>}
                                                        {result?.status === 'Sending' && <span className="text-blue-500">⏳ Sending</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Add Contact */}
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setIsModalOpen(true)}
                                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl shadow-lg transition hover:scale-110 active:scale-95"
                                title="Add New Contact">+</button>
                        </div>

                        {/* File Upload — Multiple */}
                        <div className="space-y-2">
                            <label className="block font-bold text-gray-700 text-sm">📎 Attach Files (optional — Images, Video, PDF, Excel, Word, ZIP…)</label>
                            <div className="flex items-center gap-4 p-4 border-2 border-dashed border-green-100 rounded-xl bg-green-50/40 cursor-pointer hover:border-green-300 transition-all"
                                onClick={() => fileInputRef.current?.click()}>
                                <span className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg text-sm shadow">Choose Files</span>
                                <span className="text-gray-500 text-sm">{fileNames.length === 0 ? 'No Files Selected' : `${fileNames.length} file(s) selected`}</span>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange}
                                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" multiple />
                            </div>

                            {/* Selected Files List */}
                            {fileNames.length > 0 && (
                                <div className="space-y-1.5 p-3 bg-green-50 rounded-xl border border-green-100">
                                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider">📁 Selected Files:</p>
                                    {fileNames.map((name, idx) => (
                                        <div key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-green-50 shadow-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-green-500 text-sm flex-shrink-0">
                                                    {name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? '🖼️' :
                                                        name.match(/\.(mp4|mov|avi|mkv)$/i) ? '🎬' :
                                                            name.match(/\.(mp3|wav|ogg)$/i) ? '🎵' :
                                                                name.match(/\.(pdf)$/i) ? '📄' :
                                                                    name.match(/\.(xls|xlsx|csv)$/i) ? '📊' :
                                                                        name.match(/\.(doc|docx)$/i) ? '📝' :
                                                                            name.match(/\.(zip|rar|7z)$/i) ? '📦' : '📎'}
                                                </span>
                                                <span className="text-sm text-gray-700 font-medium truncate">{name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleRemoveFile(idx); }}
                                                className="flex-shrink-0 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-500 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                                                title="Remove file"
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-gray-400">Max 5 MB per file. Select multiple files — each will be sent as a separate message to receiver.</p>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-2">
                            <button type="submit" disabled={isSubmitting}
                                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                {isSubmitting
                                    ? <><span className="animate-spin">⏳</span> Sending...</>
                                    : '✉️ Send via WhatsApp'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Status bar */}
                {status.message && (
                    <div className={`mt-6 text-center font-bold p-3 rounded-lg ${status.type === 'success' ? 'bg-green-100 text-green-700' :
                        status.type === 'error' ? 'bg-red-100   text-red-700' :
                            'bg-blue-100  text-blue-700'}`}>
                        {status.message}
                    </div>
                )}

                {/* Send results summary */}
                {sendResults.length > 0 && !showHistory && (
                    <div className="mt-4 border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
                        <p className="font-bold text-gray-700 text-sm">📊 Send Results:</p>
                        {sendResults.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                {r.status === 'Sent' && <span className="text-green-600 font-semibold">✅</span>}
                                {r.status === 'Failed' && <span className="text-red-500   font-semibold">❌</span>}
                                {r.status === 'Sending' && <span className="text-blue-500  font-semibold animate-pulse">⏳</span>}
                                <span className="font-mono text-gray-600">{r.number}</span>
                                <span className={`font-semibold ${r.status === 'Sent' ? 'text-green-600' : r.status === 'Failed' ? 'text-red-500' : 'text-blue-500'}`}>{r.status}</span>
                                {r.error && <span className="text-xs text-gray-400 italic">({r.error})</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Add Contact Modal ─────────────────────────────────────────────── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                            <div className="w-1 bg-green-500 h-6 rounded-full" />
                            <h3 className="text-xl font-bold text-gray-800">➕ Add New Contact</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">🏪 Shop Name</label>
                                <select className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400 bg-white"
                                    value={newContact.isNewShop ? '__new__' : newContact.shopName}
                                    onChange={e => setNewContact(p => ({ ...p, isNewShop: e.target.value === '__new__', shopName: e.target.value === '__new__' ? '' : e.target.value }))}>
                                    <option value="">-- Select Shop --</option>
                                    {shopNames.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="__new__">+ Add New Shop</option>
                                </select>
                            </div>
                            {newContact.isNewShop && (
                                <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400"
                                    placeholder="New shop name..." value={newContact.newShopName}
                                    onChange={e => setNewContact(p => ({ ...p, newShopName: e.target.value }))} />
                            )}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Contact Name</label>
                                <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400"
                                    placeholder="Enter name" value={newContact.name}
                                    onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Number</label>
                                <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400 font-mono"
                                    placeholder="e.g. 9876543210" value={newContact.number}
                                    onChange={e => setNewContact(p => ({ ...p, number: e.target.value }))} />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90">✕</button>
                                <button type="button" onClick={handleAddContact} disabled={isSubmitting}
                                    className="w-10 h-10 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90">💾</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsappSendMessage;
