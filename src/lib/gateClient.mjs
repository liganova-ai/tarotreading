export class GateError extends Error {
  constructor(code = 'GATE_UNAVAILABLE', status = 503, message = 'Access verification is temporarily unavailable. Please try again.') {
    super(message); this.code = code; this.status = status;
  }
}
const messages = {
  VALIDATION: 'Please enter your access code exactly as it was issued.',
  INVALID_ACCESS: 'This access code is invalid for Oracle.',
  EXPIRED: 'Your access has expired. Please enter a new code.',
  REVOKED: 'This access code has been revoked.',
  QUOTA_EXHAUSTED: 'You have used all your readings. Please enter a new code.',
  NOT_ACTIVE: 'This code is not active. Please contact the person who issued it.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
};
export async function gateCall(action, payload, transport = fetch) {
  const url = new URL(process.env.GATE_URL || 'https://credential-gate-jirby.vercel.app');
  if (!process.env.GATE_APP_KEY || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new GateError();
  let response, result;
  try {
    response = await transport(new URL(`/api/v1/${action}`, url), {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.GATE_APP_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    result = await response.json();
  } catch { throw new GateError(); }
  if (!response.ok) {
    const code = messages[result?.error] ? result.error : 'GATE_UNAVAILABLE';
    throw new GateError(code, code === 'GATE_UNAVAILABLE' ? 503 : response.status, messages[code]);
  }
  if (!result?.grantId || !result?.appId || !Number.isInteger(result.requestLimit) || !Number.isInteger(result.remaining)
    || !Number.isInteger(result.used) || result.used < 0 || result.remaining < 0 || result.requestLimit < 1
    || result.remaining + result.used !== result.requestLimit || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()
    || (action === 'activate' && typeof result.accessToken !== 'string')
    || (action === 'consume' && (result.requestId !== payload.requestId || typeof result.alreadyProcessed !== 'boolean'))) throw new GateError();
  return result;
}
export function publicGateStatus(value) {
  return Object.fromEntries(['requestLimit', 'used', 'remaining', 'activatedAt', 'expiresAt'].map(key => [key, value[key]]));
}
export function sendGateError(res, error) {
  if (!(error instanceof GateError)) return false;
  if (error.status === 429 || error.code === 'PROCESS_PENDING') res.setHeader('Retry-After', '2');
  res.status(error.status).json({ code: error.code, error: error.message }); return true;
}
