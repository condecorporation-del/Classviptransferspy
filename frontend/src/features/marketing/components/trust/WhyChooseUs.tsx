import { motion } from 'framer-motion';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { Award, DollarSign, Car, Shield } from 'lucide-react';

const ITEMS = [
  { key: 1, icon: Award },
  { key: 2, icon: DollarSign },
  { key: 3, icon: Car },
  { key: 4, icon: Shield },
] as const;

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function WhyChooseUs() {
  const { t } = useLanguage();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {ITEMS.map(({ key, icon: Icon }, i) => (
        <motion.div
          key={key}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ delay: i * 0.08 }}
          className="glass-card rounded-2xl p-6 border border-border hover:border-gold/30 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
            <Icon size={24} className="text-gold" />
          </div>
          <h3 className="font-display font-bold text-foreground mb-2">{t(`whyChoose.${key}.title`)}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{t(`whyChoose.${key}.desc`)}</p>
        </motion.div>
      ))}
    </div>
  );
}
