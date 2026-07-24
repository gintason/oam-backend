from integrations.base import register
from integrations.remittance._affiliate_base import RemittanceAffiliateBase


@register("remittance", "wise")
class WiseAffiliate(RemittanceAffiliateBase):
    program_name = "wise"
    fallback_url = "https://wise.com/"
