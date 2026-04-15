import crypto from 'crypto';
import AdminAsset from '../model/AdminAsset.js';

const ALGORITHM = 'aes-256-cbc';

function getKey() {
  const hex = process.env.ASSET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ASSET_ENCRYPTION_KEY must be a 64-character hex string in .env');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(stored) {
  try {
    const [ivHex, encHex] = stored.split(':');
    if (!ivHex || !encHex) return stored; // not encrypted (legacy)
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const encBuf = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString('utf8');
  } catch {
    return stored; // fallback: return as-is if decryption fails
  }
}

function decryptAsset(asset) {
  const obj = asset.toObject();
  obj.asstpassword = decrypt(obj.asstpassword);
  return obj;
}

// GET /api/admin-assets — admin only
export const getAdminAssets = async (req, res) => {
  try {
    if (!req.user || req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const assets = await AdminAsset.find().sort({ createdAt: -1 });
    res.json(assets.map(decryptAsset));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin-assets — admin only
export const createAdminAsset = async (req, res) => {
  try {
    if (!req.user || req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { name, assetId, asstpassword, hasCooldown, cooldownEnd } = req.body;
    if (!name || !assetId || !asstpassword) {
      return res.status(400).json({ message: 'name, assetId and asstpassword are required' });
    }
    const asset = await AdminAsset.create({
      name,
      assetId,
      asstpassword: encrypt(asstpassword),
      hasCooldown: !!hasCooldown,
      cooldownEnd: hasCooldown && cooldownEnd ? new Date(cooldownEnd) : null,
    });
    res.status(201).json(decryptAsset(asset));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin-assets/:id — admin only
export const deleteAdminAsset = async (req, res) => {
  try {
    if (!req.user || req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const asset = await AdminAsset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin-assets/:id — admin only
export const updateAdminAsset = async (req, res) => {
  try {
    if (!req.user || req.user.Role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { name, assetId, asstpassword, hasCooldown, cooldownEnd } = req.body;
    const asset = await AdminAsset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    if (name !== undefined) asset.name = name;
    if (assetId !== undefined) asset.assetId = assetId;
    if (asstpassword !== undefined) asset.asstpassword = encrypt(asstpassword);
    if (hasCooldown !== undefined) asset.hasCooldown = !!hasCooldown;
    if (cooldownEnd !== undefined) {
      asset.cooldownEnd = hasCooldown && cooldownEnd ? new Date(cooldownEnd) : null;
    }

    await asset.save();
    res.json(decryptAsset(asset));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
