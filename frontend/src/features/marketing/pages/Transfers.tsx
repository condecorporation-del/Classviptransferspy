import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  Plane,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

import { SEO } from '@/features/marketing/components/SEO';
import { ContactInfo } from '@/features/marketing/components/trust/ContactInfo';
import { TestimonialsCarousel } from '@/features/marketing/components/trust/TestimonialsCarousel';
import { TrustBadges } from '@/features/marketing/components/trust/TrustBadges';
import { useLanguage } from '@/shared/providers/LanguageContext';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

interface GalleryImage {
  src: string;
  alt: string;
}

const galleryImages: GalleryImage[] = [
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780035762/upscale-to-4k-resolution-professional-studio-quali_mh9tij.jpg',
    alt: 'Private transfer guests arriving in Los Cabos',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780035761/upscale-to-8k-resolution-enhance-to-professional-s_iuni7q.jpg',
    alt: 'Luxury private transportation in Los Cabos',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780035761/upscale-to-4k-resolution-professional-studio-quali_1_hpyisy.jpg',
    alt: 'Class VIP Transfers guest service moment',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780035761/thank-you-for-using-our_t4zxdc.jpg',
    alt: 'Thank you message from Class VIP Transfers',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780038776/Copilot_20260529_001219_nflanp.png',
    alt: 'Private transportation guest experience in Los Cabos',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780038767/Copilot_20260529_000330_eunhhm.png',
    alt: 'Premium Los Cabos transfer arrival moment',
  },
  {
    src: 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1780037525/Copilot_20260528_235108_qb5maf.png',
    alt: 'Luxury transfer service detail in Los Cabos',
  },
];

const Transfers = () => {
  const { lang } = useLanguage();
  const isEs = lang === 'es';
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const heroPrimaryImage = galleryImages[5];
  const heroSecondaryImage = galleryImages[2];

  const highlights = useMemo(
    () => [
      {
        icon: Plane,
        title: isEs ? 'Llegada sin estres' : 'Stress-free arrivals',
        body: isEs ? 'Seguimos tu vuelo y te recibimos a tiempo.' : 'We track your flight and meet you right on time.',
      },
      {
        icon: Users,
        title: isEs ? 'Ideal para parejas y grupos' : 'Great for couples and groups',
        body: isEs ? 'Reserva simple para 1 a 5 pasajeros o grupos de 6 en adelante.' : 'Simple booking for 1 to 5 guests or larger groups of 6 and up.',
      },
      {
        icon: Sparkles,
        title: isEs ? 'Comodidad VIP Transit' : 'VIP Transit comfort',
        body: isEs ? 'Espacio, clima y una experiencia privada de principio a fin.' : 'Space, comfort, and a private experience from start to finish.',
      },
    ],
    [isEs],
  );

  const included = useMemo(
    () =>
      isEs
        ? ['Monitoreo de vuelo', 'Chofer bilingue', 'Agua fria', 'Wi-Fi a bordo', 'Servicio puerta a puerta', 'Atencion por WhatsApp']
        : ['Flight tracking', 'Bilingual driver', 'Cold water', 'Onboard Wi-Fi', 'Door-to-door service', 'WhatsApp support'],
    [isEs],
  );

  const moments = useMemo(
    () => [
      isEs ? 'Recepcion puntual en aeropuerto' : 'On-time airport pickup',
      isEs ? 'Viaje privado y comodo' : 'Private and comfortable ride',
      isEs ? 'Ideal para familias y grupos' : 'Perfect for families and groups',
    ],
    [isEs],
  );

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Private Airport Transfer Los Cabos',
    provider: { '@type': 'LocalBusiness', name: 'Class VIP Transfers' },
    areaServed: { '@type': 'Place', name: 'Los Cabos, Baja California Sur, Mexico' },
    description:
      'Private airport transportation in Los Cabos with premium Transit comfort, flight tracking, bilingual drivers, and door-to-door service.',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.classviptransfers.com/' },
      { '@type': 'ListItem', position: 2, name: 'Airport Transfers', item: 'https://www.classviptransfers.com/transfers' },
    ],
  };

  return (
    <>
      <SEO
        title="Private Airport Transfers in Los Cabos · SJD Airport"
        description="Private airport transportation in Los Cabos with premium Transit comfort, flight tracking, bilingual drivers, and door-to-door service from SJD Airport to any hotel."
        keywords="SJD airport transfer, Los Cabos private transfer, Cabo airport transportation, private airport ride, VIP transit Los Cabos, Los Cabos chauffeur"
        canonical="https://www.classviptransfers.com/transfers"
        jsonLd={[serviceLd, breadcrumbLd]}
      />

      <div className="bg-background">
        <section className="navy-gradient relative overflow-hidden px-4 pb-20 pt-32">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-[-10%] top-20 h-64 w-64 rounded-full bg-gold/30 blur-3xl" />
            <div className="absolute bottom-0 right-[-5%] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="container relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <motion.span
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mb-5 inline-flex rounded-full border border-gold/25 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-gold"
              >
                {isEs ? 'Private airport service' : 'Private airport service'}
              </motion.span>
              <motion.h1
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="font-display mb-5 max-w-2xl text-4xl font-bold text-off-white md:text-6xl"
              >
                {isEs ? 'Transfers privados con estilo, espacio y llegada sin estres.' : 'Private airport rides with style, space, and smooth arrivals.'}
              </motion.h1>
              <motion.p
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: 0.08 }}
                className="max-w-2xl text-lg leading-relaxed text-off-white/80"
              >
                {isEs
                  ? 'Nos movemos con flotilla Transit premium para que tu grupo llegue comodo, puntual y con una experiencia mas elegante desde el aeropuerto.'
                  : 'Our premium Transit fleet keeps your group comfortable, on time, and taken care of from the moment you land.'}
              </motion.p>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: 0.14 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row"
              >
                <Link
                  to="/book"
                  className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110 gold-glow"
                >
                  {isEs ? 'Reservar transfer' : 'Book your transfer'} <ArrowRight size={16} />
                </Link>
                <a
                  href="https://wa.me/5216241222174?text=Hello%2C%20I%27d%20like%20to%20book%20a%20transfer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-off-white/20 px-8 py-3.5 text-sm font-bold text-off-white transition-all hover:bg-white/5"
                >
                  <MessageCircle size={16} /> {isEs ? 'Hablar por WhatsApp' : 'Chat on WhatsApp'}
                </a>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                transition={{ delay: 0.2 }}
                className="mt-10"
              >
                <TrustBadges compact dark />
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
                <img
                  src={heroPrimaryImage.src}
                  alt={heroPrimaryImage.alt}
                  className="h-full min-h-[420px] w-full object-cover object-center"
                />
              </div>
              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <img
                  src={heroSecondaryImage.src}
                  alt={heroSecondaryImage.alt}
                  className="h-52 w-full object-cover object-center"
                />
              </div>
              <div className="glass-card rounded-[2rem] border border-gold/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{isEs ? 'Experiencia' : 'Experience'}</p>
                <div className="mt-4 space-y-3">
                  {moments.map((moment) => (
                    <div key={moment} className="flex items-center gap-3 text-sm text-off-white">
                      <Star size={15} className="text-gold" />
                      <span>{moment}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-sm leading-relaxed text-off-white/70">
                  {isEs
                    ? 'Sin tabuladores complicados en la pagina: tu cotizacion se confirma facil durante la reserva.'
                    : 'No price table clutter here: your quote is confirmed clearly during booking.'}
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="section-light px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {highlights.map(({ icon: Icon, title, body }, index) => (
                <motion.div
                  key={title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  transition={{ delay: index * 0.08 }}
                  className="premium-card rounded-3xl border border-border bg-card p-7"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/12 text-gold">
                    <Icon size={22} />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Lo que recibes' : 'What you get'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  {isEs ? 'Todo lo importante, sin texto de mas.' : 'Everything you need, without the extra noise.'}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {isEs
                    ? 'La pagina ahora se enfoca en la experiencia: servicio privado, comodidad Transit, soporte rapido y una reserva simple para grupos pequenos o grandes.'
                    : 'This page now focuses on the experience: private service, Transit comfort, fast support, and a simple reservation flow for small or larger groups.'}
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: 0.08 }}
                className="grid gap-4 sm:grid-cols-2"
              >
                {included.map((item) => (
                  <div key={item} className="glass-card flex items-center gap-3 rounded-2xl border border-border p-4">
                    <Check size={18} className="text-gold" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section className="section-light px-4 py-16">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Galeria' : 'Gallery'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground md:text-4xl">
                  {isEs ? 'Momentos reales con nuestros clientes' : 'Real moments with our guests'}
                </h2>
              </div>
            </div>

            <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
              {galleryImages.map((image, index) => (
                <motion.button
                  key={image.alt}
                  type="button"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedImage(index)}
                  className="group relative block w-full break-inside-avoid overflow-hidden rounded-[1.75rem] border border-border bg-card text-left"
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="container mx-auto max-w-5xl">
            <div className="mb-10 grid gap-6 rounded-[2rem] border border-border bg-card p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                  {isEs ? 'Reserva con confianza' : 'Book with confidence'}
                </p>
                <h2 className="font-display mt-3 text-3xl font-bold text-foreground">
                  {isEs ? 'Servicio privado, seguro y facil de coordinar.' : 'Private, secure, and easy to coordinate.'}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {isEs
                    ? 'Confirmamos detalles por WhatsApp, cuidamos tus horarios y mantenemos la experiencia clara desde el primer mensaje hasta la llegada.'
                    : 'We confirm details on WhatsApp, protect your schedule, and keep the experience clear from the first message to arrival.'}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-gold/10 px-5 py-4 text-sm font-semibold text-foreground">
                <Shield size={18} className="text-gold" />
                <Clock3 size={18} className="text-gold" />
                <span>{isEs ? 'Atencion rapida y seguimiento real' : 'Fast support and real follow-through'}</span>
              </div>
            </div>

            <TestimonialsCarousel />
          </div>
        </section>

        <section className="section-light px-4 py-16">
          <div className="container mx-auto max-w-4xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <h2 className="font-display text-center text-3xl font-bold text-foreground md:text-4xl">
                {isEs ? 'Te ayudamos a coordinar tu llegada' : 'We make your arrival easy to coordinate'}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
                {isEs
                  ? 'Si tu cliente quiere rapidez, estilo y una llegada comoda, aqui esta el contacto directo del equipo.'
                  : 'If your guest wants speed, style, and a comfortable arrival, here is the direct line to our team.'}
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.08 }}
              className="mt-10"
            >
              <ContactInfo />
            </motion.div>
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
              {isEs ? 'Listo para reservar tu transfer?' : 'Ready to book your transfer?'}
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
                ? 'Cotiza facil segun tu zona y tamano de grupo. Nosotros nos encargamos del resto.'
                : 'Get a clear quote based on your zone and group size. We handle the rest.'}
            </motion.p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: 0.14 }}
              className="mt-8 flex flex-col justify-center gap-4 sm:flex-row"
            >
              <Link
                to="/book"
                className="gold-gradient inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110 gold-glow"
              >
                {isEs ? 'Ir a reservar' : 'Go to booking'} <ArrowRight size={16} />
              </Link>
              <a
                href="https://wa.me/5216241222174?text=Hello%2C%20I%27d%20like%20to%20book%20a%20transfer"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-off-white/20 px-8 py-3.5 text-sm font-bold text-off-white transition-all hover:bg-white/5"
              >
                <MessageCircle size={16} /> {isEs ? 'Escribir por WhatsApp' : 'Message us on WhatsApp'}
              </a>
            </motion.div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-5 top-5 rounded-full bg-white/12 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </button>
            <motion.img
              key={selectedImage}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              src={galleryImages[selectedImage].src}
              alt={galleryImages[selectedImage].alt}
              className="max-h-[88vh] max-w-full rounded-[1.75rem] object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Transfers;
