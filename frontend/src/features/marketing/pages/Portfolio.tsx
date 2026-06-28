import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bath,
  Bed,
  Check,
  Home,
  ImageOff,
  MapPin,
  Maximize2,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react';

import { SEO } from '@/features/marketing/components/SEO';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';
import { useLanguage } from '@/shared/providers/LanguageContext';

const fadeUp = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0 } };

interface Property {
  title: string;
  titleEs: string;
  location: string;
  description: string;
  descriptionEs: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  priceLabel?: string;
  priceLabelEs?: string;
  photos: string[];
  link?: string;
  badge?: string;
  badgeEs?: string;
}

const rentalProperties: Property[] = [
  {
    title: 'Villa Serena Luxury Retreat',
    titleEs: 'Villa Serena Retiro de Lujo',
    location: 'Cabo San Lucas, BCS',
    description:
      'Exclusive private villa with ocean views, private pool, fully equipped kitchen, and VIP concierge service. Perfect for families, romantic escapes, or corporate retreats.',
    descriptionEs:
      'Villa privada con vista al mar, alberca privada, cocina equipada y servicio concierge VIP. Ideal para familias, escapadas romanticas o retiros corporativos.',
    beds: 4,
    baths: 4,
    sqft: 4500,
    priceLabel: 'From $850 / night',
    priceLabelEs: 'Desde $850 / noche',
    photos: [],
    badge: 'Featured',
    badgeEs: 'Destacada',
  },
  {
    title: 'Ocean View Suite',
    titleEs: 'Suite con Vista al Mar',
    location: 'Corridor, Los Cabos',
    description:
      'Modern luxury suite inside a boutique resort with beach club, restaurant, and spa access. Designed for couples and small groups.',
    descriptionEs:
      'Suite de lujo dentro de un resort boutique con acceso a beach club, restaurante y spa. Pensada para parejas y grupos pequenos.',
    beds: 2,
    baths: 2,
    sqft: 1800,
    priceLabel: 'From $350 / night',
    priceLabelEs: 'Desde $350 / noche',
    photos: [],
  },
];

const saleProperties: Property[] = [
  {
    title: 'Beachfront Development Lot',
    titleEs: 'Lote Frente al Mar para Desarrollo',
    location: 'Pacific Side, Los Cabos',
    description:
      'Prime beachfront lot with permits for boutique hospitality or luxury residences. Ideal for investors seeking a strong long-term position in Los Cabos.',
    descriptionEs:
      'Lote frente al mar con permisos para hoteleria boutique o residencias de lujo. Ideal para inversionistas que buscan una posicion fuerte en Los Cabos.',
    sqft: 8000,
    priceLabel: '$2,200,000 USD',
    priceLabelEs: '$2,200,000 USD',
    photos: [],
    badge: 'High ROI',
    badgeEs: 'Alta Plusvalia',
  },
  {
    title: 'Corridor Luxury Condo',
    titleEs: 'Condo de Lujo en el Corredor',
    location: 'Tourist Corridor, Los Cabos',
    description:
      'Pre-construction condo positioned for lifestyle use or rental yield in one of the most requested areas of Los Cabos.',
    descriptionEs:
      'Condo en preventa ideal para uso personal o rendimiento de renta en una de las zonas mas buscadas de Los Cabos.',
    beds: 2,
    baths: 2,
    sqft: 1400,
    priceLabel: '$480,000 USD',
    priceLabelEs: '$480,000 USD',
    photos: [],
  },
];

const PropertyCard = ({ property, lang, kind }: { property: Property; lang: string; kind: 'rent' | 'sale' }) => {
  const isEs = lang === 'es';
  const title = isEs ? property.titleEs : property.title;
  const description = isEs ? property.descriptionEs : property.description;
  const priceLabel = isEs ? property.priceLabelEs : property.priceLabel;
  const badge = isEs ? property.badgeEs : property.badge;
  const hasPhotos = property.photos.length > 0;
  const [photoIdx, setPhotoIdx] = useState(0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-[1.8rem] border border-border bg-card shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {hasPhotos ? (
          <img src={property.photos[photoIdx]} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff size={28} className="opacity-35" />
            <span className="text-xs opacity-55">{isEs ? 'Fotos disponibles pronto' : 'Photos coming soon'}</span>
          </div>
        )}

        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-navy">
            {badge}
          </span>
        )}

        {hasPhotos && property.photos.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {property.photos.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPhotoIdx(index)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${index === photoIdx ? 'bg-gold' : 'bg-white/45'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-foreground">{title}</h3>
          {priceLabel && <span className="text-sm font-bold text-gold">{priceLabel}</span>}
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin size={12} className="text-gold" />
          <span>{property.location}</span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

        {(property.beds || property.baths || property.sqft) && (
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {property.beds && (
              <span className="flex items-center gap-1.5">
                <Bed size={12} className="text-gold" />
                {property.beds} {isEs ? 'Recamaras' : 'Beds'}
              </span>
            )}
            {property.baths && (
              <span className="flex items-center gap-1.5">
                <Bath size={12} className="text-gold" />
                {property.baths} {isEs ? 'Banos' : 'Baths'}
              </span>
            )}
            {property.sqft && (
              <span className="flex items-center gap-1.5">
                <Maximize2 size={12} className="text-gold" />
                {property.sqft.toLocaleString()} ft2
              </span>
            )}
          </div>
        )}

        <a
          href={`https://wa.me/5216241222174?text=${encodeURIComponent(
            isEs
              ? `Hola, quiero informacion sobre ${title}`
              : `Hello, I want information about ${title}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
        >
          {kind === 'rent' ? (isEs ? 'Preguntar por renta' : 'Ask about rental') : isEs ? 'Pedir detalles' : 'Request details'}
          <ArrowRight size={14} />
        </a>
      </div>
    </motion.article>
  );
};

const Portfolio = () => {
  const { lang } = useLanguage();
  const isEs = lang === 'es';

  const packageFeatures = useMemo(
    () =>
      isEs
        ? [
            'Villa o alojamiento segun tu estilo',
            'Transportacion privada coordinada para tu grupo',
            'Actividades incluidas y adaptadas a tu plan',
            'Precios con descuento por grupo',
            'Atencion personalizada por WhatsApp',
          ]
        : [
            'Villa or stay matched to your style',
            'Private transportation coordinated for your group',
            'Activities included around your plan',
            'Group discount pricing',
            'Personalized WhatsApp support',
          ],
    [isEs],
  );

  const packageCards = useMemo(
    () => [
      {
        icon: Home,
        title: isEs ? 'Villa ideal' : 'Ideal villa',
        body: isEs ? 'Buscamos la villa correcta para tu grupo, fechas y estilo de viaje.' : 'We match the right villa to your group, dates, and travel style.',
      },
      {
        icon: Users,
        title: isEs ? 'Todo coordinado' : 'Everything coordinated',
        body: isEs ? 'Incluimos transportacion privada y actividades dentro del mismo paquete.' : 'We include private transportation and activities inside the same package.',
      },
      {
        icon: Sparkles,
        title: isEs ? 'Hecho a tu medida' : 'Built around you',
        body: isEs ? 'No vendemos paquetes rigidos. Te lo personalizamos y mejoramos el precio por grupo.' : 'We do not sell rigid packages. We personalize everything and improve pricing for groups.',
      },
    ],
    [isEs],
  );

  return (
    <>
      <SEO
        title={isEs ? 'Portafolio Los Cabos - Paquetes, Villas y Propiedades' : 'Los Cabos Portfolio - Packages, Villas & Properties'}
        description={
          isEs
            ? 'Paquetes personalizados con villa, transportacion y actividades incluidas, propiedades en renta y propiedades en venta en Los Cabos.'
            : 'Custom all-inclusive packages with villa, transportation, and activities, plus rental properties and homes for sale in Los Cabos.'
        }
        canonical="https://www.classviptransfers.com/portfolio"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Class VIP Portfolio',
          description: 'Custom villa packages, rental properties, and properties for sale in Los Cabos.',
          url: 'https://www.classviptransfers.com/portfolio',
        }}
      />

      <div className="bg-background">
        <section className="navy-gradient relative overflow-hidden px-4 pb-20 pt-32">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute left-[-8%] top-12 h-64 w-64 rounded-full bg-gold/25 blur-3xl" />
            <div className="absolute bottom-[-8%] right-[-6%] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="container relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <motion.span
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="inline-flex rounded-full border border-gold/25 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-gold"
              >
                {isEs ? 'Luxury lifestyle planning' : 'Luxury lifestyle planning'}
              </motion.span>

              <motion.h1
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="font-display mt-6 max-w-3xl text-4xl font-bold text-off-white md:text-6xl"
              >
                {isEs ? 'Paquetes completos, villas y propiedades en un solo lugar.' : 'Custom packages, villas, and real estate in one place.'}
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: 0.08 }}
                className="mt-5 max-w-2xl text-lg leading-relaxed text-off-white/80"
              >
                {isEs
                  ? 'Creamos paquetes todo incluido con villa, transportacion y actividades para grupos, y tambien te ayudamos con propiedades en renta o en venta en Los Cabos.'
                  : 'We build all-inclusive group packages with villa, transportation, and activities, and we also help with rentals and homes for sale across Los Cabos.'}
              </motion.p>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: 0.14 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <a
                  href={`https://wa.me/5216241222174?text=${encodeURIComponent(
                    isEs
                      ? 'Hola, quiero armar un paquete personalizado con villa, transportacion y actividades.'
                      : 'Hello, I want a custom package with villa, transportation, and activities.',
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110 gold-glow"
                >
                  <MessageCircle size={16} /> {isEs ? 'Armar mi paquete por WhatsApp' : 'Build my package on WhatsApp'}
                </a>
                <a
                  href="#rentals"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-off-white/20 px-8 py-3.5 text-sm font-bold text-off-white transition-all hover:bg-white/5"
                >
                  {isEs ? 'Ver propiedades' : 'View properties'} <ArrowRight size={16} />
                </a>
              </motion.div>
            </div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.12 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:row-span-2">
                <img src={cloudinaryAssets.activities.camel} alt="Los Cabos package experience" className="h-full min-h-[420px] w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <img src={cloudinaryAssets.activities.horseback} alt="Luxury vacation in Los Cabos" className="h-52 w-full object-cover" />
              </div>
              <div className="glass-card rounded-[2rem] border border-gold/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Todo incluido' : 'All-inclusive'}
                </p>
                <div className="mt-4 space-y-3">
                  {packageFeatures.slice(0, 3).map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-off-white">
                      <Check size={15} className="mt-0.5 text-gold" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-off-white/70">
                  {isEs ? 'Nos escribes por WhatsApp, te lo personalizamos y te presentamos la mejor opcion para tu grupo.' : 'Message us on WhatsApp and we will personalize the best option for your group.'}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="section-light px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Paquetes personalizados' : 'Custom packages'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  {isEs ? 'Solo manejamos paquetes todo incluido y hechos a tu necesidad.' : 'We only offer all-inclusive packages built around your needs.'}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {isEs
                  ? 'No es un paquete generico. Ajustamos villa, transportacion, actividades y precio para que tu grupo tenga una propuesta real y bonita.'
                  : 'This is not a generic package. We tailor the villa, transportation, activities, and pricing so your group gets a polished real proposal.'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {packageCards.map(({ icon: Icon, title, body }, index) => (
                <motion.article
                  key={title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-[1.8rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/12 text-gold">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.article>
              ))}
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mt-10 rounded-[2rem] border border-gold/20 bg-navy px-8 py-8 text-off-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
            >
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                    {isEs ? 'Descuento por grupo' : 'Group discount pricing'}
                  </p>
                  <h3 className="font-display mt-3 text-3xl font-bold">
                    {isEs ? 'Tu paquete se cotiza bonito y personalizado por WhatsApp.' : 'Your package is quoted beautifully and personally on WhatsApp.'}
                  </h3>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {packageFeatures.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm text-off-white/80">
                        <Check size={15} className="text-gold" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <a
                  href={`https://wa.me/5216241222174?text=${encodeURIComponent(
                    isEs
                      ? 'Hola, quiero mi paquete todo incluido personalizado.'
                      : 'Hello, I want my personalized all-inclusive package.',
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110 gold-glow"
                >
                  <MessageCircle size={16} /> {isEs ? 'Contactar por WhatsApp' : 'Contact on WhatsApp'}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="rentals" className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Rental properties' : 'Rental properties'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  {isEs ? 'Propiedades en renta' : 'Properties for rent'}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {isEs
                  ? 'Aqui vamos a mostrar tus propiedades en renta para clientes que buscan estancia con nivel premium.'
                  : 'This section is ready for the rental properties you want to showcase to premium travelers.'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {rentalProperties.map((property) => (
                <PropertyCard key={property.title} property={property} lang={lang} kind="rent" />
              ))}
            </div>
          </div>
        </section>

        <section className="section-light px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Investment properties' : 'Investment properties'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  {isEs ? 'Propiedades en venta' : 'Properties for sale'}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                {isEs
                  ? 'Esta seccion queda lista para mostrar propiedades en venta con enfoque en inversion o estilo de vida en Los Cabos.'
                  : 'This section is ready for properties for sale, whether the buyer is focused on investment or lifestyle in Los Cabos.'}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {saleProperties.map((property) => (
                <PropertyCard key={property.title} property={property} lang={lang} kind="sale" />
              ))}
            </div>
          </div>
        </section>

        <section className="navy-gradient px-4 py-20">
          <div className="container mx-auto max-w-3xl text-center">
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="font-display text-3xl font-bold text-off-white md:text-5xl"
            >
              {isEs ? 'Te armamos el paquete completo segun tu grupo.' : 'We build the full package around your group.'}
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.08 }}
              className="mx-auto mt-4 max-w-2xl text-off-white/80"
            >
              {isEs
                ? 'Escribenos por WhatsApp y te preparamos una propuesta con villa, transportacion y actividades incluidas.'
                : 'Message us on WhatsApp and we will prepare a proposal with villa, transportation, and included activities.'}
            </motion.p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.14 }}
              className="mt-8"
            >
              <a
                href={`https://wa.me/5216241222174?text=${encodeURIComponent(
                  isEs
                    ? 'Hola, quiero una propuesta completa para mi grupo.'
                    : 'Hello, I want a full proposal for my group.',
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110 gold-glow"
              >
                <MessageCircle size={16} /> {isEs ? 'Hablar por WhatsApp' : 'Talk on WhatsApp'}
              </a>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Portfolio;
