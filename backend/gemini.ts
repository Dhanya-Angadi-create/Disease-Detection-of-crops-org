import { GoogleGenAI, Type } from '@google/genai';

export interface DiseasePredictionResult {
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

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add a valid Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function analyzeCropLeafImage(params: {
  base64Data: string;
  mimeType: string;
  cropHint?: string;
  language?: 'en' | 'kn';
}): Promise<DiseasePredictionResult> {
  const ai = getGeminiClient();
  const langLabel = params.language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English';
  const cropHintText =
    params.cropHint && params.cropHint !== 'auto'
      ? `The farmer indicated the crop may be: ${params.cropHint}. Verify visually whether this matches the image.`
      : 'Automatically identify the crop species from the leaf morphology if clearly recognizable.';

  const systemInstruction = `You are an expert agricultural plant pathologist and agronomy diagnostic model for AgroCare AI.
Analyze the submitted image carefully and honestly:
1. First verify whether the image actually shows a plant/crop leaf or foliage with sufficient visual clarity. If the image is NOT a plant/crop leaf (for example: a random object, person, blank wall, text screenshot, or extreme blur where pathology cannot be evaluated), set isValidLeafImage to false, explain why in qualityWarning, set confidence to 0, and avoid inventing a crop disease.
2. If it IS a recognizable crop leaf, set isValidLeafImage to true. Identify the crop species (e.g. Tomato, Potato, Rice, Wheat, Maize, Cotton, Chilli, Grapes, or the exact crop observed).
3. Distinguish healthy leaves (isHealthy: true, diseaseDetected: "Healthy Leaf", severity: "None") from diseased leaves.
4. Provide a realistic confidence percentage (0 to 100) reflecting visual certainty, plus up to 2 plausible alternative differential diagnoses when symptoms overlap.
5. Assess visible severity ("None", "Mild", "Moderate", "Severe", or "Indeterminate" if partial leaf).
6. Provide accurate, scientifically grounded plant pathology information: description, visibleSymptoms, possibleCauses, preventiveMeasures, organicControls, and chemicalTreatments (active ingredients and safe agronomic guidance only—do not fabricate dosage rates).
7. Write all narrative text fields in ${langLabel}. Keep cropDetected and diseaseDetected clear and standard.`;

  const modelQueue = ['gemini-4-hydrogen', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: unknown;
  let rawText = '';
  let activeModel = MODEL_NAME;

  for (let attempt = 0; attempt < modelQueue.length; attempt++) {
    activeModel = modelQueue[attempt];
    try {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.base64Data,
              },
            },
            {
              text: `Perform a plant pathology diagnostic assessment on this uploaded crop leaf image. ${cropHintText}`,
            },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValidLeafImage: {
                type: Type.BOOLEAN,
                description: 'True only if the image clearly shows plant foliage/leaves suitable for visual assessment.',
              },
              qualityWarning: {
                type: Type.STRING,
                description: 'Empty string if clear; otherwise a concise warning about blur, lighting, or non-leaf subject.',
              },
              cropDetected: {
                type: Type.STRING,
                description: 'Identified crop species name, or "Unrecognized" if not a leaf.',
              },
              diseaseDetected: {
                type: Type.STRING,
                description: 'Predicted disease name, "Healthy Leaf" if healthy, or "Unable to Diagnose" if invalid image.',
              },
              isHealthy: {
                type: Type.BOOLEAN,
                description: 'True if the leaf appears healthy with no significant disease lesions.',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence percentage from 0 to 100.',
              },
              severity: {
                type: Type.STRING,
                description: 'None, Mild, Moderate, Severe, or Indeterminate.',
              },
              alternativePredictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    disease: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                  },
                },
              },
              description: {
                type: Type.STRING,
                description: 'Concise agronomic overview of the diagnosis.',
              },
              visibleSymptoms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              possibleCauses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              preventiveMeasures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              organicControls: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              chemicalTreatments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'isValidLeafImage',
              'qualityWarning',
              'cropDetected',
              'diseaseDetected',
              'isHealthy',
              'confidence',
              'severity',
              'alternativePredictions',
              'description',
              'visibleSymptoms',
              'possibleCauses',
              'preventiveMeasures',
              'organicControls',
              'chemicalTreatments',
            ],
          },
        },
      });
      rawText = (response.text ?? '').trim();
      if (rawText) break;
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isTransient = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
      if (isTransient && attempt < modelQueue.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
        continue;
      }
      throw new Error(formatGeminiError(errMsg));
    }
  }

  if (!rawText) {
    const msg = lastError instanceof Error ? formatGeminiError(lastError.message) : '';
    throw new Error(msg || 'The AI analysis service returned an empty response. Please try again.');
  }

  const parsed = JSON.parse(rawText) as Omit<DiseasePredictionResult, 'modelUsed'>;
  return {
    ...parsed,
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    modelUsed: activeModel,
  };
}

function formatGeminiError(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error?.message) {
      return String(parsed.error.message);
    }
  } catch {
    // not JSON
  }
  if (rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    return 'The configured GEMINI_API_KEY is invalid or lacks permission. Please verify it in Settings > Secrets.';
  }
  return rawMessage || 'Unable to analyze leaf image right now. Please try again shortly.';
}
