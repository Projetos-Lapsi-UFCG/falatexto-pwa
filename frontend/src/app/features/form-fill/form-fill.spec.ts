import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';
import { FormFillComponent } from './form-fill';

describe('FormFillComponent', () => {
  let component: FormFillComponent;
  let fixture: ComponentFixture<FormFillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFillComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'form_001' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFillComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
