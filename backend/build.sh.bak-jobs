#!/usr/bin/env bash
# Render build command for the Django service.
#
# set -o errexit matters: without it a failed migration would still produce a
# "successful" deploy, and the service would start against a half-migrated
# database.
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
