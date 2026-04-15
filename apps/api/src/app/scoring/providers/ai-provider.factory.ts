import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';

@Injectable()
export class AiProviderFactory {
  constructor(
    private config: ConfigService,
    private anthropic: AnthropicProvider,
    private gemini: GeminiProvider,
  ) {}

  getProvider(): AiProvider {
    const name = this.config.get<string>('AI_PROVIDER', 'gemini');
    if (name === 'anthropic') return this.anthropic;
    return this.gemini;
  }

  getFallbackProvider(): AiProvider | null {
    const name = this.config.get<string>('AI_PROVIDER', 'openai');
    if (name === 'gemini') return this.anthropic;
    if (name === 'anthropic') return this.gemini;
    return null;
  }
}
