import logoClassTio from '@/assets/logo-class-tio.webp';

/**
 * Asset URLs — logos/icons on Cloudinary, activity photos direct from Cactus Tours
 */
const T = 'q_auto:good,f_auto';
export const cloudinaryAssets = {
  logo: logoClassTio,
  favicon: `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175171/classvip/favicon.png`,
  icon192: `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175172/classvip/icon-192.png`,
  icon512: `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175173/classvip/icon-512.png`,
  appleTouchIcon: `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175173/classvip/apple-touch-icon.png`,
  // Hero: el transform q_auto:good,f_auto hace que Cloudinary sirva WebP/AVIF
  // comprimido en vez del JPG crudo. Es la imagen LCP (full-screen) — el mayor
  // factor de velocidad de la home en Core Web Vitals.
  hero: [`https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175174/classvip/hero-1.jpg`, `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175175/classvip/hero-2.jpg`, `https://res.cloudinary.com/dt9iyiorn/image/upload/${T}/v1774175178/classvip/hero-3.jpg`].filter(Boolean),
  activities: {
    atv: 'https://cactustours.com.mx/wp-content/uploads/2024/03/3_Beach-and-Dunes-ATV.webp',
    camel: 'https://cactustours.com.mx/wp-content/uploads/2024/03/Cactus-tours-camel-ride-miniatura.webp',
    horseback: 'https://cactustours.com.mx/wp-content/uploads/2025/01/357A7620.webp',
    skybikes: 'https://cactustours.com.mx/wp-content/uploads/2024/11/DJI_0065.webp',
    utv: 'https://cactustours.com.mx/wp-content/uploads/2024/08/2_Side-by-side-Adventure--scaled.webp',
    moto: 'https://cactustours.com.mx/wp-content/uploads/2024/03/3_Beach-and-Dunes-ATV.webp',
  },
} as const;

/** Homepage / booking activity collages */
export const activityCollagePresets = {
  combo2: [
    cloudinaryAssets.activities.atv,
    cloudinaryAssets.activities.camel,
    cloudinaryAssets.activities.horseback,
    cloudinaryAssets.activities.skybikes,
  ],
  combo3: [
    cloudinaryAssets.activities.utv,
    cloudinaryAssets.activities.atv,
    cloudinaryAssets.activities.camel,
    cloudinaryAssets.activities.skybikes,
  ],
  heroStrip: [
    cloudinaryAssets.activities.atv,
    cloudinaryAssets.activities.camel,
    cloudinaryAssets.activities.horseback,
    cloudinaryAssets.activities.skybikes,
    cloudinaryAssets.activities.utv,
  ],
} as const;
