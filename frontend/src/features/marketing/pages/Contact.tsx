import { motion } from 'framer-motion';
import { SEO } from '@/features/marketing/components/SEO';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { Phone, Mail, MapPin, Clock, MessageCircle, Star } from 'lucide-react';
import { useState } from 'react';


const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

const contactLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Class VIP Transfers',
  description: 'Private luxury airport transfers and adventure activities in Los Cabos, Mexico. 30+ years of service.',
  url: 'https://www.classviptransfers.com',
  telephone: '+526241222174',
  email: 'Armando@classviptransfers.com',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Los Cabos',
    addressRegion: 'Baja California Sur',
    addressCountry: 'MX',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 22.8905, longitude: -109.9167 },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
  sameAs: ['https://wa.me/5216241222174'],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+526241222174',
    contactType: 'customer service',
    availableLanguage: ['English', 'Spanish'],
  },
};

const contactBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.classviptransfers.com/' },
    { '@type': 'ListItem', position: 2, name: 'Contact', item: 'https://www.classviptransfers.com/contact' },
  ],
};

const Contact = () => {
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const PHONE_WA = '5216241222174';
  const PHONE_SMS = '+5262412222174';

  const buildMessage = () => [
    lang === 'es' ? `Hola, soy ${form.name}.` : `Hi, I'm ${form.name}.`,
    form.email ? `Email: ${form.email}` : '',
    form.message,
  ]
    .filter(Boolean)
    .join('\n');

  const openWhatsApp = () => {
    const msg = buildMessage();
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${PHONE_WA}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    setForm({ name: '', email: '', message: '' });
  };

  // Uses the `sms:` scheme so on iOS it opens Messages (iMessage).
  const openImessage = () => {
    const msg = buildMessage();
    const encoded = encodeURIComponent(msg);
    window.location.href = `sms:${PHONE_SMS}?&body=${encoded}`;
    setForm({ name: '', email: '', message: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // When user submits via Enter, default to WhatsApp (green button behavior)
    openWhatsApp();
  };

  return (
    <div>
      <SEO
        title="Contact Class VIP Transfers · Los Cabos 24/7"
        description="Contact Class VIP Transfers in Los Cabos. WhatsApp, iMessage or email. Available 24/7 for airport transfers and activity bookings."
        keywords="contact class vip transfers, los cabos transfer contact, cabo whatsapp transfer, cabo airport contact"
        canonical="https://www.classviptransfers.com/contact"
        jsonLd={[contactLd, contactBreadcrumbLd]}
      />
      {/* Hero - dark */}
      <section className="navy-gradient pt-36 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="font-display text-4xl md:text-6xl font-bold mb-4 text-off-white">
            {t('contact.title')}
          </motion.h1>
          <motion.p initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }} className="text-off-white/70 text-lg">
            {t('contact.subtitle')}
          </motion.p>
        </div>
      </section>

      <section className="py-20 px-4 -mt-8">
        <div className="container mx-auto max-w-4xl grid md:grid-cols-2 gap-10">
          {/* Form */}
          <motion.form initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-5">
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">{t('contact.name')}</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={t('contact.namePlaceholder')}
                className="input-luxury" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">{t('contact.email')}</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder={t('contact.emailPlaceholder')}
                className="input-luxury" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">{t('contact.message')}</label>
              <textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder={t('contact.messagePlaceholder')}
                className="input-luxury resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openImessage}
                className="bg-[#F6C445] text-navy px-6 py-3.5 rounded-full font-bold text-sm hover:brightness-110 transition-all w-full"
                aria-label="iMessage"
              >
                iMessage
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="bg-[#25D366] text-white px-6 py-3.5 rounded-full font-bold text-sm hover:bg-[#20bd5a] transition-colors w-full"
                aria-label="WhatsApp"
              >
                WhatsApp
              </button>
            </div>
          </motion.form>

          {/* Info */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.1 }} className="space-y-6">
            <h3 className="font-display text-2xl font-bold text-foreground">{t('contact.info.title')}</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sand-light border border-border flex items-center justify-center flex-shrink-0">
                  <Phone size={18} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t('contact.phone')}</p>
                  <a href="tel:+526241222174" className="text-muted-foreground text-sm hover:text-foreground transition-colors">+52 624 122 2174</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sand-light border border-border flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t('contact.emailLabel')}</p>
                  <a href="mailto:Armando@classviptransfers.com" className="text-muted-foreground text-sm hover:text-foreground transition-colors">Armando@classviptransfers.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sand-light border border-border flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t('contact.addressLabel')}</p>
                  <p className="text-muted-foreground text-sm">{t('contact.address')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sand-light border border-border flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{t('contact.hoursLabel')}</p>
                  <p className="text-muted-foreground text-sm">{t('contact.hours')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1">
              <a href="https://facebook.com/classviptransfers" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <span className="text-muted-foreground">FB</span>
              </a>
              <a href="https://instagram.com/classviptransfers" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <span className="text-muted-foreground">IG</span>
              </a>
              <a href="https://www.tripadvisor.com.mx/Attraction_Review-g152515-d10486878-Reviews-Class_VIP_Transfers-Cabo_San_Lucas_Los_Cabos_Baja_California.html"
                target="_blank" rel="noopener noreferrer" aria-label="TripAdvisor"
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-muted transition-colors">
                <Star size={18} />
              </a>
            </div>

            <a href="https://wa.me/5216241222174" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-[#25D366] text-white font-bold text-sm hover:bg-[#20bd5a] transition-colors">
              <MessageCircle size={20} /> {t('contact.whatsapp')}
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Contact;