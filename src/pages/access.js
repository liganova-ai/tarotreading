import { useLanguage } from '@/context/Language';
import { useState } from 'react';
import { useRouter } from 'next/router';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import styles from '@/styles/access.module.css';

export default function AccessPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function unlock(event) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Please try again.'); return; }
      await router.push('/disclaimer');
    } catch { setError('Access verification is temporarily unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  return <WizardLayout back="/" action={<PageAction form="oracle-access" type="submit" disabled={!code.trim() || busy}>{t(busy ? 'Opening…' : 'Enter the oracle')}</PageAction>}>
    <h1 className={styles.title}>{t('A secret awaits')}</h1>
    <form id="oracle-access" className={styles.form} onSubmit={unlock}>
      <label className={styles.label} htmlFor="oracle-code">{t('Access code')}</label>
      <div className={styles.passwordField}>
        <input id="oracle-code" data-autofocus className={styles.input} style={{ fontSize: 'clamp(18px, 3vw, 26px)', paddingInline: '12px' }} type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={256} value={code} onChange={event => { setCode(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'access-error' : undefined} placeholder={t('Enter your access code')} required />
      </div>
      <p id="access-error" className={styles.error} role="status">{t(error)}</p>
    </form>
  </WizardLayout>;
}
