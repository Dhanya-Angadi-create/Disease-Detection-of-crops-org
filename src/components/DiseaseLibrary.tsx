import { BookOpen, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '../i18n/translations';
import type { CropItem, DiseaseItem, Language, PageRoute } from '../types';

interface DiseaseLibraryProps {
  lang: Language;
  initialCropFilter?: string;
  crops: CropItem[];
  onNavigate: (page: PageRoute) => void;
}

const CATEGORIES = ['All', 'Fungal', 'Bacterial', 'Viral', 'Healthy'] as const;

export function DiseaseLibrary({ lang, initialCropFilter, crops, onNavigate }: DiseaseLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(initialCropFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [diseases, setDiseases] = useState<DiseaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDisease, setActiveDisease] = useState<DiseaseItem | null>(null);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (initialCropFilter) {
      setSelectedCrop(initialCropFilter);
    }
  }, [initialCropFilter]);

  useEffect(() => {
    let cancelled = false;
    const fetchDiseases = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (selectedCrop !== 'All') params.set('crop', selectedCrop);
        if (selectedCategory !== 'All') params.set('category', selectedCategory);

        const res = await fetch(`/api/diseases?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.diseases)) {
          setDiseases(data.diseases);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setTimeout(fetchDiseases, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCrop, selectedCategory]);

  const cropTabs = ['All', ...crops.map((c) => c.name)];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E1E8DD] pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17241B]">
            {t(lang, 'libraryHeading')}
          </h1>
          <p className="text-sm sm:text-base text-[#526358] mt-2 max-w-2xl">{t(lang, 'librarySub')}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('detect')}
          className="px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {t(lang, 'ctaDetect')}
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-4">
        <div className="grid md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-[#526358] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(lang, 'searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CED9C8] bg-white text-sm focus:outline-none focus:border-[#15803D]"
            />
          </div>
          <div className="md:col-span-5 flex items-center gap-1 p-1 bg-[#EFF3EC] rounded-lg border border-[#DCE4D8] overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-white text-[#17241B] shadow-sm'
                    : 'text-[#526358] hover:text-[#17241B]'
                }`}
              >
                {cat === 'All' ? t(lang, 'allCategories') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Crop Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {cropTabs.map((cropName) => (
            <button
              key={cropName}
              type="button"
              onClick={() => setSelectedCrop(cropName)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                selectedCrop === cropName
                  ? 'bg-[#15803D] text-white border-[#15803D]'
                  : 'bg-white text-[#46574C] border-[#DCE4D8] hover:border-[#9EB598]'
              }`}
            >
              {cropName === 'All' ? t(lang, 'allCrops') : cropName}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-[#EFF3EC] animate-pulse border border-[#E1E8DD]" />
          ))}
        </div>
      ) : diseases.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E1E8DD] text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#526358] mx-auto" />
          <h2 className="font-display text-lg font-bold text-[#17241B]">No matching disease profiles found</h2>
          <p className="text-sm text-[#526358]">
            Try clearing your search filter or selecting a different crop category.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCrop('All');
              setSelectedCategory('All');
            }}
            className="px-4 py-2 rounded-lg border border-[#CBD6C5] text-xs font-semibold text-[#17241B] hover:bg-[#F2F5F0] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {diseases.map((disease) => (
            <article
              key={disease.id}
              onClick={() => setActiveDisease(disease)}
              className="rounded-2xl bg-white border border-[#E1E8DD] hover:border-[#15803D] transition-colors overflow-hidden flex flex-col cursor-pointer group"
            >
              <div className="h-44 bg-[#F2F5F0] border-b border-[#E8EEE5] overflow-hidden">
                {!failedImages[disease.id] ? (
                  <img
                    src={disease.image_url}
                    alt={`${disease.crop_name} ${disease.name}`}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [disease.id]: true }))}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-800 text-xs font-medium">
                    {disease.crop_name} Pathology Reference
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs text-[#526358]">
                    {disease.crop_name} · {disease.category} · {disease.severity_typical}
                  </p>
                  <h2 className="font-display text-lg font-bold text-[#17241B] mt-1 group-hover:text-[#15803D] transition-colors">
                    {disease.name}
                  </h2>
                  <p className="text-xs italic text-[#5E7064] mt-0.5">{disease.pathogen}</p>
                  <p className="text-sm text-[#46574C] mt-3 line-clamp-3 leading-relaxed">
                    {disease.symptoms}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#15803D]">
                  Inspect Causes & Treatments →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeDisease && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setActiveDisease(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#DCE4D8] max-w-3xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E6ECE3] pb-4">
              <div>
                <p className="text-xs font-medium text-[#526358]">
                  {activeDisease.crop_name} · {activeDisease.category} · Typical Severity: {activeDisease.severity_typical}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#17241B] mt-1">
                  {activeDisease.name}
                </h2>
                <p className="text-xs italic text-[#5E7064] mt-0.5">Pathogen: {activeDisease.pathogen}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDisease(null)}
                className="p-2 rounded-lg border border-[#DCE4D8] text-[#17241B] hover:bg-[#F2F5F0] cursor-pointer"
                aria-label="Close disease details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-5 text-sm">
              <div>
                <h3 className="font-display font-bold text-[#17241B]">Symptoms</h3>
                <p className="text-[#46574C] mt-1.5 leading-relaxed">{activeDisease.symptoms}</p>
              </div>
              <div>
                <h3 className="font-display font-bold text-[#17241B]">Causes & Conditions</h3>
                <p className="text-[#46574C] mt-1.5 leading-relaxed">{activeDisease.causes}</p>
              </div>
              <div className="sm:col-span-2 p-4 rounded-xl bg-[#F2F5F0] border border-[#DCE4D8]">
                <h3 className="font-display font-bold text-[#17241B]">Preventive Practices</h3>
                <p className="text-[#314136] mt-1 leading-relaxed">{activeDisease.prevention}</p>
              </div>
              <div>
                <h3 className="font-display font-bold text-[#15803D]">Organic Control Methods</h3>
                <p className="text-[#46574C] mt-1.5 leading-relaxed">{activeDisease.organic_treatment}</p>
              </div>
              <div>
                <h3 className="font-display font-bold text-[#17241B]">Chemical Control Reference</h3>
                <p className="text-[#46574C] mt-1.5 leading-relaxed">{activeDisease.chemical_treatment}</p>
              </div>
            </div>

            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {t(lang, 'disclaimerBody')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
