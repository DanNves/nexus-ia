import { Component, input } from '@angular/core';

@Component({
  selector: 'nx-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('home') { <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/> }
        @case ('demand') { <rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/><path d="M8 3.5h8"/> }
        @case ('activity') { <circle cx="5" cy="12" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 12h3l2-5 3 9 2-4h2"/> }
        @case ('requirement') { <rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/> }
        @case ('solution') { <path d="m12 3 8 4-8 4-8-4z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/> }
        @case ('ticket') { <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a2.5 2.5 0 0 0 0 5v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3a2.5 2.5 0 0 0 0-5z"/><path d="M9 7h6M9 12h4M9 16h6"/> }
        @case ('knowledge') { <path d="M5 5a3 3 0 0 1 3-2h11v18H8a3 3 0 0 1-3-3z"/><path d="M8 3v18"/><path d="M11 8h5M11 12h5M11 16h3"/> }
        @case ('chart') { <path d="M4 19V5M4 19h16"/><path d="M8 16v-4M12 16V8M16 16v-7"/> }
        @case ('settings') { <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5-1.5.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2h-.2a1.7 1.7 0 0 0-1.6 1z"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/> }
        @case ('bell') { <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16"/> }
        @case ('more') { <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/> }
        @case ('arrow') { <path d="M5 12h14M13 6l6 6-6 6"/> }
        @case ('close') { <path d="m6 6 12 12M18 6 6 18"/> }
        @case ('check') { <circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/> }
        @case ('spark') { <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7z"/><path d="m19 16 .6 1.9L21.5 18l-1.9.6L19 20.5l-.6-1.9-1.9-.6 1.9-.6z"/> }
        @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 3.5a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/> }
        @case ('message') { <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-4-.9L4 20l1.5-3.4A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5z"/><path d="M8 11h8M8 14h5"/> }
        @case ('link') { <path d="M9.5 14.5 14.5 9.5"/><path d="M7.5 17.5 5.8 19.2a4 4 0 0 1-5.7-5.7l3.5-3.5a4 4 0 0 1 5.7 0"/><path d="m16.5 6.5 1.7-1.7a4 4 0 0 1 5.7 5.7l-3.5 3.5a4 4 0 0 1-5.7 0"/> }
      }
    </svg>`,
})
export class NxIconComponent {
  name = input.required<string>();
  size = input(16);
  stroke = input(1.8);
}