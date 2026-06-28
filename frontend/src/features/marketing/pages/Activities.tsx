import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { ArrowRight, Check, MessageCircle, ChevronDown, Shield, Users, MapPin, Clock } from 'lucide-react';
import { SEO } from '@/features/marketing/components/SEO';
import { cloudinaryAssets, activityCollagePresets } from '@/shared/lib/cloudinary-assets';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

// Activity cards — images hosted on Cloudinary (same assets as homepage / book)
const activities = [
  {
    emoji: '🏍️',
    titleKey: 'activity.atv',
    descKey: 'activity.atv.desc',
    image: cloudinaryAssets.activities.atv,
    tag: 'Adrenaline',
  },
  {
    emoji: '🐫',
    titleKey: 'activity.camel',
    descKey: 'activity.camel.desc',
    image: cloudinaryAssets.activities.camel,
    tag: 'Classic',
  },
  {
    emoji: '🐎',
    titleKey: 'activity.horseback',
    descKey: 'activity.horseback.desc',
    image: cloudinaryAssets.activities.horseback,
    tag: 'Scenic',
  },
  {
    emoji: '🚲',
    titleKey: 'activity.skyBikes',
    descKey: 'activity.skyBikes.desc',
    image: cloudinaryAssets.activities.skybikes,
    tag: '🏆 World Record',
  },
  {
    emoji: '🏎️',
    titleKey: 'activity.rzr',
    descKey: 'activity.rzr.desc',
    image: cloudinaryAssets.activities.utv,
    tag: 'Off-Road',
  },
];

const includes = [
  { icon: <MapPin size={16} />, key: 'activities.include.transport' },
  { icon: <Shield size={16} />, key: 'activities.include.safety' },
  { icon: <Users size={16} />, key: 'activities.include.guide' },
  { icon: <Check size={16} />, key: 'activities.include.water' },
  { icon: <Check size={16} />, key: 'activities.include.kidsClub' },
  { icon: <Check size={16} />, key: 'activities.include.tequila' },
  { icon: <Check size={16} />, key: 'activities.include.lockers' },
];

const combos = [
  {
    titleKey: 'activities.combo.2.title',
    descKey: 'activities.combo.2.desc',
    price: '$100',
    badge: null,
    highlight: false,
    collage: [...activityCollagePresets.combo2],
  },
  {
    titleKey: 'activities.combo.3.title',
    descKey: 'activities.combo.3.desc',
    price: '$125',
    badge: 'activities.combo.badge',
    highlight: true,
    collage: [...activityCollagePresets.combo3],
  },
];

const heroImages = [...activityCollagePresets.heroStrip];

const activitiesLd = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: 'Class VIP Transfers — Adventure Activities Los Cabos',
  description: 'ATV rides, camel safaris, horseback riding, Sky Bikes (Guinness World Record), and RZR off-road adventures in Los Cabos, Mexico. Round-trip transportation included.',
  url: 'https://classviptransfers.com/activities',
  touristType: ['Adventure', 'Family', 'Outdoor'],
  photo: cloudinaryAssets.activities.atv,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Los Cabos',
    addressRegion: 'Baja California Sur',
    addressCountry: 'MX',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Combo — 2 Activities',
      description: 'Choose 2 activities from ATV, camel, horseback, Sky Bikes or RZR. Round-trip transportation included.',
      priceCurrency: 'USD',
      price: '100',
      priceValidUntil: '2027-12-31',
    },
    {
      '@type': 'Offer',
      name: 'Crazy Combo — 3 Activities',
      description: 'Choose 3 activities. Round-trip transportation, bilingual guide, tequila tasting & kids club included.',
      priceCurrency: 'USD',
      price: '125',
      priceValidUntil: '2027-12-31',
    },
  ],
};

const Activities = () => {
  const { t } = useLanguage();
  const [currentHero, setCurrentHero] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHero(prev => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="overflow-hidden">
      <SEO
        title="Adventure Activities & Tours in Los Cabos"
        description="Book ATV, camel safari, horseback riding, Sky Bikes (Guinness Record) & RZR in Los Cabos. Combo deals from $100/person. Round-trip transport included."
        keywords="ATV tour los cabos, cabo activities, UTV cabo san lucas, horseback riding cabo, camel safari los cabos, sky bikes cabo, cabo adventure tours, things to do cabo san lucas, cactus tours los cabos"
        canonical="https://classviptransfers.com/activities"
        jsonLd={activitiesLd}
      />

      {/* ===== HERO ===== */}
      <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
        {/* Rotating hero images */}
        <AnimatePresence mode="sync">
          <motion.img
            key={currentHero}
            src={heroImages[currentHero]}
            alt="Adventure activities Los Cabos"
            className="absolute inset-0 w-full h-full object-cover scale-105"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            fetchPriority={currentHero === 0 ? 'high' : 'low'}
            loading={currentHero === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/40 to-navy/80" />
        <div className="absolute inset-0 vignette" />
        {/* Dot indicators */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentHero(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentHero ? 'bg-gold w-4' : 'bg-white/40'}`}
            />
          ))}
        </div>

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-5"
          >
            <div className="h-px w-8 bg-gold/60" />
            <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase">{t('activities.hero.eyebrow')}</span>
            <div className="h-px w-8 bg-gold/60" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-5 text-white text-luxury-shadow leading-[1.1] whitespace-pre-line"
          >
            {t('activities.hero.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light font-accent"
          >
            {t('activities.hero.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-4 items-center"
          >
            <a
              href="#combos"
              className="gold-gradient text-secondary-foreground px-10 py-4 rounded-full font-bold text-base hover:brightness-110 transition-all gold-glow flex items-center gap-2 group shadow-2xl"
            >
              {t('activities.hero.cta')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#activities"
              className="text-white/80 text-sm font-medium flex items-center gap-2 hover:text-white transition-colors"
            >
              <span>See all activities</span> <ChevronDown size={16} />
            </a>
          </motion.div>
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
      <section className="relative -mt-12 z-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-4xl"
        >
          <div className="glass-card rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 gradient-border text-center">
            {[
              { value: '6', label: 'Activities' },
              { value: '2', label: 'Combo options' },
              { value: '1hr', label: 'Per activity' },
              { value: '$100', label: 'Starting price' },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display text-2xl md:text-3xl font-bold text-gold mb-1">{s.value}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== ACTIVITIES GRID ===== */}
      <section id="activities" className="py-24 px-4 scroll-mt-32">
        <div className="container mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase mb-3 block">{t('activities.hero.eyebrow')}</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-foreground">{t('activities.what.title')}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-light">{t('activities.what.subtitle')}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {activities.map((act, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group glass-card rounded-2xl overflow-hidden premium-card border border-border hover:border-gold/30 transition-all"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={act.image}
                    alt={t(act.titleKey)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="gold-gradient text-secondary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {act.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold mb-2 text-foreground">{t(act.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{t(act.descKey)}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gold" />
                    <span className="text-xs text-muted-foreground">~2 hrs · transport &amp; guide included</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== COMBOS ===== */}
      <section id="combos" className="py-24 px-4 section-light scroll-mt-32">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="font-accent text-gold text-sm tracking-[0.3em] uppercase mb-3 block">{t('activities.combos.eyebrow')}</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 text-foreground">{t('activities.combos.title')}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto font-light">{t('activities.combos.subtitle')}</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 gap-6 mb-10"
          >
            {combos.map((combo, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`glass-card rounded-3xl premium-card flex flex-col relative overflow-hidden ${combo.highlight ? 'border-2 border-gold/40' : 'border border-border'}`}
              >
                {combo.highlight && <div className="absolute inset-0 shimmer pointer-events-none z-10" />}
                {combo.badge && (
                  <div className="absolute top-0 right-0 z-20 gold-gradient text-secondary-foreground text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">
                    {t(combo.badge)}
                  </div>
                )}

                {/* 2×2 photo collage */}
                <div className="relative h-48 grid grid-cols-2 grid-rows-2 shrink-0">
                  {combo.collage.map((src, j) => (
                    <div key={j} className="overflow-hidden relative">
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                      {(j === 0 || j === 2) && <div className="absolute right-0 inset-y-0 w-px bg-black/40" />}
                      {(j === 0 || j === 1) && <div className="absolute bottom-0 inset-x-0 h-px bg-black/40" />}
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-7 flex flex-col flex-1">
                  <h3 className="font-display text-2xl font-bold text-foreground mb-1">{t(combo.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm mb-5">{t(combo.descKey)}</p>

                  <div className="flex items-baseline gap-2 mb-5">
                    <span className="font-display text-4xl font-bold text-gold">{combo.price}</span>
                    <span className="text-muted-foreground text-sm">{t('activities.combo.perPerson')}</span>
                  </div>

                  <div className="space-y-2 mb-6">
                    {[
                      t('activities.include.transport'),
                      t('activities.include.guide'),
                      t('activities.include.tequila'),
                      t('activities.include.kidsClub'),
                    ].map((item, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-foreground/80">
                        <Check size={13} className="text-gold flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto">
                    <Link
                      to="/book-activities"
                      className="w-full gold-gradient text-secondary-foreground py-3.5 rounded-full text-sm font-bold inline-flex items-center justify-center gap-2 hover:brightness-110 transition-all gold-glow group"
                    >
                      {t('activities.combo.bookNow')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Park fee note */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="glass-card rounded-2xl p-5 border border-border"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: '🎟️', text: t('activities.policy.parkFee') },
                { icon: '🛡️', text: t('activities.policy.insurance') },
                { icon: '📷', text: t('activities.policy.camera') },
                { icon: '👶', text: t('activities.policy.kidsClub') },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-foreground/70">
                  <span className="text-base mt-0.5">{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="section-divider mx-auto max-w-3xl" />

      {/* ===== EVERYTHING INCLUDED ===== */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-foreground">{t('activities.includes.title')}</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {includes.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="glass-card rounded-2xl p-5 border border-border premium-card text-center"
              >
                <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center mx-auto mb-3 text-secondary-foreground">
                  {item.icon}
                </div>
                <p className="text-sm font-medium text-foreground">{t(item.key)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== YACHTS & MASSAGES WHATSAPP ===== */}
      <section className="py-10 px-4 pb-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="navy-gradient rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer pointer-events-none" />
            <div className="text-4xl mb-4">🛥️💆</div>
            <h3 className="font-display text-2xl md:text-3xl font-bold text-off-white mb-3">
              {t('activities.whatsapp.title')}
            </h3>
            <p className="text-off-white/60 mb-6 max-w-md mx-auto">
              {t('activities.whatsapp.desc')}
            </p>
            <a
              href="https://wa.me/5216241222174?text=Hola%2C%20me%20interesan%20yates%20privados%20o%20masajes%20a%20domicilio"
              target="_blank"
              rel="noopener noreferrer"
              className="gold-gradient text-secondary-foreground px-8 py-3.5 rounded-full text-sm font-bold inline-flex items-center gap-2 hover:brightness-110 transition-all gold-glow"
            >
              <MessageCircle size={16} /> {t('activities.contactWhatsApp')}
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Activities;
