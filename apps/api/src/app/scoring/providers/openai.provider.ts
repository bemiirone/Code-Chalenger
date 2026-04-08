import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ScoreRequest, ScoreResponse } from './ai-provider.interface';
import { buildScoringSystemPrompt, buildScoringUserPrompt } from '../scoring.prompts';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private config: ConfigService) {}

  async score(request: ScoreRequest): Promise<ScoreResponse> {
    const apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    const systemPrompt = buildScoringSystemPrompt(request.language, request.targetVersion);
    const userPrompt = buildScoringUserPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`OpenAI error: ${err}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content) as { score: number; feedback: string };
    return { score: Math.min(100, Math.max(0, parsed.score)), feedback: parsed.feedback };
  }
}
