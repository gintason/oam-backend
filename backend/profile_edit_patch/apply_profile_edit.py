#!/usr/bin/env python3
"""
Add profile editing: PATCH /api/v1/auth/me/ updates first_name, last_name and
phone (email stays read-only — it's the verified login identity).

RUN FROM BACKEND ROOT:
    python3 profile_edit_patch/apply_profile_edit.py
"""
import os
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
path = os.path.join(ROOT, "apps/accounts/views.py")

if not os.path.exists(path):
    sys.exit(f"ABORT: not found: {path}")

s = open(path, encoding="utf-8").read()
old = (
    "    def get(self, request):\n"
    "        return Response(UserSerializer(request.user).data)\n"
)
new = (
    "    def get(self, request):\n"
    "        return Response(UserSerializer(request.user).data)\n"
    "\n"
    "    def patch(self, request):\n"
    "        \"\"\"Update first name, last name and phone. Email is read-only.\"\"\"\n"
    "        user = request.user\n"
    "        data = request.data\n"
    "        phone = data.get(\"phone\")\n"
    "        if phone is not None:\n"
    "            phone = str(phone).strip() or None\n"
    "            if phone and type(user).objects.filter(phone=phone).exclude(pk=user.pk).exists():\n"
    "                return Response({\"phone\": \"This phone number is already in use.\"},\n"
    "                                status=status.HTTP_400_BAD_REQUEST)\n"
    "            user.phone = phone\n"
    "        if data.get(\"first_name\") is not None:\n"
    "            user.first_name = str(data.get(\"first_name\")).strip()\n"
    "        if data.get(\"last_name\") is not None:\n"
    "            user.last_name = str(data.get(\"last_name\")).strip()\n"
    "        user.save()\n"
    "        return Response(UserSerializer(user).data)\n"
)

if "def patch(self, request):" in s and "phone is already in use" in s:
    print("= already applied")
elif s.count(old) != 1:
    sys.exit("ABORT: MeView.get anchor not found exactly once")
else:
    open(path, "w", encoding="utf-8").write(s.replace(old, new, 1))
    print("+ MeView: PATCH profile-edit added")

print("DONE.")
