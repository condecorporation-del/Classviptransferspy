import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Mic, MicOff, Headphones,
  MessageCircle, ExternalLink, Mail, Phone,
} from 'lucide-react';
import { useLanguage } from '@/shared/providers/LanguageContext';
import { getApiBaseUrl } from '@/shared/lib/api';
const assistBg = 'https://res.cloudinary.com/dt9iyiorn/image/upload/v1774168334/Widget_futurista_de_sdx22e.png';

const WHATSAPP_LINK = 'https://wa.me/5216241222174';
const WHATSAPP_PHONE = '+52 624 122 2174';
const IMESSAGE_LINK = 'sms:+15625551234'; // fallback SMS
const EMAIL_LINK = 'mailto:Armando@classviptransfers.com';
const EMAIL_ADDRESS = 'Armando@classviptransfers.com';
const BOOK_FORM = '/book';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
  showBookingCta?: boolean;
  bookingOptionsMsg?: boolean;
  quickAccessMsg?: boolean;
}

// Generador de IDs a nivel de módulo — fuera del componente para no llamar
// una función impura (Date.now) durante el render.
let _msgSeq = 0;
const nextMessageId = (): string => `msg-${Date.now()}-${++_msgSeq}`;

export const ChatWidget = () => {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLabel, setShowLabel] = useState(true);
  const [transferMode, setTransferMode] = useState(false);
  const [transferHotel, setTransferHotel] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [panelBottom, setPanelBottom] = useState<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Hide label after 15 seconds
    const timer = setTimeout(() => setShowLabel(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Reposition panel when mobile keyboard appears (iOS visualViewport API)
  useEffect(() => {
    if (!isOpen) { setPanelBottom(null); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setPanelBottom(keyboardHeight > 50 ? keyboardHeight + 8 : null);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setPanelBottom(null);
    };
  }, [isOpen]);

  // ── Recording ────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await handleAudioSubmit(); };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch { /* silently fail */ }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = async () => {
    if (audioChunksRef.current.length === 0) return;
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    const userMessage: Message = {
      id: nextMessageId(), role: 'user',
      content: lang === 'es' ? '🎤 Mensaje de voz' : '🎤 Voice message',
      timestamp: new Date(), isAudio: true,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/transcribe`, { method: 'POST', credentials: 'include', body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      await sendMessage(data.data.text);
    } catch {
      addFallbackMessage();
      setIsLoading(false);
    }
  };

  // ── Messaging ─────────────────────────────────────────────────────────────

  const addFallbackMessage = () => {
    setMessages(prev => [...prev, {
      id: nextMessageId(), role: 'assistant',
      content: lang === 'es'
        ? `No pude conectar con el asistente en este momento. Contactanos directamente:\nWhatsApp: ${WHATSAPP_PHONE}\nEmail: ${EMAIL_ADDRESS}`
        : `I couldn't reach the assistant right now. Contact us directly:\nWhatsApp: ${WHATSAPP_PHONE}\nEmail: ${EMAIL_ADDRESS}`,
      timestamp: new Date(), showBookingCta: true,
    }]);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;
    const userMessage: Message = { id: nextMessageId(), role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/ai/chat`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, locale: lang, sessionId }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.success) {
        if (data.data.sessionId) setSessionId(data.data.sessionId);
        const BOOKING_RE = /reserv|book|pagar|pay|checkout|comprar|agendar/i;
        const wantsToBook = BOOKING_RE.test(messageText) || data.data.nextAction === 'proceed_to_payment';
        setMessages(prev => [...prev, {
          id: nextMessageId(), role: 'assistant',
          content: data.data.reply, timestamp: new Date(),
          showBookingCta: wantsToBook,
        }]);
      }
    } catch {
      addFallbackMessage();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && input.trim()) sendMessage();
  };

  // WhatsApp booking link
  const whatsappBookingLink = WHATSAPP_LINK;

  const handleBookNowClick = () => {
    setMessages(prev => [...prev, {
      id: nextMessageId(),
      role: 'assistant',
      content: lang === 'es'
        ? 'Claro, estas son las 4 formas de hacer tu reservación con nosotros:'
        : 'Of course! Here are the 4 ways to book your reservation with us:',
      timestamp: new Date(),
      bookingOptionsMsg: true,
    }]);
  };

  const handleQuickAccessClick = () => {
    setMessages(prev => [...prev, {
      id: nextMessageId(),
      role: 'assistant',
      content: lang === 'es'
        ? '¡Con gusto te ayudo! ¿Sobre qué quieres saber?'
        : 'Happy to help! What would you like to know?',
      timestamp: new Date(),
      quickAccessMsg: true,
    }]);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] flex flex-col items-end gap-2">
        {/* Animated label */}
        <AnimatePresence>
          {!isOpen && showLabel && (
            <motion.div
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-navy text-gold text-xs font-bold px-3 py-2 rounded-lg shadow-xl border border-gold/40 whitespace-nowrap cursor-pointer select-none flex items-center gap-1.5"
              onClick={() => { setIsOpen(true); setShowLabel(false); }}
            >
              <Headphones size={14} className="shrink-0" />
              {lang === 'es' ? '¿Necesitas ayuda?' : 'Need assistance?'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button — compact combo-style with image bg + bold HELP */}
        <motion.button
          onClick={() => { setIsOpen(v => !v); setShowLabel(false); }}
          className="relative w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] md:w-[64px] md:h-[64px] rounded-xl flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-background"
          aria-label={lang === 'es' ? 'Abrir asistencia' : 'Open assistance'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
        >
          {/* Background image + overlay — como los combos */}
          <img
            src={assistBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/70 to-navy/50" />
          <div className="absolute inset-0 shimmer opacity-30 pointer-events-none" />

          {/* Border & shadow */}
          <div className="absolute inset-0 rounded-xl border border-gold/50 shadow-[0_4px_16px_rgba(212,175,55,0.3),inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

          {isOpen ? (
            <X size={20} strokeWidth={2.5} className="text-gold relative z-10" />
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-0.5">
              <Headphones size={14} strokeWidth={2.5} className="text-gold drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
              <span
                className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-gold tracking-[0.2em] sm:tracking-[0.25em] uppercase leading-none"
                style={{ textShadow: '0 0 8px rgba(212,175,55,0.5), 0 1px 3px rgba(0,0,0,0.5)' }}
              >
                Help
              </span>
            </div>
          )}

          {/* Green online dot */}
          {!isOpen && (
            <span className="absolute -top-0.5 -right-0.5 z-20 w-3.5 h-3.5 bg-emerald-400 rounded-full border border-navy flex items-center justify-center shadow-md">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
            </span>
          )}
        </motion.button>
      </div>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-[72px] sm:bottom-[76px] md:bottom-[80px] right-4 md:right-6 z-[9998] w-[calc(100vw-2rem)] max-w-[420px] h-[min(580px,82vh)] bg-card border border-gold/25 rounded-2xl shadow-[0_32px_72px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden"
            style={panelBottom !== null ? { bottom: `${panelBottom}px` } : undefined}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b border-gold/20"
              style={{ background: 'linear-gradient(135deg, #0A1628 0%, #112240 60%, #0D1B35 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' }}>
                  <Headphones size={20} className="text-gold" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border border-navy" />
                </div>
                <div>
                  <h3 className="font-bold text-gold text-sm tracking-wide">
                    {lang === 'es' ? 'Asistencia Class VIP' : 'Class VIP Assistance'}
                  </h3>
                  <p className="text-[11px] text-off-white/55 mt-0.5">
                    {lang === 'es' ? 'Los Cabos · Disponible 24/7' : 'Los Cabos · Available 24/7'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-off-white/50 hover:text-off-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* AI Agent intro */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))' }}>
                      <Headphones size={16} className="text-gold" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      <p className="text-sm leading-relaxed">
                        {lang === 'es'
                          ? '¡Hola! Soy el asistente virtual de Class VIP Transfers. ¿En qué puedo ayudarte hoy?'
                          : "Hi! I'm the Class VIP Transfers virtual assistant. How can I help you today?"}
                      </p>
                    </div>
                  </div>

                  {/* empty state hint */}
                  <div className="pl-10">
                    <p className="text-[11px] text-muted-foreground/50 text-center">
                      {lang === 'es' ? 'Usa los botones de abajo o escribe tu pregunta.' : 'Use the buttons below or type your question.'}
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mb-0.5"
                        style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' }}>
                        <Headphones size={13} className="text-gold" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-br-sm text-navy font-medium'
                        : 'rounded-bl-sm bg-muted text-foreground'
                    }`}
                      style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #D4AF37, #F5C842)' } : {}}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {/* Booking options — shown after bot reply when user clicks Book Now */}
                  {msg.bookingOptionsMsg && msg.role === 'assistant' && (
                    <div className="ml-9 mt-2 space-y-1.5">
                      <a href={BOOK_FORM}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 border-gold bg-gold/10 hover:bg-gold/20 transition-colors">
                        <span className="text-base">🌐</span>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">{lang === 'es' ? 'Reservación en línea' : 'Online reservation'}</p>
                          <p className="text-[10px] text-muted-foreground">{lang === 'es' ? 'Rápido · Seguro · Confirmación inmediata' : 'Fast · Secure · Instant confirmation'}</p>
                        </div>
                      </a>
                      <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/8 hover:bg-[#25D366]/15 transition-colors">
                        <span className="text-base">💬</span>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">WhatsApp</p>
                          <p className="text-[10px] text-muted-foreground">{lang === 'es' ? 'Escríbenos directo' : 'Message us directly'} · {WHATSAPP_PHONE}</p>
                        </div>
                      </a>
                      <a href={EMAIL_LINK}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors">
                        <span className="text-base">📧</span>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">Email</p>
                          <p className="text-[10px] text-muted-foreground">Armando@classviptransfers.com</p>
                        </div>
                      </a>
                      <a href={IMESSAGE_LINK}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#34AADC]/30 bg-[#34AADC]/8 hover:bg-[#34AADC]/15 transition-colors">
                        <span className="text-base">📱</span>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">iMessage / SMS</p>
                          <p className="text-[10px] text-muted-foreground">+52 624 122 2174</p>
                        </div>
                      </a>
                    </div>
                  )}

                  {/* Quick access chips — shown after bot reply when user clicks Quick Access */}
                  {msg.quickAccessMsg && msg.role === 'assistant' && (
                    <div className="ml-9 mt-2 space-y-1.5">
                      {!transferMode ? (
                        <button onClick={() => setTransferMode(true)}
                          className="w-full text-left flex items-center gap-2 text-[13px] px-3.5 py-2.5 rounded-xl border border-gold/20 bg-background hover:bg-gold/8 hover:border-gold/40 transition-all text-foreground/80">
                          <span className="text-base">✈️</span>
                          <span>{lang === 'es' ? '¿Cuánto cuesta mi traslado?' : 'How much is my transfer?'}</span>
                        </button>
                      ) : (
                        <div className="rounded-xl border border-gold/40 bg-gold/5 p-3 space-y-2">
                          <p className="text-[11px] text-gold font-semibold">
                            {lang === 'es' ? '¿A qué hotel o zona vas?' : 'Your hotel or destination?'}
                          </p>
                          <input
                            autoFocus
                            value={transferHotel}
                            onChange={e => setTransferHotel(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && transferHotel.trim()) {
                                sendMessage(lang === 'es' ? `¿Cuánto cuesta el traslado del aeropuerto SJD al ${transferHotel}?` : `How much is the transfer from SJD airport to ${transferHotel}?`);
                                setTransferMode(false); setTransferHotel('');
                              }
                              if (e.key === 'Escape') { setTransferMode(false); setTransferHotel(''); }
                            }}
                            placeholder={lang === 'es' ? 'Ej: Grand Solmar, Cabo San Lucas...' : 'E.g. Grand Solmar, Cabo San Lucas...'}
                            className="w-full bg-background border border-gold/30 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => {
                              if (transferHotel.trim()) {
                                sendMessage(lang === 'es' ? `¿Cuánto cuesta el traslado del aeropuerto SJD al ${transferHotel}?` : `How much is the transfer from SJD airport to ${transferHotel}?`);
                                setTransferMode(false); setTransferHotel('');
                              }
                            }}
                              className="flex-1 py-1.5 rounded-lg text-[12px] font-bold text-navy"
                              style={{ background: 'linear-gradient(135deg, #D4AF37, #F5C842)' }}>
                              {lang === 'es' ? 'Consultar precio' : 'Get price'}
                            </button>
                            <button onClick={() => { setTransferMode(false); setTransferHotel(''); }}
                              className="px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground border border-border hover:bg-muted transition-colors">✕</button>
                          </div>
                        </div>
                      )}
                      {(lang === 'es' ? [
                        { icon: '🏄', text: '¿Qué actividades y tours ofrecen?' },
                        { icon: '💰', text: '¿Tienen paquetes o descuentos?' },
                        { icon: '📋', text: '¿Qué incluye el servicio?' },
                      ] : [
                        { icon: '🏄', text: 'What activities and tours do you offer?' },
                        { icon: '💰', text: 'Do you have packages or discounts?' },
                        { icon: '📋', text: 'What is included in the service?' },
                      ]).map(q => (
                        <button key={q.text} onClick={() => sendMessage(q.text)}
                          className="w-full text-left flex items-center gap-2 text-[13px] px-3.5 py-2.5 rounded-xl border border-gold/20 bg-background hover:bg-gold/8 hover:border-gold/40 transition-all text-foreground/80">
                          <span className="text-base">{q.icon}</span><span>{q.text}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.showBookingCta && msg.role === 'assistant' && (
                    <div className="mt-2 ml-9 flex gap-2 flex-wrap">
                      <a href={BOOK_FORM}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-gold bg-gold text-navy hover:bg-gold/90 transition-colors">
                        <ExternalLink size={12} /> {lang === 'es' ? 'Reservar online' : 'Reserve online'}
                      </a>
                      <a href={whatsappBookingLink} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors">
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                      <a href={EMAIL_LINK}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border hover:bg-muted/80 transition-colors text-foreground">
                        <Mail size={12} /> Email
                      </a>
                      <a href={IMESSAGE_LINK}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#34AADC]/10 border border-[#34AADC]/30 text-[#34AADC] hover:bg-[#34AADC]/20 transition-colors">
                        <Phone size={12} /> iMessage / SMS
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mb-0.5"
                    style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))' }}>
                    <Headphones size={13} className="text-gold" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Shortcut buttons ── */}
            <div className="border-t border-gold/15 px-3 pt-2.5 pb-2 bg-card/95 flex items-center gap-2.5">
              <button
                onClick={handleBookNowClick}
                className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-full text-[13px] font-semibold tracking-wide text-[#0A1628] transition-all hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] border border-[#D4AF37]/70 shadow-[0_3px_10px_rgba(12,22,40,0.12)]"
                style={{ background: 'linear-gradient(135deg, #F6DE8A 0%, #E8C35A 55%, #D4AF37 100%)' }}
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0A1628]/10 border border-[#0A1628]/15">
                  <ExternalLink size={12} />
                </span>
                {lang === 'es' ? 'Book Now' : 'Book Now'}
              </button>
              <button
                onClick={handleQuickAccessClick}
                className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-full text-[13px] font-semibold border border-[#1C2B44]/25 bg-[#0F1E34]/[0.04] text-[#1C2B44] hover:bg-[#0F1E34]/[0.08] hover:border-[#1C2B44]/40 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] transition-all shadow-[0_2px_8px_rgba(12,22,40,0.08)]"
              >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[11px] text-[#B7902A]">⚡</span>
                {lang === 'es' ? 'Acceso rápido' : 'Quick Access'}
              </button>
            </div>

            {/* ── Input ── */}
            <div className="px-3 pb-3 bg-card/95" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}>
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-background border border-gold/20 rounded-2xl focus-within:ring-2 focus-within:ring-gold/40 focus-within:border-gold/50 transition-all">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={lang === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
                    className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                    disabled={isLoading || isRecording}
                  />
                  <button
                    type="button"
                    onMouseDown={startRecording} onMouseUp={stopRecording}
                    onTouchStart={startRecording} onTouchEnd={stopRecording}
                    disabled={isLoading}
                    className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isRecording ? 'text-red-500' : 'text-muted-foreground/50 hover:text-gold'}`}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || isRecording}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-navy disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #F5C842)' }}
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

