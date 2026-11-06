import { createHash, randomUUID } from 'node:crypto';
import { gateCall, GateError } from './gateClient.mjs';
import { privateStore } from './privateStore.mjs';

export const validProcessId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pending = () => new GateError('PROCESS_PENDING', 409, 'This reading is still processing. Please try again shortly.');
const conflict = () => new GateError('PROCESS_CONFLICT', 409, 'This reading attempt belongs to different input. Please start a new question.');
const ttl = session => Math.max(1, Math.ceil((Date.parse(session.gate.expiresAt) - Date.now()) / 1000));
const nameFor = (session, id) => `round:${session.gate.appId}:${session.gate.grantId}:${id}`;

// One Gate charge owns a bounded workflow. Durable write-once jobs prevent parallel
// requests, replay, navigation and uncertain network outcomes from executing AI twice.
export function createProcessService(store = privateStore, gate = gateCall) {
  async function load(session, id) {
    if (!validProcessId(id)) throw new GateError('PROCESS_REQUIRED', 400, 'Please confirm your question first.');
    const name = nameFor(session, id), round = await store.get(name);
    if (!round) throw new GateError('PROCESS_REQUIRED', 403, 'Please confirm your question first.');
    return { name, round };
  }
  return {
    async start(session, id, input) {
      if (!validProcessId(id)) throw new GateError('PROCESS_REQUIRED', 400, 'A reading attempt ID is required.');
      const name = nameFor(session, id), fingerprint = digest(input);
      const initial = { fingerprint, input, state: 'authorizing', requestId: randomUUID() };
      const owner = await store.put(name, initial, ttl(session), true);
      let round = owner ? initial : await store.get(name);
      if (!round || round.fingerprint !== fingerprint) throw conflict();
      if (owner) {
        try {
          const authorization = await gate('consume', { accessToken: session.gate.accessToken, requestId: round.requestId });
          if (authorization.grantId !== session.gate.grantId || authorization.appId !== session.gate.appId) throw new GateError();
          if (authorization.alreadyProcessed) throw new GateError('PROCESS_UNCERTAIN', 409, 'This reading attempt cannot be safely resumed. Please start a new question.');
          round = { ...round, state: 'authorized' };
          await store.put(name, round, ttl(session));
        } catch (error) {
          await store.put(name, { ...round, state: 'failed', error: { code: error.code || 'GATE_UNAVAILABLE', status: error.status || 503, message: error.message } }, ttl(session));
          throw error;
        }
      }
      if (round.state === 'authorizing') throw pending();
      if (round.state === 'failed') throw new GateError(round.error.code, round.error.status, round.error.message);
      return round;
    },
    async round(session, id) { return (await load(session, id)).round; },
    async job(session, id, jobName, input, perform) {
      const { name, round } = await load(session, id);
      if (round.state !== 'authorized') throw pending();
      const jobKey = `${name}:job:${jobName}`, fingerprint = digest(input);
      const owner = await store.put(jobKey, { fingerprint, state: 'pending' }, ttl(session), true);
      if (!owner) {
        const job = await store.get(jobKey);
        if (!job || job.fingerprint !== fingerprint) throw conflict();
        if (job.state === 'done') return job.result;
        if (job.state === 'failed') throw new GateError(job.error.code, job.error.status, job.error.message);
        throw pending();
      }
      try {
        // Revalidate revocation and expiry before each child operation. Remaining=0
        // still permits finishing the already-consumed reading, never a new question.
        const status = await gate('status', { accessToken: session.gate.accessToken });
        if (status.grantId !== session.gate.grantId || status.appId !== session.gate.appId) throw new GateError();
        const result = await perform(round);
        await store.put(jobKey, { fingerprint, state: 'done', result }, ttl(session));
        return result;
      } catch (error) {
        const failure = error instanceof GateError ? error : new GateError('AI_FAILED', 503, 'This reading attempt could not be completed. AI failures still count as a usage.');
        await store.put(jobKey, { fingerprint, state: 'failed', error: { code: failure.code, status: failure.status, message: failure.message } }, ttl(session));
        throw failure;
      }
    },
    async result(session, id, jobName) {
      const { name } = await load(session, id), job = await store.get(`${name}:job:${jobName}`);
      if (job?.state !== 'done') throw new GateError('PROCESS_REQUIRED', 403, 'Please finish the preceding reading step first.');
      return job.result;
    },
  };
}
export const readingProcesses = createProcessService();
