from django.urls import path

from apps.ia.api.views import JobDetalheView, JobsView, StatusIAView

urlpatterns = [
    path('ia/status', StatusIAView.as_view(), name='ia-status'),
    path('ia/jobs', JobsView.as_view(), name='ia-jobs'),
    path('jobs/<uuid:job_id>', JobDetalheView.as_view(), name='ia-job-detalhe'),
]
