# NEXUS — Fluxo para apresentação à banca

## 1. Problema
O NEXUS parte da dificuldade de preservar, recuperar e utilizar o contexto produzido durante o desenvolvimento de uma solução de software no atendimento de chamados de suporte.

## 2. Pergunta de pesquisa
Como uma plataforma que preserva e recupera o contexto produzido durante o desenvolvimento de uma solução de software pode auxiliar o atendimento de chamados de suporte por meio de IA generativa com validação humana?

## 3. Fluxo central
**Demanda → Requisitos → Solução/Versão → Chamado → Recuperação do contexto → Sugestão da IA → Validação humana → Conhecimento**

### Demanda
A necessidade é registrada com solicitante, responsável, objetivo, prioridade e origem.

### Requisitos
A demanda é transformada em informação estruturada relacionada ao desenvolvimento.

### Solução e versão
O contexto fica associado à solução e à versão em que a mudança foi implementada.

### Chamado
Após a entrega, uma ocorrência de suporte é registrada e relacionada à solução/versão.

### Recuperação do contexto
O NEXUS recupera o contexto de todas as etapas relacionadas ao chamado: demanda, atividades, requisitos, solução/versão, chamados relacionados e conhecimentos validados. A recuperação percorre os vínculos registrados e também considera registros da mesma solução e versão.

### IA generativa
A IA está ativa dentro do atendimento dos chamados. Ela recebe o problema relatado e utiliza o contexto completo recuperado para classificar o chamado, sintetizar as evidências, sugerir possíveis causas e procedimentos e apontar conhecimentos relacionados. A tela de IA funciona como uma área de demonstração/inspeção, mas a IA também aparece diretamente no chamado. No protótipo atual, a geração é uma simulação controlada.

### Validação humana
O responsável pode aprovar ou rejeitar a sugestão. A IA não confirma a causa nem executa ação crítica de forma autônoma.

### Conhecimento
Uma solução validada pode ser registrada como conhecimento reutilizável. O item mantém origem no chamado, solução, versão, responsável pela validação, data/revisão e procedimento validado.

## 4. Demonstração para a banca
1. Criar uma demanda pelo passo a passo.
2. Mostrar o salvamento de cada etapa.
3. Mostrar solicitante, responsável e contexto.
4. Mostrar requisito relacionado.
5. Mostrar solução e versão.
6. Abrir um chamado.
7. Mostrar a recuperação do contexto.
8. Mostrar a sugestão da IA.
9. Mostrar que a sugestão aguarda validação.
10. Aprovar ou rejeitar a sugestão.
11. Mostrar a alteração do status.
12. Mostrar o conhecimento validado.
13. Pesquisar novamente o contexto pela busca global.

## 5. Frase para explicar o diferencial
> O NEXUS não trata o suporte como uma etapa isolada. Ele preserva o contexto produzido durante o desenvolvimento e o leva para o atendimento. A IA utiliza esse contexto para sugerir caminhos, mas a decisão continua com o profissional.

## 6. MVP e evolução
- Implementado: Angular standalone, Router, dashboard, demandas, atividades, requisitos com regras/critério de aceitação, soluções/versões, chamados com IA ativa, recuperação de contexto por múltiplas etapas, workspace de IA, base de conhecimento estruturada, busca, wizard com salvamento por etapa, contexto, pessoas, comunicação, sugestão controlada e validação humana.
- Persistência atual: localStorage para demonstração.
- Evolução: API REST, PostgreSQL, autenticação, LLM real, RAG/busca semântica, armazenamento de documentos, auditoria e avaliação experimental.