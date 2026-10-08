# NEXUS — Fundamentação Teórica

## 1. Delimitação

O NEXUS é investigado como uma plataforma de apoio ao ciclo de uma solução de software, com ênfase na preservação e recuperação do contexto entre levantamento, especificação, desenvolvimento e suporte pós-entrega.

A arquitetura atual da main amplia o fluxo funcional para:

**NECESSIDADE → ENTREVISTA GUIADA → CENÁRIO → PROTÓTIPO → SOLICITAÇÃO → VIABILIDADE/REUNIÃO/METODOLOGIA → REQUISITOS → DOCUMENTO → PRODUTO/VERSÃO → CHAMADO → CONTEXTO → IA → VALIDAÇÃO HUMANA → CONHECIMENTO.**

O recorte acadêmico continua centrado na continuidade do contexto e na utilização de IA como apoio, nunca como autoridade autônoma.

## 2. Engenharia de Requisitos

Engenharia de Requisitos trata da elicitação, análise, especificação, validação e gestão das necessidades que orientam uma solução de software.

No NEXUS, essa área fundamenta:
- registro estruturado da necessidade;
- entrevista guiada;
- requisitos funcionais e não funcionais;
- regras de negócio;
- critérios de aceitação;
- versionamento;
- baseline;
- documento de requisitos.

A entrevista guiada procura reduzir ambiguidades sem exigir linguagem técnica do solicitante. As respostas são preservadas e também podem produzir sinais utilizados posteriormente na recomendação de cenário.

## 3. Rastreabilidade

Rastreabilidade estabelece vínculos entre artefatos e decisões produzidos ao longo do desenvolvimento.

No NEXUS, a rastreabilidade não deve depender de nomes ou títulos. Relações explícitas conectam:

**Demanda → Levantamento → Requisito → Baseline → Produto → Versão → Chamado → Conhecimento.**

Também são previstos vínculos entre processos de melhoria, fontes de informação, protótipos e registros de suporte.

Essa estrutura permite que um analista, ao receber um chamado, consiga retornar à origem do requisito e aos artefatos que contextualizam a versão afetada.

## 4. Gestão do conhecimento em Engenharia de Software

Conhecimento produzido durante desenvolvimento e manutenção possui valor quando pode ser recuperado e reutilizado em situações posteriores.

No NEXUS, a base de conhecimento não é uma coleção independente de textos. Um item deve preservar:
- origem;
- chamado;
- produto;
- versão;
- procedimento;
- validação;
- revisão;
- relacionamentos;
- quantidade de reusos.

A consolidação de conhecimento ocorre depois da decisão humana sobre a solução de suporte.

## 5. Suporte pós-entrega

O suporte técnico depende do entendimento do sistema afetado. Um chamado isolado pode apresentar somente sintomas, enquanto o diagnóstico pode depender da versão, requisito, regra de negócio, histórico de alteração e ocorrências anteriores.

O NEXUS utiliza esse princípio para tornar o chamado uma porta de entrada para o contexto do produto, e não apenas para uma descrição textual do problema.

## 6. Inteligência Artificial generativa

Modelos generativos podem auxiliar tarefas de interpretação, classificação, síntese e geração de conteúdo. No NEXUS, esse potencial é aplicado a atividades como:
- geração assistida de requisitos;
- recomendação de cenário;
- produção de protótipo;
- triagem de chamados;
- sugestão de causa e procedimento;
- apoio à formação de conhecimento.

A arquitetura isola o provedor por meio da porta `LLMProvider`, permitindo substituir o modelo sem alterar as regras do domínio.

## 7. IA como sistema de apoio, não autoridade

O princípio fundamental do NEXUS é:

**IA PROPÕE → HUMANO VALIDA → SISTEMA CONSOLIDA.**

Esse princípio é aplicado por uma máquina de estados. Um artefato produzido por IA nasce como **PROPOSTO** e pode passar por revisão humana para ser aprovado, editado ou rejeitado.

Não existe transição automática de uma sugestão para APROVADO.

Essa decisão reduz o risco de transformar uma hipótese gerada por modelo em uma decisão técnica não revisada.

## 8. Alucinação, incerteza e evidências

Conteúdo gerado pode conter erros ou apresentar uma hipótese como se fosse fato. Por isso, a interface do NEXUS deve distinguir:
- informação recuperada;
- evidência;
- hipótese;
- sugestão;
- decisão humana.

No suporte, a possível causa não deve ser apresentada como diagnóstico confirmado. As fontes recuperadas devem permanecer navegáveis e a decisão deve ser registrada pelo profissional.

## 9. Interação humano-IA

Uma interação responsável com IA exige que o usuário compreenda o papel do sistema, tenha condições de avaliar a saída e consiga corrigir ou rejeitar o resultado.

No NEXUS:
- a origem da IA é explicitada;
- o estado de validação é visível;
- a rejeição exige motivo;
- a edição preserva a versão anterior;
- a aprovação registra autor e momento;
- o conhecimento só se consolida após validação.

## 10. Recuperação aumentada por conhecimento

RAG é uma estratégia na qual informações relevantes são recuperadas antes da geração para fornecer contexto ao modelo.

Na arquitetura de referência do NEXUS, conhecimento e artefatos aprovados podem ser fragmentados e indexados. Porém, a implementação local com SQLite não depende de pgvector. A busca inicial pode ser realizada por mecanismos compatíveis com o volume do MVP, mantendo a possibilidade de migração posterior.

Assim, RAG é fundamento arquitetural e evolução controlada, não uma afirmação de que o MVP local já possui um mecanismo vetorial em produção.

## 11. Design Science Research

O NEXUS é compatível com uma abordagem de Design Science Research porque envolve:
1. identificação de um problema prático;
2. definição de objetivos;
3. construção de um artefato;
4. demonstração;
5. avaliação;
6. comunicação dos resultados.

A avaliação experimental deve ser realizada separadamente da demonstração do sistema. Dados fictícios de demonstração não devem ser apresentados como resultados científicos.

## 12. Privacidade e LGPD

A plataforma trabalha com informações potencialmente associadas a pessoas. A LGPD estabelece princípios como finalidade, adequação, necessidade, transparência, segurança, prevenção e responsabilização no tratamento de dados pessoais. citeturn2search0turn2search3

Por isso, o NEXUS prevê:
- coleta proporcional;
- separação entre dado original e conteúdo enviado à IA;
- anonimização antes de provedores externos;
- registro das operações relevantes;
- controle de acesso por perfil e objeto;
- armazenamento local no MVP;
- ausência de segredos no frontend.

## 13. Arquitetura de software

A arquitetura adota um monólito modular em Django no backend e Angular desacoplado no frontend.

A separação por contexto evita que regras de negócio sejam espalhadas pela interface. Cada módulo deve organizar:
- API;
- aplicação;
- domínio;
- infraestrutura.

SQLite foi escolhido para o MVP local pela simplicidade operacional. Django suporta SQLite oficialmente; uma migração futura para PostgreSQL permanece possível sem alterar o domínio quando o sistema exigir ambiente compartilhado. citeturn0search0turn0search1

## 14. Avaliação do artefato

Os indicadores previstos devem ser derivados dos eventos reais:
- tempo por etapa;
- aprovação sem edição;
- edição;
- rejeição;
- motivos de rejeição;
- tempo de atendimento;
- utilidade percebida do contexto;
- aceitação da sugestão;
- reuso do conhecimento.

Nenhum valor experimental deve ser inventado antes da execução dos casos de teste.

## 15. Trabalhos relacionados

A revisão deve comparar o NEXUS com categorias de ferramentas de:
- engenharia de requisitos e rastreabilidade;
- gestão de serviços e chamados;
- gestão do conhecimento;
- assistência por IA.

Ferramentas de mercado demonstram que rastreabilidade, ITSM, conhecimento e automação podem coexistir, mas o diferencial acadêmico do NEXUS está no recorte integrado e controlado entre contexto de desenvolvimento, suporte, sugestão generativa e validação humana.

Essa seção deve ser aprofundada com uma revisão sistemática ou seleção justificada de trabalhos antes da versão final da monografia.

## 16. Síntese teórica

A fundamentação sustenta a seguinte cadeia:

**Engenharia de Requisitos** produz informação estruturada.

**Rastreabilidade** mantém as relações.

**Gestão do Conhecimento** permite reutilização.

**Suporte pós-entrega** necessita recuperar contexto.

**IA Generativa** pode auxiliar a interpretação e sugestão.

**Interação Humano-IA** exige transparência e possibilidade de correção.

**Validação humana** mantém a decisão sob responsabilidade profissional.

**NEXUS** integra esses princípios em um fluxo contínuo.

## Referências-base

- Gotel, O.; Finkelstein, A. An analysis of the requirements traceability problem. 1994.
- Rus, I.; Lindvall, M. Knowledge Management in Software Engineering. IEEE Software, 2002.
- Hevner, A. R. et al. Design Science in Information Systems Research. MIS Quarterly, 2004.
- Amershi, S. et al. Guidelines for Human-AI Interaction. CHI, 2019.
- Ji, Z. et al. Survey of Hallucination in Natural Language Generation. ACM Computing Surveys, 2023.
- Sommerville, I. Software Engineering.
- Pressman, R. S.; Maxim, B. R. Software Engineering: A Practitioner's Approach.
- Brasil. Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais.
