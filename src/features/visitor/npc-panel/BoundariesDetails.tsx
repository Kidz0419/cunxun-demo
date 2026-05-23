type BoundariesDetailsProps = {
  boundaries: string[];
  handoffText: string;
};

export function BoundariesDetails({ boundaries, handoffText }: BoundariesDetailsProps) {
  return (
    <details className="boundaries-details">
      <summary>边界 / 我不答的 ({boundaries.length})</summary>
      <div className="body">
        {boundaries.map((boundary) => (
          <p key={boundary}>· {boundary}</p>
        ))}
        <p className="handoff">{handoffText}</p>
      </div>
    </details>
  );
}
