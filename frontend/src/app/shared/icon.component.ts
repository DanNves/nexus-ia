import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Família de ícones oficial: traço no estilo Lucide (24x24, stroke 1.75). Não misturar com outra família.
@Component({
  selector: 'nx-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icone' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('home') { <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/> }
        @case ('demand') { <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/> }
        @case ('calendar') { <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/> }
        @case ('layers') { <path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/> }
        @case ('queue') { <path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/> }
        @case ('plus') { <path d="M12 5v14M5 12h14"/> }
        @case ('search') { <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/> }
        @case ('bell') { <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/> }
        @case ('menu') { <path d="M4 6h16M4 12h16M4 18h16"/> }
        @case ('close') { <path d="M18 6 6 18M6 6l12 12"/> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6"/> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6"/> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6"/> }
        @case ('arrow-left') { <path d="M19 12H5M12 19l-7-7 7-7"/> }
        @case ('check') { <path d="M20 6 9 17l-5-5"/> }
        @case ('check-circle') { <circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/> }
        @case ('x-circle') { <circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/> }
        @case ('spark') { <path d="M11 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 15c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/> }
        @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/> }
        @case ('user') { <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/> }
        @case ('clock') { <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/> }
        @case ('globe') { <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/> }
        @case ('monitor') { <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/> }
        @case ('phone') { <rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/> }
        @case ('plug') { <path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/> }
        @case ('upload') { <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/> }
        @case ('file') { <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/> }
        @case ('pause') { <circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/> }
        @case ('send') { <path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/> }
        @case ('play') { <circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/> }
        @case ('inbox') { <path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/> }
        @case ('refresh') { <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/> }
        @case ('pin') { <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/> }
        @case ('book') { <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/> }
        @case ('alert') { <path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/> }
        @case ('edit') { <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/> }
        @case ('list') { <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/> }
        @case ('board') { <rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/> }
        @case ('logout') { <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/> }
        @case ('swap') { <path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/> }
        @case ('printer') { <path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/> }
        @case ('sun') { <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/> }
        @case ('moon') { <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/> }
        @default { <circle cx="12" cy="12" r="2"/> }
      }
    </svg>`,
})
export class NxIconComponent {
  name = input.required<string>();
  size = input(18);
  stroke = input(1.75);
}
