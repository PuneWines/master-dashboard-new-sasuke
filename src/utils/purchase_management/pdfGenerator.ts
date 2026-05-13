const _isLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const SCRIPT_URL =
  import.meta.env.DEV || _isLocalhost
    ? "/gas"
    : import.meta.env.VITE_GOOGLE_SCRIPT_URL || "/api/gas";

// Interface for PO data
interface POData {
  poNumber: string;
  companyName: string;
  tradeName: string;
  transporterName: string;
  items: Array<{
    indentNumber: string;
    itemName: string;
    reorderQuantityPcs: string;
    reorderQuantityBox: string;
    sizeML: string;
    closingStockPcs?: string;
    closingStockBox?: string;
  }>;
  remarks?: string;
  type?: 'receiver' | 'vendor'; // 'receiver' for manager, 'vendor' for trader/transporter
}

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * MAIN FUNCTION: Generate PO as IMAGE and upload to Google Drive
 * Direct Canvas → JPEG → Google Drive (NO PDF STEP)
 */
export const generatePOPDF = async (poData: POData): Promise<string> => {
  console.log("Step 1: Generating PO as Image (Direct Canvas)...");
  
  try {
    // Create image directly from canvas
    const jpegBlob = await generatePOImage(poData);
    console.log("Step 1 Complete: Image generated successfully");
    
    console.log("Step 2: Uploading Image to Google Drive...");
    
    // Create file from blob
    const imageFile = new File([jpegBlob], `PO-${poData.poNumber}.jpg`, {
      type: "image/jpeg",
    });
    
    // Upload to Google Drive
    const driveUrl = await uploadFileToDrive(
      imageFile,
      "1H0COtBsJdbsAfJjZ3Kt9UJQFeyWi8bGF",
      `PO-${poData.poNumber}`
    );
    
    console.log("Step 2 Complete: Image uploaded successfully");
    console.log("Google Drive URL:", driveUrl);
    
    return driveUrl;
    
  } catch (error) {
    console.error("Error generating or uploading PO image:", error);
    throw new Error(`Failed to process PO: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate PO Document as High-Quality JPEG Image
 * Uses HTML Canvas to draw the entire document
 */
const generatePOImage = async (poData: POData): Promise<Blob> => {
  // A4 size at 300 DPI (high quality for printing)
  const width = 2480;  // 210mm * 300/25.4
  const height = 3508; // 297mm * 300/25.4
  
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  
  // Colors
  const headerColor = "#0b1a33";
  const lightPink = "#fde3e4";
  const grayText = "#555555";
  
  // Fill white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  
  // === HEADER ===
  ctx.fillStyle = headerColor;
  ctx.fillRect(0, 0, width, 236); // ~20mm height
  
  // Company name centered
  ctx.fillStyle = "white";
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(poData.companyName || "THE LIQUOR STORY", width / 2, 150);
  
  // === JAGWANI LOGO on right side of header ===
  try {
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Logo load failed'));
      img.src = '/logo.png';
    });
    // Draw logo at top-right, fitting within header height
    const logoH = 200;
    const logoW = (logoImg.width / logoImg.height) * logoH;
    ctx.drawImage(logoImg, width - logoW - 60, 18, logoW, logoH);
  } catch (_) {
    // Logo failed to load – skip silently
    console.warn('Jagwani logo could not be loaded for PO slip');
  }
  
  // Reset styles
  ctx.fillStyle = "black";
  ctx.textAlign = "left";
  
  // === PO INFO SECTION ===
  let y = 413; // ~35mm from top
  ctx.font = "42px Arial, sans-serif";
  
  // PO Number
  ctx.fillText("PO NUMBER:", 177, y);
  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText(poData.poNumber, 708, y);
  ctx.font = "42px Arial, sans-serif";
  
  // Company Name
  y += 95;
  ctx.fillText("Company Name:", 177, y);
  ctx.font = "bold 42px Arial, sans-serif";
  const companyText = wrapText(ctx, poData.companyName || "", 1400, 42);
  companyText.forEach((line, i) => {
    ctx.fillText(line, 708, y + (i * 50));
  });
  y += Math.max(companyText.length * 50, 95);
  
  // Trade Name
  y += 47;
  ctx.font = "42px Arial, sans-serif";
  ctx.fillText("Trade Name:", 177, y);
  ctx.font = "bold 42px Arial, sans-serif";
  const tradeText = wrapText(ctx, poData.tradeName || "", 1400, 42);
  tradeText.forEach((line, i) => {
    ctx.fillText(line, 708, y + (i * 50));
  });
  y += Math.max(tradeText.length * 50, 95);
  
  // Date Issued
  y += 71;
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  ctx.font = "42px Arial, sans-serif";
  ctx.fillText(`Date Issued: ${today}`, 177, y);
  
  // === TABLE HEADER ===
  y = 1004; // ~85mm from top
  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(177, y, 2126, 95); // Header background
  
  // Helper for formatting numbers to max 2 decimal places
  const formatNum = (val: string | number | undefined): string => {
    if (val === undefined || val === null || val === "") return "0";
    const n = Number(val);
    if (isNaN(n)) return String(val);
    // If it's an integer, return as is. If decimal, limit to 2 places.
    return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  };

  ctx.fillStyle = "black";
  ctx.font = "bold 32px Arial, sans-serif";
  
  const isReceiver = poData.type === 'receiver';

  if (isReceiver) {
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText("S.NO", 197, y + 60);
    ctx.fillText("ITEM NAME", 413, y + 60);
    ctx.fillText("CLOSING(BTL)", 944, y + 60);
    ctx.fillText("CLOSING(BOX)", 1215, y + 60);
    ctx.fillText("ORDER(BTL)", 1487, y + 60);
    ctx.fillText("ORDER(BOX)", 1758, y + 60);
    ctx.fillText("SIZE (ML)", 2030, y + 60);
  } else {
    // Simplified for Trader/Transporter (Vendor) - Exactly as Image 1
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillText("S.NO", 236, y + 60);
    ctx.fillText("ITEM NAME", 531, y + 60);
    ctx.fillText("QTY(PC)", 1298, y + 60);
    ctx.fillText("QTY(BOX)", 1593, y + 60);
    ctx.fillText("SIZE (ML)", 1888, y + 60);
  }
  
  // === TABLE BODY ===
  y = 1158; // ~98mm from top
  ctx.font = isReceiver ? "30px Arial, sans-serif" : "38px Arial, sans-serif";
  
  poData.items.forEach((item) => {
    const rowHeight = 118;
    
    // Wrap widths based on type
    const itemWidth = isReceiver ? 500 : 708;
    const boxWidth = isReceiver ? 200 : 236;
    const fontSize = isReceiver ? 30 : 38;

    const itemNameLines = wrapText(ctx, item.itemName, itemWidth, fontSize);
    const qtyBoxLines = wrapText(ctx, formatNum(item.reorderQuantityBox), boxWidth, fontSize);
    
    const itemNameHeight = itemNameLines.length * (fontSize + 8);
    const qtyBoxHeight = qtyBoxLines.length * (fontSize + 8);
    const actualRowHeight = Math.max(rowHeight, itemNameHeight, qtyBoxHeight);
    
    ctx.fillStyle = lightPink;
    ctx.fillRect(177, y - 59, 2126, actualRowHeight);
    ctx.fillStyle = "black";
    
    if (isReceiver) {
      ctx.fillText(item.indentNumber, 197, y);
      itemNameLines.forEach((line, i) => ctx.fillText(line, 413, y + (i * 40)));
      ctx.fillText(formatNum(item.closingStockPcs), 1000, y);
      ctx.fillText(formatNum(item.closingStockBox), 1270, y);
      ctx.fillText(formatNum(item.reorderQuantityPcs), 1545, y);
      qtyBoxLines.forEach((line, i) => ctx.fillText(line, 1810, y + (i * 40)));
      ctx.fillText(formatNum(item.sizeML), 2085, y);
    } else {
      ctx.fillText(item.indentNumber, 236, y);
      itemNameLines.forEach((line, i) => ctx.fillText(line, 531, y + (i * 47)));
      ctx.fillText(formatNum(item.reorderQuantityPcs), 1357, y);
      qtyBoxLines.forEach((line, i) => ctx.fillText(line, 1652, y + (i * 47)));
      ctx.fillText(formatNum(item.sizeML), 1947, y);
    }
    
    y += actualRowHeight + 24;
  });
  
  // === TRANSPORTER NAME ===
  y += 118;
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillText("Transporter Name *", 177, y);
  
  ctx.strokeStyle = "#b4b4b4";
  ctx.lineWidth = 2;
  ctx.strokeRect(177, y + 35, 2126, 95);
  
  ctx.font = "38px Arial, sans-serif";
  ctx.fillText(poData.transporterName || "Select Transporter", 236, y + 106);
  
  // === REMARKS ===
  y += 236;
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillText("Remarks", 177, y);
  
  ctx.strokeRect(177, y + 35, 2126, 177);
  
  if (poData.remarks) {
    ctx.font = "38px Arial, sans-serif";
    const remarksLines = wrapText(ctx, poData.remarks, 2000, 38);
    remarksLines.forEach((line, i) => {
      if (i < 3) { // Max 3 lines to fit in box
        ctx.fillText(line, 236, y + 106 + (i * 47));
      }
    });
  }
  
  // === FOOTER ===
  ctx.fillStyle = grayText;
  ctx.font = "italic 32px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Powered By Botivate", width / 2, 3366); // ~285mm from top
  
  // Convert canvas to JPEG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image from canvas"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.95 // High quality
    );
  });
};

/**
 * Helper function to wrap text to fit within specified width
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
};

/**
 * Upload file to Google Drive via Google Apps Script
 * Returns the shareable Google Drive link
 */
export const uploadFileToDrive = async (
  file: File,
  folderId: string,
  filePrefix: string = "file"
): Promise<string> => {
  if (!SCRIPT_URL) {
    throw new Error("Google Apps Script URL not configured");
  }

  const maxRetries = 3;
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}...`);

      // Convert file to base64
      const base64Data = await blobToBase64(file);

      // Clean filename
      const cleanFileName = filePrefix
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

      const fileName = `${cleanFileName}.jpg`;
      const mimeType = "image/jpeg";

      const payload = {
        action: "uploadfile",
        base64Data,
        fileName,
        mimeType,
        folderId,
      };

      console.log("Uploading:", fileName, "to folder:", folderId);

      // Send to Google Apps Script
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result || !result.success) {
        throw new Error(result?.error || "Upload failed - no success flag");
      }

      if (!result.fileUrl) {
        throw new Error("Upload succeeded but no fileUrl returned");
      }

      // Extract file ID and create shareable link
      let fileUrl = result.fileUrl;
      const fileId =
        fileUrl.match(/id=([^&]+)/)?.[1] ||
        fileUrl.match(/\/d\/([^/]+)/)?.[1] ||
        fileUrl.match(/\/file\/d\/([^/]+)/)?.[1] ||
        fileUrl.match(/([\w-]{25,})/)?.[1];

      if (!fileId) {
        console.warn("Could not extract file ID, using original URL:", fileUrl);
        return fileUrl; // Return original if we can't parse it
      }

      // Create proper shareable Google Drive link
      const shareableUrl = `https://drive.google.com/file/d/${fileId}/view`;
      console.log("✅ Upload successful! File ID:", fileId);
      console.log("📎 Shareable URL:", shareableUrl);

      return shareableUrl;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Upload attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(
    `Upload failed after ${maxRetries} attempts: ${lastError.message}`
  );
};