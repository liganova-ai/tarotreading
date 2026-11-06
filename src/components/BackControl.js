import { useLanguage } from '@/context/Language';
import Link from 'next/link';
import styles from '@/styles/BackControl.module.css';

export default function BackControl({ href, className = '', ...props }) {
  const { t } = useLanguage();
  const content = <svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="14" cy="14" r="12.5" strokeWidth=".8" /><path d="m15.5 9-5 5 5 5" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  const shared = { className: `${styles.control} ${className}`, 'aria-label': t('Go back'), ...props };
  return href ? <Link href={href} {...shared}>{content}</Link> : <button type="button" {...shared}>{content}</button>;
}
