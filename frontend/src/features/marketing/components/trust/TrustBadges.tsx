import { useLanguage } from '@/shared/providers/LanguageContext';
import { Shield, FileCheck, Headphones } from 'lucide-react';

const BADGES = [
  { key: 'trust.licensed', icon: FileCheck },
  { key: 'trust.insured', icon: Shield },
  { key: 'trust.support', icon: Headphones },
] as const;

export function TrustBadges({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const { t } = useLanguage();
  const base = dark
    ? 'border-off-white/25 bg-off-white/10 text-off-white'
    : 'border-gold/20 bg-gold/5 text-foreground';
  const iconCls = dark ? 'text-gold' : 'text-gold';

  return (
    <div className={`flex flex-wrap justify-center gap-4 ${compact ? 'gap-3' : 'gap-6'}`}>
      {BADGES.map(({ key, icon: Icon }) => (
        <div
          key={key}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${base} ${
            compact ? 'px-3 py-2' : 'px-5 py-3'
          }`}
        >
          <Icon size={compact ? 18 : 22} className={`${iconCls} flex-shrink-0`} />
          <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
            {t(key)}
          </span>
        </div>
      ))}
    </div>
  );
}
