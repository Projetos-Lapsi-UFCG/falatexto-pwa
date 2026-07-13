import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormFillComponent } from "./form-fill";

describe("FormFillComponent", () => {
  let component: FormFillComponent;
  let fixture: ComponentFixture<FormFillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFillComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});