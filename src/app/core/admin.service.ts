import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AdminUser } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/admin/users';

  users(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.url);
  }

  block(id: string, blocked: boolean): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/${blocked ? 'block' : 'unblock'}`, {});
  }

  resetTwoFactor(id: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/reset-2fa`, {});
  }

  passwordResetUrl(id: string): Observable<string> {
    return this.http
      .post<{ path: string }>(`${this.url}/${id}/password-reset`, {})
      .pipe(map((r) => window.location.origin + r.path));
  }

  setAdmin(id: string, isAdmin: boolean): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/admin`, { isAdmin });
  }

  deletePreview(id: string): Observable<{ householdsDeleted: { name: string; items: number }[] }> {
    return this.http.get<{ householdsDeleted: { name: string; items: number }[] }>(`${this.url}/${id}/delete-preview`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
