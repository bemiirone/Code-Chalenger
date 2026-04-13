import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  let service: ChallengesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChallengesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getLanguages GETs /api/challenges/languages', async () => {
    const languages = [
      { language: 'angular-ts', difficulties: ['Easy', 'Medium', 'Hard'] },
      { language: 'typescript', difficulties: ['Easy'] },
    ];
    const p = service.getLanguages();
    const req = http.expectOne('/api/challenges/languages');
    expect(req.request.method).toBe('GET');
    req.flush(languages);
    expect(await p).toEqual(languages);
  });
});
