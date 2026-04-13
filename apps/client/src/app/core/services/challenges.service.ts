import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LanguageInfo } from '@code-challenger/shared';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ChallengesService {
  constructor(private http: HttpClient) {}

  getLanguages(): Promise<LanguageInfo[]> {
    return firstValueFrom(this.http.get<LanguageInfo[]>(`${API}/challenges/languages`));
  }
}
