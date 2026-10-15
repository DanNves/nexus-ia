from django.urls import path

from apps.contas.api import views

urlpatterns = [
    path('auth/registro', views.RegistroView.as_view(), name='auth-registro'),
    path('auth/entrar', views.EntrarView.as_view(), name='auth-entrar'),
    path('auth/renovar', views.RenovarView.as_view(), name='auth-renovar'),
    path('auth/sair', views.SairView.as_view(), name='auth-sair'),
    path('me', views.MeView.as_view(), name='me'),
]
