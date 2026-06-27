import styles from './ProposalSkeleton.module.css';

export function ProposalSkeleton() {
  return (
    <article className={styles.card} aria-hidden="true">
      <div className={styles.cardHeader}>
        <div className={`${styles.skeleton} ${styles.titleSkeleton}`} />
        <div className={`${styles.skeleton} ${styles.badgeSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.descSkeleton}`} />
      <div className={`${styles.skeleton} ${styles.metaSkeleton}`} />
      <div className={styles.progressTrack}>
        <div className={`${styles.skeleton} ${styles.progressSkeleton}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.countsSkeleton}`} />
    </article>
  );
}
