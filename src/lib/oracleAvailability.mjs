export const ORACLE_UNAVAILABLE = 'AI_UNAVAILABLE';
export const ORACLE_CREDITS_EXHAUSTED = 'AI_CREDITS_EXHAUSTED';

export function oracleFailureCode(error) {
  return [error?.code, error?.error?.code].includes('insufficient_quota')
    ? ORACLE_CREDITS_EXHAUSTED : ORACLE_UNAVAILABLE;
}

export function oracleAvailabilityMessage(code) {
  return code === ORACLE_CREDITS_EXHAUSTED
    ? 'Your three cards are drawn, but our oracle has run out of AI credits for now. Their message waits just beyond the veil. Take a quiet moment with your question and the symbols before you, and return soon when the oracle’s voice is restored and your reading can unfold.'
    : 'Your three cards are drawn, but our oracle’s AI energy has run dry for now. Their message waits just beyond the veil. Take a quiet moment with your question and the symbols before you, and return soon when the oracle’s voice is restored and your reading can unfold.';
}
