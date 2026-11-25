import { ArrowRight, BookOpen, ChevronDown, Leaf, ScanLine, ShieldCheck, Sprout } from 'lucide-react';
import { useState } from 'react';
import { t } from '../i18n/translations';
import type { ArticleItem, CropItem, Language, PageRoute } from '../types';

interface LandingPageProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onNavigate: (page: PageRoute, cropFilter?: string) => void;
  crops: CropItem[];
  articles: ArticleItem[];
  publicStats: { cropsCount: number; diseasesCount: number; detectionsCount: number };
}

export function LandingPage({
  lang,
  onChangeLang,
  onNavigate,
  crops,
  articles,
  publicStats,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [leafImgFailed, setLeafImgFailed] = useState(false);
  const [farmerImgFailed, setFarmerImgFailed] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    rating: 5,
  });
  const [contactStatus, setContactStatus] = useState<{ type: 'idle' | 'submitting' | 'success' | 'error'; msg: string }>({
    type: 'idle',
    msg: '',
  });

  const faqs =
    lang === 'kn'
      ? [
          {
            q: 'AgroCare AI ರೋಗ ಪತ್ತೆ ಎಷ್ಟು ನಿಖರವಾಗಿದೆ?',
            a: 'ನಮ್ಮ ದೃಷ್ಟಿ ವಿಶ್ಲೇಷಣಾ ಮಾದರಿಯು ಎಲೆಯ ಕಲೆಗಳು, ಅಂಚುಗಳು ಮತ್ತು ಬಣ್ಣದ ಬದಲಾವಣೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಶೇಕಡಾವಾರು ತೋರಿಸುತ್ತದೆ. ಚಿತ್ರವು ಅಸ್ಪಷ್ಟವಾಗಿದ್ದರೆ ಅಥವಾ ಎಲೆಯಲ್ಲದಿದ್ದರೆ, ಅದು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸುತ್ತದೆ.',
          },
          {
            q: 'ರಾಸಾಯನಿಕ ಔಷಧಿಗಳನ್ನು ಬಳಸುವ ಮೊದಲು ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕೇ?',
            a: 'ಹೌದು. AI ಫಲಿತಾಂಶಗಳು ಪ್ರಾಥಮಿಕ ಕ್ಷೇತ್ರ ತಪಾಸಣೆಗೆ ಸಹಾಯ ಮಾಡುತ್ತವೆ. ಯಾವುದೇ ರಾಸಾಯನಿಕ ಸಿಂಪಡಣೆಗೆ ಮುನ್ನ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿ ಅಥವಾ ತಜ್ಞರಿಂದ ದೃಢಪಡಿಸಿಕೊಳ್ಳಿ.',
          },
          {
            q: 'ಯಾವ ಚಿತ್ರ ಸ್ವರೂಪಗಳನ್ನು ಬೆಂಬಲಿಸಲಾಗುತ್ತದೆ?',
            a: 'ನೀವು JPG, JPEG, ಅಥವಾ PNG ಸ್ವರೂಪದ ಗರಿಷ್ಠ 8 MB ಗಾತ್ರದ ಸ್ಪಷ್ಟ ಹಗಲು ಬೆಳಕಿನ ಎಲೆ ಚಿತ್ರಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಬಹುದು.',
          },
          {
            q: 'ನನ್ನ ವರದಿಗಳನ್ನು PDF ಆಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದೇ?',
            a: 'ಹೌದು. ಪ್ರತಿ ವಿಶ್ಲೇಷಣೆಯ ನಂತರ ನೀವು ಪೂರ್ಣ ರೋಗ ವರದಿಯನ್ನು PDF ಆಗಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದು ಮತ್ತು ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಉಳಿಸಬಹುದು.',
          },
        ]
      : [
          {
            q: 'How reliable is the AI leaf disease detection?',
            a: 'Our vision pathology workflow evaluates lesion geometry, chlorotic halos, and surface sporulation to return a primary prediction with a transparent confidence percentage and differential alternatives. If a photo is blurry or not a leaf, it warns you instead of guessing.',
          },
          {
            q: 'Should I confirm AI predictions before spraying chemical pesticides?',
            a: 'Yes. AI predictions are designed as an early field-scouting decision aid. Always verify severe outbreaks and exact chemical dosages with a qualified local agricultural extension officer.',
          },
          {
            q: 'Which image formats and crops are supported?',
            a: 'You can upload JPG, JPEG, or PNG images up to 8 MB. Our reference knowledge base covers Tomato, Potato, Rice, Wheat, Maize, Cotton, Chilli, and Grapes, while our vision model can also evaluate many other common garden and field crops.',
          },
          {
            q: 'Can I save scan history and download PDF reports?',
            a: 'Yes. Every detection generates an instant downloadable PDF diagnostic summary, and registered farmers can save reports, annotate field notes, and track healthy vs. diseased trends in their personal dashboard.',
          },
        ];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus({ type: 'submitting', msg: '' });
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactStatus({ type: 'error', msg: data.error || 'Could not submit feedback.' });
        return;
      }
      setContactStatus({ type: 'success', msg: data.message });
      setContactForm({ name: '', email: '', subject: '', message: '', rating: 5 });
    } catch {
      setContactStatus({ type: 'error', msg: 'Network error while sending message.' });
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-12">
        {/* Language & Regional Utility Strip below header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#E5ECE2]">
          <p className="text-xs font-medium text-[#526358]">
            {t(lang, 'heroKicker')} · English & ಕನ್ನಡ
          </p>
          <div className="inline-flex items-center p-1 bg-[#EFF3EC] rounded-lg border border-[#DCE4D8]">
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                lang === 'en' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358] hover:text-[#17241B]'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('kn')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                lang === 'kn' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358] hover:text-[#17241B]'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <h1 className="font-display text-[clamp(2.25rem,4vw,3.6rem)] leading-[1.08] font-bold tracking-tight text-[#132017] text-balance">
              {t(lang, 'heroTitle')}
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-[#46574C] max-w-xl">
              {t(lang, 'heroSubtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('detect')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ScanLine className="w-4 h-4" />
                {t(lang, 'ctaDetect')}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#CBD6C5] bg-white text-[#17241B] text-sm font-semibold hover:bg-[#F2F5F0] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                {t(lang, 'ctaLibrary')}
              </button>
            </div>
            <p className="text-xs text-[#5E7064] pt-2">
              Supports JPG, JPEG & PNG leaf photos · Agronomic guidance reviewed against standard plant pathology practices
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-2xl overflow-hidden border border-[#DCE4D8] bg-[#E8EFE5]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_agrocare_field_1795616492799.jpg"
                  alt="Terraced green tomato and maize agricultural fields at sunrise"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-800 to-emerald-950 flex flex-col items-center justify-center text-white p-8 text-center">
                  <Sprout className="w-12 h-12 mb-3 opacity-80" />
                  <p className="font-display text-lg font-semibold">AgroCare AI Field Diagnostics</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <p className="text-xs font-medium text-emerald-200">
                  Early Field Scouting · Tomato, Potato, Rice, Wheat, Maize, Cotton, Chilli, Grapes
                </p>
                <p className="text-sm font-medium text-white mt-1">
                  Visual lesion assessment paired with organic and extension-backed preventive care.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column Key Metrics Strip below hero */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-xl bg-white border border-[#E1E8DD]">
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#17241B]">
              {publicStats.cropsCount || 8}
            </p>
            <p className="text-xs text-[#526358] mt-1">{t(lang, 'metricCrops')}</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#17241B]">
              {publicStats.diseasesCount || 15}+
            </p>
            <p className="text-xs text-[#526358] mt-1">{t(lang, 'metricDiseases')}</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#17241B]">
              &lt; 5s
            </p>
            <p className="text-xs text-[#526358] mt-1">{t(lang, 'metricSpeed')} (Illustrative)</p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#17241B]">
              {publicStats.detectionsCount}
            </p>
            <p className="text-xs text-[#526358] mt-1">Logged Platform Leaf Scans</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-2xl overflow-hidden border border-[#DCE4D8] bg-[#F2F5F0] aspect-[4/3]">
              {!leafImgFailed ? (
                <img
                  src="/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg"
                  alt="Clean daylight macro photograph of a healthy crop leaf for visual inspection"
                  referrerPolicy="no-referrer"
                  onError={() => setLeafImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-800">
                  <Leaf className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
                {t(lang, 'howItWorksTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#526358] mt-2">{t(lang, 'howItWorksSub')}</p>
            </div>

            <div className="divide-y divide-[#E4EBE0] border-y border-[#E4EBE0]">
              <div className="py-5">
                <h3 className="font-display text-lg font-semibold text-[#17241B]">{t(lang, 'step1Title')}</h3>
                <p className="text-sm text-[#46574C] mt-1.5 leading-relaxed">{t(lang, 'step1Desc')}</p>
              </div>
              <div className="py-5">
                <h3 className="font-display text-lg font-semibold text-[#17241B]">{t(lang, 'step2Title')}</h3>
                <p className="text-sm text-[#46574C] mt-1.5 leading-relaxed">{t(lang, 'step2Desc')}</p>
              </div>
              <div className="py-5">
                <h3 className="font-display text-lg font-semibold text-[#17241B]">{t(lang, 'step3Title')}</h3>
                <p className="text-sm text-[#46574C] mt-1.5 leading-relaxed">{t(lang, 'step3Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Asymmetric Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
            {t(lang, 'capabilitiesTitle')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 p-7 rounded-2xl bg-white border border-[#E1E8DD] flex flex-col justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#15803D]">Diagnostic Transparency</p>
              <h3 className="font-display text-xl font-bold text-[#17241B]">
                Honest Confidence Scoring & Image Quality Guardrails
              </h3>
              <p className="text-sm text-[#46574C] leading-relaxed max-w-2xl">
                Unlike toy classifiers that force a label on any picture, AgroCare AI checks whether an upload actually depicts recognizable foliage before diagnosing. When symptoms overlap—such as Early Blight versus Septoria Leaf Spot—it presents alternative differential candidates alongside confidence metrics.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-[#EDF2EA] flex flex-wrap gap-6 text-xs text-[#526358]">
              <span>Healthy vs. Diseased Screening</span>
              <span aria-hidden="true">·</span>
              <span>Blurry / Non-Leaf Rejection</span>
              <span aria-hidden="true">·</span>
              <span>Severity Assessment</span>
            </div>
          </div>

          <div className="p-7 rounded-2xl bg-[#F2F5F0] border border-[#DCE4D8] flex flex-col justify-between">
            <div className="space-y-3">
              <ShieldCheck className="w-6 h-6 text-[#15803D]" />
              <h3 className="font-display text-xl font-bold text-[#17241B]">
                Organic & Chemical IPM Guidance
              </h3>
              <p className="text-sm text-[#46574C] leading-relaxed">
                Every report separates preventive cultural hygiene, biological/organic options (Trichoderma, neem, copper soap), and active-ingredient chemical references with explicit extension-officer safety disclaimers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('detect')}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#15803D] hover:text-[#166534] cursor-pointer"
            >
              Launch Leaf Scanner <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-[#E1E8DD]">
            <h3 className="font-display text-lg font-bold text-[#17241B]">
              Downloadable PDF Field Reports
            </h3>
            <p className="text-sm text-[#46574C] mt-2 leading-relaxed">
              Export structured plant pathology reports with timestamps, visible symptoms, and treatment plans to share directly with local agronomists or co-ops.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-[#E1E8DD]">
            <h3 className="font-display text-lg font-bold text-[#17241B]">
              English & Kannada (ಕನ್ನಡ) Interface
            </h3>
            <p className="text-sm text-[#46574C] mt-2 leading-relaxed">
              Switch seamlessly between English and Kannada across navigation, diagnostic results, and agronomy articles for accessible rural field adoption.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white border border-[#E1E8DD]">
            <h3 className="font-display text-lg font-bold text-[#17241B]">
              Farmer History & Analytics
            </h3>
            <p className="text-sm text-[#46574C] mt-2 leading-relaxed">
              Track scanned plots over time, review saved reports, and monitor healthy versus diseased crop distributions from a dedicated farmer dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Crops */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
              {t(lang, 'supportedCropsTitle')}
            </h2>
            <p className="text-sm text-[#526358] mt-1">{t(lang, 'supportedCropsSub')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="text-sm font-semibold text-[#15803D] hover:underline cursor-pointer whitespace-nowrap shrink-0"
          >
            View Full Disease Library →
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {crops.map((crop) => (
            <button
              key={crop.id}
              type="button"
              onClick={() => onNavigate('library', crop.name)}
              className="text-left p-5 rounded-xl bg-white border border-[#E1E8DD] hover:border-[#15803D] transition-colors cursor-pointer group"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-[#17241B] group-hover:text-[#15803D] transition-colors">
                  {crop.name}
                </h3>
                <span className="font-mono tabular-nums text-xs text-[#526358]">
                  {crop.disease_count ?? 0} profiles
                </span>
              </div>
              <p className="text-xs italic text-[#5E7064] mt-0.5">{crop.scientific_name}</p>
              <p className="text-xs text-[#46574C] mt-3 line-clamp-2 leading-relaxed">{crop.description}</p>
              <p className="text-xs font-medium text-[#526358] mt-3 pt-3 border-t border-[#EDF2EA]">
                Season: {crop.season}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Sample Farmer Proof / Testimonial */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#16271C] text-white p-8 lg:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4">
            <div className="w-44 h-44 sm:w-52 sm:h-52 mx-auto lg:mx-0 rounded-2xl overflow-hidden border border-white/15 bg-emerald-950">
              {!farmerImgFailed ? (
                <img
                  src="/src/assets/images/farmer_field_portrait_1795616494869.jpg"
                  alt="Sample farmer portrait in green vegetable field"
                  referrerPolicy="no-referrer"
                  onError={() => setFarmerImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-200">
                  <Sprout className="w-10 h-10" />
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-8 space-y-4">
            <p className="text-xs font-medium text-emerald-300">{t(lang, 'testimonialLabel')}</p>
            <blockquote className="font-display text-xl sm:text-2xl leading-snug font-medium text-white">
              “Before using visual leaf screening, I often mistook early Alternaria spots on lower tomato leaves for simple heat scorch. Catching Early Blight in week three let me prune infected leaves and apply biological Trichoderma sprays early—saving most of my two-acre harvest.”
            </blockquote>
            <div className="pt-2 text-sm text-emerald-100/85">
              <span className="font-semibold text-white">Raghavendra Gowda</span> · Vegetable & Paddy Grower · Mandya District (Sample Illustration)
            </div>
          </div>
        </div>
      </section>

      {/* Educational Agronomy Articles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B] mb-6">
          {t(lang, 'articlesTitle')}
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {articles.map((article) => (
            <article
              key={article.id}
              className="p-6 rounded-xl bg-white border border-[#E1E8DD] flex flex-col justify-between"
            >
              <div>
                <p className="text-xs text-[#526358]">
                  {article.category} · {article.read_time}
                </p>
                <h3 className="font-display text-lg font-bold text-[#17241B] mt-2 leading-snug">
                  {lang === 'kn' ? article.title_kn : article.title}
                </h3>
                <p className="text-sm text-[#46574C] mt-2 leading-relaxed">
                  {lang === 'kn' ? article.summary_kn : article.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(article)}
                className="mt-5 text-left text-sm font-semibold text-[#15803D] hover:underline cursor-pointer"
              >
                Read Field Guide →
              </button>
            </article>
          ))}
        </div>

        {selectedArticle && (
          <div className="mt-6 p-6 rounded-xl bg-[#F2F5F0] border border-[#DCE4D8]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-[#526358]">
                  {selectedArticle.category} · {selectedArticle.read_time}
                </p>
                <h3 className="font-display text-xl font-bold text-[#17241B] mt-1">
                  {lang === 'kn' ? selectedArticle.title_kn : selectedArticle.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#DCE4D8] text-xs font-medium text-[#17241B] cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-[#314136] leading-relaxed mt-4">
              {lang === 'kn' ? selectedArticle.content_kn : selectedArticle.content}
            </p>
          </div>
        )}
      </section>

      {/* FAQ + Contact & Feedback Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6 space-y-5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
            {t(lang, 'faqTitle')}
          </h2>
          <div className="divide-y divide-[#E1E8DD] border-y border-[#E1E8DD]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.q} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-semibold text-sm sm:text-base text-[#17241B] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-[#526358] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="text-sm text-[#46574C] mt-2.5 leading-relaxed">{faq.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 p-7 rounded-2xl bg-white border border-[#E1E8DD]">
          <h2 className="font-display text-2xl font-bold text-[#17241B]">{t(lang, 'contactTitle')}</h2>
          <p className="text-sm text-[#526358] mt-1 mb-5">{t(lang, 'contactSub')}</p>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#314136] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="e.g. Mahesh Patil"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#314136] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="farmer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#314136] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="Disease identification feedback or inquiry"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#314136] mb-1">Rating</label>
                <select
                  value={contactForm.rating}
                  onChange={(e) => setContactForm({ ...contactForm, rating: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value={5}>5 / 5 Excellent</option>
                  <option value={4}>4 / 5 Good</option>
                  <option value={3}>3 / 5 Fair</option>
                  <option value={2}>2 / 5 Needs Work</option>
                  <option value={1}>1 / 5 Poor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#314136] mb-1">Message</label>
              <textarea
                rows={3}
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                placeholder="Describe your crop issue or suggestion..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
              />
            </div>

            {contactStatus.type === 'error' && (
              <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {contactStatus.msg}
              </p>
            )}
            {contactStatus.type === 'success' && (
              <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {contactStatus.msg}
              </p>
            )}

            <button
              type="submit"
              disabled={contactStatus.type === 'submitting'}
              className="px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {contactStatus.type === 'submitting' ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
