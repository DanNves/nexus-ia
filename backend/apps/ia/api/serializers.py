"""Serializers da IA. Campos explícitos, nomes em camelCase (contrato em claude/front/contratos.md, 2026-10-15)."""
import json

from rest_framework import serializers

from apps.ia.domain.tarefas import TAREFAS
from apps.ia.models import Job

LIMITE_ENTRADA = 60_000      # caracteres da entrada inteira (JSON)
LIMITE_NECESSIDADE = 20_000  # soma dos textos das fontes


def _texto(max_length, **kwargs):
    return serializers.CharField(max_length=max_length, trim_whitespace=True, **kwargs)


def _lista(filho, max_length, **kwargs):
    return serializers.ListField(child=filho, max_length=max_length, **kwargs)


# ---------- envelope ----------

class SolicitacaoJobSerializer(serializers.Serializer):
    tarefa = serializers.ChoiceField(choices=sorted(TAREFAS))
    alvoTipo = _texto(40)
    alvoId = _texto(64)
    entrada = serializers.DictField()


# ---------- entrada da tarefa `requisitos` ----------

class RespostaEntrevistaSerializer(serializers.Serializer):
    pergunta = _texto(500)
    respostas = _lista(_texto(300), 20, allow_empty=True)
    outro = _texto(500, required=False, allow_blank=True)


class DemandaEntradaSerializer(serializers.Serializer):
    codigo = _texto(30)
    nome = _texto(200)
    descricao = _texto(4000, allow_blank=True)
    cenario = _texto(200, required=False, allow_blank=True)
    necessidade = _lista(_texto(LIMITE_NECESSIDADE, allow_blank=True), 20, allow_empty=True)
    respostas = _lista(RespostaEntrevistaSerializer(), 100, allow_empty=True)

    def validate_necessidade(self, valor):
        if sum(len(t) for t in valor) > LIMITE_NECESSIDADE:
            raise serializers.ValidationError(f'A necessidade pode ter no máximo {LIMITE_NECESSIDADE} caracteres no total.')
        return valor


class RequisitoAprovadoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=['RF', 'RNF', 'REGRA'])
    titulo = _texto(300)


class RequisitoRejeitadoSerializer(serializers.Serializer):
    """Requisito rejeitado pela equipe (CLAUDE.md §6: REJEITADO → PROPOSTO leva o motivo)."""
    tipo = serializers.ChoiceField(choices=['RF', 'RNF', 'REGRA'])
    titulo = _texto(300)
    motivo = _texto(1000)


class EntradaRequisitosSerializer(serializers.Serializer):
    demanda = DemandaEntradaSerializer()
    requisitosAprovados = _lista(RequisitoAprovadoSerializer(), 200, allow_empty=True, required=False, default=list)
    requisitosRejeitados = _lista(RequisitoRejeitadoSerializer(), 30, allow_empty=True, required=False, default=list)


# ---------- entrada da tarefa `sugestao_suporte` ----------

class ChamadoEntradaSerializer(serializers.Serializer):
    codigo = _texto(30)
    titulo = _texto(300)
    descricao = _texto(5000, allow_blank=True)
    prioridade = _texto(30)


class SolucaoEntradaSerializer(serializers.Serializer):
    nome = _texto(200)
    versao = _texto(30)


class RequisitoContextoSerializer(serializers.Serializer):
    codigo = _texto(30)
    titulo = _texto(300)
    descricao = _texto(2000, allow_blank=True)


class ConhecimentoContextoSerializer(serializers.Serializer):
    codigo = _texto(30)
    titulo = _texto(300)
    procedimento = _lista(_texto(1000), 30, allow_empty=True)


class ChamadoResolvidoSerializer(serializers.Serializer):
    codigo = _texto(30)
    titulo = _texto(300)


class SugestaoRejeitadaSerializer(serializers.Serializer):
    """Sugestão anterior rejeitada neste chamado: a nova geração deve ser outra hipótese."""
    causa = _texto(1000)
    motivo = _texto(1000)


class EntradaSugestaoSerializer(serializers.Serializer):
    chamado = ChamadoEntradaSerializer()
    solucao = SolucaoEntradaSerializer(required=False, allow_null=True)
    requisitos = _lista(RequisitoContextoSerializer(), 50, allow_empty=True, required=False, default=list)
    conhecimentos = _lista(ConhecimentoContextoSerializer(), 20, allow_empty=True, required=False, default=list)
    chamadosResolvidos = _lista(ChamadoResolvidoSerializer(), 50, allow_empty=True, required=False, default=list)
    sugestoesRejeitadas = _lista(SugestaoRejeitadaSerializer(), 5, allow_empty=True, required=False, default=list)


ENTRADA_POR_TAREFA = {
    'requisitos': EntradaRequisitosSerializer,
    'sugestao_suporte': EntradaSugestaoSerializer,
}


def tamanho_entrada(entrada: dict) -> int:
    return len(json.dumps(entrada, ensure_ascii=False))


# ---------- saída ----------

class JobSerializer(serializers.ModelSerializer):
    """`resultado` e `modelo` só quando CONCLUIDO; `erro` só quando FALHOU."""

    class Meta:
        model = Job
        fields = ('id', 'tarefa', 'estado', 'percentual', 'etapa')
        read_only_fields = fields

    def to_representation(self, job):
        dados = super().to_representation(job)
        if job.estado == Job.Estado.CONCLUIDO:
            dados['resultado'] = job.resultado
            dados['modelo'] = job.modelo
        elif job.estado == Job.Estado.FALHOU:
            dados['erro'] = job.erro_tratado
        return dados
