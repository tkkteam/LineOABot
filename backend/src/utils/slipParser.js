import sharp from 'sharp';
import jsQR from 'jsqr';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { logger } from './logger.js';

let ocrWorker = null;

async function getOCRWorker() {
  if (!ocrWorker) {
    ocrWorker = await createWorker(['tha', 'eng']);
  }
  return ocrWorker;
}

export const BANK_DISPLAY_NAMES = {
  'กสิกรไทย': 'ธ.กสิกรไทย (KBANK)',
  'KBANK': 'ธ.กสิกรไทย (KBANK)',
  'กรุงเทพ': 'ธ.กรุงเทพ (BBL)',
  'BBL': 'ธ.กรุงเทพ (BBL)',
  'กรุงไทย': 'ธ.กรุงไทย (KTB)',
  'KTB': 'ธ.กรุงไทย (KTB)',
  'ไทยพาณิชย์': 'ธ.ไทยพาณิชย์ (SCB)',
  'SCB': 'ธ.ไทยพาณิชย์ (SCB)',
  'กรุงศรี': 'ธ.กรุงศรี (BAY)',
  'BAY': 'ธ.กรุงศรี (BAY)',
  'ทีทีบี': 'ทีทีบี (ttb)',
  'ทหารไทย': 'ทีทีบี (ttb)',
  'TTB': 'ทีทีบี (ttb)',
  'ออมสิน': 'ธ.ออมสิน (GSB)',
  'GSB': 'ธ.ออมสิน (GSB)',
  'ธอส': 'ธอส. (GHB)',
  'ธ.ก.ส': 'ธ.ก.ส. (BAAC)',
  'เกียรตินาคิน': 'ธ.เกียรตินาคินภัทร (KKP)',
  'KKP': 'ธ.เกียรตินาคินภัทร (KKP)',
  'ทิสโก้': 'ธ.ทิสโก้ (TISCO)',
  'TISCO': 'ธ.ทิสโก้ (TISCO)',
  'ซีไอเอ็มบี': 'ธ.ซีไอเอ็มบี (CIMB)',
  'ยูโอบี': 'ธ.ยูโอบี (UOB)',
  'UOB': 'ธ.ยูโอบี (UOB)',
  'แลนด์ แอนด์ เฮ้าส์': 'LH Bank',
  'พร้อมเพย์': 'พร้อมเพย์ (PromptPay)',
  'ทรูมันนี่': 'ทรูมันนี่ วอลเล็ท',
};

const BANK_NAME_KEYWORDS = Object.keys(BANK_DISPLAY_NAMES);

/**
 * Extract transfer amount, date, sender, and receiver details from slip image using OCR
 */
export async function extractDetailsFromSlip(imagePath) {
  const result = {
    amount: null,
    dateStr: null,
    sender: {
      name: null,
      bank: null,
      account: null
    },
    receiver: {
      name: null,
      bank: null,
      account: null
    }
  };

  try {
    // Preprocess image with sharp (upscale + grayscale + normalize) for sharp Thai text recognition
    const preprocessedBuffer = await sharp(imagePath)
      .resize({ width: 1400, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .toBuffer();

    const worker = await getOCRWorker();
    const ret = await worker.recognize(preprocessedBuffer);
    const text = ret.data?.text || '';
    
    const lines = text.split('\n');
    const amountCandidates = [];
    const foundAccounts = [];
    const foundBanks = [];
    const foundNames = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 1. Detect Amount
      const matches = line.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g);
      for (const match of matches) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (isNaN(val) || val <= 0) continue;
        
        let score = 0;
        const context = (line + ' ' + (lines[i - 1] || '') + ' ' + (lines[i + 1] || '')).toLowerCase();
        
        if (/[u|U][n|m|N|M]/.test(line) || /บาท|baht|thb|บ\./i.test(line)) {
          score += 10;
        }
        if (/จำนวน|amount|ยอด|transfer/i.test(context)) {
          score += 5;
        }
        if (/[0-9]{1,2}\.[0-9]{1,2}\./.test(line) && !/[u|U][n|m]/.test(line)) {
          score -= 10;
        }
        
        amountCandidates.push({ val, score, raw: match[1] });
      }

      // 2. Detect Masked Account (e.g. xxx-x-x2350-x or 0903855583 or x-xxxx)
      const accMatch = line.match(/[xX*0-9-]{7,}/);
      if (accMatch && /[xX*]/.test(accMatch[0])) {
        foundAccounts.push(accMatch[0]);
      } else if (/^0[689][0-9]{8}$/.test(line.replace(/[^0-9]/g, ''))) {
        foundAccounts.push(line.replace(/[^0-9]/g, ''));
      }

      // 3. Detect Bank Name and map to clean display name
      const matchedBank = BANK_NAME_KEYWORDS.find(b => line.includes(b));
      if (matchedBank) {
        foundBanks.push(BANK_DISPLAY_NAMES[matchedBank]);
      }

      // 4. Detect "จาก" / "ผู้โอน"
      const fromMatch = line.match(/(?:จาก|ผู้โอน)\s*[@]?\s*(.+)/);
      if (fromMatch) {
        let candidate = fromMatch[1].replace(/[^ก-ฮะ-์a-zA-Z\s.]/g, '').trim();
        if (candidate.length >= 3) {
          result.sender.name = candidate;
        }
      }

      // 5. Detect "ไปยัง" / "ถึง" / "ผู้รับ"
      const toMatch = line.match(/(?:ไปยัง|ถึง|ผู้รับ|โอนให้)\s*[@]?\s*(.+)/);
      if (toMatch) {
        let candidate = toMatch[1].replace(/[^ก-ฮะ-์a-zA-Z\s.]/g, '').trim();
        if (candidate.length >= 3) {
          result.receiver.name = candidate;
        }
      }

      // 6. Detect Person / Company Name
      const nameMatch = line.match(/(นาย|นางสาว|นาง|น\.ส\.|บจก\.|บริษัท|หจก\.|Mr\.|Mrs\.|Ms\.)\s*([\u0E01-\u0E5B\s.]+)/);
      if (nameMatch) {
        let cleanName = nameMatch[0].trim().replace(/[^\u0E01-\u0E5B\s.]/g, '').trim();
        foundNames.push(cleanName);
      }

      // 7. Detect Date/Time text (e.g. 19/09/2026 11:03 or 19 ก.ย. 69)
      if (!result.dateStr && /[0-9]{1,2}\s*(?:\/|-|\.|\s)\s*(?:[0-9]{1,2}|[ก-ฮ]{2,4}\.?)\s*(?:\/|-|\.|\s)\s*[0-9]{2,4}/.test(line)) {
        const timeMatch = line.match(/[0-9]{1,2}:[0-9]{2}/);
        const timeStr = timeMatch ? ` (${timeMatch[0]})` : '';
        const cleanDate = line.replace(/[^0-9a-zA-Z\u0E00-\u0E7F/.:-\s]/g, '').trim();
        if (cleanDate.length >= 6 && cleanDate.length <= 30) {
          result.dateStr = `วันที่โอน ${cleanDate}${!cleanDate.includes(':') ? timeStr : ''}`;
        }
      }
    }
    
    if (amountCandidates.length > 0) {
      amountCandidates.sort((a, b) => b.score - a.score);
      result.amount = amountCandidates[0].val;
    }

    if (!result.sender.name && foundNames.length > 0) {
      result.sender.name = foundNames[0];
    }
    if (!result.receiver.name && foundNames.length > 1) {
      result.receiver.name = foundNames[1];
    }

    result.sender.bank = result.sender.bank || foundBanks[0] || null;
    result.sender.account = result.sender.account || foundAccounts[0] || null;

    result.receiver.bank = result.receiver.bank || foundBanks[1] || null;
    result.receiver.account = result.receiver.account || foundAccounts[1] || null;

  } catch (err) {
    logger.warn('[slipParser] OCR details extraction failed', { message: err.message });
  }

  return result;
}

export const BANK_CODES = {
  '002': 'ธ.กรุงเทพ (BBL)',
  '004': 'ธ.กสิกรไทย (KBANK)',
  '006': 'ธ.กรุงไทย (KTB)',
  '011': 'ทีทีบี (TTB)',
  '014': 'ธ.ไทยพาณิชย์ (SCB)',
  '025': 'ธ.กรุงศรี (BAY)',
  '030': 'ธ.ออมสิน (GSB)',
  '033': 'ธอส. (GHB)',
  '034': 'ธ.ก.ส. (BAAC)',
  '065': 'ธ.ธนชาต (TBANK)',
  '066': 'ธ.อิสลาม (IBANK)',
  '067': 'ธ.ทิสโก้ (TISCO)',
  '069': 'ธ.เกียรตินาคินภัทร (KKP)',
  '070': 'ธ.ไอซีบีซี (ICBC)',
  '071': 'ธ.ไทยเครดิต (TCRB)',
  '073': 'ธ.แลนด์ แอนด์ เฮ้าส์ (LH Bank)',
};

/**
 * Helper to get readable bank name from 3-digit code
 */
export function getBankName(code) {
  if (!code) return 'บัญชีธนาคาร/พร้อมเพย์';
  const cleanCode = code.toString().padStart(3, '0');
  return BANK_CODES[cleanCode] || `ธนาคาร (รหัส ${cleanCode})`;
}

/**
 * Parse standard EMVCo TLV string into key-value map
 */
export function parseTLV(data) {
  const result = {};
  if (!data || typeof data !== 'string') return result;

  let i = 0;
  while (i < data.length) {
    if (i + 4 > data.length) break;
    const tag = data.substring(i, i + 2);
    const lengthStr = data.substring(i + 2, i + 4);
    const length = parseInt(lengthStr, 10);
    
    if (isNaN(length) || length < 0 || i + 4 + length > data.length) {
      break;
    }
    
    const value = data.substring(i + 4, i + 4 + length);
    // If tag already exists (e.g. multiple 00 tags in nested sub-TLVs), store in array or subfield
    if (result[tag]) {
      if (Array.isArray(result[tag])) {
        result[tag].push(value);
      } else {
        result[tag] = [result[tag], value];
      }
    } else {
      result[tag] = value;
    }
    
    i += 4 + length;
  }
  return result;
}

/**
 * Decode Thai Bank Slip Mini QR payload (EMVCo / PromptPay Slip Standard)
 */
export function decodeThaiSlipPayload(rawText) {
  if (!rawText) return null;

  const rootTLV = parseTLV(rawText);
  let transRef = null;
  let sendingBank = null;
  let amount = null;
  let transDate = null;
  let transTime = null;

  // 1. Tag 54 = Transaction Amount (if present in QR)
  if (rootTLV['54']) {
    const parsedAmount = parseFloat(rootTLV['54']);
    if (!isNaN(parsedAmount)) {
      amount = parsedAmount;
    }
  }

  // 2. Check Sub-TLVs (Sub-tag 0046 or Tag 00 / 51 / 29 / 30 / 31)
  const subTlvCandidates = [];

  if (Array.isArray(rootTLV['00'])) {
    for (const val of rootTLV['00']) {
      if (val.length > 2) subTlvCandidates.push(val);
    }
  } else if (rootTLV['00'] && rootTLV['00'].length > 2) {
    subTlvCandidates.push(rootTLV['00']);
  }

  ['51', '29', '30', '31', '91'].forEach((tag) => {
    if (rootTLV[tag]) {
      if (Array.isArray(rootTLV[tag])) {
        subTlvCandidates.push(...rootTLV[tag]);
      } else {
        subTlvCandidates.push(rootTLV[tag]);
      }
    }
  });

  // Extract from sub-TLVs
  for (const candidate of subTlvCandidates) {
    const subTLV = parseTLV(candidate);
    
    // Sub-tag 01: Bank code (e.g. 014 = SCB, 004 = KBANK)
    if (subTLV['01'] && !sendingBank) {
      sendingBank = subTLV['01'].trim();
    }
    
    // Sub-tag 02: Transaction Reference / Trace Number
    if (subTLV['02'] && !transRef) {
      transRef = subTLV['02'].trim();
    }

    // Sub-tag 03 or 04: Date / Time or metadata
    if (subTLV['03']) {
      const val = subTLV['03'].trim();
      if (/^\d{8}$/.test(val)) {
        transDate = val;
      }
    }

    // Sub-tag 54: Amount inside subTLV if any
    if (subTLV['54'] && !amount) {
      const parsedAmount = parseFloat(subTLV['54']);
      if (!isNaN(parsedAmount)) amount = parsedAmount;
    }
  }

  // Fallback: If transRef still not found, check if rawText contains common Thai Bank reference patterns
  if (!transRef) {
    if (rawText.length >= 10 && rawText.length <= 40 && /^[A-Za-z0-9_-]+$/.test(rawText)) {
      transRef = rawText;
    }
  }

  return {
    raw: rawText,
    transRef: transRef || (rawText.length >= 8 ? rawText.substring(0, 35) : null),
    sendingBank: sendingBank || null,
    amount: amount || null,
    transDate: transDate || null,
    transTime: transTime || null,
    isThaiBankSlip: Boolean(sendingBank || transRef)
  };
}

/**
 * Scan QR code from image path using Sharp + jsQR (Multi-pass processing)
 */
export async function parseSlipQR(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Slip file not found at ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);

  // Define multi-pass preprocessing pipelines to maximize QR detection rate
  const pipelines = [
    // Pass 1: Raw image
    (sharpInst) => sharpInst,
    // Pass 2: Resized to 1000px max (helps large smartphone camera photos)
    (sharpInst) => sharpInst.resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }),
    // Pass 3: Grayscale + Normalization
    (sharpInst) => sharpInst.resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).grayscale().normalize(),
    // Pass 4: Thresholding / High Contrast
    (sharpInst) => sharpInst.resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).grayscale().threshold(128)
  ];

  for (let pass = 0; pass < pipelines.length; pass++) {
    try {
      const transformed = pipelines[pass](sharp(imageBuffer));
      const { data, info } = await transformed
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const qrCode = jsQR(new Uint8ClampedArray(data), info.width, info.height, {
        inversionAttempts: 'attemptBoth'
      });

      if (qrCode && qrCode.data) {
        logger.info(`[slipParser] QR detected on pass ${pass + 1}`, { length: qrCode.data.length });
        const decoded = decodeThaiSlipPayload(qrCode.data);
        
        // Extract extra details via OCR (Amount, Date, Sender, Receiver Info)
        const ocrDetails = await extractDetailsFromSlip(imagePath);
        if (ocrDetails) {
          if (!decoded.amount && ocrDetails.amount) {
            decoded.amount = ocrDetails.amount;
          }
          decoded.ocrDateStr = ocrDetails.dateStr;
          decoded.sender = {
            name: ocrDetails.sender?.name || null,
            bank: ocrDetails.sender?.bank || null,
            account: ocrDetails.sender?.account || null
          };
          decoded.receiver = {
            name: ocrDetails.receiver?.name || null,
            bank: ocrDetails.receiver?.bank || null,
            account: ocrDetails.receiver?.account || null
          };
          logger.info('[slipParser] Details extracted from image via OCR', { 
            amount: decoded.amount, 
            date: decoded.ocrDateStr,
            sender: decoded.sender,
            receiver: decoded.receiver
          });
        }

        return {
          success: true,
          qrData: decoded,
          rawText: qrCode.data
        };
      }
    } catch (passErr) {
      logger.debug(`[slipParser] Pass ${pass + 1} processing failed`, { message: passErr.message });
    }
  }

  logger.warn('[slipParser] No QR Code found in image');
  return {
    success: false,
    message: 'ไม่พบ QR Code ในรูปภาพสลิป'
  };
}

