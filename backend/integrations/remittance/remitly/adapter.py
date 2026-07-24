from integrations.base import register
from integrations.remittance._affiliate_base import RemittanceAffiliateBase


@register("remittance", "remitly")
class RemitlyAffiliate(RemittanceAffiliateBase):
    program_name = "remitly"
    fallback_url = "https://www.remitly.com/"
