import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CalendarClock, Download, FilePen, Link2, Receipt, Siren, TrendingDown, TrendingUp } from "lucide-react";
import { AreaChart } from "@/components/dashboard/AreaChart";
import { RecentEntries } from "@/components/dashboard/RecentEntries";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardAlertsFromApi } from "@/data/alerts";
import { DATA_START_DATE } from "@/data/mockData";
import { recentEntriesFromJournal } from "@/lib/ledger";
import { useAccountingStore } from "@/stores/useAccountingStore";
import { downloadFile, toCSV } from "@/lib/csv";
import { DEFAULT_PRESET_ID, formatFileDate, formatRange, getPresetRange, getPreviousRange } from "@/lib/dateRange";
import { bucketize, dailyFinancialsFromJournal, filterByRange, GRANULARITY_LABELS, percentChange, summarize } from "@/lib/financials";
import { cn, formatCompact } from "@/lib/utils";

const STATIC_TASKS = [
  { icon: Receipt, label: "Déclaration TVA — échéance 20/10", count: 1, to: "/grand-livre" },
];

const GRANULARITY_CHART_LABELS = { day: "jour", week: "semaine", month: "mois" };

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const ALERT_STYLES = {
  warning: {
    icon: AlertTriangle,
    iconClasses: "bg-amber-100 text-amber-700",
  },
  destructive: {
    icon: Siren,
    iconClasses: "bg-destructive/10 text-destructive",
  },
};

const ALERT_ICONS = {
  drafts: AlertTriangle,
  "late-invoices": Siren,
  "vat-declaration": CalendarClock,
};

function useDashboardData(range, journalEntries) {
  return useMemo(() => {
    const series = dailyFinancialsFromJournal(journalEntries);
    const days = filterByRange(series, range);
    const summary = summarize(days);
    const previous = summarize(filterByRange(series, getPreviousRange(range)));
    const { granularity, buckets } = bucketize(days, range);
    return {
      summary,
      revenueChange: percentChange(summary.revenue, previous.revenue),
      granularity,
      buckets,
      chartData: buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, value: bucket.revenue })),
    };
  }, [range, journalEntries]);
}

function RevenueTrend({ change }) {
  if (change === null) {
    return <p className="mt-1 text-xs text-muted-foreground">Pas de période précédente à comparer</p>;
  }
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-destructive")}>
      <Icon className="size-3.5" aria-hidden="true" />
      {percentFormatter.format(change)} % vs période précédente
    </p>
  );
}

export default function Dashboard() {
  const [activeDateRange, setActiveDateRange] = useState(() => getPresetRange(DEFAULT_PRESET_ID));
  const journalEntries = useAccountingStore((state) => state.journalEntries);
  const apiAlerts = useAccountingStore((state) => state.alerts);
  const syncStatus = useAccountingStore((state) => state.syncStatus);
  const syncError = useAccountingStore((state) => state.syncError);
  const brouillons = apiAlerts.drafts;
  const recentEntries = recentEntriesFromJournal(journalEntries);
  const alerts = dashboardAlertsFromApi(apiAlerts);
  const tasks = [
    { icon: FilePen, label: "Brouillons à corriger", count: brouillons, to: "/brouillons" },
    { icon: Link2, label: "Écritures non lettrées", count: apiAlerts.unlettered ?? 0, to: "/lettrage" },
    ...STATIC_TASKS,
  ];
  const { summary, revenueChange, granularity, buckets, chartData } = useDashboardData(activeDateRange, journalEntries);
  const periodLabel = formatRange(activeDateRange);

  const handleExport = () => {
    const header = [GRANULARITY_LABELS[granularity], "Chiffre d'affaires HT (MAD)", "Charges (MAD)", "Résultat (MAD)"];
    const rows = buckets.map((bucket) => [
      bucket.exportLabel,
      bucket.revenue,
      bucket.charges,
      bucket.revenue - bucket.charges,
    ]);
    rows.push(["Total", summary.revenue, summary.charges, summary.netResult]);

    const { startDate, endDate } = activeDateRange;
    downloadFile(
      toCSV(header, rows),
      `export_chiffre_daffaires_${formatFileDate(startDate)}_${formatFileDate(endDate)}.csv`
    );
  };

  return (
    <>
      <PageHeader
        actions={
          <>
            <DateRangePicker value={activeDateRange} onChange={setActiveDateRange} minDate={DATA_START_DATE} />
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download aria-hidden="true" /> Exporter
            </Button>
          </>
        }
      />

      {syncStatus === "error" && (
        <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          L'API n'est pas joignable{syncError ? ` : ${syncError}` : ""}. Vérifiez que Postgres et Laravel tournent, puis rechargez.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chiffre d'affaires HT</CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="grid items-end gap-4 sm:grid-cols-[auto_1fr]">
            <div>
              <p className="text-3xl font-bold tracking-tight tabular-nums">{formatCompact(summary.revenue)} MAD</p>
              <RevenueTrend change={revenueChange} />
            </div>
            <div className="h-28">
              <AreaChart
                data={chartData}
                label={`Chiffre d'affaires HT par ${GRANULARITY_CHART_LABELS[granularity]}, ${periodLabel}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Alertes</CardTitle>
            <CardDescription>Points nécessitant votre attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2">
              {alerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.id] ?? ALERT_STYLES[alert.tone].icon;

                return (
                  <li key={alert.id}>
                    <Link
                      to={alert.to}
                      className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        aria-hidden="true"
                        className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", ALERT_STYLES[alert.tone].iconClasses)}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{alert.label}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{alert.detail}</span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <RecentEntries entries={recentEntries} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>À traiter</CardTitle>
            <CardDescription>Actions en attente sur le dossier</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-3">
              {tasks.map(({ icon: Icon, label, count, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm">{label}</span>
                    <span className="text-lg font-semibold tabular-nums">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
