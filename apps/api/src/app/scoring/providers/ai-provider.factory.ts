import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { OpenAiProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';

@Injectable()
export class AiProviderFactory {
  constructor(
    private config: ConfigService,
    private openAi: OpenAiProvider,
    private anthropic: AnthropicProvider,
  ) {}

  getProvider(): AiProvider {
    const name = this.config.get<string>('AI_PROVIDER', 'openai');
    if (name === 'anthropic') return this.anthropic;
    return this.openAi;
  }
}
