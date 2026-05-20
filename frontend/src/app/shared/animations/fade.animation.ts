import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
]);

export const fadeOut = trigger('fadeOut', [
  transition(':leave', [
    animate(
      '400ms ease-in',
      style({ opacity: 0, transform: 'translateY(-20px)' })
    ),
  ]),
]);

export const staggerFade = trigger('staggerFade', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        stagger('50ms', [
          animate(
            '400ms ease-out',
            style({ opacity: 1, transform: 'translateY(0)' })
          ),
        ]),
      ],
      { optional: true }
    ),
  ]),
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate(
      '500ms ease-out',
      style({ opacity: 1, transform: 'scale(1)' })
    ),
  ]),
]);

export const hoverScale = trigger('hoverScale', [
  transition('false => true', [
    animate('300ms ease-out', style({ transform: 'translateY(0)' })),
  ]),
  transition('true => false', [
    animate('300ms ease-in', style({ transform: 'translateY(0)' })),
  ]),
]);
