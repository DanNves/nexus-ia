# NEXUS Backend

API do NEXUS em **Django 6.1 + Django REST Framework**, sob `/api/v1/`. Roda em localhost com SQLite.

## Módulos prontos
| App | O que faz |
|---|---|
| `core` | modelo-base (UUID e datas), auditoria append-only, erros sempre em JSON `{mensagem, campos}` |
| `contas` | usuários com perfil CLIENTE/EQUIPE, cadastro público (sempre CLIENTE), login JWT com refresh em cookie HttpOnly, `seed_demo` |
| `ia` | porta `LLMProvider` com adaptadores (`gemini`, `openai_compat`, `fake`), jobs (202 + polling), prompts versionados, LogIA, anonimização, avaliação |

Os demais módulos (demandas, levantamento, cenário, protótipo, requisitos, chamados, conhecimento…) ainda são simulados pelo frontend. Ver `CLAUDE.md` §7 e §31.

## Como rodar
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements/base.txt
copy .env.example .env        # preencha DJANGO_SECRET_KEY e, para IA real, GEMINI_API_KEY
python manage.py migrate
python manage.py seed_demo    # EquipeAdmin/123 (equipe) e Usuario/123 (cliente) — só com DEBUG
python manage.py runserver    # http://localhost:8000
```
O Angular (`frontend/`, `npm start`, porta 4200) chama a API pelo proxy `/api`.

## IA
- Provedor e modelos no `.env`: `IA_PROVEDOR` (`gemini` | `openai_compat` | `fake`), `IA_MODELO`, `IA_MODELOS_RESERVA`, `IA_TIMEOUT_SEGUNDOS`.
- Sem custo e sem internet: `IA_PROVEDOR=fake` (os testes sempre usam o fake).
- Novo provedor: um arquivo em `apps/ia/adapters/` + uma linha no registro `PROVEDORES`.
- `python manage.py ia_testar` faz uma geração real; `python manage.py ia_avaliar` roda os casos de qualidade.
- Antes de enviar ao provedor, e-mails, telefones, CPF/CNPJ e nomes cadastrados são anonimizados. No plano gratuito do Gemini use só dados fictícios.

## Testes
```bash
python manage.py check
python manage.py makemigrations --check
python manage.py test        # usa config.settings.test (IA falsa, banco em memória)
```

Segredos ficam em `.env`, que não é versionado.
