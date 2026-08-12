import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentHistory from '../model/PaymentHistory.js';
import Client from '../model/Client.js';

dotenv.config();

async function backfillPaymentBrand() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all payment records without a brand or with empty brand
    const payments = await PaymentHistory.find({
      $or: [
        { brand: { $exists: false } },
        { brand: '' },
        { brand: null }
      ]
    }).populate('clientId', 'brand');

    console.log(`Found ${payments.length} payment records to update`);

    let updated = 0;
    let skipped = 0;

    for (const payment of payments) {
      if (payment.clientId && payment.clientId.brand) {
        payment.brand = payment.clientId.brand;
        await payment.save();
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`Updated ${updated} payment records with brand information`);
    console.log(`Skipped ${skipped} payment records (no client or client has no brand)`);
    console.log('Backfill completed successfully');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error backfilling payment brand:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

backfillPaymentBrand();

