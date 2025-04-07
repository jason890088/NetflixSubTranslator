from django.apps import AppConfig
from .model_manager import TranslationModelManager


class TranslationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'translation'

    def ready(self):
        TranslationModelManager()  # 初始化一次（Singleton 確保只會做一次）