import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

/** Fake testimonials - structure ready for API replacement later */
const TESTIMONIAL_IDS = [1, 2, 3] as const;

export function TestimonialsCarousel() {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % TESTIMONIAL_IDS.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          {TESTIMONIAL_IDS.map((id, idx) =>
            idx === active ? (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-card rounded-2xl p-8 md:p-10 border border-gold/20"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={18} className="fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
                  "{t(`testimonial.${id}.text`)}"
                </blockquote>
                <p className="text-sm text-muted-foreground font-medium">
                  — {t(`testimonial.${id}.location`)}
                </p>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          onClick={() => setActive((a) => (a - 1 + TESTIMONIAL_IDS.length) % TESTIMONIAL_IDS.length)}
          className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2">
          {TESTIMONIAL_IDS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === active ? 'bg-gold' : 'bg-gold/30 hover:bg-gold/50'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActive((a) => (a + 1) % TESTIMONIAL_IDS.length)}
          className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
