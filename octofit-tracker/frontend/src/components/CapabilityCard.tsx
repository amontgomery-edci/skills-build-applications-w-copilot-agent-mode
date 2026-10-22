import { useEffect, useMemo, useState } from 'react';
import { getJson } from '../api/client.js';

type CapabilityKey = 'activities' | 'teams' | 'leaderboard' | 'suggestions';

type Props = {
  title: string;
  description: string;
  endpoint: string;
  dataKey: CapabilityKey;
  emptyText: string;
};

export function CapabilityCard({ title, description, endpoint, dataKey, emptyText }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const response = await getJson<Record<string, unknown>>(endpoint);
        if (!isMounted) return;
        setData(response);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError((err as Error).message || 'Unable to load data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  const items = useMemo(() => {
    if (!data) return [] as Array<Record<string, unknown>>;
    const value = data[dataKey];
    return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
  }, [data, dataKey]);

  if (loading) {
    return (
      <section className="card h-100">
        <div className="card-body">
          <h2 className="h4">{title}</h2>
          <p>{description}</p>
          <p role="status">Loading...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card h-100">
        <div className="card-body">
          <h2 className="h4">{title}</h2>
          <p>{description}</p>
          <div role="alert">{error.includes('503') ? 'Unavailable' : error}</div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="card h-100">
        <div className="card-body">
          <h2 className="h4">{title}</h2>
          <p>{description}</p>
          <p>{emptyText}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        <ul className="list-unstyled mb-0">
          {items.map((item, index) => {
            if (dataKey === 'activities') {
              return <li key={`${(item.type as string) ?? 'activity'}-${index}`}>{String(item.type ?? 'Activity')} ({String(item.minutes ?? 0)} mins)</li>;
            }
            if (dataKey === 'teams') {
              return <li key={`${String(item.name ?? 'team')}-${index}`}>{String(item.name ?? 'Team')}</li>;
            }
            if (dataKey === 'leaderboard') {
              return <li key={`${String(item.teamName ?? 'team')}-${index}`}>{String(item.teamName ?? 'Team')} {String(item.totalPoints ?? 0)}</li>;
            }
            return <li key={`${String(item.title ?? 'workout')}-${index}`}>{String(item.title ?? 'Workout')}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}
