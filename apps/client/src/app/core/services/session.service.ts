import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Session, StartSessionDto, SubmitAnswerDto, ScoringResult } from '@code-challenger/shared';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly activeSession = signal<Session | null>(null);
  readonly currentChallengeIndex = signal(0);
  readonly isLoading = signal(false);

  constructor(private http: HttpClient) {}

  async startSession(dto: StartSessionDto): Promise<Session> {
    this.isLoading.set(true);
    try {
      const session = await firstValueFrom(
        this.http.post<Session>(`${API}/sessions`, dto),
      );
      this.activeSession.set(session);
      this.currentChallengeIndex.set(0);
      return session;
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitAnswer(dto: SubmitAnswerDto): Promise<ScoringResult> {
    return firstValueFrom(
      this.http.post<ScoringResult>(`${API}/sessions/submit`, dto),
    );
  }

  async loadSession(id: string): Promise<Session> {
    const session = await firstValueFrom(
      this.http.get<Session>(`${API}/sessions/${id}`),
    );
    this.activeSession.set(session);
    return session;
  }

  async listSessions(): Promise<Session[]> {
    return firstValueFrom(this.http.get<Session[]>(`${API}/sessions`));
  }

  advanceChallenge(): void {
    this.currentChallengeIndex.update((i) => i + 1);
  }
}
