export default function Skeleton({ width = '100%', height = 18, radius = 6, style = {} }) {
    return (
        <div
            className="skeleton"
            style={{ width, height, borderRadius: radius, ...style }}
        />
    );
}

export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={14} width="40%" />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
            ))}
        </div>
    );
}
