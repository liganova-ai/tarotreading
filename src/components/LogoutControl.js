import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useLanguage } from '@/context/Language';
import { clearLegacyReadings, privateFlow } from '@/lib/privateFlow.mjs';
import styles from '@/styles/LogoutControl.module.css';
export default function LogoutControl() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState(null);
  const [now, setNow] = useState(Date.now());
  const router = useRouter();
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch('/api/access-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await response.json();
        if (!active) return;
        if (response.status === 401 || ['EXPIRED', 'REVOKED', 'INVALID_ACCESS'].includes(data.code)) { window.location.replace('/access'); return; }
        if (!response.ok) { setAccess(null); return; }
        setAccess(data);
      } catch { if (active) setAccess(null); }
    }
    refresh();
    const poll = setInterval(refresh, 60000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('oracle-usage-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(poll); clearInterval(tick); window.removeEventListener('oracle-usage-changed', refresh); window.removeEventListener('focus', refresh); };
  }, [router.pathname]);
  const seconds = access ? Math.max(0, Math.ceil((Date.parse(access.expiresAt) - now) / 1000)) : 0;
  const time = `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
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
  return <div className={styles.control}>{access && <div className={styles.allowance}><span>{t('{n} readings remaining', { n: access.remaining })}</span><span>{t('Access expires in {time}', { time })}</span></div>}<button type="button" onClick={logout} disabled={busy}>{t('Sign out')}</button>{error && <span role="alert">{error}</span>}</div>;
}
