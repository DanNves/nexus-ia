// Serves the official Angular build (copied from DanNves/nexus-ia frontend/) for every page.
import html from '../nexus-angular.html?raw';

export function angularShell() {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
