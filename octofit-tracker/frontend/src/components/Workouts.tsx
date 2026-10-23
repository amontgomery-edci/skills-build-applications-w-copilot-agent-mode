import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';
const load = () => getJson<Record<string, unknown>>('/api/workouts/suggestions/mona@example.com');

export default function Workouts() {
  return <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns." load={load} dataKey="suggestions" emptyText="No workout suggestions" />;
}
