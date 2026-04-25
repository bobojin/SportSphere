export function MetricCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <p className="metric-card__eyebrow">{label}</p>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__note">{note}</p>
    </article>
  );
}
