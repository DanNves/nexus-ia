# NEXUS — Guia de demonstração do MVP

## Objetivo da apresentação

Demonstrar, em poucos minutos, que o NEXUS mantém o contexto produzido durante o desenvolvimento e o utiliza no suporte, com IA generativa como apoio e validação humana obrigatória.

## Fluxo principal

DEMANDA → REQUISITO → VERSÃO DA SOLUÇÃO → CHAMADO → RECUPERAÇÃO DO CONTEXTO → IA GENERATIVA → SUGESTÃO → VALIDAÇÃO HUMANA → CONHECIMENTO → REUTILIZAÇÃO

## Roteiro recomendado

1. **Dashboard**
   - Apresente os indicadores e o fluxo central.
   - Mostre a rastreabilidade DEM-012 → REQ-014 → VER-120 → CH-028 → KB-007.
   - Explique que a tela resume a continuidade do contexto.

2. **Nova demanda**
   - Clique em Nova demanda.
   - Mostre as cinco etapas: Identificação → Pessoas → Contexto → Objetivo → Revisão.
   - Explique que cada etapa preserva o rascunho.

3. **Demanda**
   - Abra DEM-012.
   - Mostre solicitante, responsável, objetivo e relacionamentos.

4. **Requisito**
   - Abra REQ-014 pelo relacionamento.
   - Mostre que o requisito mantém a ligação com a demanda e a versão.

5. **Versão**
   - Abra VER-120.
   - Mostre que a versão funciona como ponte entre desenvolvimento e suporte.

6. **Chamado**
   - Abra CH-028.
   - Mostre contexto recuperado, requisito, versão, conhecimento, sugestão da IA, possíveis causas, procedimento e evidências.

7. **Validação humana**
   - Explique: a IA não confirma a causa e não encerra o atendimento.
   - Clique em Aprovar sugestão.
   - Mostre que o próximo passo passa a ser Registrar conhecimento.

8. **Conhecimento**
   - Clique em Registrar conhecimento.
   - Mostre a criação automática de um novo registro KB-xxx relacionado ao chamado.
   - Explique que o conhecimento validado pode ser reutilizado.

9. **Busca global**
   - Use a busca para localizar CH-028, REQ-014 ou KB-007.
   - Demonstre que o contexto pode ser recuperado por diferentes pontos do sistema.

## Frase central

> O NEXUS não trata o suporte como uma etapa isolada. Ele preserva o contexto produzido durante o desenvolvimento e o leva para o atendimento. A IA utiliza esse contexto para sugerir caminhos, mas a decisão continua com o profissional.

## Onde a IA está no MVP

A IA está concentrada no atendimento de suporte. O chamado fornece o problema e o NEXUS recupera o contexto relacionado. A camada de IA então apresenta uma sugestão de possível causa e procedimento.

A validação humana é obrigatória antes de o chamado poder ser encerrado e transformado em conhecimento.

## O que é demonstrável nesta versão

- Navegação e organização do fluxo.
- Cadastro de demanda e atividade com wizard.
- Persistência local dos registros.
- Relacionamento entre registros.
- Recuperação de contexto por relacionamentos.
- Sugestão de IA controlada para os chamados.
- Aprovação/rejeição da sugestão.
- Bloqueio da conclusão do chamado sem validação.
- Registro de conhecimento após validação.
- Busca global.
- Indicadores calculados a partir dos registros.
- Notificações de pendências.

## O que ainda é evolução arquitetural

- API REST.
- PostgreSQL.
- Autenticação e autorização.
- LLM real.
- RAG/busca semântica.
- Auditoria persistente.
- Integrações externas.
- Avaliação experimental automatizada.

A apresentação deve deixar claro que a simulação controlada da IA existe para demonstrar e avaliar o fluxo do TCC; ela não deve ser apresentada como integração com um provedor de LLM real.