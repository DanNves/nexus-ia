from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.core.models import EventoAuditoria
from apps.core.services import auditoria


class AuditoriaAppendOnlyTests(TestCase):
    def setUp(self):
        self.evento = auditoria.registrar(ator=None, acao='TESTE', entidade_tipo='x', entidade_id=1, dados={'a': 1})

    def test_registrar_grava_evento(self):
        evento = EventoAuditoria.objects.get(pk=self.evento.pk)
        self.assertEqual((evento.acao, evento.entidade_tipo, evento.entidade_id, evento.dados), ('TESTE', 'x', '1', {'a': 1}))
        self.assertIsNone(evento.ator)

    def test_alterar_levanta_erro(self):
        self.evento.acao = 'OUTRA'
        with self.assertRaises(ValueError):
            self.evento.save()
        with self.assertRaises(ValueError):
            EventoAuditoria.objects.filter(pk=self.evento.pk).update(acao='OUTRA')
        self.assertEqual(EventoAuditoria.objects.get(pk=self.evento.pk).acao, 'TESTE')

    def test_apagar_levanta_erro(self):
        with self.assertRaises(ValueError):
            self.evento.delete()
        with self.assertRaises(ValueError):
            EventoAuditoria.objects.all().delete()
        self.assertTrue(EventoAuditoria.objects.filter(pk=self.evento.pk).exists())

    def test_excluir_usuario_preserva_evento_sem_ator(self):
        usuario = get_user_model().objects.create_user(username='ana', email='ana@exemplo.com', nome='Ana', password='x')
        evento = auditoria.registrar(ator=usuario, acao='LOGIN', entidade_tipo='usuario', entidade_id=usuario.id)

        usuario.delete()

        evento = EventoAuditoria.objects.get(pk=evento.pk)
        self.assertIsNone(evento.ator)
