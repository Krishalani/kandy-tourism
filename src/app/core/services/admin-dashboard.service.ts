import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../api/api';
import { AdminDashboard } from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  get(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(apiUrl('/admin/dashboard'));
  }
}
