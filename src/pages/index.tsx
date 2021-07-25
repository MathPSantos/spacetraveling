import { useState } from 'react';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const formattedPosts = postsPagination.results.map(item => ({
    ...item,
    first_publication_date: format(
      new Date(item.first_publication_date),
      "dd MMM' 'yyyy",
      {
        locale: ptBR,
      }
    ),
  }));

  const [posts, setPosts] = useState(formattedPosts);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleNextPage() {
    if (!nextPage) return;

    const response = await fetch(nextPage);

    const data = await response.json();

    const newPosts = data.results.map(post => ({
      uid: post.uid,
      first_publication_date: format(
        new Date(post.first_publication_date),
        "dd MMM' 'yyyy",
        {
          locale: ptBR,
        }
      ),
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    }));

    setPosts([...posts, ...newPosts]);

    setNextPage(data.next_page);
  }

  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>

      <div className={` ${commonStyles.maxWidth} ${styles.container}`}>
        <header className={styles.header}>
          <img src="assets/logo.svg" alt="logo" />
        </header>

        <main className={styles.content}>
          <div className={styles.posts}>
            {posts.map(item => (
              <Link key={item.uid} href={`post/${item.uid}`}>
                <a className={styles.post}>
                  <strong>{item.data.title}</strong>
                  <p>{item.data.subtitle}</p>
                  <div className={commonStyles.footerPostData}>
                    <time>
                      <FiCalendar />
                      {item.first_publication_date}
                    </time>
                    <span>
                      <FiUser />
                      {item.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            ))}
          </div>

          {nextPage && (
            <button
              type="button"
              className={styles.button}
              onClick={handleNextPage}
            >
              Carregar mais posts
            </button>
          )}
        </main>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const prismic = getPrismicClient();
  const response = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
    }
  );

  const posts = response.results.map(post => ({
    uid: post.uid,
    first_publication_date: post.first_publication_date,
    data: {
      title: post.data.title,
      subtitle: post.data.subtitle,
      author: post.data.author,
    },
  }));

  const postsPagination = {
    results: posts,
    next_page: response.next_page,
  };

  const props = {
    postsPagination,
  };

  return {
    props,
  };
};
