from django.urls import path

from apps.contas.api import views, views_usuarios

urlpatterns = [
    path('usuarios', views_usuarios.UsuariosView.as_view(), name='usuarios'),
    path('usuarios/<uuid:usuario_id>', views_usuarios.UsuarioView.as_view(), name='usuario'),
    path('usuarios/<uuid:usuario_id>/senha', views_usuarios.UsuarioSenhaView.as_view(), name='usuario-senha'),
    path('auth/registro', views.RegistroView.as_view(), name='auth-registro'),
    path('auth/entrar', views.EntrarView.as_view(), name='auth-entrar'),
    path('auth/renovar', views.RenovarView.as_view(), name='auth-renovar'),
    path('auth/sair', views.SairView.as_view(), name='auth-sair'),
    path('me', views.MeView.as_view(), name='me'),
]
