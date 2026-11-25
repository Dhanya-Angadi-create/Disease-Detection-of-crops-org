import { useState } from 'react';
import { t } from '../i18n/translations';
import type { Language } from '../types';

interface AboutContactPageProps {
  lang: Language;
}

export function AboutContactPage({ lang }: AboutContactPageProps) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', rating: 5 });
  const [status, setStatus] = useState<{ type: 'idle' | 'submitting' | 'success' | 'error'; msg: string }>({
    type: 'idle',
    msg: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'submitting', msg: '' });
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || 'Could not submit inquiry.' });
        return;
      }
      setStatus({ type: 'success', msg: data.message });
      setForm({ name: '', email: '', subject: '', message: '', rating: 5 });
    } catch {
      setStatus({ type: 'error', msg: 'Network error while submitting form.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="border-b border-[#E1E8DD] pb-6 space-y-2">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17241B]">
          About AgroCare AI
        </h1>
        <p className="text-base text-[#526358] max-w-3xl">
          Empowering farmers and agricultural extension workers with early foliar disease screening, bilingual agronomy knowledge, and responsible treatment guidance.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-3">
            <h2 className="font-display text-xl font-bold text-[#17241B]">Our Agronomic Mission</h2>
            <p className="text-sm text-[#46574C] leading-relaxed">
              Late identification of foliar pathogens such as Early Blight, Late Blight, Rice Blast, and Bacterial Leaf Blight costs smallholder farmers substantial yield every season. AgroCare AI brings instant, accessible leaf image analysis directly to mobile and desktop browsers in both English and Kannada.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#F2F5F0] border border-[#DCE4D8] space-y-3">
            <h2 className="font-display text-xl font-bold text-[#17241B]">
              Responsible AI & Plant Pathology Standards
            </h2>
            <p className="text-sm text-[#314136] leading-relaxed">
              Every prediction includes transparent confidence scoring, image quality verification (to reject blurred or non-leaf images instead of guessing), and an explicit recommendation to verify chemical interventions with local agricultural extension specialists.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 p-7 rounded-2xl bg-white border border-[#E1E8DD]">
          <h2 className="font-display text-2xl font-bold text-[#17241B]">{t(lang, 'contactTitle')}</h2>
          <p className="text-sm text-[#526358] mt-1 mb-5">{t(lang, 'contactSub')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#314136] mb-1">Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#314136] mb-1">Message</label>
              <textarea
                rows={4}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm"
              />
            </div>

            {status.type === 'error' && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{status.msg}</p>
            )}
            {status.type === 'success' && (
              <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                {status.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={status.type === 'submitting'}
              className="px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] cursor-pointer"
            >
              {status.type === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
