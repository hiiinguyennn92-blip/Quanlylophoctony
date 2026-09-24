import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

export const PRIMARY_MODEL = 'gemini-3.8-flash';
export const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Generate content with automatic resilience against 503/429/high-demand errors,
 * dynamically failing over across healthy Gemini models.
 */
export async function generateContentWithRetry(
  request: Parameters<GoogleGenAI['models']['generateContent']>[0]
): Promise<ReturnType<GoogleGenAI['models']['generateContent']>> {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured or available.');
  }

  const ai = getGeminiClient();
  const requestedModel = request.model || PRIMARY_MODEL;

  // Build ordered list of unique models to try
  const modelsToTry = Array.from(
    new Set([requestedModel, PRIMARY_MODEL, ...FALLBACK_MODELS])
  );

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Model ${modelName} request timed out (5s).`)), 5000)
      );
      const response = (await Promise.race([
        ai.models.generateContent({
          ...request,
          model: modelName,
        }),
        timeoutPromise,
      ])) as any;
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || '');
      const errStatus = err?.status || err?.code || '';
      const isTemporary =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('429') ||
        errStatus === 503 ||
        errStatus === 'UNAVAILABLE' ||
        errStatus === 429 ||
        errStatus === 'RESOURCE_EXHAUSTED';

      if (isTemporary) {
        console.warn(`Model ${modelName} temporary spike/unavailable (${errStatus}): trying next model...`);
        // Short pause to allow socket cleanup
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // If it's a non-temporary validation error, break
      console.error(`Model ${modelName} non-recoverable error:`, errMsg);
      break;
    }
  }

  // If initial failover pass was exhausted due to temporary spikes across all models, do 1 retry with backoff on primary
  try {
    console.warn(`All models experienced spikes, attempting final backoff retry with ${PRIMARY_MODEL}...`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Final retry timed out (5s).`)), 5000)
    );
    return (await Promise.race([
      ai.models.generateContent({
        ...request,
        model: PRIMARY_MODEL,
      }),
      timeoutPromise,
    ])) as any;
  } catch (finalErr: any) {
    throw lastError || finalErr || new Error('Hệ thống AI hiện đang có lượng truy cập cao. Xin vui lòng thử lại sau giây lát.');
  }
}
