import { createFileRoute } from '@tanstack/react-router';
import { angularShell } from '../lib/angular-shell';

export const Route = createFileRoute('/')({
  server: { handlers: { GET: () => angularShell() } },
});
