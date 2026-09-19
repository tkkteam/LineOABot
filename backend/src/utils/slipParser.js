import sharp from 'sharp';
import jsQR from 'jsqr';
import fs from 'fs';
import { logger } from './logger.js';

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
  // Thai Bank Slip standard uses Tag 00 (length 46 or similar) or Tag 51 for Transfer Sub-TLV
  const subTlvCandidates = [];

  // If Tag 00 is an array (multiple 00 tags) or has length > 2
  if (Array.isArray(rootTLV['00'])) {
    for (const val of rootTLV['00']) {
      if (val.length > 2) subTlvCandidates.push(val);
    }
  } else if (rootTLV['00'] && rootTLV['00'].length > 2) {
    subTlvCandidates.push(rootTLV['00']);
  }

  // Also check tags 51, 29, 30, 31, 91
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

  // If we couldn't parse structured EMVCo, but it's a valid QR string
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
