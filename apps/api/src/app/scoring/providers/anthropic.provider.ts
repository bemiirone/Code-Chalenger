import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ScoreRequest, ScoreResponse } from './ai-provider.interface';
import { buildScoringSystemPrompt, buildScoringUserPrompt } from '../scoring.prompts';

@Injectable()
export class AnthropicProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private config: ConfigService) {}

  async score(request: ScoreRequest): Promise<ScoreResponse> {
    const apiKey = this.config.getOrThrow<string>('ANTHROPIC_API_KEY');
    const systemPrompt = buildScoringSystemPrompt(request.language, request.targetVersion);
    const userPrompt = buildScoringUserPrompt(request);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`Anthropic error: ${err}`);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
    };
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse Anthropic scoring response');
    const parsed = JSON.parse(jsonMatch[0]) as { score: number; feedback: string };
    return { score: Math.min(100, Math.max(0, parsed.score)), feedback: parsed.feedback };
  }
}
