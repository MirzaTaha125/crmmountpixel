// One-shot maintenance script: drop the old (non-partial) publicSlug_1 index
// on the invoices collection so Mongoose can recreate it with the correct
// partialFilterExpression on next startup.
//
// Run once:  node src/scripts/dropPublicSlugIndex.js
//
// Safe to re-run — if the index doesn't exist any more, it just logs and exits.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI not set in .env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const coll = mongoose.connection.db.collection('invoices');

  const indexes = await coll.indexes();
  const bad = indexes.find((i) => i.name === 'publicSlug_1');

  if (!bad) {
    console.log('No publicSlug_1 index found — nothing to drop.');
  } else {
    console.log('Found existing index:', bad);
    await coll.dropIndex('publicSlug_1');
    console.log('Dropped publicSlug_1. Mongoose will recreate it as a partial-unique index on next backend start.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
