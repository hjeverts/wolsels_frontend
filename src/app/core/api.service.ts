import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { HouseholdService } from './household.service';
import {
  Animal,
  AnimalImportRequest,
  AnimalImportResult,
  AnimalRequest,
  Blend,
  BlendRequest,
  Harvest,
  HarvestRequest,
  Location,
  LocationRequest,
  ProductionSummary,
  Settings,
  Wool,
  WoolRequest,
} from './models';

class Resource<T, TRequest> {
  constructor(
    protected readonly http: HttpClient,
    protected readonly url: string,
  ) {}

  list(params?: Record<string, string | number>): Observable<T[]> {
    return this.http.get<T[]>(this.url, { params: params && new HttpParams({ fromObject: params }) });
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  save(id: number | null, request: TRequest): Observable<T> {
    return id === null
      ? this.http.post<T>(this.url, request)
      : this.http.put<T>(`${this.url}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

class WoolResource extends Resource<Wool, WoolRequest> {
  constructor(
    http: HttpClient,
    url: string,
    private readonly households: HouseholdService,
  ) {
    super(http, url);
  }

  /** Merges a lot into another one; returns the remaining lot. */
  merge(id: number, targetWoolId: number): Observable<Wool> {
    return this.http.post<Wool>(`${this.url}/${id}/merge`, { targetWoolId });
  }

  /** Uploads an (already resized) photo with thumbnail; returns the id of the photo. */
  uploadPhoto(woolId: number, photo: Blob, thumbnail: Blob): Observable<number> {
    const form = new FormData();
    form.append('photo', photo, 'foto.jpg');
    form.append('thumbnail', thumbnail, 'miniatuur.jpg');
    return this.http.post<number>(`${this.url}/${woolId}/photos`, form);
  }

  deletePhoto(woolId: number, photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${woolId}/photos/${photoId}`);
  }

  /**
   * URL for an &lt;img&gt;. An image cannot send an X-Household header, so the household is
   * in the URL (the server checks membership the same way).
   */
  photoUrl(woolId: number, photoId: number, thumbnail = false): string {
    const params = new URLSearchParams();
    if (thumbnail) params.set('size', 'thumb');
    const household = this.households.activeId();
    if (household) params.set('household', String(household));
    const query = params.toString();
    return `${this.url}/${woolId}/photos/${photoId}${query ? `?${query}` : ''}`;
  }
}

class AnimalResource extends Resource<Animal, AnimalRequest> {
  /** Imports animals in one go; on an error nothing is saved. */
  import(request: AnimalImportRequest): Observable<AnimalImportResult> {
    return this.http.post<AnimalImportResult>(`${this.url}/import`, request);
  }
}

class HarvestResource extends Resource<Harvest, HarvestRequest> {
  deleteHarvest(id: number, removeFromStock: boolean): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, { params: { removeFromStock } });
  }

  summary(year?: number): Observable<ProductionSummary> {
    return this.http.get<ProductionSummary>(`${this.url}/summary`, {
      params: year ? { year } : {},
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  readonly wools = new WoolResource(this.http, '/api/wools', inject(HouseholdService));
  readonly blends = new Resource<Blend, BlendRequest>(this.http, '/api/blends');
  readonly locations = new Resource<Location, LocationRequest>(this.http, '/api/locations');
  readonly animals = new AnimalResource(this.http, '/api/animals');
  readonly harvests = new HarvestResource(this.http, '/api/harvests');

  readonly settings$: Observable<Settings> = this.http
    .get<Settings>('/api/settings')
    .pipe(shareReplay(1));
}
