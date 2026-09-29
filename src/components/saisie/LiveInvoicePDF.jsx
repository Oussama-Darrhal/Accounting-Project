import { memo } from "react";
import { Document, Page, PDFViewer, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ACCOUNT_LABELS } from "@/data/planComptable";
import { isLineBlank } from "@/hooks/useJournalLines";
import { isoToFr } from "@/components/ui/date-input";
import { formatCurrency, toCents } from "@/lib/utils";

const COLORS = { text: "#0f172a", muted: "#64748b", border: "#e2e8f0", head: "#f1f5f9", warning: "#b45309", success: "#15803d" };

const COLUMNS = [
  { key: "date", label: "Date", width: "13%" },
  { key: "facture", label: "N° Facture", width: "17%" },
  { key: "compte", label: "Compte", width: "38%" },
  { key: "debit", label: "Débit", width: "16%", align: "right" },
  { key: "credit", label: "Crédit", width: "16%", align: "right" },
];

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9, color: COLORS.text },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12, marginBottom: 16, borderBottom: `1pt solid ${COLORS.border}` },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  subtitle: { marginTop: 4, color: COLORS.muted },
  row: { flexDirection: "row", borderBottom: `0.5pt solid ${COLORS.border}` },
  headRow: { backgroundColor: COLORS.head, fontFamily: "Helvetica-Bold", color: COLORS.muted },
  totalRow: { fontFamily: "Helvetica-Bold", borderTop: `1pt solid ${COLORS.muted}`, borderBottom: "none" },
  cell: { paddingVertical: 5, paddingHorizontal: 4 },
  status: { marginTop: 10, fontFamily: "Helvetica-Bold" },
});

/** Standard PDF fonts have no glyph for the narrow no-break space Intl uses as a thousands separator. */
const pdfSafe = (text) => text.replace(/[\u202f\u00a0]/g, " ");
const money = (cents) => pdfSafe(formatCurrency(cents / 100));

function cellValue(line, key) {
  if (key === "date") return isoToFr(line.date);
  if (key === "compte") return line.compte ? `${line.compte} ${ACCOUNT_LABELS[line.compte] ?? ""}` : "";
  if (key === "debit" || key === "credit") {
    const cents = toCents(line[key]);
    return cents ? money(cents) : "";
  }
  return line[key];
}

export function LiveInvoiceDocument({ data }) {
  const lines = data.filter((line) => !isLineBlank(line));
  const totalDebit = lines.reduce((sum, line) => sum + toCents(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + toCents(line.credit), 0);
  const gap = totalDebit - totalCredit;
  const pieces = [...new Set(lines.map((line) => line.facture.trim()).filter(Boolean))];

  return (
    <Document title="Aperçu de l'écriture comptable" language="fr-FR">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Écriture comptable</Text>
            <Text style={styles.subtitle}>{pieces.length ? `Pièce(s) : ${pieces.join(", ")}` : "Pièce non renseignée"}</Text>
          </View>
          <Text style={styles.subtitle}>Généré le {new Date().toLocaleDateString("fr-FR")}</Text>
        </View>

        <View style={[styles.row, styles.headRow]} fixed>
          {COLUMNS.map((column) => (
            <Text key={column.key} style={[styles.cell, { width: column.width, textAlign: column.align ?? "left" }]}>
              {column.label}
            </Text>
          ))}
        </View>

        {lines.map((line) => (
          <View key={line.id} style={styles.row} wrap={false}>
            {COLUMNS.map((column) => (
              <Text key={column.key} style={[styles.cell, { width: column.width, textAlign: column.align ?? "left" }]}>
                {cellValue(line, column.key)}
              </Text>
            ))}
          </View>
        ))}

        <View style={[styles.row, styles.totalRow]}>
          <Text style={[styles.cell, { width: "68%" }]}>Total</Text>
          <Text style={[styles.cell, { width: "16%", textAlign: "right" }]}>{money(totalDebit)}</Text>
          <Text style={[styles.cell, { width: "16%", textAlign: "right" }]}>{money(totalCredit)}</Text>
        </View>

        <Text style={[styles.status, { color: gap === 0 ? COLORS.success : COLORS.warning }]}>
          {gap === 0 ? "Écriture équilibrée" : `Écriture non équilibrée — écart de ${money(Math.abs(gap))}`}
        </Text>
      </Page>
    </Document>
  );
}

export function renderInvoiceBlob(data) {
  return pdf(<LiveInvoiceDocument data={data} />).toBlob();
}

function LiveInvoicePDF({ data }) {
  return (
    <PDFViewer className="h-full w-full rounded-md border-none">
      <LiveInvoiceDocument data={data} />
    </PDFViewer>
  );
}

export default memo(LiveInvoicePDF);
