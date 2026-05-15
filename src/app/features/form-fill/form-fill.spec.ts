import { ComponentFixture, TestBed } from "@angular/core/testing";

import { FormFill } from "./form-fill";

describe("FormFill", () => {
  let component: FormFill;
  let fixture: ComponentFixture<FormFill>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFill],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFill);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
