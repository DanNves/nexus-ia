# NEXUS — Backend

API Django + Django REST Framework do NEXUS.

## Banco

SQLite local em db.sqlite3.

## Ambiente

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

API base: http://localhost:8000/api/v1/

## Estado atual

A estrutura inicial do Django está criada. O frontend ainda pode executar com o interceptor simulado enquanto os módulos reais da API são implementados.

Próxima implementação:
1. core/auditoria/máquina de estados;
2. contas/perfis;
3. demandas;
4. levantamento;
5. cenário;
6. protótipo;
7. validação;
8. requisitos;
9. planejamento;
10. produtos;
11. chamados;
12. conhecimento;
13. IA.

O schema definitivo deve seguir docs/MODELO_DADOS.md.
