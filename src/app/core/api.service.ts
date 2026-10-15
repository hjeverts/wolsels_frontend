import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  Animal,
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

class HarvestResource extends Resource<Harvest, HarvestRequest> {
  summary(year?: number): Observable<ProductionSummary> {
    return this.http.get<ProductionSummary>(`${this.url}/summary`, {
      params: year ? { year } : {},
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  readonly wools = new Resource<Wool, WoolRequest>(this.http, '/api/wools');
  readonly blends = new Resource<Blend, BlendRequest>(this.http, '/api/blends');
  readonly locations = new Resource<Location, LocationRequest>(this.http, '/api/locations');
  readonly animals = new Resource<Animal, AnimalRequest>(this.http, '/api/animals');
  readonly harvests = new HarvestResource(this.http, '/api/harvests');

  readonly settings$: Observable<Settings> = this.http
    .get<Settings>('/api/settings')
    .pipe(shareReplay(1));
}
