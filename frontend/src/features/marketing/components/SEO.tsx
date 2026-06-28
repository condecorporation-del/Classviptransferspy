import { Helmet } from 'react-helmet-async';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';

type SEOProps = {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  canonical?: string;
};

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://www.classviptransfers.com';
};

export const SEO = ({ title, description, keywords, image, url, jsonLd, canonical }: SEOProps) => {
  const baseUrl = getBaseUrl();
  const fullTitle = title.includes('|') ? title : `${title} | Class VIP Transfers`;
  const fullDescription = description ?? 'Premium luxury transportation and adventure experiences in Los Cabos, Mexico.';
  const fullImage = image?.startsWith('http') ? image : (image ? `${baseUrl}${image}` : cloudinaryAssets.logo);
  const fullUrl = url ?? (typeof window !== 'undefined' ? window.location.href : baseUrl);
  const canonicalUrl = canonical ?? fullUrl;

  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="es_MX" />
      <meta property="og:site_name" content="Class VIP Transfers" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
};
