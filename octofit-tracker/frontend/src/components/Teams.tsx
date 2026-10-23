import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';
const load = () => getJson<Record<string, unknown>>('/api/teams');

export default function Teams() {
  return <CapabilityCard title="Teams" description="Manage teams and members." load={load} dataKey="teams" emptyText="No teams" />;
}
