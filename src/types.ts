export type Language = 'en' | 'kn';

export type PageRoute =
  | 'home'
  | 'detect'
  | 'library'
  | 'dashboard'
  | 'admin'
  | 'about'
  | 'auth';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'farmer' | 'admin';
  language_pref: Language;
  created_at?: string;
}

export interface FarmerProfile {
  user_id: number;
  phone: string;
  village_district: string;
  state: string;
  farm_size_acres: number;
  primary_crops: string;
  updated_at?: string;
}

export interface CropItem {
  id: number;
  name: string;
  scientific_name: string;
  season: string;
  climate_zone: string;
  description: string;
  disease_count?: number;
}

export interface DiseaseItem {
  id: number;
  crop_id: number;
  crop_name: string;
  name: string;
  pathogen: string;
  category: 'Fungal' | 'Bacterial' | 'Viral' | 'Pest' | 'Healthy';
  severity_typical: string;
  image_url: string;
  symptoms: string;
  causes: string;
  prevention: string;
  organic_treatment: string;
  chemical_treatment: string;
}

export interface DetectionResult {
  detectionId: number;
  imageUrl: string;
  createdAt: string;
  isValidLeafImage: boolean;
  qualityWarning: string;
  cropDetected: string;
  diseaseDetected: string;
  isHealthy: boolean;
  confidence: number;
  severity: string;
  alternativePredictions: Array<{
    disease: string;
    confidence: number;
  }>;
  description: string;
  visibleSymptoms: string[];
  possibleCauses: string[];
  preventiveMeasures: string[];
  organicControls: string[];
  chemicalTreatments: string[];
  modelUsed: string;
}

export interface SavedReportRow {
  id: number;
  detection_id: number;
  title: string;
  notes: string;
  created_at: string;
  crop_detected: string;
  disease_detected: string;
  is_healthy: number;
  confidence: number;
  severity: string;
  image_data: string;
  description: string;
  symptoms_json: string;
  causes_json: string;
  prevention_json: string;
  organic_json: string;
  chemical_json: string;
  alternatives_json: string;
  quality_warning: string;
  model_used: string;
}

export interface ArticleItem {
  id: number;
  title: string;
  title_kn: string;
  category: string;
  summary: string;
  summary_kn: string;
  content: string;
  content_kn: string;
  read_time: string;
  published_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: 'info' | 'advisory' | 'alert';
  is_read: number;
  created_at: string;
}

export interface FeedbackItem {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  status: 'new' | 'reviewed';
  created_at: string;
}
