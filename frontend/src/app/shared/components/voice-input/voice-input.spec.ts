import { ComponentFixture, TestBed } from "@angular/core/testing";

import { VoiceInput } from "./voice-input";

describe("VoiceInput", () => {
  let component: VoiceInput;
  let fixture: ComponentFixture<VoiceInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoiceInput],
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
