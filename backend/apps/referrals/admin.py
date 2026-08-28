from django.contrib import admin

from .models import (ReferralProfile, ReferralRelationship,
                     ReferralCommissionLog, ReferralNotification)

admin.site.register(ReferralProfile)
admin.site.register(ReferralRelationship)
admin.site.register(ReferralCommissionLog)
admin.site.register(ReferralNotification)
