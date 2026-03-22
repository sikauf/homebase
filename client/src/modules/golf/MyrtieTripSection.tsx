const TRIP_DATE = new Date('2026-04-17T00:00:00')

const COURSES = [
  { name: 'South Creek',   image: '/golf/myrtle/south_creek.webp', objPos: '50% 50%' },
  { name: 'Glen Dornoch',  image: '/golf/myrtle/glen_donorch.jpg', objPos: '50% 40%' },
  { name: "Man O' War",    image: '/golf/myrtle/man_o_war.webp',   objPos: '50% 50%' },
]

export default function MyrtieTripSection() {
  const days = Math.ceil((TRIP_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div
      className="mb-8 rounded-2xl overflow-hidden grid"
      style={{ height: '300px', gridTemplateColumns: '1fr 2fr', gap: '1px', background: 'rgba(255,255,255,0.05)' }}
    >
      {/* Dedicated dark text column */}
      <div className="flex flex-col justify-center px-8" style={{ background: '#0c1009' }}>
        <p
          className="text-xs tracking-[.5em] uppercase mb-4"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Upcoming Trip
        </p>
        <h3 className="text-3xl font-black tracking-tight text-white leading-none mb-1">
          Myrtle Beach
        </h3>
        <p
          className="text-xs tracking-[.2em] uppercase mb-6"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          South Carolina · Apr 17, 2026
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className="text-white leading-none"
            style={{
              fontFamily: "'Kreon', serif",
              fontSize: '5.5rem',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {days}
          </span>
          <span
            className="text-xs tracking-[.35em] uppercase"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            days away
          </span>
        </div>
      </div>

      {/* Three course images */}
      <div className="grid grid-cols-3" style={{ gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
        {COURSES.map((course) => (
          <div key={course.name} className="relative overflow-hidden">
            <img
              src={course.image}
              alt={course.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: course.objPos }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-10 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }}
            >
              <p
                className="text-white text-sm tracking-wide"
                style={{
                  fontFamily: "'Kreon', serif",
                  fontWeight: 700,
                  textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                }}
              >
                {course.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
