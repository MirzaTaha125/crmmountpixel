import Inquiry from '../model/Inquiry.js';
import Brand from '../model/Brand.js';
import { emitNewInquiry } from '../socket.js';
import { normalizeHost } from '../utils/hostUtils.js';

export const submitPublicInquiry = async (req, res) => {
  try {
    const {
      name, email, phone, reason, message, source,
      brand, brandCode, publicCode,   // brandCode/publicCode → look up Brand
      businessName, serviceWebsite, serviceLogo, serviceSmm, serviceOther,
      sourceUrl: bodySourceUrl,       // full page URL, if the brand website sent it
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Name, email, and phone are required fields'
      });
    }

    // Ensure at least reason or message is provided
    if (!reason && !message) {
      return res.status(400).json({
        message: 'Validation error',
        error: 'Either reason or message must be provided'
      });
    }

    // Two ways the CRM figures out which brand this inquiry belongs to, in order:
    //   1. brandCode / publicCode in the body — explicit, matched against Brand.publicCode
    //   2. The request Origin — implicit, matched against Brand.officialWebsites
    //   3. Whatever raw `brand` string the caller passed (kept for back-compat)
    let resolvedBrand = brand?.trim() || '';

    const rawCode = (brandCode || publicCode || '').toString().trim();
    if (rawCode) {
      const brandDoc = await Brand.findOne({ publicCode: rawCode });
      if (brandDoc) resolvedBrand = brandDoc.name;
      // No match → fall through to origin / raw brand. We don't reject the
      // inquiry over a typo: losing a real lead is worse than mis-labeling one.
    }

    // Only auto-detect from Origin if the code didn't already give us an answer.
    if (!resolvedBrand) {
      const originHost = normalizeHost(req.headers.origin);
      if (originHost) {
        const brandDoc = await Brand.findOne({ officialWebsites: originHost });
        if (brandDoc) resolvedBrand = brandDoc.name;
      }
    }

    // Record the exact page the form was submitted from so the operator can
    // click through to it from the CRM. Preference order:
    //   1. sourceUrl explicitly sent in the body (e.g. window.location.href)
    //   2. Referer header (set by the browser to the page URL)
    //   3. Origin header (just the origin, no path — fallback)
    // We cap the length so pathological URLs can't bloat the record.
    const rawSourceUrl = String(bodySourceUrl || req.headers.referer || req.headers.origin || '').trim();
    const resolvedSourceUrl = rawSourceUrl.length > 500 ? rawSourceUrl.slice(0, 500) : rawSourceUrl;

    // Prepare inquiry data
    const inquiryData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      reason: reason?.trim() || message?.trim() || '',
      message: message?.trim() || reason?.trim() || '',
      source: source || 'Public API',
      brand: resolvedBrand,
      businessName: businessName?.trim() || '',
      serviceWebsite: !!serviceWebsite,
      serviceLogo: !!serviceLogo,
      serviceSmm: !!serviceSmm,
      serviceOther: !!serviceOther,
      sourceUrl: resolvedSourceUrl,
      createdBy: null, // Public submissions have no creator
      createdByName: 'Public Submission',
      createdByRole: 'Guest'
    };

    const inquiry = await Inquiry.create(inquiryData);

    // Notify all connected staff in real time (sound + toast on the admin panel).
    emitNewInquiry(inquiry);

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      inquiryId: inquiry._id
    });
  } catch (err) {
    console.error('Error in public inquiry submission:', err);

    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation error',
        error: validationErrors.join(', ')
      });
    }

    res.status(500).json({
      message: 'Error submitting inquiry',
      error: err.message || 'An unexpected error occurred'
    });
  }
};
