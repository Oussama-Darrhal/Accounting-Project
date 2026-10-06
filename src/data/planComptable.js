export const ACCOUNT_CLASSES = [
  {
    classe: 1,
    label: "Classe 1 — Financement permanent",
    accounts: [
      { code: "1111", label: "Capital social" },
      { code: "1140", label: "Réserve légale" },
      { code: "1481", label: "Emprunts auprès des établissements de crédit" },
    ],
  },
  {
    classe: 2,
    label: "Classe 2 — Actif immobilisé",
    accounts: [
      { code: "2332", label: "Matériel et outillage" },
      { code: "2340", label: "Matériel de transport" },
      { code: "2355", label: "Matériel informatique" },
    ],
  },
  {
    classe: 3,
    label: "Classe 3 — Actif circulant",
    accounts: [
      { code: "3111", label: "Marchandises" },
      { code: "3421", label: "Clients" },
      { code: "3455", label: "État — TVA récupérable" },
    ],
  },
  {
    classe: 4,
    label: "Classe 4 — Passif circulant",
    accounts: [
      { code: "4411", label: "Fournisseurs" },
      { code: "4432", label: "Rémunérations dues au personnel" },
      { code: "4455", label: "État — TVA facturée" },
    ],
  },
  {
    classe: 5,
    label: "Classe 5 — Trésorerie",
    accounts: [
      { code: "5141", label: "Banques" },
      { code: "5161", label: "Caisse" },
    ],
  },
  {
    classe: 6,
    label: "Classe 6 — Charges",
    accounts: [
      { code: "6111", label: "Achats de marchandises" },
      { code: "6125", label: "Achats non stockés de matières et fournitures" },
      { code: "6131", label: "Locations et charges locatives" },
      { code: "6171", label: "Rémunérations du personnel" },
    ],
  },
  {
    classe: 7,
    label: "Classe 7 — Produits",
    accounts: [
      { code: "7111", label: "Ventes de marchandises" },
      { code: "7121", label: "Ventes de biens et services produits" },
    ],
  },
  {
    classe: 8,
    label: "Classe 8 — Résultats",
    accounts: [
      { code: "8110", label: "Résultat d'exploitation" },
      { code: "8800", label: "Résultat après impôts" },
    ],
  },
];

export const ACCOUNTS = ACCOUNT_CLASSES.flatMap((group) => group.accounts);

export const ACCOUNT_LABELS = Object.fromEntries(
  ACCOUNTS.map((account) => [account.code, account.label])
);

export const TVA_RATES = [
  { value: "20", label: "20 %" },
  { value: "14", label: "14 %" },
  { value: "10", label: "10 %" },
  { value: "7", label: "7 %" },
  { value: "0", label: "0 %" },
];

export const JOURNALS = ["ACH", "VT", "BQ", "OD"];

export const TIER_SUGGESTIONS = ["4411 - Oasis Tech", "3421 - Atlas SARL", "5141 - Banque Populaire"];
