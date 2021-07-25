import Image from 'next/image';
import Link from 'next/link';

import styles from './header.module.scss';

export default function Header() {
  return (
    <header className={styles.container}>
      <nav>
        <Link href="/">
          <a>
            <Image width={240} height={26} src="/assets/logo.svg" alt="logo" />
          </a>
        </Link>
      </nav>
    </header>
  );
}
