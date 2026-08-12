import Stripe from 'stripe';

// Lazy singleton so a missing STRIPE_SECRET_KEY doesn't crash startup —
// we only fail when someone actually tries to charge.
let _stripe = null;
function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set. Add it to your .env to enable Stripe invoices.');
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// True if we're using a Stripe test/sandbox key (starts with sk_test_).
// Helpful for showing "test mode" hints in the CRM but never blocks anything.
export function isStripeTestMode() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_test_');
}

/**
 * Verify a webhook signature and parse the event.
 * Requires STRIPE_WEBHOOK_SECRET in .env (from the Stripe dashboard).
 * Throws on invalid signature.
 */
export function constructStripeEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set. Add it to your .env to accept Stripe webhooks.');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Create an invoice on Stripe for the given item and email it to the customer.
 * Mirrors createAndSendInvoice() from paypalService — always returns
 * { invoiceId, invoiceUrl, status } so the caller doesn't need to know
 * which provider it's talking to.
 *
 * Stripe status values are lowercase:
 *   draft | open | paid | uncollectible | void
 */
export async function createAndSendStripeInvoice({ clientName, clientEmail, title, amount, description, invoiceNumber }) {
  const stripe = getStripe();

  if (!clientEmail) {
    throw new Error('clientEmail is required to send a Stripe invoice');
  }

  // Step 1 — find-or-create a Customer keyed by email.
  // Stripe allows duplicate customers with the same email, so we search first
  // to keep the CRM's customer list tidy in the Stripe dashboard.
  let customerId;
  try {
    const search = await stripe.customers.search({
      query: `email:"${clientEmail.replace(/"/g, '\\"')}"`,
      limit: 1,
    });
    if (search.data.length > 0) {
      customerId = search.data[0].id;
    }
  } catch {
    // Search API isn't available on all keys — fall through to create.
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: clientEmail,
      name: clientName || undefined,
    });
    customerId = customer.id;
  }

  // Step 2 — draft the invoice FIRST (empty). We attach the line item to
  // this specific invoice next, otherwise a floating invoice item stays
  // orphaned and Stripe finalizes an empty $0 invoice (which it auto-marks
  // as PAID, since there's nothing to pay).
  const draftPayload = {
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 7,
    description: description || undefined,
  };
  // Use the CRM invoice number so both dashboards match. Stripe requires
  // this to be unique across the account, which our INV-<ts>-<rnd> already is.
  if (invoiceNumber) draftPayload.number = invoiceNumber;

  const draft = await stripe.invoices.create(draftPayload);

  // Step 3 — create the invoice item and attach it to *this* draft invoice.
  const amountCents = Math.round(parseFloat(amount) * 100);
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: draft.id,      // ← critical: pin item to this invoice
    amount: amountCents,
    currency: 'usd',
    description: title + (description ? ` — ${description}` : ''),
  });

  // Step 4 — finalize + send. finalizeInvoice makes it un-editable and
  // returns a hosted_invoice_url the client can pay from.
  const finalized = await stripe.invoices.finalizeInvoice(draft.id);
  try {
    await stripe.invoices.sendInvoice(finalized.id);
  } catch (e) {
    // Sending can fail (e.g. email bounces). The invoice still exists and
    // is payable from the hosted URL, so we don't abort here.
    console.error('Stripe sendInvoice failed:', e?.message);
  }

  return {
    invoiceId: finalized.id,
    invoiceUrl: finalized.hosted_invoice_url || null,
    status: finalized.status || 'open',
  };
}

/**
 * Fetch the current status + hosted URL for a Stripe invoice.
 * Returns { status, invoiceUrl, paidAt } to match getPaypalInvoiceStatus.
 */
export async function getStripeInvoiceStatus(invoiceId) {
  const stripe = getStripe();
  const inv = await stripe.invoices.retrieve(invoiceId);
  return {
    status: inv.status || 'draft',
    invoiceUrl: inv.hosted_invoice_url || null,
    paidAt: inv.status_transitions?.paid_at
      ? new Date(inv.status_transitions.paid_at * 1000)
      : null,
  };
}

/**
 * Void a Stripe invoice (used when the CRM invoice is deleted).
 * Only OPEN invoices can be voided; DRAFT invoices are deleted; PAID
 * ones must be refunded separately. This helper handles the first two.
 */
export async function cancelStripeInvoice(invoiceId) {
  const stripe = getStripe();
  try {
    const inv = await stripe.invoices.retrieve(invoiceId);
    if (inv.status === 'draft') {
      await stripe.invoices.del(invoiceId);
    } else if (inv.status === 'open') {
      await stripe.invoices.voidInvoice(invoiceId);
    }
    // paid / uncollectible / void → no-op
  } catch (e) {
    console.error('cancelStripeInvoice failed:', e?.message);
  }
}

/**
 * Gets the actual Stripe processing fee and net amount for a paid invoice.
 * Returns { fee, netAmount } — both as numbers. Returns null if unavailable
 * (e.g. invoice not yet paid, or no charge attached).
 */
export async function getStripeInvoiceFee(invoiceId) {
  const stripe = getStripe();
  try {
    const inv = await stripe.invoices.retrieve(invoiceId, {
      expand: ['charge.balance_transaction'],
    });
    const charge = inv.charge;
    if (!charge || typeof charge === 'string') return null;
    const bt = charge.balance_transaction;
    if (!bt || typeof bt === 'string') return null;

    // Stripe amounts are in the smallest currency unit (cents for USD).
    const fee = (bt.fee || 0) / 100;
    const netAmount = (bt.net || 0) / 100;
    return { fee, netAmount };
  } catch (e) {
    console.error('getStripeInvoiceFee failed:', e?.message);
    return null;
  }
}
