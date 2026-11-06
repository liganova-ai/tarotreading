import { requireOracleAccess } from '@/lib/requireOracleAccess.mjs';
import { publicGateStatus } from '@/lib/gateClient.mjs';
export default async function handler(req, res) {
  if (!await requireOracleAccess(req, res)) return;
  return res.status(200).json(publicGateStatus(req.gateSummary));
}
export const config = { api: { bodyParser: { sizeLimit: '1kb' } } };
