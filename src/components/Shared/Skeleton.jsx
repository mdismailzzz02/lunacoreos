export default function Skeleton({ width = '100%', height = 18, radius = 6, style = {} }) {
    return (
        <>
            <style>{`
                .lunacore-skeleton {
                    background: linear-gradient(90deg, rgba(167,139,250,0.05) 25%, rgba(167,139,250,0.15) 50%, rgba(167,139,250,0.05) 75%);
                    background-size: 200% 100%;
                    animation: lunacore-shimmer 2s infinite linear;
                    position: relative;
                    overflow: hidden;
                }
                .lunacore-skeleton::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(167,139,250,0.1), transparent);
                    transform: skewX(-20deg) translateX(-150%);
                    animation: shimmer-sweep 2.5s infinite ease-in-out;
                }
                @keyframes lunacore-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes shimmer-sweep {
                    0% { transform: skewX(-20deg) translateX(-150%); }
                    50% { transform: skewX(-20deg) translateX(150%); }
                    100% { transform: skewX(-20deg) translateX(150%); }
                }
                .skeleton-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(167,139,250,0.1);
                    border-radius: 16px;
                    padding: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    backdrop-filter: blur(10px);
                }
                .vault-skeleton {
                    aspect-ratio: 1/1;
                    width: 100%;
                    border-radius: 24px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(167,139,250,0.1);
                    overflow: hidden;
                    position: relative;
                    box-sizing: border-box;
                }
            `}</style>
            <div
                className="lunacore-skeleton"
                style={{ width, height, borderRadius: radius, ...style }}
            />
        </>
    );
}

export function SkeletonCard({ lines = 3, type = 'default' }) {
    if (type === 'vault') {
        return (
            <div className="vault-skeleton lunacore-skeleton">
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ width: '40%', height: '8px', background: 'rgba(167,139,250,0.2)', borderRadius: '4px' }} />
                    <div style={{ width: '70%', height: '8px', background: 'rgba(167,139,250,0.1)', borderRadius: '4px' }} />
                </div>
                <div style={{ position: 'absolute', top: '16px', left: '16px', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(167,139,250,0.2)' }} />
            </div>
        );
    }
    
    return (
        <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={16} width="50%" radius={8} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton key={i} height={10} radius={6} width={i === lines - 1 ? '70%' : '100%'} />
                ))}
            </div>
        </div>
    );
}

export function SkeletonStrip({ count = 3, width = '80px', height = '24px', radius = '12px' }) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'hidden' }}>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} width={width} height={height} radius={radius} />
            ))}
        </div>
    );
}
