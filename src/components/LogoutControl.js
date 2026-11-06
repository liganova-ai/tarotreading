import { useState } from 'react';
import { useLanguage } from '@/context/Language';
import { clearLegacyReadings, privateFlow } from '@/lib/privateFlow.mjs';
import styles from '@/styles/LogoutControl.module.css';
export default function LogoutControl() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error();
      privateFlow.clear();
      try { clearLegacyReadings(window.localStorage); clearLegacyReadings(window.sessionStorage); } catch {}
      window.location.replace('/access');
    } catch { setError(t('Please try again.')); setBusy(false); }
  }
  return <div className={styles.control}><button type="button" onClick={logout} disabled={busy}>{t('Sign out')}</button>{error && <span role="alert">{error}</span>}</div>;
}
