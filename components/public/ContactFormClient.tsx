'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { trackConversionEvent } from '@/components/public/AnalyticsTracker';

export function ContactFormClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setFeedback(json.error || 'Could not send your message.');
        return;
      }
      trackConversionEvent('contact_form_submit', '/contact', { subject });
      setStatus('success');
      setFeedback('Your inquiry has been received by our front desk team in Abraka.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('error');
      setFeedback('Network error while sending your message. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-[#E6E1D8] bg-white p-6 sm:p-8 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5">
            Full Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-phone" className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5">
            Phone Number (Optional)
          </label>
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs uppercase tracking-[0.18em] text-[#8C6822] mb-1.5">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#D8D1C5] focus:outline-none focus:border-[#8C6822]"
        />
      </div>

      {feedback ? (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={`text-sm p-3 border ${
            status === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center gap-2 bg-[#0D0D0E] text-[#FAF9F6] px-6 py-3.5 text-xs font-medium uppercase tracking-[0.18em] hover:bg-[#26231F] disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{status === 'submitting' ? 'Sending Inquiry' : 'Send Message'}</span>
      </button>
    </form>
  );
}
