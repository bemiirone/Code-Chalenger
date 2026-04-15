import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';

@Injectable()
export class AiProviderFactory {
  constructor(
    private config: ConfigService,
    private openAi: OpenAiProvider,
    private anthropic: AnthropicProvider,
    private gemini: GeminiProvider,
  ) {}

  getProvider(): AiProvider {
    const name = this.config.get<string>('AI_PROVIDER', 'openai');
    if (name === 'anthropic') return this.anthropic;
    if (name === 'gemini') return this.gemini;
    return this.openAi;
  }
}
