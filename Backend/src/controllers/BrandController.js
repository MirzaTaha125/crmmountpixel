import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Brand from '../model/Brand.js';
import { parseOfficialWebsites } from '../utils/hostUtils.js';

// Fixed set of payment methods a brand can accept via manual invoices.
const VALID_PAYMENT_METHODS = new Set(['Cheque', 'Wire', 'Online', 'Zelle', 'Taptap', 'Cashapp']);

// Coerce the paymentAccounts field into a validated array. The frontend posts
// this as either a JSON string (multipart forms) or an already-parsed array
// (JSON body). Bad entries are dropped silently rather than rejecting the whole
// brand save — losing one address book row is better than losing the update.
function parsePaymentAccounts(raw) {
  if (raw === undefined || raw === null || raw === '') return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const method = String(item.method || '').trim();
    if (!VALID_PAYMENT_METHODS.has(method)) continue;
    out.push({
      method,
      label: String(item.label || '').trim(),
      details: String(item.details || '').trim(),
    });
  }
  return out;
}

// Normalize a color input to a safe CSS color string. Accepts hex ("#6366f1"),
// rgb(), or a named color. Anything wild → return null (caller keeps existing).
function normalizeColor(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return '';
  // Very lax check — CSS accepts many formats and we don't need to validate on
  // the server since it's only echoed back to the UI. Just cap length.
  return s.slice(0, 40);
}

// Lazy import to avoid a circular dependency between server.js and this file.
// Any brand write should refresh the public CORS allowlist so the change is
// picked up on the next request (instead of after the 30-second cache expiry).
async function bustPublicOriginCache() {
  try {
    const { invalidatePublicOriginCache } = await import('../server.js');
    invalidatePublicOriginCache?.();
  } catch { /* server.js may not be fully loaded during startup — safe to ignore */ }
}

// A public code should be long + random enough that it can't be guessed by
// scanning. 24 URL-safe characters (~144 bits of entropy) is plenty.
const generatePublicCode = () => crypto.randomBytes(18).toString('base64url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build the public path stored for an uploaded logo file.
const logoPath = (file) => (file ? `/uploads/brands/${file.filename}` : '');

// Remove a previously-uploaded local logo from disk (best effort).
const removeLogoFile = (logo) => {
  if (logo && logo.startsWith('/uploads/brands/')) {
    fs.unlink(path.join(__dirname, '..', '..', logo), () => {});
  }
};

// Create a new brand. Logo (optional) arrives as multipart via multer (req.file).
export const createBrand = async (req, res) => {
  try {
    const {
      name, code, phone, email,
      publicCode: rawPublicCode, officialWebsites,
      mainColor, paymentAccounts,
    } = req.body;

    if (!name || !name.trim() || !code || !code.trim()) {
      return res.status(400).json({ message: 'Brand name and code are required' });
    }

    const existing = await Brand.findOne({ code: code.trim() });
    if (existing) {
      return res.status(409).json({ message: 'A brand with this code already exists' });
    }

    // Public code: use the one the admin provided, or auto-generate a random one.
    // Either way, make sure it's not already in use by another brand.
    let publicCode = rawPublicCode?.trim() || generatePublicCode();
    while (await Brand.findOne({ publicCode })) {
      publicCode = generatePublicCode();
    }

    const normalizedColor = normalizeColor(mainColor);
    const brand = await Brand.create({
      name: name.trim(),
      code: code.trim(),
      publicCode,
      officialWebsites: parseOfficialWebsites(officialWebsites),
      mainColor: normalizedColor || '#6366f1',
      paymentAccounts: parsePaymentAccounts(paymentAccounts),
      logo: logoPath(req.file),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      createdBy: req.user?._id || null,
    });

    bustPublicOriginCache();
    res.status(201).json({ message: 'Brand created successfully', brand });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ message: 'Error creating brand', error: error.message });
  }
};

// Rotate (regenerate) a brand's public code — useful if the previous one leaked.
// After rotation, any external website still using the old code stops linking.
export const rotatePublicCode = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    let publicCode = generatePublicCode();
    while (await Brand.findOne({ publicCode, _id: { $ne: brand._id } })) {
      publicCode = generatePublicCode();
    }
    brand.publicCode = publicCode;
    await brand.save();

    res.json({ message: 'Public code rotated', brand });
  } catch (error) {
    console.error('Error rotating public code:', error);
    res.status(500).json({ message: 'Error rotating public code', error: error.message });
  }
};

export const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find()
      .populate('createdBy', 'First_Name Last_Name Email email')
      .sort({ createdAt: -1 });
    res.json({ brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Error fetching brands', error: error.message });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });
    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ message: 'Error fetching brand', error: error.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const {
      name, code, phone, email, publicCode, officialWebsites,
      mainColor, paymentAccounts,
    } = req.body;

    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });

    if (officialWebsites !== undefined) {
      brand.officialWebsites = parseOfficialWebsites(officialWebsites);
    }

    if (mainColor !== undefined) {
      const normalized = normalizeColor(mainColor);
      if (normalized !== null) brand.mainColor = normalized || '#6366f1';
    }

    if (paymentAccounts !== undefined) {
      brand.paymentAccounts = parsePaymentAccounts(paymentAccounts);
    }

    if (code !== undefined && code.trim() && code.trim() !== brand.code) {
      const dup = await Brand.findOne({ code: code.trim(), _id: { $ne: brand._id } });
      if (dup) return res.status(409).json({ message: 'A brand with this code already exists' });
      brand.code = code.trim();
    }
    if (name !== undefined && name.trim()) brand.name = name.trim();
    if (phone !== undefined) brand.phone = phone?.trim() || '';
    if (email !== undefined) brand.email = email?.trim() || '';

    if (publicCode !== undefined) {
      const pc = publicCode?.trim() || '';
      if (pc && pc !== brand.publicCode) {
        const dup = await Brand.findOne({ publicCode: pc, _id: { $ne: brand._id } });
        if (dup) return res.status(409).json({ message: 'A brand with this public code already exists' });
        brand.publicCode = pc;
      } else if (!pc) {
        brand.publicCode = null;
      }
    }

    if (req.file) {
      removeLogoFile(brand.logo);
      brand.logo = logoPath(req.file);
    }

    await brand.save();
    bustPublicOriginCache();
    res.json({ message: 'Brand updated successfully', brand });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ message: 'Error updating brand', error: error.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });
    removeLogoFile(brand.logo);
    bustPublicOriginCache();
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ message: 'Error deleting brand', error: error.message });
  }
};
