export type SocialReputationCard = {
  id: 'tripadvisor' | 'google' | 'facebook' | 'instagram';
  platform: string;
  handle: string;
  url: string;
  metricLabel: string;
  rating: number | null;
  reviews: number | null;
  note: string;
  accent: string;
};

// Keep this file as the single source of truth for reputation/social cards in admin.
// Update URLs and metrics here when the official platform pages are confirmed.
export const socialReputationCards: SocialReputationCard[] = [
  {
    id: 'tripadvisor',
    platform: 'Tripadvisor',
    handle: 'Class VIP Transfers',
    url: 'https://www.tripadvisor.com/',
    metricLabel: 'Calificacion publica',
    rating: null,
    reviews: null,
    note: 'Conecta la URL final del perfil y la calificacion confirmada.',
    accent: '#34d399',
  },
  {
    id: 'google',
    platform: 'Google',
    handle: 'Business Profile',
    url: 'https://www.google.com/search?q=Class+VIP+Transfers+Los+Cabos',
    metricLabel: 'Resenas visibles',
    rating: null,
    reviews: null,
    note: 'Usa la ficha oficial del negocio para reflejar la reputacion real.',
    accent: '#60a5fa',
  },
  {
    id: 'facebook',
    platform: 'Facebook',
    handle: 'Pagina oficial',
    url: 'https://www.facebook.com/',
    metricLabel: 'Recomendacion',
    rating: null,
    reviews: null,
    note: 'Completa el enlace y la calificacion de la pagina oficial.',
    accent: '#93c5fd',
  },
  {
    id: 'instagram',
    platform: 'Instagram',
    handle: '@classviptransfers',
    url: 'https://www.instagram.com/',
    metricLabel: 'Comunidad',
    rating: null,
    reviews: null,
    note: 'Instagram no usa estrellas; aqui conviene mostrar seguidores o engagement.',
    accent: '#f59e0b',
  },
];
