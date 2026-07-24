from integrations.base import register
from integrations.remittance._affiliate_base import RemittanceAffiliateBase


@register("remittance", "taptap")
class TaptapSendAffiliate(RemittanceAffiliateBase):
    program_name = "taptap"
    fallback_url = "https://www.taptapsend.com/"
