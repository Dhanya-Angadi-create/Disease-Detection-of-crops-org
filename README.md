# AgroCare AI – Smart Crop Disease Detection System

AgroCare AI is a full-stack agricultural technology web application designed to help farmers detect crop leaf diseases early, inspect plant pathology reference profiles, export PDF field reports, and track farm health analytics in **English** and **Kannada (ಕನ್ನಡ)**.

## Architecture

- **Frontend (`src/`)**: React 19 + TypeScript + Tailwind CSS v4 + jsPDF for PDF field report generation.
- **Backend (`server.ts`, `backend/`)**: Express REST API, unified persistence layer (`backend/storage.ts`) supporting **Supabase PostgreSQL** (via server-side `@supabase/supabase-js`) with automatic local SQLite fallback, `scrypt` password hashing, HMAC-SHA256 bearer authentication, and role-based access control.
- **AI Vision Diagnostics (`backend/gemini.ts`)**: Server-side `@google/genai` multimodal analysis (`gemini-4-hydrogen`) that verifies leaf image quality, identifies crop species, separates healthy from diseased foliage, estimates severity, and returns structured preventive, organic, and chemical guidance.
- **Offline CNN Reference Pipeline (`machine_learning/`)**: Optional Python TensorFlow/Keras MobileNetV2 transfer-learning scripts (`train.py`, `predict.py`, `preprocess.py`) and SQL schema files (`supabase_schema.sql`, `database.sql`).

## Connecting Supabase Backend

1. Open your Supabase project's **SQL Editor** and run the full contents of `supabase_schema.sql` to create all tables (`users`, `farmer_profiles`, `crops`, `diseases`, `detections`, `saved_reports`, `feedback`, `notifications`, `articles`, `app_settings`, `password_resets`) with Row Level Security enabled.
2. In AI Studio **Settings > Secrets** (or your server `.env` file locally), add:
   - `SUPABASE_PROJECT_ID` = your Supabase project ID
   - `SUPABASE_SECRET_KEY` = your Supabase server secret key (`sb_secret_...`)
3. Restart the server. AgroCare AI automatically connects to Supabase and seeds initial crops, disease profiles, and agronomy articles if empty.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm start
```
