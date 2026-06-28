import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { ArrowRight, Star, ChevronDown, ChevronLeft, ChevronRight, Trophy, Plane, Sparkles, CheckCircle2 } from 'lucide-react';
import { SEO } from '@/features/marketing/components/SEO';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/ui/accordion';
import { cloudinaryAssets, activityCollagePresets } from '@/shared/lib/cloudinary-assets';

const heroImages = cloudinaryAssets.hero;

const heroTexts = [
  { titleKey: 'hero.title', subtitleKey: 'hero.subtitle' },
  { titleKey: 'hero.title2', subtitleKey: 'hero.subtitle2' },
  { titleKey: 'hero.title3', subtitleKey: 'hero.subtitle3' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const TRIPADVISOR_TESTIMONIAL_IDS = [1, 2, 3, 4, 5] as const;

const Index = () => {
  const { t } = useLanguage();
  const [currentImage, setCurrentImage] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage(prev => (prev + 1) % heroImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % TRIPADVISOR_TESTIMONIAL_IDS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { value: '30+', label: t('trust.years') },
    { value: '15K+', label: t('stats.trips') },
    { value: '4.9', label: t('stats.rating'), icon: <Star size={16} className="fill-gold text-gold" /> },
    { value: '24/7', label: t('trust.support') },
  ];

  const steps = [
    { num: '01', titleKey: 'howItWorks.step1.title', descKey: 'howItWorks.step1.desc', icon: <Plane size={24} /> },
    { num: '02', titleKey: 'howItWorks.step2.title', descKey: 'howItWorks.step2.desc', icon: <CheckCircle2 size={24} /> },
    { num: '03', titleKey: 'howItWorks.step3.title', descKey: 'howItWorks.step3.desc', icon: <Sparkles size={24} /> },
  ];

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Class VIP Transfers',
    description: 'Premium private airport transportation in Los Cabos with 30+ years of experience. Serving 250+ hotels from SJD Airport. TripAdvisor Certificate of Excellence.',
    url: 'https://www.classviptransfers.com',
    telephone: '+526241222174',
    email: 'Armando@classviptransfers.com',
    address: { '@type': 'PostalAddress', addressLocality: 'Los Cabos', addressRegion: 'Baja California Sur', addressCountry: 'MX' },
    geo: { '@type': 'GeoCoordinates', latitude: 22.8905, longitude: -109.9167 },
    priceRange: '$$$',
    image: cloudinaryAssets.logo,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      bestRating: '5',
      reviewCount: '100',
    },
    sameAs: [
      'https://wa.me/5216241222174',
      'https://www.tripadvisor.com.mx/Attraction_Review-g152515-d10486878-Reviews-Class_VIP_Transfers-Cabo_San_Lucas_Los_Cabos_Baja_California.html',
    ],
    openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '00:00', closes: '23:59' },
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How far in advance should I book a Los Cabos airport transfer?', acceptedAnswer: { '@type': 'Answer', text: 'We recommend booking at least 24 hours in advance to guarantee availability. However, we accept last-minute bookings subject to vehicle availability.' } },
      { '@type': 'Question', name: 'What is included in a private airport transfer in Los Cabos?', acceptedAnswer: { '@type': 'Answer', text: 'Private transfers include flight monitoring, cold beverages, bilingual driver, free Wi-Fi, and door-to-door service in a luxury SUV or Sprinter Van.' } },
      { '@type': 'Question', name: 'Can I cancel or modify my Los Cabos transfer booking?', acceptedAnswer: { '@type': 'Answer', text: 'Yes! Free cancellation more than 48 hours before your service for a full refund. Modifications can be made anytime via WhatsApp or email.' } },
      { '@type': 'Question', name: 'Do you provide child car seats for airport transfers?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, we provide complimentary child seats upon request. Please mention it when booking or contact us via WhatsApp.' } },
    ],
  };

  return (
    <div className="overflow-hidden">
      <SEO
        title="Los Cabos Airport Transfer | Luxury Transportation - 30 Years Experience"
        description="Premium private transportation from Los Cabos Airport (SJD) to any hotel. 30 years of experience. TripAdvisor Certificate of Excellence. Book direct - best rates guaranteed."
        keywords="cabo airport transfer, sjd airport transportation, cabo san lucas transfer, private transportation los cabos, Class VIP Transfers, luxury transfer cabo, cabo adventure tours"
        canonical="https://www.classviptransfers.com/"
        jsonLd={[localBusinessLd, faqLd]}
      />
      {/* ===== HERO (dark cinematic) ===== */}
      <section className="relative h-screen min-h-[700px] overflow-hidden">
        {/* All images stacked — crossfade via opacity, no unmounting = no gray flash */}
        {heroImages.map((img, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: currentImage === i ? 1 : 0,
              scale: currentImage === i ? 1.05 : 1.12,
            }}
            transition={{ opacity: { duration: 1.2, ease: 'easeInOut' }, scale: { duration: 8, ease: 'linear' } }}
            className="absolute inset-0"
          >
            <img
              src={img}
              alt={`Los Cabos luxury ${i + 1}`}
              className="w-full h-full object-cover"
              {...(i === 0
                ? { fetchPriority: 'high' as const }
                : { loading: 'lazy' as const, decoding: 'async' as const })}
            />
          </motion.div>
        ))}

        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 vignette" />

        <div className="relative z-10 h-full flex flex-col items-center justify-start pt-20 md:justify-center md:pt-0 px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="h-px w-8 bg-gold/60" />
            <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase">{t('hero.eyebrow')}</span>
            <div className="h-px w-8 bg-gold/60" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentImage}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-6 max-w-5xl text-white text-luxury-shadow leading-[1.1]">
                {t(heroTexts[currentImage].titleKey)}
              </h1>
              <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light font-accent">
                {t(heroTexts[currentImage].subtitleKey)}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Link
              to="/book"
              className="gold-gradient text-secondary-foreground px-12 py-5 rounded-full font-bold text-lg md:text-xl hover:brightness-110 transition-all gold-glow inline-flex items-center gap-3 group shadow-2xl"
            >
              {t('hero.cta1')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImage(i)}
              className={`h-1.5 rounded-full transition-all duration-700 ${
                i === currentImage ? 'w-12 bg-gold' : 'w-4 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 z-10"
        >
          <ChevronDown size={28} />
        </motion.div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative -mt-16 z-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="container mx-auto max-w-5xl"
        >
          <div className="glass-card rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 gradient-border">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="font-display text-3xl md:text-4xl font-bold text-gold">{stat.value}</span>
                  {stat.icon}
                </div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== COMPANY STORY ===== */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 gap-14 items-center"
          >
            {/* Text */}
            <motion.div variants={fadeUp}>
              <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase mb-4 block">
                {t('home.story.eyebrow')}
              </span>
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 text-foreground leading-tight whitespace-pre-line">
                {t('home.story.title')}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-10 font-light">
                {t('home.story.text')}
              </p>
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border">
                {[
                  { value: '30+', label: t('home.story.stat1Label') },
                  { value: t('home.story.stat2Label'), label: '' },
                  { value: 'VIP', label: t('home.story.stat3Label') },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="font-display text-2xl md:text-3xl font-bold text-gold mb-1">{stat.value}</div>
                    {stat.label && <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quote card */}
            <motion.div variants={fadeUp}>
              <div className="glass-card rounded-3xl p-10 premium-card border-2 border-gold/20 text-center relative overflow-hidden">
                <div className="absolute inset-0 shimmer pointer-events-none" />
                <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-6">
                  <Trophy size={32} className="text-secondary-foreground" />
                </div>
                <blockquote className="text-foreground/80 italic text-lg leading-relaxed font-accent mb-6">
                  "{t('home.story.quote')}"
                </blockquote>
                <div className="text-gold font-semibold text-sm">— Armando Álvarez H.</div>
                <div className="text-muted-foreground text-xs mt-1">{t('home.story.founderTitle')}</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== ACTIVITIES (dark bg — solid navy gradient) ===== */}
      <section className="py-0 relative overflow-hidden navy-gradient">

        <div className="relative z-10 py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
              <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase mb-3 block">{t('home.activities.eyebrow')}</span>
              <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-5 text-off-white">{t('home.activities.title')}</h2>
              <p className="text-off-white/60 max-w-xl mx-auto text-lg font-light">{t('home.activities.subtitle')}</p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
              {/* Combo 2 — photo collage card */}
              {([
                {
                  collage: [...activityCollagePresets.combo2],
                  badge: null,
                  titleKey: 'home.activities.combo',
                  subtitleKey: 'home.activities.comboActivities',
                  priceKey: 'home.activities.comboPrice',
                  noteKey: 'home.activities.includesNote',
                  ctaKey: 'home.activities.bookCombo',
                  highlight: false,
                },
                {
                  collage: [...activityCollagePresets.combo3],
                  badge: 'home.activities.bestValue',
                  titleKey: 'home.activities.crazyCombo',
                  subtitleKey: 'home.activities.crazyActivities',
                  priceKey: 'home.activities.crazyPrice',
                  noteKey: 'home.activities.includesNote',
                  ctaKey: 'home.activities.bookCrazyCombo',
                  highlight: true,
                },
              ] as const).map((card, i) => (
                <motion.div key={i} variants={fadeUp} className={`rounded-3xl flex flex-col relative overflow-hidden ${card.highlight ? 'border-2 border-gold/50' : 'border border-white/10'}`}>
                  {card.highlight && <div className="absolute inset-0 shimmer pointer-events-none z-10" />}
                  {card.badge && (
                    <div className="absolute top-0 right-0 z-20 gold-gradient text-secondary-foreground text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                      {t(card.badge)}
                    </div>
                  )}
                  {/* 2×2 photo collage */}
                  <div className="relative h-44 grid grid-cols-2 grid-rows-2 shrink-0">
                    {card.collage.map((src, j) => (
                      <div key={j} className="overflow-hidden relative">
                        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                        {(j === 0 || j === 2) && <div className="absolute right-0 inset-y-0 w-px bg-black/40" />}
                        {(j === 0 || j === 1) && <div className="absolute bottom-0 inset-x-0 h-px bg-black/40" />}
                      </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                  </div>
                  {/* Card content */}
                  <div className="p-6 flex flex-col flex-1" style={{ background: card.highlight ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
                    <p className="font-display text-xl font-bold text-off-white mb-0.5">{t(card.titleKey)}</p>
                    <p className="text-off-white/50 text-sm mb-4">{t(card.subtitleKey)}</p>
                    <p className="text-gold text-4xl font-bold font-display mb-1">{t(card.priceKey)}</p>
                    <p className="text-off-white/40 text-xs mb-5">{t(card.noteKey)}</p>
                    <div className="mt-auto">
                      <Link to="/activities#combos" className="gold-gradient text-secondary-foreground px-7 py-3 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:brightness-110 transition-all gold-glow group w-full justify-center">
                        {t(card.ctaKey)} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
              <p className="text-off-white/30 text-sm mb-5">{t('home.activities.parkFeeNote')}</p>
              <Link
                to="/activities"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gold border border-gold/30 px-6 py-2.5 rounded-full hover:bg-gold/10 transition-all"
              >
                {t('home.activities.exploreAll')} <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase mb-3 block">Simple Process</span>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-5 text-foreground">{t('howItWorks.title')}</h2>
            <p className="text-muted-foreground text-lg font-light">{t('howItWorks.subtitle')}</p>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-gold/30 to-transparent" />
                )}
                <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-6 relative">
                  <span className="text-secondary-foreground">{step.icon}</span>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-background border-2 border-gold text-gold text-xs font-bold flex items-center justify-center">
                    {step.num}
                  </span>
                </div>
                <h4 className="font-display text-xl font-bold mb-3 text-foreground">{t(step.titleKey)}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(step.descKey)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== WHAT OUR GUESTS SAY (TripAdvisor-style carousel) ===== */}
      <section className="py-24 px-4 section-light">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <span className="font-accent text-gold text-xs tracking-[0.25em] uppercase mb-2 block">
              {t('testimonials.title')}
            </span>
            <p className="text-muted-foreground text-sm">
              {t('testimonials.subtitle')}
            </p>
          </motion.div>

          {/* Carousel track — slides horizontal */}
          <div className="relative overflow-hidden">
            <div
              className="flex"
              style={{
                transform: `translateX(-${testimonialIndex * 100}%)`,
                transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              {TRIPADVISOR_TESTIMONIAL_IDS.map((id) => (
                <div key={id} className="w-full shrink-0 px-2">
                  <div
                    className="rounded-xl border border-[#00AF87]/20 bg-white/60 backdrop-blur-sm p-8 shadow-sm"
                    style={{ boxShadow: '0 2px 12px rgba(0,175,135,0.08)' }}
                  >
                    {/* TripAdvisor-style green rating bubbles */}
                    <div className="flex justify-center gap-1.5 mb-6" aria-label="5 of 5 bubbles">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span
                          key={j}
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: '#00AF87' }}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <blockquote className="text-foreground/90 text-lg md:text-xl leading-relaxed font-light mb-5 text-center">
                      &ldquo;{t(`testimonial.${id}.text`)}&rdquo;
                    </blockquote>
                    <p className="text-muted-foreground text-sm text-center">
                      — {t(`testimonial.${id}.author`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Prev / Next arrows */}
            <button
              type="button"
              onClick={() => setTestimonialIndex((a) => (a - 1 + TRIPADVISOR_TESTIMONIAL_IDS.length) % TRIPADVISOR_TESTIMONIAL_IDS.length)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-12 h-12 rounded-full bg-white/90 shadow-md border border-[#00AF87]/20 flex items-center justify-center text-[#00AF87] hover:bg-[#00AF87] hover:text-white transition-all"
              aria-label={t('testimonials.prev')}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() => setTestimonialIndex((a) => (a + 1) % TRIPADVISOR_TESTIMONIAL_IDS.length)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-12 h-12 rounded-full bg-white/90 shadow-md border border-[#00AF87]/20 flex items-center justify-center text-[#00AF87] hover:bg-[#00AF87] hover:text-white transition-all"
              aria-label={t('testimonials.next')}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Pagination dots — TripAdvisor green when active */}
          <div className="flex items-center justify-center gap-2.5 mt-8">
            {TRIPADVISOR_TESTIMONIAL_IDS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTestimonialIndex(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === testimonialIndex
                    ? 'w-8 h-2.5'
                    : 'w-2.5 h-2.5 hover:opacity-80'
                }`}
                style={{
                  backgroundColor: i === testimonialIndex ? '#00AF87' : 'rgba(0,175,135,0.3)',
                }}
                aria-label={`${t('testimonials.title')} ${i + 1}`}
              />
            ))}
          </div>

          <a
            href="https://www.tripadvisor.com.mx/Attraction_Review-g152515-d10486878-Reviews-Class_VIP_Transfers-Cabo_San_Lucas_Los_Cabos_Baja_California.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-8 text-sm font-semibold transition-colors"
            style={{ color: '#00AF87' }}
          >
            {t('testimonials.tripAdvisorCta')}
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== FAQ ===== */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 text-foreground">{t('faq.title')}</h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl border border-border px-6 data-[state=open]:border-gold/30 transition-colors">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-5">
                  {t(`faq.${i}.q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-5 leading-relaxed">
                  {t(`faq.${i}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== CTA BANNER (dark) ===== */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="navy-gradient rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer pointer-events-none" />
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-off-white">{t('cta.title')}</h2>
            <p className="text-off-white/60 text-lg font-light max-w-lg mx-auto mb-8">{t('cta.subtitle')}</p>
            <div className="flex justify-center">
              <Link
                to="/book"
                className="gold-gradient text-secondary-foreground px-12 py-5 rounded-full font-bold text-lg md:text-xl hover:brightness-110 transition-all gold-glow flex items-center gap-3 group shadow-2xl"
              >
                {t('hero.cta1')} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;
