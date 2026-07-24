OAM Landing Page — file drop
============================

This does NOT touch your Hero.tsx — it's left exactly as you have it.

Unzip from your frontend/ folder. It places:

  src/App.tsx                        (REPLACES existing — imports your Hero)
  src/index.css                      (REPLACES existing — fonts + tokens)
  src/sections/Services.tsx          (new)
  src/sections/HowItWorks.tsx        (new)
  src/sections/MarketAndArtisans.tsx (new)
  src/sections/Trust.tsx             (new)
  src/sections/CTAFooter.tsx         (new)
  tailwind.config.js                 (REPLACES existing — brand colours)

HOW TO RUN
----------
1. Put oam_landing.zip inside your frontend/ folder:
     /Users/mac/Desktop/oam-platform/frontend/

2. From that folder, unzip (-o overwrites App.tsx, index.css, tailwind.config.js):
     cd /Users/mac/Desktop/oam-platform/frontend
     unzip -o oam_landing.zip

3. Make sure your logo exists at src/assets/logo.png . If not:
     mkdir -p src/assets
     find /Users/mac/Desktop/oam-platform -name "logo.png"
     # copy the result into src/assets/logo.png

4. Confirm src/main.tsx has, near the top:
     import './index.css'
   and does NOT import './App.css' (delete that line if present).

5. Run:
     npm run dev
   Open http://localhost:5173

Your Hero.tsx is untouched. App.tsx imports it with:  import Hero from "./Hero";
