# Site WeLap — refonte 2026

Site 100 % statique (HTML/CSS/JS, aucune dépendance, aucun build). Déploiement Vercel inchangé.

## Mettre en ligne
Remplacer le contenu du repo GitHub `WeLap` par le contenu de ce dossier (Add file > Upload files), puis commit. Vercel redéploie seul.

## Liens App Store / Google Play
Déjà intégrés dans tous les boutons stores :
- App Store : https://apps.apple.com/fr/app/welap/id6781696001
- Google Play : https://play.google.com/store/apps/details?id=com.welap.app
Référence centrale : `assets/js/site.js`, bloc `WELAP_CONFIG`.

## Fichiers à ne jamais supprimer
- `app-ads.txt` (AdMob)
- `google0f227b4155ff1af1.html` (vérification Google)

## Pages
- `/` accueil
- `/pro/` WeLap Pro
- `/support/`, `/confidentialite/`, `/conditions/` (textes légaux inchangés, FR/EN)
- Les anciens liens `/#privacy`, `/#terms`, `/#support` redirigent vers ces pages.
