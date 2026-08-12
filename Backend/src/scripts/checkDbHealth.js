// One-off maintenance / diagnostic script.
//
// Run on ANY environment (reads MONGO_URI from that environment's .env):
//   node src/scripts/checkDbHealth.js
//
// It:
//  1) Drops the known-stale `shortCode_1` unique index on `brands` (the one that made
//     brand creation fail with E11000). Safe — the current Brand model doesn't use it.
//  2) Lists indexes on `clients` so any OTHER stale/unique index is visible.
//  3) Reports the distinct `brand` strings used by clients vs the Brand records and the
//     existing clientId prefixes — so name/code mismatches (e.g. "Webdeveloper Inc" vs
//     "Webdevelopers Inc") are obvious.
// It never deletes data and never drops anything on `clients`.

import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI, { family: 4 });
  console.log('Connected to database:', mongoose.connection.name);
  const db = mongoose.connection.db;

  // 1) brands — drop the stale shortCode index that breaks brand creation.
  try {
    const brandIdx = await db.collection('brands').indexes();
    console.log('\nbrands indexes:', brandIdx.map((i) => i.name).join(', '));
    if (brandIdx.some((i) => i.name === 'shortCode_1')) {
      await db.collection('brands').dropIndex('shortCode_1');
      console.log('  -> DROPPED stale index "shortCode_1" on brands ✔');
    } else {
      console.log('  -> no stale shortCode_1 index (good)');
    }
  } catch (e) {
    console.error('brands index check failed:', e.message);
  }

  // 2) clients — just list indexes so a stale unique index is visible.
  try {
    const clientIdx = await db.collection('clients').indexes();
    console.log('\nclients indexes:', clientIdx.map((i) => `${i.name}${i.unique ? ' (UNIQUE)' : ''}`).join(', '));
  } catch (e) {
    console.error('clients index check failed:', e.message);
  }

  // 3) brand-name / clientId-prefix consistency.
  try {
    const distinct = await db.collection('clients').distinct('brand');
    console.log('\nDistinct "brand" values in clients:', JSON.stringify(distinct));

    const brands = await db.collection('brands').find({}, { projection: { name: 1, code: 1 } }).toArray();
    console.log('Brand records (name [code]):', brands.map((b) => `${b.name} [${b.code}]`).join('  |  ') || '(none)');

    const ids = await db.collection('clients')
      .find({ clientId: { $exists: true, $ne: null } }, { projection: { clientId: 1 } })
      .toArray();
    const prefixes = {};
    for (const c of ids) {
      const m = (c.clientId || '').match(/^[A-Za-z]+/);
      const p = m ? m[0] : '(none)';
      prefixes[p] = (prefixes[p] || 0) + 1;
    }
    console.log('Existing clientId prefixes:', JSON.stringify(prefixes));
  } catch (e) {
    console.error('brand consistency check failed:', e.message);
  }

  console.log('\n✔ Done.');
  console.log('Make sure each Brand record\'s NAME exactly matches the "brand" string in clients,');
  console.log('and its CODE matches the existing clientId prefix — e.g. "Webdevelopers Inc" [WDI].');
  process.exit(0);
}

main().catch((e) => {
  console.error('checkDbHealth error:', e);
  process.exit(1);
});
