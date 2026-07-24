"""
AffiliateService — the single entry point domain code uses to get a tracked
affiliate link. It records the click first (to mint a sub_id), then asks the
provider adapter to build the link using that sub_id.

Usage (from a future view):
    link = AffiliateService.link(
        category="flights", user=request.user,
        params={"origin": "LOS", "destination": "LHR"},
    )
    return Response({"url": link.url})
"""
from __future__ import annotations

from django.conf import settings

from integrations.base import ProviderFactory
from .models import AffiliateClick


class AffiliateService:
    @staticmethod
    def link(*, category: str, user=None, target_url: str = "", params: dict | None = None):
        provider_key = settings.DEFAULT_PROVIDERS.get(category, "")
        provider = ProviderFactory.get(category, provider_key)

        # 1) record the click to obtain a stable attribution id (sub_id)
        click = AffiliateClick.objects.create(
            user=user if (user and user.is_authenticated) else None,
            category=category,
            provider=provider_key,
            program=f"{provider_key}:{category}",
            target_url=target_url or "",
            params=params or {},
        )

        # 2) build the tracked link carrying our sub_id
        affiliate_link = provider.build_link(
            sub_id=str(click.id), target_url=target_url, params=params,
        )

        # 3) backfill the final URL/program we actually sent
        click.target_url = affiliate_link.url[:1000]
        click.program = affiliate_link.program
        click.save(update_fields=["target_url", "program", "updated_at"])
        return affiliate_link
