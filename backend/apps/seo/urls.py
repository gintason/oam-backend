"""Root-level routes (wired into config/urls.py by apply_seo_backend.py)."""
from django.urls import path, re_path

from . import views

urlpatterns = [
    path("sitemap.xml", views.sitemap_xml, name="seo-sitemap"),
    path("robots.txt", views.robots_txt, name="seo-robots"),
    # Server-rendered previews for the two shareable page types (reached via a Render rewrite).
    re_path(r"^marketplace/(?P<rest>[\w\-/]*)$", views.marketplace_page, name="seo-marketplace"),
    re_path(r"^artisans/(?P<rest>[\w\-/]*)$", views.artisan_page, name="seo-artisan"),
]
