import { useLanguage } from '@/context/Language';
import { useState } from 'react';
import { useRouter } from 'next/router';
import WizardLayout, { PageAction } from '@/components/WizardLayout';
import styles from '@/styles/access.module.css';
import GlassDot from '@/components/GlassDot';

export default function AccessPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function unlock(event) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Please try again.'); return; }
      await router.push('/disclaimer');
    } catch { setError('The connection slipped away. Please try again.'); }
    finally { setBusy(false); }
  }
  return <WizardLayout back="/" action={<PageAction form="oracle-access" type="submit" disabled={!password || busy}>{t(busy ? 'Opening…' : 'Enter the oracle')}</PageAction>}>
    <h1 className={styles.title}>{t("A secret awaits")}</h1>
    <form id="oracle-access" className={styles.form} onSubmit={unlock}>
      <label className={styles.label} htmlFor="oracle-password">{t("Your password")}</label>
      <div className={styles.passwordField}>
      <input id="oracle-password" className={`${styles.input} ${!passwordVisible && password ? styles.maskedInput : ''}`} type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" maxLength={256} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} aria-invalid={!!error} aria-describedby={error ? 'access-error' : undefined} placeholder={t("Enter the password")} required />
      {!passwordVisible && password && <div className={styles.passwordDots} aria-hidden="true">
        <div className={styles.dotTrack}>{Array.from(password).map((_, index) => <GlassDot key={index} filled index={index} />)}</div>
      </div>}
      <button className={styles.reveal} type="button" aria-label={t(passwordVisible ? 'Hide password' : 'Show password')} aria-controls="oracle-password" onClick={() => setPasswordVisible(visible => !visible)}>
        <svg viewBox="0 0 32 24" width="28" height="22" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          {passwordVisible ? <>
            <path d="M3 12Q16 25 29 12M7 15.3l-2 3M12.5 18l-.7 3M19.5 18l.7 3M25 15.3l2 3" />
          </> : <>
            <path d="M2 12Q16-3 30 12Q16 27 2 12Z" />
            <circle cx="16" cy="12" r="4.5" strokeOpacity=".65" />
            <path d="M16 8.5Q16.4 11.6 19.5 12Q16.4 12.4 16 15.5Q15.6 12.4 12.5 12Q15.6 11.6 16 8.5Z" fill="currentColor" stroke="none" />
          </>}
        </svg>
      </button>
      </div>
      <p id="access-error" className={styles.error} role="status">{t(error)}</p>
    </form>
  </WizardLayout>;
}
