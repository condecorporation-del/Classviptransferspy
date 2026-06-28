import { useLanguage } from '@/shared/providers/LanguageContext';
import { Phone, MessageCircle, Mail } from 'lucide-react';

const PHONE = '+52 624 122 2174';
const PHONE_RAW = '5216241222174';
const EMAIL = 'Armando@classviptransfers.com';

export function ContactInfo({ inline = false }: { inline?: boolean }) {
  const { t } = useLanguage();
  const whatsappMsg = encodeURIComponent(t('floatingWhatsApp.msg'));

  const links = [
    { href: `tel:${PHONE_RAW}`, icon: Phone, label: PHONE },
    { href: `https://wa.me/${PHONE_RAW}?text=${whatsappMsg}`, icon: MessageCircle, label: t('contact.whatsapp'), external: true },
    { href: `mailto:${EMAIL}`, icon: Mail, label: EMAIL },
  ];

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {links.map(({ href, icon: Icon, label, external }) => (
          <a
            key={label}
            href={href}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            className="flex items-center gap-2 text-gold hover:text-gold-dark font-medium transition-colors"
          >
            <Icon size={16} className="flex-shrink-0" />
            {label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
      {links.map(({ href, icon: Icon, label, external }) => (
        <a
          key={label}
          href={href}
          {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 hover:border-gold/40 hover:bg-gold/5 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-gold" />
          </div>
          <span className="font-semibold text-foreground">{label}</span>
        </a>
      ))}
    </div>
  );
}
