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
    const name = this.config.get<string>('AI_PROVIDER', 'anthropic');
    if (name === 'gemini') return this.gemini;
    return this.anthropic;
  }

  getFallbackProvider(): AiProvider | null {
    const name = this.config.get<string>('AI_PROVIDER', 'anthropic');
    if (name === 'anthropic') return this.gemini;
    if (name === 'gemini') return this.anthropic;
    return null;
  }
}
