from django.apps import AppConfig


class SchoolsConfig(AppConfig):
    name = 'schools'

    def ready(self):
        import schools.signals  # noqa: F401  -- connects the post_save receiver