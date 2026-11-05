import BackControl from '@/components/BackControl';
import styles from '@/styles/Wizard.module.css';

export function PageAction({ children, ...props }) {
  return <footer className={styles.footer}><button className={styles.action} {...props}>{children}</button></footer>;
}

export default function WizardLayout({ back, children, action, className = '' }) {
  return (
    <div className={`${styles.page} ${className}`}>
      <header className={styles.header}>
        {back && <BackControl href={back} className={styles.back} />}
        <span className={styles.logo}>LIGAORACLE</span>
      </header>
      <div className={styles.content}>{children}</div>
      {action}
    </div>
  );
}
