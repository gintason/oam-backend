OAM — Messaging: one chat system for Marketplace AND Artisans
=============================================================
INSTALL
  cd /Users/mac/Desktop/oam-platform/backend
  unzip -o oam_messaging.zip -d apps

  That creates apps/messaging/ (models, serializers, views, urls, admin).

  1. Add to INSTALLED_APPS in config/settings/base.py (or wherever your
     app list lives), alongside the other "apps.*" entries:

         "apps.messaging",

  2. Add to config/urls.py, next to the other api/v1 includes:

         path("api/v1/messaging/", include("apps.messaging.urls")),

  3. Then:
         python3 manage.py makemigrations messaging
         python3 manage.py migrate
         python3 manage.py runserver 8080

WHY ONE APP INSTEAD OF TWO
  Your marketplace and artisan requests are the same feature: a private thread
  between someone who wants something and someone offering it. A Conversation
  points at EITHER a Listing or an ArtisanProfile, so both verticals share one
  schema, one API and (later) one chat UI. Building it twice would mean keeping
  two of everything in step forever.

CONTACT DETAILS — GATED, AS YOU ASKED
  You already store contacts: Listing.contact_phone / contact_whatsapp, and
  ArtisanProfile.phone / whatsapp. These are NEVER returned by the messaging
  API while a conversation is merely open.

  Flow:
     customer sends an enquiry        -> status "open",     contacts: null
     provider taps Accept             -> status "accepted", contacts revealed
     provider taps Decline            -> status "declined", contacts stay hidden

  Only the PROVIDER can accept — it represents them agreeing to the job or
  sale. If a customer could accept their own enquiry they'd help themselves to
  a number the provider never agreed to share.

  This keeps the introduction on OAM, gives you a record that a connection
  happened (useful when you add commission), and means a customer only ever
  gets the number of someone who has actually agreed to the work.

ENDPOINTS
  GET  /api/v1/messaging/conversations/           list (?role=customer|provider)
  POST /api/v1/messaging/conversations/           start one
       body: {kind: "listing"|"artisan", id: "<uuid>", body: "Hello..."}
  GET  /api/v1/messaging/conversations/<id>/      thread + messages (marks read)
  POST /api/v1/messaging/conversations/<id>/messages/   {body: "..."}
  POST /api/v1/messaging/conversations/<id>/accept/     provider only
  POST /api/v1/messaging/conversations/<id>/decline/    provider only
  POST /api/v1/messaging/conversations/<id>/close/
  GET  /api/v1/messaging/unread/                  {"unread": n} for the badge

BUILT-IN SAFEGUARDS
  * Every query is scoped to threads you're a participant in — you cannot read
    someone else's conversation by guessing a UUID
  * Re-enquiring about the same item returns the EXISTING thread, so a
    provider's inbox doesn't fill with duplicates from one person
  * You can't message your own listing
  * Messages capped at 4000 characters

WHAT'S NOT HERE YET (deliberately)
  * Real-time push — the frontend will poll. Websockets need Django Channels
    plus a Redis instance, which is a bigger deployment change than it's worth
    before you have users. Polling every few seconds is fine at this scale.
  * Email/SMS notification when a message arrives. Worth adding — a marketplace
    where sellers don't know they have an enquiry is a marketplace where nobody
    replies. Your receipt infrastructure makes this straightforward.
  * Blocking/reporting. Needed before you scale, not before you launch.

NEXT: the frontend — decision hubs, browse pages, profiles and the chat UI.
