import { Activity, ArrowLeft, Loader2, Menu } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useTheme } from './ThemeProvider';
import { backNavIconButtonClassName } from '@/lib/backNavButton';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  fetchUsageSummary,
  fetchUsageTimeseries,
  type UsageSummary,
  type UsageTimeseries,
} from '@/services/adminUsage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type RangePreset = '7' | '30' | 'custom';

interface AdminUsageScreenProps {
  onOpenMenu: () => void;
  onNavigateBack: () => void;
  onSessionExpired: () => void;
}

function formatIsoRange(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDayLabel(day: string): string {
  try {
    return new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return day;
  }
}

export function AdminUsageScreen({
  onOpenMenu,
  onNavigateBack,
  onSessionExpired,
}: AdminUsageScreenProps) {
  const { themeColor } = useTheme();
  const [preset, setPreset] = useState<RangePreset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [series, setSeries] = useState<UsageTimeseries | null>(null);

  const dateRange = useMemo(() => {
    if (preset === 'custom') {
      if (!customFrom || !customTo) return { dateFrom: undefined as string | undefined, dateTo: undefined as string | undefined };
      return { dateFrom: customFrom, dateTo: customTo };
    }
    const days = preset === '7' ? 6 : 29;
    const end = new Date();
    const start = subDays(end, days);
    return {
      dateFrom: format(start, 'yyyy-MM-dd'),
      dateTo: format(end, 'yyyy-MM-dd'),
    };
  }, [preset, customFrom, customTo]);

  const load = useCallback(async () => {
    setError('');
    const { dateFrom, dateTo } = dateRange;
    if (preset === 'custom' && (!dateFrom || !dateTo)) {
      setSummary(null);
      setSeries(null);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const qFrom = preset === '30' ? undefined : dateFrom;
      const qTo = preset === '30' ? undefined : dateTo;
      const [s, ts] = await Promise.all([
        fetchUsageSummary(qFrom, qTo),
        fetchUsageTimeseries(qFrom, qTo),
      ]);
      setSummary(s);
      setSeries(ts);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Erro ao carregar uso');
      setSummary(null);
      setSeries(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange, preset, onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = summary?.totals;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <header className="shrink-0 px-4 pt-6 pb-3 border-b border-border flex items-center gap-3">
        <button type="button" onClick={onNavigateBack} className={backNavIconButtonClassName}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="truncate">Uso da plataforma</span>
          </h1>
          <p className="text-xs text-muted-foreground">Acessos, chats, voz e eventos de agenda criados</p>
        </div>
        <button type="button" onClick={onOpenMenu} className={backNavIconButtonClassName}>
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide pb-24 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreset('7')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              preset === '7'
                ? `bg-gradient-to-br ${themeColor} text-white border-transparent`
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
          >
            7 dias
          </button>
          <button
            type="button"
            onClick={() => setPreset('30')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              preset === '30'
                ? `bg-gradient-to-br ${themeColor} text-white border-transparent`
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
          >
            30 dias
          </button>
          <button
            type="button"
            onClick={() => setPreset('custom')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              preset === 'custom'
                ? `bg-gradient-to-br ${themeColor} text-white border-transparent`
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
          >
            Personalizado
          </button>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">De</span>
              <input
                type="date"
                value={customFrom}
                onChange={(ev) => setCustomFrom(ev.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Até</span>
              <input
                type="date"
                value={customTo}
                onChange={(ev) => setCustomTo(ev.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-br ${themeColor} btn-apple`}
            >
              Aplicar
            </button>
          </div>
        )}

        {summary && (
          <p className="text-[11px] text-muted-foreground">
            Período: {formatIsoRange(summary.period_from)} — {formatIsoRange(summary.period_to)}
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Carregando…</p>
          </div>
        ) : (
          <>
            {totals && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 card-apple">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Acessos</p>
                  <p className="text-2xl font-semibold mt-1">{totals.accesses}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Login + renovação de sessão</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 card-apple">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Chats</p>
                  <p className="text-2xl font-semibold mt-1">{totals.chat_completion}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 card-apple">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Voz</p>
                  <p className="text-2xl font-semibold mt-1">{totals.voice_session}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 card-apple">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Eventos criados</p>
                  <p className="text-2xl font-semibold mt-1">{totals.events_created}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Compromissos na agenda</p>
                </div>
              </div>
            )}

            {series && series.series.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden card-apple">
                <p className="text-sm font-medium px-4 pt-4 pb-2">Por dia (UTC)</p>
                <div className="overflow-x-auto px-2 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead className="text-right">Chat</TableHead>
                        <TableHead className="text-right">Voz</TableHead>
                        <TableHead className="text-right">Eventos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {series.series.map((row) => (
                        <TableRow key={row.day}>
                          <TableCell className="whitespace-nowrap">{formatDayLabel(row.day)}</TableCell>
                          <TableCell className="text-right">{row.accesses}</TableCell>
                          <TableCell className="text-right">{row.chat_completion}</TableCell>
                          <TableCell className="text-right">{row.voice_session}</TableCell>
                          <TableCell className="text-right">{row.events_created}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {summary && summary.users.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden card-apple">
                <p className="text-sm font-medium px-4 pt-4 pb-2">Por usuário</p>
                <div className="overflow-x-auto px-2 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead className="text-right">Chat</TableHead>
                        <TableHead className="text-right">Voz</TableHead>
                        <TableHead className="text-right">Eventos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium max-w-[120px] truncate">{u.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[160px] truncate">{u.email}</TableCell>
                          <TableCell className="text-right">{u.accesses}</TableCell>
                          <TableCell className="text-right">{u.chat_completion}</TableCell>
                          <TableCell className="text-right">{u.voice_session}</TableCell>
                          <TableCell className="text-right">{u.events_created}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
