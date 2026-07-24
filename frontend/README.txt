OAM — trim the navbar
=====================
  cd /Users/mac/Desktop/oam-platform/frontend
  unzip -o oam_navbar.zip

REMOVED: Travel · Marketplace · Find Artisans
  They already have cards in the dashboard's services grid, so the navbar was
  repeating them without making anything quicker to reach.

NAVBAR IS NOW
  Desktop:  Dashboard · Wallet · Orders · Messages   (+ Earnings for admins)
  Mobile:   bottom tabs carry Dashboard, Wallet, Orders and Logout;
            the hamburger holds Messages (+ Earnings)

  The mobile menu is down to one or two items now, which is a fair signal the
  bottom bar is doing its job.
