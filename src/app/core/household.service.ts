import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { CreatedInvite, Household, HouseholdSummary, InviteInfo } from './models';

const STORAGE_KEY = 'wolsels.household';

/**
 * The active household. Each tab sends it with every API request (header X-Household, see the
 * interceptor); the server checks that you are a member of it.
 */
@Injectable({ providedIn: 'root' })
export class HouseholdService {
  private readonly http = inject(HttpClient);

  readonly households = signal<HouseholdSummary[]>([]);
  readonly activeId = signal<number | null>(readStored());
  readonly active = computed(() => this.households().find((h) => h.id === this.activeId()) ?? null);

  /** Loads the households and picks a valid active household. */
  load(): Observable<HouseholdSummary[]> {
    return this.http.get<HouseholdSummary[]>('/api/households').pipe(
      tap((list) => {
        this.households.set(list);
        if (!list.some((h) => h.id === this.activeId())) this.setActive(list[0]?.id ?? null);
      }),
    );
  }

  /** Switches household and reloads the app, so that no data of the previous household remains on screen. */
  switchTo(id: number, path = '/voorraad'): void {
    this.setActive(id);
    window.location.assign(path);
  }

  /** On a 403 'household-access': the stored household no longer belongs to this user. */
  forget(): void {
    this.setActive(null);
  }

  create(name: string): Observable<HouseholdSummary> {
    return this.http.post<HouseholdSummary>('/api/households', { name });
  }

  current(): Observable<Household> {
    return this.http.get<Household>('/api/household');
  }

  rename(name: string): Observable<void> {
    return this.http.put<void>('/api/household', { name }).pipe(
      tap(() => this.households.update((list) => list.map((h) => (h.id === this.activeId() ? { ...h, name } : h)))),
    );
  }

  createInvite(): Observable<CreatedInvite> {
    return this.http.post<CreatedInvite>('/api/household/invites', {});
  }

  revokeInvite(id: number): Observable<void> {
    return this.http.delete<void>(`/api/household/invites/${id}`);
  }

  inviteInfo(token: string): Observable<InviteInfo> {
    return this.http.get<InviteInfo>(`/api/household/invites/${encodeURIComponent(token)}`);
  }

  join(token: string): Observable<number> {
    return this.http
      .post<{ householdId: number; name: string }>('/api/household/join', { token })
      .pipe(map((r) => r.householdId));
  }

  leave(): Observable<void> {
    return this.http.post<void>('/api/household/leave', {});
  }

  removeMember(userId: string): Observable<void> {
    return this.http.delete<void>(`/api/household/members/${encodeURIComponent(userId)}`);
  }

  inviteUrl(token: string): string {
    return `${window.location.origin}/uitnodiging/${token}`;
  }

  private setActive(id: number | null): void {
    this.activeId.set(id);
    try {
      if (id === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Storage not available (private window): only remember it for this tab.
    }
  }
}

function readStored(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}
