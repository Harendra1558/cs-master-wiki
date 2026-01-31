import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function PwaReloadPopup({ onReload }) {
    return (
        <div className={clsx(styles.popup)}>
            <div className={styles.content}>
                <p className={styles.message}>
                    ✨ New content is available!
                </p>
                <button
                    className={styles.button}
                    type="button"
                    onClick={onReload}
                >
                    Refresh
                </button>
            </div>
        </div>
    );
}
