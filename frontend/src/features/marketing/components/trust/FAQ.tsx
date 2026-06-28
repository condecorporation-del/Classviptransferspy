import { useState } from 'react';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

const FAQ_ITEMS = [1, 2, 3, 4] as const;

export function FAQ() {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((id) => {
        const isOpen = openId === id;
        return (
          <div
            key={id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="font-semibold text-foreground">{t(`faq.${id}.q`)}</span>
              <ChevronDown
                size={20}
                className={cn('text-gold flex-shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 pt-0">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(`faq.${id}.a`)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
