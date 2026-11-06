import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/context/Language';
import { LANGUAGES } from '@/lib/languages.mjs';
import styles from '@/styles/LanguageSelector.module.css';

const languages = Object.entries(LANGUAGES);
export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const options = useRef([]);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    options.current[languages.findIndex(([code]) => code === language)]?.focus();
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, language]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  function navigate(event, index) {
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % languages.length;
    if (event.key === 'ArrowUp') next = (index - 1 + languages.length) % languages.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = languages.length - 1;
    if (next !== undefined) { event.preventDefault(); options.current[next]?.focus(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') setOpen(false);
  }
  return <div ref={root} className={styles.selector} data-language-selector onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${t('Language')}: ${LANGUAGES[language]}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); }
      }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
      <span>{LANGUAGES[language]}</span>
      <svg className={styles.chevron} data-open={open} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>
    </button>
    {open && <div id={id} role="listbox" aria-label={t('Language')} className={styles.menu}>
      {languages.map(([code, name], index) => <button key={code} ref={element => { options.current[index] = element; }}
        type="button" role="option" aria-selected={language === code} tabIndex={-1} className={styles.option}
        onKeyDown={event => navigate(event, index)} onClick={() => { setLanguage(code); close(); }}>
        <span className={styles.mark} aria-hidden="true">{language === code ? '✧' : ''}</span>{name}
      </button>)}
    </div>}
  </div>;
}
