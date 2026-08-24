import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { UserType } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(
    this.storage.getItem<boolean>('isLoggedIn') ?? false
  );
  readonly isLoggedIn$: Observable<boolean> = this.isLoggedInSubject.asObservable();

  private readonly userTypeSubject = new BehaviorSubject<UserType | null>(
    this.storage.getItem<UserType>('userType')
  );
  readonly userType$: Observable<UserType | null> = this.userTypeSubject.asObservable();

  login(userType: UserType, pin: string): boolean {
    if (pin.length === 4) {
      this.storage.setItem('isLoggedIn', true);
      this.storage.setItem('userType', userType);
      this.isLoggedInSubject.next(true);
      this.userTypeSubject.next(userType);
      return true;
    }
    return false;
  }

  logout(): void {
    this.storage.removeItem('isLoggedIn');
    this.storage.removeItem('userType');
    this.isLoggedInSubject.next(false);
    this.userTypeSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.isLoggedInSubject.value;
  }

  getCurrentUserType(): UserType | null {
    return this.userTypeSubject.value;
  }
}
