import { Fragment, useMemo, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { Comments } from '../../components/Comments';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  preview: boolean;
  post: Post;
  nextPost: Post | null;
  prevPost: Post | null;
}

export default function Post({ post, preview, prevPost, nextPost }: PostProps) {
  const router = useRouter();

  const formatedPost = {
    ...post,
    first_publication_date: format(
      new Date(post.first_publication_date),
      "dd MMM' 'yyyy",
      {
        locale: ptBR,
      }
    ),
  };

  const [pagePost, setPagePost] = useState(formatedPost);

  const readingTime = useMemo(
    () =>
      post.data.content.reduce((acc, content) => {
        const textBody = RichText.asText(content.body);
        const split = textBody.split(' ');
        const number_words = split.length;

        const result = Math.ceil(number_words / 200);
        return acc + result;
      }, 0),
    []
  );

  const isEditedPost = useMemo(() => {
    if (router.isFallback) {
      return false;
    }

    return post.last_publication_date !== post.first_publication_date;
  }, [post, router.isFallback]);

  if (router.isFallback) {
    return (
      <p
        style={{
          position: 'absolute',
          top: '50%',
          bottom: '50%',
          left: '50%',
          right: '50%',
        }}
      >
        Carregando...
      </p>
    );
  }

  return (
    <>
      <Head>
        <title>{pagePost.data.title} | spacetraveling</title>
      </Head>

      <Header />
      <main>
        <img
          className={styles.heroImage}
          src={pagePost.data.banner.url}
          alt=""
        />

        <div className={`${commonStyles.maxWidth} ${styles.content}`}>
          <h1>{pagePost.data.title}</h1>
          <div className={commonStyles.footerPostData}>
            <time>
              <FiCalendar />
              {pagePost.first_publication_date}
            </time>
            <span>
              <FiUser />
              {pagePost.data.author}
            </span>

            <span>
              <FiClock />
              {readingTime} min
            </span>
          </div>

          {isEditedPost && (
            <div className={styles.postEdited}>
              <span>
                * editado em{' '}
                <time>
                  {format(new Date(post.last_publication_date), 'dd MMM yyyy', {
                    locale: ptBR,
                  })}
                </time>
                , às{' '}
                <time>
                  {format(
                    new Date(post.last_publication_date),
                    `${'HH'}:${'mm'}`,
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
              </span>
            </div>
          )}

          <div className={styles.postContent}>
            {pagePost.data.content.map(item => (
              <Fragment key={item.heading}>
                <h2>{item.heading}</h2>

                <div
                  className={styles.postBody}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(item.body),
                  }}
                />
              </Fragment>
            ))}
          </div>
          <footer className={styles.navigationController}>
            <div>
              {prevPost && (
                <Link href={`/post/${prevPost.uid}`}>
                  <a>
                    <h4>{prevPost.data.title}</h4>
                    <span>Post anterior</span>
                  </a>
                </Link>
              )}
            </div>
            <div>
              {nextPost && (
                <Link href={`/post/${nextPost.uid}`}>
                  <a>
                    <h4>{nextPost.data.title}</h4>
                    <span>Próximo post</span>
                  </a>
                </Link>
              )}
            </div>
          </footer>
          <Comments />
          {preview && (
            <aside className={commonStyles.exitPreviewButton}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      pageSize: 1,
    }
  );

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => ({
        heading: item.heading,
        body: [...item.body],
      })),
    },
  };

  const nextPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date]',
      after: response.id,
    }
  );

  const prevPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
      after: response.id,
    }
  );

  return {
    props: {
      post,
      preview,
      nextPost: nextPost.results[0] ?? null,
      prevPost: prevPost.results[0] ?? null,
    },
  };
};
