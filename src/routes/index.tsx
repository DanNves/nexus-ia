import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte" },
      {
        name: "description",
        content:
          "Plataforma web que preserva o contexto produzido durante o desenvolvimento de uma solução de software e o utiliza no atendimento de chamados de suporte, com IA generativa e validação humana.",
      },
      {
        property: "og:title",
        content: "NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte",
      },
      {
        property: "og:description",
        content:
          "Preservar o contexto criado durante o desenvolvimento para apoiar o atendimento de suporte com IA generativa e validação humana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const steps: Array<[string, string, string]> = [
  ["01", "Demanda", "Necessidade registrada e contextualizada."],
  ["02", "Requisitos", "Requisitos, regras e critérios relacionados."],
  ["03", "Versão", "Solução e versão vinculadas ao contexto."],
  ["04", "Chamado", "Atendimento conectado ao produto e à versão."],
  ["05", "Contexto", "Recuperação das informações relevantes."],
  ["06", "IA generativa", "Análise e sugestões baseadas no contexto."],
  ["07", "Validação", "Profissional aprova, edita ou rejeita."],
  ["08", "Conhecimento", "Solução validada disponível para reuso."],
];

const aiFocus = [
  "Classificação do chamado",
  "Possíveis causas",
  "Procedimentos e soluções",
  "Conhecimento relacionado",
];

const humanControl = [
  "Aprovar a sugestão",
  "Editar a sugestão",
  "Rejeitar a sugestão",
  "Consolidar conhecimento validado",
];

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="text-xs font-extrabold tracking-[0.12em] text-eyebrow">
      {children}
    </span>
  );
}

function Index() {
  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-16 pb-8">
        <header>
          <Eyebrow>TCC • MVP EM CONSTRUÇÃO</Eyebrow>
          <h1 className="mt-2 mb-1 text-[clamp(52px,8vw,86px)] leading-[0.95] font-bold tracking-[-0.06em]">
            NEXUS
          </h1>
          <p className="text-[clamp(18px,3vw,26px)] font-bold">
            Conexão entre Demanda, Desenvolvimento e Suporte
          </p>
          <p className="mt-4 max-w-[720px] text-[17px] leading-relaxed text-muted-foreground">
            Preservar o contexto criado durante o desenvolvimento para apoiar o
            atendimento de suporte com IA generativa e validação humana.
          </p>
        </header>

        <section className="mt-11 mb-14 flex flex-col items-start justify-between gap-4 rounded-[20px] border bg-card px-7 py-6 shadow-card sm:flex-row sm:items-center">
          <div>
            <Eyebrow>REGRA CENTRAL</Eyebrow>
            <h2 className="mt-2 text-xl font-semibold">
              IA sugere → humano valida → sistema consolida.
            </h2>
          </div>
          <span className="rounded-full bg-badge px-3 py-2 text-xs font-bold text-primary">
            MVP
          </span>
        </section>

        <section>
          <Eyebrow>FLUXO PRINCIPAL</Eyebrow>
          <h2 className="mt-2 text-2xl font-bold">
            Do desenvolvimento ao suporte
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            O contexto acompanha o chamado e alimenta a análise assistida.
          </p>
          <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, t, d]) => (
              <article
                key={n}
                className="min-h-[165px] rounded-[20px] border bg-card p-5 shadow-card"
              >
                <small className="font-extrabold text-eyebrow">{n}</small>
                <h3 className="mt-7 mb-2 font-semibold">{t}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {d}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2">
          <article className="rounded-[20px] border bg-card p-7 shadow-card">
            <Eyebrow>FOCO DA IA</Eyebrow>
            <h2 className="mt-2 mb-4 text-xl font-bold">
              Assistência no atendimento
            </h2>
            <ul className="list-disc space-y-2.5 pl-5 text-muted-foreground">
              {aiFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-[20px] border bg-card p-7 shadow-card">
            <Eyebrow>HUMANO NO CONTROLE</Eyebrow>
            <h2 className="mt-2 mb-4 text-xl font-bold">
              Validação obrigatória
            </h2>
            <ul className="list-disc space-y-2.5 pl-5 text-muted-foreground">
              {humanControl.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <footer className="mt-14 border-t pt-6 text-[13px] text-muted-foreground">
          NEXUS • Estrutura inicial do MVP
        </footer>
      </div>
    </main>
  );
}
