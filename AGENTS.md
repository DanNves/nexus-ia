<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Render the NEXUS preview through TanStack Start React routes while keeping the upstream Angular implementation as a read-only reference; the preview runtime cannot run Angular CLI.
- Keep NEXUS demo records and browser-local interactions in a React context shared by preview views; this mirrors the upstream MVP without adding an unrequested backend.
