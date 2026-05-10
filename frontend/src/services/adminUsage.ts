import { authorizedFetch, parseFastApiDetail } from './auth';

/** accesses = logins + renovação de sessão (refresh). events_created = eventos de agenda criados. */
export interface UsageTotals {
  accesses: number;
  chat_completion: number;
  voice_session: number;
  events_created: number;
}

export interface UsageUserRow {
  user_id: string;
  name: string;
  email: string;
  accesses: number;
  chat_completion: number;
  voice_session: number;
  events_created: number;
}

export interface UsageSummary {
  period_from: string;
  period_to: string;
  totals: UsageTotals;
  users: UsageUserRow[];
}

export interface UsageTimeseriesRow {
  day: string;
  accesses: number;
  chat_completion: number;
  voice_session: number;
  events_created: number;
}

export interface UsageTimeseries {
  period_from: string;
  period_to: string;
  series: UsageTimeseriesRow[];
}

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return parseFastApiDetail(body, 'Erro na requisição');
}

function buildRangeQuery(dateFrom?: string, dateTo?: string): string {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const q = params.toString();
  return q ? `?${q}` : '';
}

/** Omitir intervalo = últimos 30 dias (backend). */
export async function fetchUsageSummary(dateFrom?: string, dateTo?: string): Promise<UsageSummary> {
  const res = await authorizedFetch(`/admin/usage/summary${buildRangeQuery(dateFrom, dateTo)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchUsageTimeseries(dateFrom?: string, dateTo?: string): Promise<UsageTimeseries> {
  const res = await authorizedFetch(`/admin/usage/timeseries${buildRangeQuery(dateFrom, dateTo)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
