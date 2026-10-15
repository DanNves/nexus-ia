from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.contas.models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'nome', 'email', 'perfil', 'is_active', 'last_login')
    list_filter = ('perfil', 'is_active', 'is_staff')
    search_fields = ('username', 'nome', 'email')
    ordering = ('username',)
    fieldsets = UserAdmin.fieldsets + (('NEXUS', {'fields': ('nome', 'organizacao', 'perfil')}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('NEXUS', {'fields': ('nome', 'email', 'perfil')}),)
