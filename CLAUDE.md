@AGENTS.md

# garage-saas — instructions pour Claude

## Rôle du projet
Ancien prototype (avril 2026) d'un logiciel de gestion de garage multi-entreprises : inscription, connexion, entreprises, clients, véhicules, devis et factures.
**Ce n'est pas l'ERP actuel de GAMA** : l'ERP utilisé se trouve dans le dépôt `Gamasite` (sous `/admin`). Ne pas reporter de travail ici sans demande explicite d'Elvir.

## État (vérifié le 08.11.2026)
- 19 commits, dernier le 20.04.2026. Aucune branche autre que `main`.
- Dépôt **public** sur GitHub. Aucun secret trouvé dans tout l'historique ; les clés sont dans Vercel.
- Projet Vercel `garage-saas`, dernier déploiement de production le 20.04.2026, sans domaine personnalisé.
- Projet Supabase utilisé : **non confirmé** (les tables `companies`, `quotes`, `invoices`… n'existent pas dans `gama-erp-admin` ; probablement le projet `Lytho`, actuellement en pause).

## Stack réelle
- **Next.js 16** (App Router, dossier `app/`), React, TypeScript, Tailwind CSS v4, ESLint.
- Supabase via `@supabase/ssr` (`lib/supabase/`), Resend pour les courriels.
- npm (`package-lock.json`).

## Commandes
```bash
npm ci
npm run dev
npm run build      # nécessite l'accès à Google Fonts (police Geist) ; échoue dans un environnement sans Internet
npx tsc --noEmit   # contrôle TypeScript (passe au 08.11.2026)
npm run lint       # 10 erreurs et 7 avertissements connus au 08.11.2026
```

## Variables d'environnement (noms seulement)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement), `RESEND_API_KEY`, `APP_BASE_URL`.

## Précautions
- Dépôt public : ne jamais y ajouter de secret, de données de clients ni d'informations internes de GAMA.
- Next.js 16 diffère des versions connues : lire la documentation dans `node_modules/next/dist/docs/` avant de coder (voir `AGENTS.md`).
- Archivage ou passage en privé : décision d'Elvir, à ne pas faire sans accord.
