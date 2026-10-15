"""Testes da camada de domínio (sem banco)."""
from django.test import SimpleTestCase

from apps.ia.domain.anonimizacao import anonimizar, restaurar
from apps.ia.domain.esquema import ErroEsquema, exigir_valido, validar
from apps.ia.domain.tarefas import TAREFAS, obter_tarefa


class AnonimizacaoTests(SimpleTestCase):
    def test_troca_dados_pessoais_por_marcadores(self):
        texto = ('Falar com Mariana Souza (mariana.souza@exemplo.com.br, (71) 99876-5432 ou 71 3333-4444). '
                 'CPF 123.456.789-09, CNPJ 12.345.678/0001-90. Mariana aprova.')
        r = anonimizar(texto, ['Mariana Souza'])
        for original in ('Mariana', 'exemplo.com.br', '99876', '3333-4444', '123.456.789-09', '12.345.678/0001-90'):
            self.assertNotIn(original, r.dados)
        for marcador in ('[PESSOA_1]', '[EMAIL_1]', '[TELEFONE_1]', '[TELEFONE_2]', '[CPF_1]', '[CNPJ_1]', '[PESSOA_2]'):
            self.assertIn(marcador, r.dados)
        self.assertEqual(r.substituicoes, 7)

    def test_telefone_no_fim_da_frase(self):
        # Defeito achado pela avaliação em 2026-10-15: o ponto final impedia a detecção e o telefone ia ao provedor.
        for texto in ('Ligue para (71) 99876-5432.', 'Ligue 71 3333-4444.', 'Tel.: 3333-4444. Obrigado'):
            with self.subTest(texto=texto):
                self.assertIn('[TELEFONE_1]', anonimizar(texto).dados)
        self.assertEqual(anonimizar('valor 1234-5678.90').dados, 'valor 1234-5678.90')

    def test_mesmo_valor_mesmo_marcador_e_estruturas(self):
        dado = {'a': 'joao@x.com', 'lista': ['de novo joao@x.com', {'b': 'JOAO@X.COM'}], 'n': 3, 'nulo': None}
        r = anonimizar(dado)
        self.assertEqual(r.dados['a'], '[EMAIL_1]')
        self.assertEqual(r.dados['lista'][0], 'de novo [EMAIL_1]')
        self.assertEqual(r.dados['lista'][1]['b'], '[EMAIL_1]')
        self.assertEqual(r.dados['n'], 3)
        self.assertIsNone(r.dados['nulo'])

    def test_nao_toca_codigos_versoes_e_palavras_comuns(self):
        texto = 'CH-028 na versão 1.2.0 (KB-007, REQ-014) em 2026-10-15. A rosa é vermelha.'
        r = anonimizar(texto, ['Rosa Lima'])
        self.assertEqual(r.dados, texto)
        self.assertEqual(r.substituicoes, 0)

    def test_nome_de_uma_palavra_so_com_maiuscula_e_composto_com_espacos(self):
        r = anonimizar('a equipe chamou Equipe e MARIANA   souza', ['Equipe', 'Mariana Souza'])
        self.assertEqual(r.dados, 'a equipe chamou [PESSOA_2] e [PESSOA_1]')

    def test_restaura_marcadores_no_resultado(self):
        r = anonimizar({'t': 'Contato: ana@x.com e Carlos Dias'}, ['Carlos Dias'])
        resposta = {'itens': ['Enviar a [EMAIL_1]', {'resp': '[PESSOA_1] valida'}], 'outro': '[EMAIL_9] fica'}
        self.assertEqual(restaurar(resposta, r.mapa),
                         {'itens': ['Enviar a ana@x.com', {'resp': 'Carlos Dias valida'}], 'outro': '[EMAIL_9] fica'})


class EsquemaTests(SimpleTestCase):
    SCHEMA = {
        'type': 'object',
        'properties': {
            'itens': {'type': 'array', 'minItems': 1, 'maxItems': 2,
                      'items': {'type': 'string', 'enum': ['A', 'B']}},
            'nota': {'type': 'number', 'minimum': 0, 'maximum': 1},
            'qtd': {'type': 'integer'},
            'ok': {'type': 'boolean'},
            'ref': {'type': ['string', 'null']},
        },
        'required': ['itens', 'nota', 'ref'],
        'additionalProperties': False,
    }

    def test_valido(self):
        self.assertEqual(validar({'itens': ['A'], 'nota': 0.5, 'qtd': 2, 'ok': True, 'ref': None}, self.SCHEMA), [])

    def test_erros(self):
        casos = [
            ({'itens': [], 'nota': 0.5, 'ref': None}, 'mínimo'),
            ({'itens': ['A', 'B', 'A'], 'nota': 0.5, 'ref': None}, 'máximo'),
            ({'itens': ['C'], 'nota': 0.5, 'ref': None}, 'fora da lista'),
            ({'itens': ['A'], 'nota': 2, 'ref': None}, 'maior'),
            ({'itens': ['A'], 'ref': None}, 'obrigatório'),
            ({'itens': ['A'], 'nota': 0.5, 'ref': None, 'extra': 1}, 'não permitido'),
            ({'itens': ['A'], 'nota': True, 'ref': None}, 'esperado number'),
            ({'itens': ['A'], 'nota': 0.5, 'ref': None, 'qtd': 1.5}, 'esperado integer'),
            ({'itens': ['A'], 'nota': 0.5, 'ref': 3}, 'esperado string/null'),
            ([], 'esperado object'),
        ]
        for dado, trecho in casos:
            with self.subTest(dado=dado):
                erros = validar(dado, self.SCHEMA)
                self.assertTrue(any(trecho in e for e in erros), erros)

    def test_exigir_valido_lanca(self):
        with self.assertRaises(ErroEsquema):
            exigir_valido({}, self.SCHEMA)


class TarefasTests(SimpleTestCase):
    def test_catalogo(self):
        self.assertEqual(set(TAREFAS), {'requisitos', 'sugestao_suporte'})
        self.assertTrue(all(t.exige_equipe and len(t.etapas) == 4 for t in TAREFAS.values()))
        self.assertIsNone(obter_tarefa('inexistente'))

    def test_sugestao_nao_cita_conhecimento_inventado(self):
        tarefa = TAREFAS['sugestao_suporte']
        entrada = {'conhecimentos': [{'codigo': 'KB-007'}]}
        self.assertEqual(tarefa.pos_processar(entrada, {'conhecimentoUsado': 'KB-999'})['conhecimentoUsado'], None)
        self.assertEqual(tarefa.pos_processar(entrada, {'conhecimentoUsado': 'KB-007'})['conhecimentoUsado'], 'KB-007')
