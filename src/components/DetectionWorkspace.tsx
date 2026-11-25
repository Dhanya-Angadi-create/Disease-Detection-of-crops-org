import {
  AlertTriangle,
  BookmarkCheck,
  CheckCircle2,
  Download,
  FileWarning,
  ImagePlus,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { t } from '../i18n/translations';
import type { DetectionResult, Language, PageRoute, User } from '../types';
import { downloadDetectionPdfReport } from '../utils/pdfReport';

interface DetectionWorkspaceProps {
  lang: Language;
  token: string | null;
  user: User | null;
  initialResult: DetectionResult | null;
  onClearInitialResult: () => void;
  onNavigate: (page: PageRoute) => void;
  onSavedReport?: () => void;
}

const SAMPLE_PHOTOS = [
  {
    label: 'Tomato Early Blight Sample',
    cropHint: 'Tomato',
    path: '/src/assets/images/disease_tomato_blight_1795616494383.jpg',
  },
  {
    label: 'Rice Blast Sample',
    cropHint: 'Rice',
    path: '/src/assets/images/disease_rice_blast_1795616494031.jpg',
  },
  {
    label: 'Healthy Leaf Baseline',
    cropHint: 'auto',
    path: '/src/assets/images/crop_leaf_scan_demo_1795616492401.jpg',
  },
];

export function DetectionWorkspace({
  lang,
  token,
  user,
  initialResult,
  onClearInitialResult,
  onNavigate,
  onSavedReport,
}: DetectionWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [samplePath, setSamplePath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [cropHint, setCropHint] = useState<string>('auto');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<DetectionResult | null>(initialResult);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string>('');

  const handleFile = (file: File) => {
    setErrorMsg('');
    setSavedNotice('');
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Unsupported file type. Please upload a JPG, JPEG, or PNG crop leaf image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('File exceeds 8 MB maximum size limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
        setSamplePath('');
        setFileName(file.name);
        setResult(null);
        onClearInitialResult();
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSelectSample = (sample: (typeof SAMPLE_PHOTOS)[number]) => {
    setErrorMsg('');
    setSavedNotice('');
    setPreviewUrl(sample.path);
    setSamplePath(sample.path);
    setFileName(sample.label);
    setCropHint(sample.cropHint);
    setResult(null);
    onClearInitialResult();
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    setSamplePath('');
    setFileName('');
    setErrorMsg('');
    setSavedNotice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!previewUrl) {
      setErrorMsg('Please upload or select a crop leaf image first.');
      return;
    }
    setErrorMsg('');
    setSavedNotice('');
    setAnalyzing(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = samplePath
        ? { sampleAssetPath: samplePath, cropHint, language: lang }
        : { imageDataUrl: previewUrl, cropHint, language: lang };

      const res = await fetch('/api/detect', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Image analysis failed. Please try again.');
        return;
      }
      setResult(data as DetectionResult);
    } catch {
      setErrorMsg('Network error while connecting to the diagnostic service.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveReport = async () => {
    if (!result) return;
    if (!token || !user) {
      onNavigate('auth');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          detectionId: result.detectionId,
          title: `${result.cropDetected} — ${result.diseaseDetected}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save report.');
        return;
      }
      setSavedNotice(data.alreadySaved ? 'Already saved in your Farmer Dashboard.' : t(lang, 'savedSuccess'));
      if (onSavedReport) onSavedReport();
    } catch {
      setErrorMsg('Network error while saving report.');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    handleRemoveImage();
    setResult(null);
    onClearInitialResult();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E1E8DD] pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17241B]">
            {t(lang, 'detectHeading')}
          </h1>
          <p className="text-sm sm:text-base text-[#526358] mt-2 max-w-2xl">{t(lang, 'detectSub')}</p>
        </div>
        {result && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#CBD6C5] bg-white text-sm font-semibold text-[#17241B] hover:bg-[#F2F5F0] cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            {t(lang, 'analyzeAnother')}
          </button>
        )}
      </div>

      {/* Upload & Preview Panel when no result yet (or while analyzing) */}
      {!result && (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#15803D] bg-[#EEF5EC]'
                  : 'border-[#CBD6C5] bg-white hover:border-[#8FB38A]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              {!previewUrl ? (
                <div className="py-8 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-[#F2F5F0] border border-[#DCE4D8] flex items-center justify-center text-[#15803D]">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[#17241B]">{t(lang, 'dropzoneText')}</p>
                    <p className="text-xs text-[#526358]">Accepted formats: JPG, JPEG, PNG · Max 8 MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4" />
                    {t(lang, 'browseBtn')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-[#DCE4D8] bg-[#F2F5F0] max-h-[380px] flex items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Preview of uploaded crop leaf"
                      referrerPolicy="no-referrer"
                      className="max-h-[380px] w-auto object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs font-medium text-[#526358] truncate max-w-xs">{fileName}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-lg border border-[#CBD6C5] bg-white text-xs font-semibold text-[#17241B] hover:bg-[#F2F5F0] cursor-pointer"
                      >
                        {t(lang, 'replaceBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t(lang, 'removeBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-white border border-[#E1E8DD] flex flex-wrap items-end justify-between gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-[#314136] mb-1.5">
                  {t(lang, 'cropHintLabel')}
                </label>
                <select
                  value={cropHint}
                  onChange={(e) => setCropHint(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm bg-white focus:outline-none focus:border-[#15803D]"
                >
                  <option value="auto">{t(lang, 'cropHintAuto')}</option>
                  <option value="Tomato">Tomato</option>
                  <option value="Potato">Potato</option>
                  <option value="Rice">Rice</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Maize">Maize</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Chilli">Chilli</option>
                  <option value="Grapes">Grapes</option>
                </select>
              </div>

              <button
                type="button"
                disabled={!previewUrl || analyzing}
                onClick={handleAnalyze}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t(lang, 'analyzingBtn')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {t(lang, 'analyzeBtn')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right column: Sample field photos + photo capture guidelines */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E1E8DD] space-y-4">
              <h2 className="font-display text-lg font-bold text-[#17241B]">{t(lang, 'sampleTestTitle')}</h2>
              <p className="text-xs text-[#526358]">
                Click any verified botanical reference image below to test live AI pathology diagnosis immediately.
              </p>
              <div className="space-y-3">
                {SAMPLE_PHOTOS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`w-full flex items-center gap-3.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      samplePath === sample.path
                        ? 'border-[#15803D] bg-[#EEF5EC]'
                        : 'border-[#E1E8DD] hover:border-[#9EB598] bg-[#FAFBF9]'
                    }`}
                  >
                    <img
                      src={sample.path}
                      alt={sample.label}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 rounded-lg object-cover border border-[#DCE4D8] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#17241B] truncate">{sample.label}</p>
                      <p className="text-xs text-[#526358]">
                        Crop hint: {sample.cropHint === 'auto' ? 'Auto-detect' : sample.cropHint}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#F2F5F0] border border-[#DCE4D8] space-y-3">
              <h3 className="font-display text-base font-bold text-[#17241B]">
                Field Photography Tips
              </h3>
              <ul className="space-y-2 text-xs text-[#46574C] leading-relaxed">
                <li>1. Photograph a single leaf against a neutral background in bright natural daylight.</li>
                <li>2. Keep the camera 15–25 cm away so concentric rings, spots, or powdery mildew are sharp.</li>
                <li>3. Include both diseased lesions and surrounding green leaf tissue for clear contrast.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Results Dashboard */}
      {result && (
        <div className="space-y-8">
          {!result.isValidLeafImage && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3.5 text-amber-950">
              <FileWarning className="w-6 h-6 shrink-0 text-amber-700 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-bold">Image Quality or Subject Warning</h2>
                <p className="text-sm mt-1">
                  {result.qualityWarning ||
                    'This image does not appear to show a clear crop leaf. Please upload a focused daylight photo of plant foliage.'}
                </p>
              </div>
            </div>
          )}

          {result.isValidLeafImage && result.qualityWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
              <p>{result.qualityWarning}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Uploaded Photo + Actions */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl overflow-hidden border border-[#DCE4D8] bg-white p-3">
                <img
                  src={result.imageUrl || previewUrl}
                  alt={`${result.cropDetected} leaf uploaded for analysis`}
                  referrerPolicy="no-referrer"
                  className="w-full h-72 object-cover rounded-xl bg-[#F2F5F0]"
                />
                <div className="px-2 pt-3 pb-1 flex items-center justify-between text-xs text-[#526358]">
                  <span>Scan ID: #AC-{result.detectionId}</span>
                  <span className="font-mono tabular-nums">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <button
                  type="button"
                  onClick={() => downloadDetectionPdfReport(result, user?.name)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {t(lang, 'downloadPdf')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveReport}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#CBD6C5] bg-white text-[#17241B] text-sm font-semibold hover:bg-[#F2F5F0] transition-colors cursor-pointer"
                >
                  <BookmarkCheck className="w-4 h-4 text-[#15803D]" />
                  {saving ? 'Saving...' : user ? t(lang, 'saveResult') : 'Sign In to Save Result'}
                </button>
              </div>

              {savedNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>{savedNotice}</span>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Diagnostic Summary & Recommendations */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E1E8DD] space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#526358]">
                      Crop: {result.cropDetected} · Model: {result.modelUsed}
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B] mt-1">
                      {result.diseaseDetected}
                    </h2>
                  </div>

                  <div className="text-right">
                    <p className="font-mono tabular-nums text-2xl font-bold text-[#17241B]">
                      {result.confidence}%
                    </p>
                    <p className="text-xs text-[#526358]">Prediction Confidence</p>
                  </div>
                </div>

                {/* Semantic status line (text + color, never color alone) */}
                <div className="flex flex-wrap items-center gap-6 py-3 border-y border-[#EDF2EA] text-sm">
                  <div className="flex items-center gap-2">
                    {result.isHealthy ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                    )}
                    <span className="font-semibold text-[#17241B]">
                      Health Status: {result.isHealthy ? 'Healthy Tissue' : 'Pathology Detected'}
                    </span>
                  </div>
                  <div className="text-[#46574C]">
                    Severity Assessment: <span className="font-semibold text-[#17241B]">{result.severity}</span>
                  </div>
                </div>

                <p className="text-sm text-[#314136] leading-relaxed">{result.description}</p>

                {result.alternativePredictions && result.alternativePredictions.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-[#526358] mb-2">
                      Alternative Differential Possibilities
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-[#314136]">
                      {result.alternativePredictions.map((alt) => (
                        <span key={alt.disease} className="font-medium">
                          {alt.disease}{' '}
                          <span className="font-mono tabular-nums text-[#526358]">({alt.confidence}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Pathology Grid */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                  <h3 className="font-display text-base font-bold text-[#17241B]">Visible Symptoms</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#46574C]">
                    {result.visibleSymptoms.map((s) => (
                      <li key={s} className="leading-relaxed">• {s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                  <h3 className="font-display text-base font-bold text-[#17241B]">Possible Causes</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#46574C]">
                    {result.possibleCauses.map((c) => (
                      <li key={c} className="leading-relaxed">• {c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-white border border-[#E1E8DD]">
                  <h3 className="font-display text-base font-bold text-[#17241B]">Preventive Measures</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#46574C]">
                    {result.preventiveMeasures.map((p) => (
                      <li key={p} className="leading-relaxed">• {p}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-[#F2F5F0] border border-[#DCE4D8]">
                  <h3 className="font-display text-base font-bold text-[#15803D]">Organic Control Methods</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#314136]">
                    {result.organicControls.map((o) => (
                      <li key={o} className="leading-relaxed">• {o}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-white border border-[#E1E8DD]">
                <h3 className="font-display text-base font-bold text-[#17241B]">
                  Chemical Treatment Guidance
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-[#46574C]">
                  {result.chemicalTreatments.map((ch) => (
                    <li key={ch} className="leading-relaxed">• {ch}</li>
                  ))}
                </ul>
              </div>

              {/* Mandatory Safety Disclaimer */}
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-amber-950">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">{t(lang, 'disclaimerTitle')}</h4>
                  <p className="text-xs leading-relaxed mt-1">{t(lang, 'disclaimerBody')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
