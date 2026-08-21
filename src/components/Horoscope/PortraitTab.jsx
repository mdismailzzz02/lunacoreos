import React from 'react';

const SECTIONS = [
    {
        title: "Sun in Aries, Moon in Virgo",
        content: `You were born with the Sun in Aries and the Moon in Virgo, which gives you a complex and varied character. With the Sun in Aries your essential qualities are determination, leadership, and dynamism. Others see you as a practical, down-to-earth, prudent person.

You are a collector of things and you habitually sort, categorize, and analyze. At times you are very critical of people but never in a malicious fashion.

There is a love force and spirituality in you that can rise at particular moments.

Because you possess two qualities that are essential for any good business person - creativeness and a sense of economy - you will very possibly go far in all material affairs of life.

You really are a person to be envied because, although you must perform the mundane tasks of life every day, you perform them correctly and fulfill all your obligations with freshness and vitality.

The key to harmonious development of your being will be to somehow balance the influence of the Sun in Aries with that of the Moon in Virgo. Your active inner nature can be expressed through service and humanitarian activities.`
    },
    {
        title: "Ascendant in Capricorn, Saturn in the Third House",
        content: `At the time of your birth the zodiacal sign of Capricorn was ascending on the horizon. Its ruler Saturn is located in the third house.

The sign of Capricorn denotes an existence in which temperament is very important. You will give an image of ambition, persistence, will power, consistency and perseverance. You were born with the tendencies to seek material, social, and, perhaps, even political power.

Capricorn tends to a challenging life which forces you to exert all your resources in order to triumph. Because of your tact and prudence, you will be favored with the good will of important people.

Your mind is egocentric, rational and you have a natural tendency toward scepticism. Able to work hard, you will bear obstacles and frustrations with patience.

You will proceed with prudence in your love life and in all other activities. You will seriously consider all of the ramifications of a relationship, especially the aspects of your independence, and you will not commit yourself to a partner until you are sure of your choice. After that however there is a tendency to conduct a peaceful and quiet life.

You are very economical in your daily activities, and if you do not exert some control over this trait, it could appear as rather mean.

You are best placed in governmental, municipal, political, or large business organizations where hierarchy is very exactly defined. The key word for your professional orientation is responsibility.

This position indicates that your life is geared to the satisfaction of intimate intellectual needs. Your mind is slow, rational, egocentric, despondent, careful, tactful, cautious, and a little afraid. You are an ideal diplomat and a person to whom any secrets can be confided. Intellectual pursuits requiring patience and persistence are your ideal choices. The problem is that you distrust everything and everybody.

Be aware of subjective and negative tendencies; Saturn in this position indicates a strong tendency to melancholia, highly subjective moods, mental shyness, and an ability for clear and frank communication.`
    },
    {
        title: "Neptune Conjunct Ascendant",
        content: `The conjunction of Neptune to the Ascendant shows that you are very sensitive and perhaps psychic. Your grip on the real world is loose; you need to grasp it more firmly.

You are so physically sensitive to the injustices you observe in society that they can easily make you ill. Because your environment has such a powerful effect, you should try to make some contribution to relieve your anxieties about allowing these negative conditions to exist.

You are sympathetic toward the oppressed, understanding of the emotionally disturbed, and forgiving to those who seem guiltless in their transgressions against society.

You easily become distraught over conditions you are powerless to do anything about, and your feelings of guilt and failure can make you withdraw into a world that is safe from responsibility.

You should associate with people who have their feet on the ground to compensate for your aimless wandering temperament. There is a great need for your sympathetic understanding, and you do not have the right to turn down anyone who extends a hand for help.`
    },
    {
        title: "Sun in the Third House",
        content: `The Sun appears in the third house at the time of your birth.

Your individuality as ruled by the Sun must pass several karmic tests of a mental character in order to return to its spiritual abode with a richer knowledge in this state of consciousness. Your mind strives for glory, social success, honors, power and magnanimous elevation by means of intellectual understanding.

The path for the realization of fame, honor, nobility and advancement lies through study, communication and self-expression. Your views about life are optimistic, self-assured, kind and generous.

The liabilities of your mind are a lack of interest in detail or occupations and matters that you regard as being below your dignity.`
    },
    {
        title: "Venus in the Third House",
        content: `Venus was in the third house of your horoscope at the time of birth. You are keenly interested in the creative arts, and your thoughts and words are surrounded by a halo of beauty, taste, and proportion. Your mind actually feels the emotions connected with nature and the higher aspects of things human. Venus here augurs pleasant and kind relations with members of your family; the disposition of your intellect is congenial, youthful, and attractive.

The keys to a better integration of both your mental and emotional functions consist of deepening your personal relationships and of turning the mind inward so that you may be able to know the world better by means of true self-knowledge.`
    },
    {
        title: "Saturn in the Third House",
        content: `Saturn appeared in the third house at the time of your birth. This planet brings an aura of objectivity and contriving to all mental functions; the general attitude is reserved, serious, and lacking in dynamism, warmth and flexibility. You are a thinker and a slow, but determined planner.

The struggle to realize your life plans might be difficult, and you will receive little assistance from persons close to you.

You tend to worry needlessly or give excessive attention to plans which will yield very little in relation to the effort invested. We advise you to plan things carefully and realistically without overdoing it.

Saturn here represents duties that you must comply with and which are of an intellectual nature. It also points to tests of character occurring at critical points of human relationship, which can only be successfully "passed" by developing an altruistic and compassionate nature that will make pardon and forgiveness feasible.`
    },
    {
        title: "Moon in the Seventh House",
        content: `The Moon was found in the seventh house at the time of your birth.

Exciting romance may occur at an early stage in life. We must warn you, however, that unless modified by further interpretations, the partner may have fluctuating affections.

You're also one of those who throughout the relationship manifests a great variety of personality roles and who seldom shows in intimacy his real nature.`
    }
];

export default function PortraitTab() {
    return (
        <div style={{ animation: 'fadeInUp 0.25s ease' }}>
            <div className="dashboard-card fade-in" style={{ padding: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Personal Portrait</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>for Mohd Ismail, born on 18 April 1997, 1:00 AM, Lucknow, India</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>Text by Robert Pelletier</div>
                
                <div style={{ marginTop: '2rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img 
                        src="/natal_chart.png" 
                        alt="Natal Chart" 
                        style={{ width: '100%', display: 'block', filter: 'invert(0.9) hue-rotate(180deg) contrast(1.2)' }} 
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {SECTIONS.map((sec, idx) => (
                    <div key={idx} className="dashboard-card fade-in" style={{ padding: '1.5rem', borderLeft: '3px solid #8b5cf6' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#a78bfa' }}>{sec.title}</h3>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.7, opacity: 0.9 }}>
                            {sec.content.split('\n\n').map((paragraph, pIdx) => (
                                <p key={pIdx} style={{ margin: '0 0 0.8rem 0' }}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
