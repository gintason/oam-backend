from integrations.base import register
from integrations.remittance._affiliate_base import RemittanceAffiliateBase


@register("remittance", "lemfi")
class LemfiAffiliate(RemittanceAffiliateBase):
    program_name = "lemfi"
    fallback_url = "https://www.lemfi.com/"
