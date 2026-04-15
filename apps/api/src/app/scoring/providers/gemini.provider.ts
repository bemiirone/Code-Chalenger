import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ScoreRequest, ScoreResponse } from './ai-provider.interface';
import { buildScoringSystemPrompt, buildScoringUserPrompt } from '../scoring.prompts';
import { ProviderResourceExhaustedError } from './provider-errors';

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private config: ConfigService) {}

  async score(request: ScoreRequest): Promise<ScoreResponse> {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
    const systemPrompt = buildScoringSystemPrompt(request.language, request.targetVersion);
    const userPrompt = buildScoringUserPrompt(request);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              score: { type: 'integer' },
              feedback: { type: 'string' },
            },
            required: ['score', 'feedback'],
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`Gemini error: ${err}`);
      if (response.status === 429 || response.status === 503) {
        throw new ProviderResourceExhaustedError('Gemini', response.status, `Gemini API error: ${response.status}`);
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const text = data.candidates[0].content.parts[0].text;
    let parsed: { score: number; feedback: string };
    try {
      parsed = JSON.parse(text) as { score: number; feedback: string };
    } catch {
      this.logger.error(`Gemini JSON parse failed. Raw response: ${text}`);
      throw new Error('Could not parse Gemini scoring response');
    }
    return { score: Math.min(100, Math.max(0, parsed.score)), feedback: parsed.feedback };
  }
}
