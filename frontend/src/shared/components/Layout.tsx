import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/shared/providers/LanguageContext';
import Navbar from '@/features/marketing/components/Navbar';
import Footer from '@/features/marketing/components/Footer';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

const ChatWidget = lazy(async () => {
  const module = await import('@/features/marketing/components/ChatWidget');
  return { default: module.ChatWidget };
});

const Layout = () => {
  const { lang } = useLanguage();
  const [opacity, setOpacity] = useState(1);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setOpacity(0.92);
    const t = setTimeout(() => setOpacity(1), 180);
    return () => clearTimeout(t);
  }, [lang]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <motion.div
          animate={{ opacity }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default Layout;
