"use client";

import Head from "next/head";
import { usePathname } from "next/navigation";
import siteMetadata from "@/data/siteMetadata";

interface CommonSEOProps {
  title: string;
  description: string;
  ogType: string;
  ogImage: string | { url: string }[];
  twImage: string;
}

const CommonSEO = ({
  title,
  description,
  ogType,
  ogImage,
  twImage,
}: CommonSEOProps) => {
  const pathname = usePathname();
  return (
    <Head>
      <title>{title}</title>
      <meta name="robots" content="follow, index" />
      <meta name="description" content={description} />
      <meta property="og:url" content={`${siteMetadata.siteUrl}${pathname}`} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteMetadata.title} />
      <meta property="og:description" content={description} />
      <meta property="og:title" content={title} />
      {Array.isArray(ogImage) ? (
        ogImage.map(({ url }) => (
          <meta property="og:image" content={url} key={url} />
        ))
      ) : (
        <meta property="og:image" content={ogImage} key={ogImage} />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteMetadata.twitter} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={twImage} />
    </Head>
  );
};

interface PageSEOProps {
  title: string;
  description: string;
  imageUrl?: string;
}

export const PageSEO = ({ title, description, imageUrl }: PageSEOProps) => {
  const ogImageUrl =
    imageUrl || siteMetadata.siteUrl + siteMetadata.socialBanner;
  const twImageUrl =
    imageUrl || siteMetadata.siteUrl + siteMetadata.socialBanner;
  return (
    <CommonSEO
      title={title}
      description={description}
      ogType="website"
      ogImage={ogImageUrl}
      twImage={twImageUrl}
    />
  );
};
