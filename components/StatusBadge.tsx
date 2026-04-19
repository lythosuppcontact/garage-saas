export default function StatusBadge({ status }: { status: string }) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border";

  switch (status) {
    case "draft":
      return (
        <span className={`${base} bg-yellow-500/15 text-yellow-300 border-yellow-500/30`}>
          Brouillon
        </span>
      );

    case "sent":
      return (
        <span className={`${base} bg-blue-500/15 text-blue-300 border-blue-500/30`}>
          Envoyé
        </span>
      );

    case "approved":
    case "accepted":
      return (
        <span className={`${base} bg-green-500/15 text-green-300 border-green-500/30`}>
          Accepté
        </span>
      );

    case "rejected":
    case "refused":
      return (
        <span className={`${base} bg-red-500/15 text-red-300 border-red-500/30`}>
          Refusé
        </span>
      );

    case "paid":
      return (
        <span className={`${base} bg-green-500/15 text-green-300 border-green-500/30`}>
          Payé
        </span>
      );

    case "partially_paid":
      return (
        <span className={`${base} bg-orange-500/15 text-orange-300 border-orange-500/30`}>
          Partiellement payé
        </span>
      );

    case "overdue":
      return (
        <span className={`${base} bg-red-500/15 text-red-300 border-red-500/30`}>
          En retard
        </span>
      );

    case "cancelled":
      return (
        <span className={`${base} bg-zinc-500/15 text-zinc-300 border-zinc-500/30`}>
          Annulé
        </span>
      );

    default:
      return (
        <span className={`${base} bg-white/10 text-white border-white/10`}>
          {status}
        </span>
      );
  }
}