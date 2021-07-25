import { Fragment, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
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

interface Post {
  first_publication_date: string | null;
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
  post: Post;
}

export default function Post({ post }: PostProps) {
  const route = useRouter();

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

  if (route.isFallback) {
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

  const readingTime = post.data.content.reduce((acc, content) => {
    const textBody = RichText.asText(content.body);
    const split = textBody.split(' ');
    const number_words = split.length;

    const result = Math.ceil(number_words / 200);
    return acc + result;
  }, 0);

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

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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

  return {
    props: {
      post,
    },
  };
};
