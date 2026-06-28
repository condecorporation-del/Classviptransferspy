import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface LuxurySpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Elegant gold-toned loading spinner for luxury UX.
 * Use instead of basic Loader2 for premium feel.
 */
export function LuxurySpinner({ size = 24, className }: LuxurySpinnerProps) {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-gold', className)}
      strokeWidth={2.5}
      aria-hidden
    />
  );
}
