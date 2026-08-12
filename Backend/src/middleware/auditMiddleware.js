import mongoose from 'mongoose';
import { logActivity } from '../services/activityLogService.js';

// Maps HTTP method -> human verb used in the action key and description.
const METHOD_VERB = {
  POST: 'created',
  PUT: 'updated',
  PATCH: 'updated',
  DELETE: 'deleted',
};

// Best-effort label for whoever performed the action.
function actorLabel(req) {
  if (req.user) {
    const name = [req.user.First_Name, req.user.Last_Name].filter(Boolean).join(' ').trim();
    return name || req.user.Email || 'A user';
  }
  if (req.client) {
    return req.client.name || req.client.email || 'A client';
  }
  return 'Someone';
}

// Try to pull a human-friendly name out of a request/response payload for the description.
function pickName(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return (
    obj.Name || obj.name || obj.title || obj.Title ||
    obj.First_Name || obj.fullName ||
    obj.Email || obj.email || ''
  );
}

// Strip sensitive keys before storing the request body in the log details.
function redactBody(body) {
  if (!body || typeof body !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    if (/pass|password|token|secret|otp|cvv|card|cardnumber/i.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * Generic audit middleware factory. Apply on a mounted router (in server.js) to
 * automatically record every successful create/update/delete for that module,
 * attributed to the acting user (req.user) when known.
 *
 * Reads are never logged. Failed requests (non-2xx) are never logged. Logging is
 * fire-and-forget and wrapped so it can never break the response.
 *
 * @param {Object} opts
 * @param {string} opts.module     - Module label shown in the audit UI (e.g. 'Employees')
 * @param {string} opts.entityType - Entity name (e.g. 'Employee'); drives the action key
 */
export function auditLog({ module, entityType }) {
  const typeKey = entityType.toLowerCase();

  return async function auditLogMiddleware(req, res, next) {
    const verb = METHOD_VERB[req.method];
    if (!verb) return next(); // only audit mutations

    // For updates/deletes, snapshot the target document BEFORE the controller mutates
    // or removes it. Otherwise we can't say *what* was changed/deleted — a delete has
    // no req.body and usually returns only a success message, so the name is lost.
    let preName = '';
    if ((req.method === 'DELETE' || req.method === 'PUT' || req.method === 'PATCH') && req.params?.id) {
      try {
        const Model = mongoose.models[entityType];
        if (Model && mongoose.isValidObjectId(req.params.id)) {
          const doc = await Model.findById(req.params.id).lean();
          if (doc) preName = pickName(doc);
        }
      } catch {
        // ignore — auditing must never block or break the request
      }
    }

    // Capture the JSON the controller sends so we can extract the entity id/name.
    let responseBody;
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      // Only record successful operations.
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      try {
        const actorId = req.user?._id || null;

        // The controller usually returns { message, <entity>: {...} } or the doc itself.
        const entityDoc =
          responseBody && typeof responseBody === 'object'
            ? (responseBody[typeKey] || responseBody.data || responseBody)
            : null;

        let entityId = req.params?.id || entityDoc?._id;
        if (entityId && !mongoose.isValidObjectId(entityId)) entityId = undefined;

        // Prefer the live name (create/update body or response); fall back to the
        // pre-mutation snapshot — that's what makes deletes say *which* record went.
        const name = pickName(req.body) || pickName(entityDoc) || preName;
        const description = `${actorLabel(req)} ${verb} ${typeKey}${name ? `: ${name}` : ''}`;

        // Fire-and-forget; logActivity has its own try/catch and never throws.
        logActivity({
          userId: actorId,
          action: `${typeKey}_${verb}`,
          entityType,
          entityId: entityId || undefined,
          description,
          details: {
            method: req.method,
            path: req.originalUrl,
            targetName: name || undefined,
            body: redactBody(req.body),
          },
          module,
          req,
        });
      } catch {
        // Auditing must never affect the actual request/response.
      }
    });

    next();
  };
}

export default auditLog;
