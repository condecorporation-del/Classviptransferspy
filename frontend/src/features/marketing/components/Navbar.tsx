import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { cloudinaryAssets } from '@/shared/lib/cloudinary-assets';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/transfers', label: t('nav.transfers') },
    { to: '/activities', label: t('nav.activities') },
    { to: '/portfolio', label: t('nav.portfolio') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Hero sections are dark → use light text; elsewhere use dark text on bright bg
  const isDarkHero = isHome && !scrolled;

  const navBg = isDarkHero
    ? 'bg-gradient-to-b from-navy/40 to-transparent'
    : 'bg-white/98 backdrop-blur-xl border-b border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]';

  const textColor = isDarkHero ? 'text-off-white' : 'text-foreground';
  const mutedText = isDarkHero ? 'text-off-white/75' : 'text-muted-foreground';
  const activeText = 'text-gold';
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 overflow-visible ${navBg}`}>
      <div className="container mx-auto px-4 h-16 md:h-[124px] flex items-center justify-between overflow-visible">
        <Link to="/" className="flex-shrink-0 overflow-visible flex items-center group ml-10 md:ml-12">
          <img
            src={cloudinaryAssets.logo}
            alt="Class VIP Transfers"
            className="h-16 md:h-[156px] w-auto object-contain md:translate-x-2 md:translate-y-2 drop-shadow-[0_6px_30px_rgba(212,175,55,0.7)] brightness-[1.16] transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-xs font-semibold uppercase tracking-[0.18em] transition-colors gold-underline ${
                isActive(link.to) ? activeText : `${mutedText} ${isDarkHero ? 'hover:text-off-white' : 'hover:text-foreground'}`
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex rounded-full overflow-hidden border ${isDarkHero ? 'border-off-white/20' : 'border-border'}`}>
            <motion.button
              onClick={() => setLang('en')}
              whileTap={{ scale: 0.95 }}
              className={`text-[10px] font-bold px-3 py-1.5 transition-all ${
                lang === 'en' ? 'gold-gradient text-secondary-foreground' : `${mutedText}`
              }`}
            >
              EN
            </motion.button>
            <motion.button
              onClick={() => setLang('es')}
              whileTap={{ scale: 0.95 }}
              className={`text-[10px] font-bold px-3 py-1.5 transition-all ${
                lang === 'es' ? 'gold-gradient text-secondary-foreground' : `${mutedText}`
              }`}
            >
              ES
            </motion.button>
          </div>

          <Link
            to="/book"
            className="hidden md:inline-flex gold-gradient text-secondary-foreground px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-105 transition-all shadow-sm items-center gap-2"
          >
            {t('nav.bookNow')}
          </Link>

          <button onClick={() => setOpen(!open)} className={`md:hidden ${textColor}`}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/40 bg-white overflow-hidden"
          >
            <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-6 py-5 flex flex-col gap-1">
              {links.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center text-sm font-semibold uppercase tracking-wider px-3 py-3.5 rounded-xl transition-colors ${
                    isActive(link.to)
                      ? 'text-gold bg-gold/10'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/book"
                onClick={() => setOpen(false)}
                className="gold-gradient text-secondary-foreground px-6 py-3.5 rounded-lg text-sm font-bold text-center mt-3 shadow-sm"
              >
                {t('nav.bookNow')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;