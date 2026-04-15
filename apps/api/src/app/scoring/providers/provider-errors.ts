export class ProviderResourceExhaustedError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderResourceExhaustedError';
  }
}
