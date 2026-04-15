import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env');
  }
  const response = await axios.post(
    `${BASE_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  return response.data.access_token;
}

/**
 * Creates a PayPal invoice draft and sends it to the client.
 * Returns { invoiceId, invoiceUrl, status }
 */
export async function createAndSendPaypalInvoice(paymentLink) {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const businessName  = process.env.PAYPAL_BUSINESS_NAME  || paymentLink.brand || 'Our Company';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Build items list
  const items = [
    {
      name: paymentLink.packageName,
      description: paymentLink.packageDescription || '',
      quantity: '1',
      unit_amount: {
        currency_code: 'USD',
        value: parseFloat(paymentLink.packagePrice).toFixed(2)
      },
      unit_of_measure: 'QUANTITY'
    }
  ];
  if (paymentLink.additionalAmount && parseFloat(paymentLink.additionalAmount) > 0) {
    items.push({
      name: paymentLink.additionalDescription || 'Additional Charges',
      quantity: '1',
      unit_amount: {
        currency_code: 'USD',
        value: parseFloat(paymentLink.additionalAmount).toFixed(2)
      },
      unit_of_measure: 'QUANTITY'
    });
  }

  const invoiceBody = {
    detail: {
      invoice_date: today,
      currency_code: 'USD',
      note: `Thank you for your business with ${businessName}.`,
      terms_and_conditions: 'Payment is due upon receipt.',
    },
    invoicer: {
      name: { business_name: businessName },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { given_name: paymentLink.clientName },
          ...(paymentLink.clientEmail ? { email_address: paymentLink.clientEmail } : {})
        }
      }
    ],
    items,
  };

  // Step 1: Create draft
  const createRes = await axios.post(
    `${BASE_URL}/v2/invoicing/invoices`,
    invoiceBody,
    { headers }
  );

  const invoiceId  = createRes.data.id;
  const invoiceUrl = createRes.data.detail?.metadata?.recipient_view_url
    || `https://www.${PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/invoice/p/#${invoiceId}`;

  // Step 2: Send the invoice (PayPal emails the client)
  await axios.post(
    `${BASE_URL}/v2/invoicing/invoices/${invoiceId}/send`,
    { send_to_recipient: true, send_to_invoicer: false },
    { headers }
  );

  return { invoiceId, invoiceUrl, status: 'SENT' };
}

/**
 * Fetches the current status of a PayPal invoice.
 * Returns { status, invoiceUrl }
 */
export async function getPaypalInvoiceStatus(invoiceId) {
  const token = await getAccessToken();
  const res = await axios.get(
    `${BASE_URL}/v2/invoicing/invoices/${invoiceId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = res.data;
  const invoiceUrl = data.detail?.metadata?.recipient_view_url
    || `https://www.${PAYPAL_MODE === 'live' ? '' : 'sandbox.'}paypal.com/invoice/p/#${invoiceId}`;
  return {
    status: data.status,        // DRAFT | SENT | PAID | CANCELLED | REFUNDED | etc.
    invoiceUrl,
    paidAt: data.payments?.transactions?.[0]?.payment_date || null
  };
}

/**
 * Simple invoice creation — title + flat amount (used by new Invoice generator).
 * Returns { invoiceId, invoiceUrl, status }
 */
export async function createAndSendInvoice({ clientName, clientEmail, title, amount, description, brand }) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const businessName  = process.env.PAYPAL_BUSINESS_NAME  || brand || 'Our Company';
  const today = new Date().toISOString().split('T')[0];

  const invoiceBody = {
    detail: {
      invoice_date: today,
      currency_code: 'USD',
      note: `Thank you for your business with ${businessName}.`,
    },
    invoicer: {
      name: { business_name: businessName },
    },
    primary_recipients: [{
      billing_info: {
        name: { given_name: clientName },
        ...(clientEmail ? { email_address: clientEmail } : {})
      }
    }],
    items: [{
      name: title,
      ...(description ? { description } : {}),
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: parseFloat(amount).toFixed(2) },
      unit_of_measure: 'QUANTITY'
    }],
  };

  // Create draft
  let createRes;
  try {
    createRes = await axios.post(`${BASE_URL}/v2/invoicing/invoices`, invoiceBody, { headers });
  } catch (e) {
    console.error('PayPal create invoice failed:', JSON.stringify(e?.response?.data || e.message));
    throw e;
  }

  // Extract invoice ID — PayPal returns it at data.id OR in the href link
  let invoiceId = createRes.data?.id;
  if (!invoiceId && createRes.data?.href) {
    invoiceId = createRes.data.href.split('/').pop();
  }
  if (!invoiceId) {
    console.error('PayPal create response (no id found):', JSON.stringify(createRes.data));
    throw new Error('PayPal did not return an invoice ID');
  }
  console.log('PayPal invoice created, id:', invoiceId);

  // Build invoice URL without an extra GET call
  const invoiceUrl = PAYPAL_MODE === 'live'
    ? `https://www.paypal.com/invoice/p/#${invoiceId}`
    : `https://www.sandbox.paypal.com/invoice/p/#${invoiceId}`;

  // Send the invoice
  try {
    await axios.post(
      `${BASE_URL}/v2/invoicing/invoices/${invoiceId}/send`,
      { send_to_recipient: !!clientEmail, send_to_invoicer: false },
      { headers }
    );
  } catch (e) {
    console.error('PayPal send invoice failed:', JSON.stringify(e?.response?.data || e.message));
    // Invoice was created — return it even if send failed
    return { invoiceId, invoiceUrl, status: 'DRAFT' };
  }

  return { invoiceId, invoiceUrl, status: 'SENT' };
}

/**
 * Gets the actual PayPal fee and net amount for a paid invoice.
 * Returns { fee, netAmount } — both as numbers. Returns null if unavailable.
 */
export async function getPaypalInvoiceFee(invoiceId) {
  try {
    const token = await getAccessToken();
    const headers = { Authorization: `Bearer ${token}` };

    // Step 1: GET invoice to find the payment_id
    const invRes = await axios.get(`${BASE_URL}/v2/invoicing/invoices/${invoiceId}`, { headers });
    const transactions = invRes.data?.payments?.transactions;

    if (!transactions || transactions.length === 0) {
      console.log('[PayPal Fee] No transactions on invoice');
      return null;
    }

    const paymentId = transactions[0].payment_id;
    if (!paymentId) {
      console.log('[PayPal Fee] No payment_id found');
      return null;
    }

    console.log('[PayPal Fee] payment_id:', paymentId);

    // Step 2: GET sale details — returns transaction_fee directly, no special permissions needed
    try {
      const saleRes = await axios.get(`${BASE_URL}/v1/payments/sale/${paymentId}`, { headers });
      const sale = saleRes.data;
      console.log('[PayPal Fee] sale response:', JSON.stringify({ amount: sale.amount, transaction_fee: sale.transaction_fee, state: sale.state }));

      const fee       = Math.abs(parseFloat(sale.transaction_fee?.value || '0'));
      const grossAmount = parseFloat(sale.amount?.total || '0');
      const netAmount = grossAmount - fee;
      console.log('[PayPal Fee] fee:', fee, '| gross:', grossAmount, '| net:', netAmount);
      return { fee, netAmount };
    } catch (saleErr) {
      console.log('[PayPal Fee] Sale API failed:', saleErr?.response?.data?.name, '— trying capture API');

      // Step 3: fallback — try as capture ID (v2 orders)
      try {
        const captureRes = await axios.get(`${BASE_URL}/v2/payments/captures/${paymentId}`, { headers });
        const capture = captureRes.data;
        console.log('[PayPal Fee] capture response:', JSON.stringify({ amount: capture.amount, seller_receivable_breakdown: capture.seller_receivable_breakdown }));

        const breakdown = capture.seller_receivable_breakdown;
        const fee       = Math.abs(parseFloat(breakdown?.paypal_fee?.value || '0'));
        const netAmount = parseFloat(breakdown?.net_amount?.value || capture.amount?.value || '0');
        console.log('[PayPal Fee] fee:', fee, '| net:', netAmount);
        return { fee, netAmount };
      } catch (captureErr) {
        console.error('[PayPal Fee] Both APIs failed. Sale:', saleErr?.response?.data?.name, '| Capture:', captureErr?.response?.data?.name);
        return null;
      }
    }
  } catch (err) {
    console.error('[PayPal Fee] Error:', err?.response?.data || err.message);
    return null;
  }
}

/**
 * Cancels a PayPal invoice (when payment link is deleted).
 */
export async function cancelPaypalInvoice(invoiceId, reason = 'Invoice cancelled') {
  try {
    const token = await getAccessToken();
    await axios.post(
      `${BASE_URL}/v2/invoicing/invoices/${invoiceId}/cancel`,
      { subject: 'Invoice Cancelled', note: reason, send_to_recipient: false, send_to_invoicer: false },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Log but don't throw — deletion should still proceed
    console.error('Error cancelling PayPal invoice:', err?.response?.data || err.message);
  }
}
