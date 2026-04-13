import { TestBed } from '@angular/core/testing';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { vi } from 'vitest';
import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BrowserModule] });
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new MarkdownPipe(sanitizer);
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('converts bold markdown to <strong>', () => {
    const spy = vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');
    pipe.transform('**bold text**');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('<strong>bold text</strong>'));
  });

  it('converts inline code to <code>', () => {
    const spy = vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');
    pipe.transform('use `ngOnInit`');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('<code'));
  });

  it('strips XSS script tags via DOMPurify', () => {
    const spy = vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');
    pipe.transform('<script>alert("xss")</script>safe text');
    const html = spy.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('safe text');
  });

  it('passes result through bypassSecurityTrustHtml', () => {
    const spy = vi.spyOn(sanitizer, 'bypassSecurityTrustHtml');
    pipe.transform('hello');
    expect(spy).toHaveBeenCalled();
  });
});
