"""Domínio do cenário: catálogo de sinais e pontuação determinística (sem banco)."""
import re

from django.test import SimpleTestCase

from apps.cenario.domain import sinais as s


class CatalogoTests(SimpleTestCase):
    def test_codigos_e_pesos_bem_formados(self):
        self.assertGreaterEqual(len(s.CODIGOS), 20)
        for codigo, (motivo, pesos) in s.CATALOGO.items():
            with self.subTest(codigo=codigo):
                self.assertRegex(codigo, r'^[A-Z][A-Z_]+$')
                self.assertTrue(0 < len(motivo) <= 80)
                self.assertTrue(pesos)
                self.assertLessEqual(set(pesos), set(s.CENARIOS))
                self.assertTrue(all(isinstance(p, int) and 0 < p <= 5 for p in pesos.values()))

    def test_todo_cenario_pode_vencer(self):
        """Cada cenário tem ao menos um sinal em que é o mais forte (nenhum cenário fica inalcançável)."""
        for tipo in s.CENARIOS:
            fortes = [c for c, (_, p) in s.CATALOGO.items() if p.get(tipo, 0) == max(p.values()) and p[tipo] >= 3]
            self.assertTrue(fortes, tipo)

    def test_filtrar(self):
        self.assertEqual(s.filtrar(['USO_CELULAR', 'INVENTADO', 'USO_CELULAR', None, 3, 'LOCALIZACAO']),
                         ['USO_CELULAR', 'LOCALIZACAO'])
        self.assertEqual(s.filtrar(None), [])
        self.assertEqual(s.descricao('PRECISA_OFFLINE'), 'Precisa funcionar sem internet')


class PontuarTests(SimpleTestCase):
    def test_equipe_no_computador_recomenda_web(self):
        ranking = s.pontuar(['EQUIPE_INTERNA', 'USO_COMPUTADOR', 'INTERNET_DISPONIVEL', 'USO_CONTINUO',
                             'DEZENAS_USUARIOS'])
        # WEB 9, DESKTOP 6, MOBILE 1 → total 16 (mesma conta do gerarRanking do front)
        self.assertEqual([(c['tipo'], c['pontuacao']) for c in ranking],
                         [('WEB', 56), ('DESKTOP', 38), ('MOBILE', 6), ('JOB', 0), ('API', 0)])
        self.assertEqual(ranking[0]['nome'], 'Aplicação web')
        self.assertEqual(ranking[0]['motivos'], ['Usado por uma equipe interna', 'Uso no computador',
                                                 'Internet sempre disponível', 'Dezenas de usuários simultâneos'])
        self.assertEqual(ranking[2]['motivos'], [])  # peso 1 não vira motivo

    def test_rotina_sem_operador_recomenda_job(self):
        ranking = s.pontuar(['SEM_OPERADOR', 'EXECUCAO_AGENDADA', 'RESULTADO_EMAIL'])
        self.assertEqual([(c['tipo'], c['pontuacao']) for c in ranking[:2]], [('JOB', 83), ('API', 17)])
        self.assertIn('Funciona sem ninguém operando', ranking[1]['motivos'])

    def test_entregadores_em_campo_recomenda_mobile(self):
        ranking = s.pontuar(['EQUIPE_INTERNA', 'USO_EM_CAMPO', 'USO_CELULAR', 'LOCALIZACAO', 'INTERNET_INSTAVEL'])
        self.assertEqual(ranking[0]['tipo'], 'MOBILE')

    def test_arredonda_como_math_round(self):
        # D1 + J4 + J2 + W1 = 8 → DESKTOP e WEB = 12,5 % → 13 (Math.round); o round() do Python daria 12.
        ranking = {c['tipo']: c['pontuacao'] for c in
                   s.pontuar(['POUCOS_USUARIOS', 'EXECUCAO_AGENDADA', 'RESULTADO_ARQUIVO', 'SEM_PERIFERICOS'])}
        self.assertEqual(ranking, {'JOB': 75, 'DESKTOP': 13, 'WEB': 13, 'MOBILE': 0, 'API': 0})

    def test_sinal_repetido_conta_uma_vez_e_desconhecido_e_ignorado(self):
        self.assertEqual(s.pontuar(['USO_CELULAR']), s.pontuar(['USO_CELULAR', 'USO_CELULAR', 'NAO_EXISTE']))

    def test_sem_sinais_tudo_zero_na_ordem_do_catalogo(self):
        ranking = s.pontuar([])
        self.assertEqual([c['tipo'] for c in ranking], list(s.CENARIOS))
        self.assertTrue(all(c['pontuacao'] == 0 and c['motivos'] == [] for c in ranking))

    def test_dominio_sem_django(self):
        with open(s.__file__, encoding='utf-8') as arquivo:
            codigo = arquivo.read()
        self.assertIsNone(re.search(r'^\s*(from|import)\s+(django|rest_framework|httpx|requests)', codigo, re.M))
