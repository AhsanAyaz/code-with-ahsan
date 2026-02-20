import Script from "next/script";

type AdsenseProps = {
  pId: string;
};

export default function GoogleAdsense({ pId }: AdsenseProps) {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
