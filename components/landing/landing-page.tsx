export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/35">
              Lytho
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight">
              <span className="text-white">De</span>
              <span className="text-red-500">vis</span>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            >
              Se connecter
            </a>
            <a
              href="/register"
              className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
            >
              Commencer
            </a>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="relative z-10">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/60">
              Pour indépendants, artisans et PME
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.04em] md:text-6xl">
              Crée tes devis et factures
              <span className="text-red-500"> en quelques secondes</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
              Lytho Devis t’aide à envoyer des devis propres, rapides et professionnels,
              sans Excel, sans prise de tête, et sans perdre du temps sur l’administratif.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/register"
                className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Créer mon compte
              </a>
              <a
                href="#tarifs"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] hover:text-white"
              >
                Voir les tarifs
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/45">
              <div>59 CHF / mois</div>
              <div className="h-1 w-1 rounded-full bg-white/20" />
              <div>Installation complète possible : 500 CHF</div>
            </div>
          </div>

          <div className="relative z-10">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="rounded-3xl border border-white/10 bg-[#090909] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/30">
                      Exemple de devis
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-white">
                      DEV-2026-1042
                    </div>
                  </div>
                  <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                    Brouillon
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-white/35">Client</div>
                  <div className="mt-1 text-sm font-medium text-white">Jean Dupont</div>
                  <div className="mt-1 text-sm text-white/45">jean@email.ch</div>
                </div>

                <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Vidange complète</span>
                    <span className="font-medium text-white">120 CHF</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Filtre à huile</span>
                    <span className="font-medium text-white">35 CHF</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Main-d’œuvre</span>
                    <span className="font-medium text-white">80 CHF</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between text-sm text-white/55">
                    <span>Sous-total</span>
                    <span>235 CHF</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-white/55">
                    <span>TVA</span>
                    <span>18.10 CHF</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-lg font-bold text-white">
                    <span>Total TTC</span>
                    <span>253.10 CHF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070707]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-white/30">
              Le problème
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Tu perds du temps sur des devis bricolés.
            </h2>
            <p className="mt-4 text-white/60">
              Word, Excel, notes, copier-coller, erreurs dans les montants, documents pas très propres.
              Tout ça te ralentit et donne une moins bonne image à tes clients.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Trop de temps perdu sur l’administratif",
              "Documents pas toujours professionnels",
              "Risque d’erreurs dans les montants",
              "Facturation plus lente que nécessaire",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-white/30">
              La solution
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Une solution simple, rapide et pro.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              title="Devis en quelques secondes"
              text="Crée un devis clair et professionnel sans repartir de zéro à chaque fois."
            />
            <FeatureCard
              title="Factures automatiques"
              text="Transforme un devis en facture rapidement pour gagner encore plus de temps."
            />
            <FeatureCard
              title="Gestion clients"
              text="Retrouve toutes les informations utiles au même endroit."
            />
            <FeatureCard
              title="PDF propres"
              text="Envoie des documents nets et rassurants pour tes clients."
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#070707]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-[0.18em] text-white/30">
              Pour qui
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Pensé pour les pros qui veulent aller vite.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              "Garages",
              "Artisans",
              "Indépendants",
              "Petites entreprises",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center text-lg font-semibold text-white"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center">
            <div className="text-sm uppercase tracking-[0.18em] text-white/30">
              Tarifs
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Une offre simple et claire.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[32px] border border-red-500/20 bg-gradient-to-b from-red-500/[0.12] to-red-500/[0.04] p-8 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]">
              <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                Offre principale
              </div>

              <h3 className="mt-5 text-3xl font-black tracking-tight">Lytho Devis</h3>
              <div className="mt-4 flex items-end gap-2">
                <div className="text-5xl font-black tracking-tight">59 CHF</div>
                <div className="pb-1 text-white/50">/ mois</div>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-white/75">
                {[
                  "Gestion des devis",
                  "Gestion des factures",
                  "Gestion des clients",
                  "PDF professionnels",
                  "Interface simple et rapide",
                  "Accès en ligne",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/register"
                  className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  Commencer maintenant
                </a>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
              <div className="text-sm uppercase tracking-[0.18em] text-white/30">
                Installation en option
              </div>
              <h3 className="mt-4 text-3xl font-black tracking-tight">500 CHF</h3>
              <p className="mt-4 text-white/60">
                Idéal si tu veux un démarrage rapide, une configuration faite pour toi et un vrai accompagnement au lancement.
              </p>

              <div className="mt-8 grid gap-3 text-sm text-white/75">
                {[
                  "Mise en place complète",
                  "Configuration de départ",
                  "Accompagnement personnalisé",
                  "Gain de temps immédiat",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-white/40" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070707]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <div className="text-sm uppercase tracking-[0.18em] text-white/30">
            Appel à l’action
          </div>
          <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Passe à une façon plus simple de gérer tes devis.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/60">
            Arrête de bricoler tes documents. Passe sur une solution claire, rapide et professionnelle.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/register"
              className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Créer mon compte
            </a>
            <a
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.06] hover:text-white"
            >
              Se connecter
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-3 text-sm leading-7 text-white/60">{text}</div>
    </div>
  );
}
