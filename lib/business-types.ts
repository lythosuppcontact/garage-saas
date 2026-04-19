export type BusinessType =
  | "garage"
  | "cleaning"
  | "plumbing"
  | "electrical"
  | "landscaping"
  | "btp"
  | "other";

type BusinessConfig = {
  label: string;
  shortLabel: string;
  description: string;
  entities: {
    customerSingular: string;
    customerPlural: string;
    vehicleSingular: string;
    vehiclePlural: string;
    quoteSingular: string;
    quotePlural: string;
    invoiceSingular: string;
    invoicePlural: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    revenueLabel: string;
    pendingLabel: string;
    paidLabel: string;
    quotesLabel: string;
    invoicesLabel: string;
    recentQuotesLabel: string;
    recentInvoicesLabel: string;
  };
  sidebar: {
    showVehicles: boolean;
    vehiclesLabel: string;
    customersLabel: string;
    quotesNewLabel: string;
    quotesListLabel: string;
    invoicesNewLabel: string;
    invoicesListLabel: string;
  };
  features: {
    showClaimNumber: boolean;
  };
};

export const BUSINESS_CONFIGS: Record<BusinessType, BusinessConfig> = {
  garage: {
    label: "Garage / carrosserie",
    shortLabel: "Garage",
    description: "Gestion atelier, véhicules, devis et factures garage.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "véhicule",
      vehiclePlural: "véhicules",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage de l’atelier",
      subtitle: "Suivi des devis, factures, véhicules et activité garage.",
      revenueLabel: "Chiffre d'affaires atelier",
      pendingLabel: "Restant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis garage",
      invoicesLabel: "Factures garage",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: true,
      vehiclesLabel: "Véhicules",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: true,
    },
  },

  cleaning: {
    label: "Entreprise de nettoyage",
    shortLabel: "Nettoyage",
    description: "Gestion des prestations, interventions et facturation.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "équipement",
      vehiclePlural: "équipements",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage des prestations",
      subtitle: "Suivi des clients, interventions et facturation nettoyage.",
      revenueLabel: "Chiffre d'affaires prestations",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis prestations",
      invoicesLabel: "Factures prestations",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Équipements",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },

  plumbing: {
    label: "Plomberie",
    shortLabel: "Plomberie",
    description: "Gestion des interventions, installations et dépannages.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "matériel",
      vehiclePlural: "matériel",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage des interventions",
      subtitle: "Suivi des clients, devis et factures plomberie.",
      revenueLabel: "Chiffre d'affaires interventions",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis plomberie",
      invoicesLabel: "Factures plomberie",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Matériel",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },

  electrical: {
    label: "Électricité",
    shortLabel: "Électricité",
    description: "Gestion des installations, interventions et équipements.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "équipement",
      vehiclePlural: "équipements",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage des chantiers électriques",
      subtitle: "Suivi des clients, devis et factures électricité.",
      revenueLabel: "Chiffre d'affaires interventions",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis électricité",
      invoicesLabel: "Factures électricité",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Équipements",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },

  landscaping: {
    label: "Paysagisme",
    shortLabel: "Paysagisme",
    description: "Gestion des chantiers, entretiens et aménagements.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "matériel",
      vehiclePlural: "matériel",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage des chantiers",
      subtitle: "Suivi des clients, devis et factures paysagisme.",
      revenueLabel: "Chiffre d'affaires chantiers",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis paysagisme",
      invoicesLabel: "Factures paysagisme",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Matériel",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },

  btp: {
    label: "BTP / construction",
    shortLabel: "BTP",
    description: "Gestion des chantiers, métrés et facturation BTP.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "matériel",
      vehiclePlural: "matériel",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage des chantiers",
      subtitle: "Suivi des clients, devis et factures construction.",
      revenueLabel: "Chiffre d'affaires chantiers",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis chantier",
      invoicesLabel: "Factures chantier",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Matériel",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },

  other: {
    label: "Autre activité",
    shortLabel: "Activité",
    description: "Version générique adaptable à tout type de métier.",
    entities: {
      customerSingular: "client",
      customerPlural: "clients",
      vehicleSingular: "élément",
      vehiclePlural: "éléments",
      quoteSingular: "devis",
      quotePlural: "devis",
      invoiceSingular: "facture",
      invoicePlural: "factures",
    },
    dashboard: {
      title: "Pilotage de l’activité",
      subtitle: "Suivi global de l’activité, des devis et des factures.",
      revenueLabel: "Chiffre d'affaires",
      pendingLabel: "Montant à encaisser",
      paidLabel: "Total encaissé",
      quotesLabel: "Devis",
      invoicesLabel: "Factures",
      recentQuotesLabel: "Devis récents",
      recentInvoicesLabel: "Factures récentes",
    },
    sidebar: {
      showVehicles: false,
      vehiclesLabel: "Éléments",
      customersLabel: "Clients",
      quotesNewLabel: "Nouveau devis",
      quotesListLabel: "Liste des devis",
      invoicesNewLabel: "Nouvelle facture",
      invoicesListLabel: "Liste des factures",
    },
    features: {
      showClaimNumber: false,
    },
  },
};

export function getBusinessConfig(
  businessType: string | null | undefined
): BusinessConfig {
  if (!businessType) return BUSINESS_CONFIGS.other;
  return BUSINESS_CONFIGS[businessType as BusinessType] || BUSINESS_CONFIGS.other;
}