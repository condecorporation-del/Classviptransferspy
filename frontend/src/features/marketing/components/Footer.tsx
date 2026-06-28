import { Link } from 'react-router-dom';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { Phone, Mail, MapPin, ArrowRight, Star } from 'lucide-react';

const Footer = () => {
  const { t, lang } = useLanguage();

  return (
    <footer className="navy-gradient text-off-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div>
            <img
              src={cloudinaryAssets.logo}
              alt="Class VIP Transfers"
              className="mb-4 h-16 drop-shadow-[0_4px_16px_rgba(212,175,55,0.45)]"
            />
            <p className="text-sm leading-relaxed text-off-white/60">
              {lang === 'es'
                ? 'Transportación premium y experiencias en Los Cabos, México. Más de 30 años de excelencia.'
                : 'Premium transportation and experiences in Los Cabos, Mexico. Over 30 years of excellence.'}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t('footer.quickLinks')}
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/" className="text-sm text-off-white/60 transition-colors hover:text-off-white">{t('nav.home')}</Link>
              <Link to="/transfers" className="text-sm text-off-white/60 transition-colors hover:text-off-white">{t('nav.transfers')}</Link>
              <Link to="/activities" className="text-sm text-off-white/60 transition-colors hover:text-off-white">{t('nav.activities')}</Link>
              <Link to="/contact" className="text-sm text-off-white/60 transition-colors hover:text-off-white">{t('nav.contact')}</Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t('footer.contact')}
            </h4>
            <div className="flex flex-col gap-3">
              <a href="tel:+526241222174" className="flex items-center gap-2 text-sm text-off-white/60 transition-colors hover:text-off-white">
                <Phone size={14} className="text-gold" /> +52 624 122 2174
              </a>
              <a href="mailto:Armando@classviptransfers.com" className="flex items-center gap-2 text-sm text-off-white/60 transition-colors hover:text-off-white">
                <Mail size={14} className="text-gold" /> Armando@classviptransfers.com
              </a>
              <span className="flex items-center gap-2 text-sm text-off-white/60">
                <MapPin size={14} className="text-gold" /> {lang === 'es' ? 'Los Cabos, B.C.S., México' : 'Los Cabos, B.C.S., Mexico'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t('nav.bookNow')}
            </h4>
            <p className="mb-4 text-sm text-off-white/60">{t('cta.subtitle')}</p>
            <Link
              to="/book"
              className="gold-gradient gold-glow inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-secondary-foreground transition-all hover:brightness-110"
            >
              {t('nav.bookNow')} <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="section-divider mb-6 mt-12" />

        <div className="mb-6 flex flex-col items-center gap-4">
          <a
            href="https://www.tripadvisor.com.mx/Attraction_Review-g152515-d10486878-Reviews-Class_VIP_Transfers-Cabo_San_Lucas_Los_Cabos_Baja_California.html"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="See Class VIP Transfers on TripAdvisor"
            className="inline-flex items-center gap-2 text-sm font-semibold text-off-white/70 transition-colors hover:text-gold"
          >
            <Star className="h-5 w-5 shrink-0 fill-gold text-gold" aria-hidden />
            TripAdvisor
          </a>
          <div className="flex items-center gap-5">
            <a href="https://facebook.com/classviptransfers" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-off-white/40 transition-colors hover:text-off-white">
              <span className="text-off-white/40">FB</span>
            </a>
            <a href="https://instagram.com/classviptransfers" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-off-white/40 transition-colors hover:text-off-white">
              <span className="text-off-white/40">IG</span>
            </a>
            <a
              href="https://www.tripadvisor.com.mx/Attraction_Review-g152515-d10486878-Reviews-Class_VIP_Transfers-Cabo_San_Lucas_Los_Cabos_Baja_California.html"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TripAdvisor"
              className="text-off-white/40 transition-colors hover:text-gold"
            >
              <Star className="h-6 w-6" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-off-white/40">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span>© {new Date().getFullYear()} Class VIP Transfers. {t('footer.rights')}</span>
            <span className="text-off-white/20">•</span>
            <Link to="/terms" className="text-off-white/40 transition-colors hover:text-off-white/60">
              {lang === 'es' ? 'Términos y Condiciones' : 'Terms & Conditions'}
            </Link>
            <span className="text-off-white/20">•</span>
            <Link to="/privacy" className="text-off-white/40 transition-colors hover:text-off-white/60">
              {lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
