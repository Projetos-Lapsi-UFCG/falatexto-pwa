import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { DisplayValuePipe } from './display-value.pipe';

describe('DisplayValuePipe', () => {
  let pipe: DisplayValuePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DisplayValuePipe,
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    pipe = TestBed.inject(DisplayValuePipe);
  });

  it('renders an em dash for null, undefined, and empty string', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform('')).toBe('—');
  });

  it('translates booleans to yes/no keys', () => {
    expect(pipe.transform(true)).toBe('SUBMISSIONS.DETAIL.YES');
    expect(pipe.transform(false)).toBe('SUBMISSIONS.DETAIL.NO');
  });

  it('joins non-empty arrays with a comma', () => {
    expect(pipe.transform(['a', 'b'])).toBe('a, b');
  });

  it('renders an em dash for an empty array', () => {
    expect(pipe.transform([])).toBe('—');
  });

  it('stringifies numbers and strings', () => {
    expect(pipe.transform(42)).toBe('42');
    expect(pipe.transform('hello')).toBe('hello');
  });

  it('falls back to JSON for plain objects', () => {
    expect(pipe.transform({ nested: true })).toBe(JSON.stringify({ nested: true }));
  });
});
