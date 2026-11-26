'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { MessageSquare, Send, X } from 'lucide-react';
import type { ChatConversation, ChatMessage } from '@/lib/types';

interface StoredChatSession {
  conversationId: string;
  guestToken: string;
  guestName: string;
  guestEmail: string;
}

const STORAGE_KEY = 'charlees_guest_chat_session_v1';

export function PublicLiveChatWidget() {
  const shouldReduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<StoredChatSession | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredChatSession;
        if (parsed.conversationId && parsed.guestToken) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [conversation, setConversation] = useState<Omit<ChatConversation, 'guest_token' | 'unread_staff_count' | 'unread_guest_count'> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Poll active conversation when widget is open
  useEffect(() => {
    if (!open || !session) return;
    let active = true;

    const loadThread = async () => {
      try {
        const res = await fetch(
          `/api/chat?conversationId=${encodeURIComponent(session.conversationId)}&token=${encodeURIComponent(session.guestToken)}`,
          { cache: 'no-store' }
        );
        if (!active) return;
        if (res.status === 401 || res.status === 404) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
          setConversation(null);
          setMessages([]);
          return;
        }
        if (res.ok) {
          const json = await res.json();
          setConversation(json.conversation);
          setMessages(json.messages || []);
        }
      } catch {
        // Non-blocking poll failure
      }
    };

    loadThread();
    const timer = setInterval(loadThread, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open, session]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: shouldReduce ? 'auto' : 'smooth' });
    }
  }, [messages.length, open, shouldReduce]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          guestName,
          guestEmail,
          bookingReference: bookingReference.trim() || undefined,
          message: draft.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not start live chat.');
      } else {
        const nextSession: StoredChatSession = {
          conversationId: json.conversation.id,
          guestToken: json.guestToken,
          guestName: json.conversation.guest_name,
          guestEmail: json.conversation.guest_email,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
        setConversation(json.conversation);
        setMessages(json.messages || []);
        setDraft('');
      }
    } catch {
      setError('Network error while connecting to Charlees reception desk.');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !draft.trim()) return;
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          conversationId: session.conversationId,
          token: session.guestToken,
          message: draft.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Unable to send message.');
      } else {
        setConversation(json.conversation);
        setMessages(json.messages || []);
        setDraft('');
      }
    } catch {
      setError('Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <AnimatePresence>
        {open ? (
          <motion.section
            initial={shouldReduce ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            aria-label="Reception Live Chat"
            className="w-[min(calc(100vw-2rem),360px)] bg-white border border-[#0D0D0E] shadow-2xl flex flex-col overflow-hidden"
          >
            <header className="bg-[#0D0D0E] text-[#FAF9F6] px-4 py-3.5 flex items-center justify-between border-b border-[#26231F]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D6B46A]">
                  Charlees Reception Desk
                </p>
                <p className="font-display text-lg leading-tight">Live Guest Assistance</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close live chat"
                className="p-1.5 text-[#CFC9BE] hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </header>

            {!session ? (
              <form onSubmit={handleStartChat} className="p-4 space-y-3 bg-[#FAF9F6]">
                <p className="text-xs leading-relaxed text-[#5C574F]">
                  Ask our Abraka front desk about room availability, bank transfers, or existing reservations.
                </p>
                <div>
                  <label htmlFor="chat-name" className="block text-[10px] uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                    Your Name
                  </label>
                  <input
                    id="chat-name"
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                  />
                </div>
                <div>
                  <label htmlFor="chat-email" className="block text-[10px] uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                    Email Address
                  </label>
                  <input
                    id="chat-email"
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                  />
                </div>
                <div>
                  <label htmlFor="chat-ref" className="block text-[10px] uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                    Booking Reference (Optional)
                  </label>
                  <input
                    id="chat-ref"
                    type="text"
                    placeholder="CH-..."
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    className="w-full h-9 px-2.5 text-xs bg-white border border-[#D8D1C5] font-mono-tabular uppercase focus:outline-none focus:border-[#0D0D0E]"
                  />
                </div>
                <div>
                  <label htmlFor="chat-initial-msg" className="block text-[10px] uppercase tracking-[0.16em] text-[#8C6822] mb-1">
                    Message
                  </label>
                  <textarea
                    id="chat-initial-msg"
                    rows={2}
                    required
                    placeholder="How can we assist with your stay?"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                  />
                </div>
                {error ? <p className="text-xs text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-[#0D0D0E] text-[#FAF9F6] py-2.5 text-xs uppercase tracking-[0.16em] hover:bg-[#26231F] disabled:opacity-50"
                >
                  {sending ? 'Connecting...' : 'Start Conversation'}
                </button>
              </form>
            ) : (
              <>
                <div className="px-4 py-2 bg-[#F2EFE9] border-b border-[#E6E1D8] flex items-center justify-between text-[11px] text-[#4A453E]">
                  <span className="truncate">
                    {session.guestName}
                    {conversation?.booking_reference ? ` · ${conversation.booking_reference}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(STORAGE_KEY);
                      setSession(null);
                      setConversation(null);
                      setMessages([]);
                    }}
                    className="text-[10px] uppercase tracking-[0.14em] text-[#8C6822] hover:underline shrink-0"
                  >
                    New Chat
                  </button>
                </div>

                <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.sender_type === 'guest' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[10px] text-[#6B6459] mb-0.5">
                        {m.sender_name}
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                          m.sender_type === 'guest'
                            ? 'bg-[#0D0D0E] text-[#FAF9F6]'
                            : 'bg-white border border-[#E6E1D8] text-[#171614]'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {error ? (
                  <p className="px-4 py-1.5 text-xs text-red-700 bg-red-50 border-t border-red-200">
                    {error}
                  </p>
                ) : null}

                <form
                  onSubmit={handleSendReply}
                  className="p-3 border-t border-[#E6E1D8] bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Type a message..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#0D0D0E]"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    aria-label="Send message"
                    className="h-9 px-3 bg-[#0D0D0E] text-[#FAF9F6] hover:bg-[#26231F] disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </form>
              </>
            )}
          </motion.section>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2.5 bg-[#0D0D0E] text-[#FAF9F6] border border-[#2C2822] px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] shadow-lg hover:border-[#D6B46A] transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-[#D6B46A]" aria-hidden="true" />
            <span>Reception Chat</span>
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
