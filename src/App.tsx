import { FormEvent, useEffect, useMemo, useState } from 'react'

type Tab = 'discover' | 'host' | 'games' | 'profile'
type RequestStatus = 'pending' | 'accepted' | 'declined'

type Player = {
  id: string
  name: string
  handicap: number
  club: string
  location: string
  ponyAccess: 'Own ponies' | 'Need ponies' | 'Flexible'
}

type PlayerSummary = Pick<Player, 'id' | 'name' | 'handicap'>

type JoinRequest = PlayerSummary & {
  requestId: string
  status: RequestStatus
}

type Chukka = {
  id: string
  title: string
  hostId: string
  hostName: string
  club: string
  location: string
  date: string
  time: string
  chukkas: number
  minHandicap: number
  maxHandicap: number
  totalSpots: number
  ponyArrangement: string
  price: number
  notes: string
  confirmedPlayers: PlayerSummary[]
  requests: JoinRequest[]
}

type NewChukkaForm = {
  title: string
  club: string
  location: string
  date: string
  time: string
  chukkas: string
  minHandicap: string
  maxHandicap: string
  totalSpots: string
  ponyArrangement: string
  price: string
  notes: string
}

const CURRENT_USER_ID = 'player-you'
const PLAYER_STORAGE_KEY = 'nasu-player-v1'
const CHUKKAS_STORAGE_KEY = 'nasu-chukkas-v1'

const seedPlayer: Player = {
  id: CURRENT_USER_ID,
  name: 'Your profile',
  handicap: 0,
  club: 'Ham Polo Club',
  location: 'London',
  ponyAccess: 'Flexible',
}

const seedChukkas: Chukka[] = [
  {
    id: 'cowdray-sunday',
    title: 'Sunday club chukkas',
    hostId: 'player-harry',
    hostName: 'Harry W.',
    club: 'Cowdray Park Polo Club',
    location: 'West Sussex',
    date: '2026-09-06',
    time: '11:00',
    chukkas: 4,
    minHandicap: -2,
    maxHandicap: 1,
    totalSpots: 4,
    ponyArrangement: 'Bring your own ponies',
    price: 0,
    notes: 'Friendly practice chukkas. Mixed level, competitive but relaxed.',
    confirmedPlayers: [
      { id: 'player-harry', name: 'Harry W.', handicap: 0 },
      { id: 'player-amelia', name: 'Amelia R.', handicap: -1 },
    ],
    requests: [],
  },
  {
    id: 'guards-midweek',
    title: 'Midweek 4-goal practice',
    hostId: 'player-luca',
    hostName: 'Luca M.',
    club: 'Guards Polo Club',
    location: 'Windsor',
    date: '2026-09-12',
    time: '15:30',
    chukkas: 5,
    minHandicap: 0,
    maxHandicap: 2,
    totalSpots: 4,
    ponyArrangement: 'Hire ponies available — message host after confirmation',
    price: 120,
    notes: 'Looking for one more player. Please be comfortable at a quick club pace.',
    confirmedPlayers: [
      { id: 'player-luca', name: 'Luca M.', handicap: 1 },
      { id: 'player-james', name: 'James P.', handicap: 1 },
      { id: 'player-sofia', name: 'Sofia N.', handicap: 0 },
    ],
    requests: [],
  },
  {
    id: 'beaufort-open',
    title: 'Open afternoon chukkas',
    hostId: 'player-nina',
    hostName: 'Nina A.',
    club: 'Beaufort Polo Club',
    location: 'Gloucestershire',
    date: '2026-09-20',
    time: '14:00',
    chukkas: 4,
    minHandicap: -2,
    maxHandicap: 0,
    totalSpots: 4,
    ponyArrangement: 'Own ponies preferred',
    price: 35,
    notes: 'Good for newer competitive players. Two spaces currently open.',
    confirmedPlayers: [
      { id: 'player-nina', name: 'Nina A.', handicap: 0 },
      { id: 'player-femi', name: 'Femi K.', handicap: -1 },
    ],
    requests: [],
  },
  {
    id: 'ham-hosted',
    title: 'Saturday morning practice',
    hostId: CURRENT_USER_ID,
    hostName: 'You',
    club: 'Ham Polo Club',
    location: 'London',
    date: '2026-09-05',
    time: '10:30',
    chukkas: 4,
    minHandicap: -2,
    maxHandicap: 1,
    totalSpots: 4,
    ponyArrangement: 'Bring your own ponies',
    price: 0,
    notes: 'Short practice set before lunch.',
    confirmedPlayers: [
      { id: CURRENT_USER_ID, name: 'You', handicap: 0 },
      { id: 'player-maya', name: 'Maya T.', handicap: 0 },
    ],
    requests: [
      {
        requestId: 'request-tom',
        id: 'player-tom',
        name: 'Tom E.',
        handicap: -1,
        status: 'pending',
      },
    ],
  },
]

const initialForm: NewChukkaForm = {
  title: '',
  club: '',
  location: '',
  date: '',
  time: '',
  chukkas: '4',
  minHandicap: '-2',
  maxHandicap: '1',
  totalSpots: '4',
  ponyArrangement: 'Bring your own ponies',
  price: '0',
  notes: '',
}

function loadStoredValue<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function formatPrice(price: number) {
  return price === 0 ? 'Free' : `£${price}`
}

function handicapLabel(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

function App() {
  const [tab, setTab] = useState<Tab>('discover')
  const [player, setPlayer] = useState<Player>(() =>
    loadStoredValue(PLAYER_STORAGE_KEY, seedPlayer),
  )
  const [chukkas, setChukkas] = useState<Chukka[]>(() =>
    loadStoredValue(CHUKKAS_STORAGE_KEY, seedChukkas),
  )
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [onlyMatches, setOnlyMatches] = useState(true)
  const [form, setForm] = useState<NewChukkaForm>(initialForm)
  const [toast, setToast] = useState('')

  useEffect(() => {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player))
  }, [player])

  useEffect(() => {
    localStorage.setItem(CHUKKAS_STORAGE_KEY, JSON.stringify(chukkas))
  }, [chukkas])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const locations = useMemo(
    () => ['All locations', ...Array.from(new Set(chukkas.map((item) => item.location)))],
    [chukkas],
  )

  const discoverChukkas = useMemo(
    () =>
      chukkas.filter((chukka) => {
        if (chukka.hostId === CURRENT_USER_ID) return false
        const locationMatches =
          locationFilter === 'All locations' || chukka.location === locationFilter
        const levelMatches =
          player.handicap >= chukka.minHandicap && player.handicap <= chukka.maxHandicap
        return locationMatches && (!onlyMatches || levelMatches)
      }),
    [chukkas, locationFilter, onlyMatches, player.handicap],
  )

  const hostedChukkas = chukkas.filter((chukka) => chukka.hostId === CURRENT_USER_ID)
  const joinedChukkas = chukkas.filter((chukka) =>
    chukka.confirmedPlayers.some((confirmed) => confirmed.id === CURRENT_USER_ID),
  )
  const requestedChukkas = chukkas.filter((chukka) =>
    chukka.requests.some(
      (request) => request.id === CURRENT_USER_ID && request.status === 'pending',
    ),
  )
  const pendingHostRequests = hostedChukkas.reduce(
    (count, chukka) =>
      count + chukka.requests.filter((request) => request.status === 'pending').length,
    0,
  )

  function requestSpot(chukkaId: string) {
    setChukkas((current) =>
      current.map((chukka) => {
        if (chukka.id !== chukkaId) return chukka
        const alreadyRequested = chukka.requests.some((request) => request.id === player.id)
        const alreadyConfirmed = chukka.confirmedPlayers.some(
          (confirmed) => confirmed.id === player.id,
        )
        if (alreadyRequested || alreadyConfirmed) return chukka

        return {
          ...chukka,
          requests: [
            ...chukka.requests,
            {
              requestId: `request-${Date.now()}`,
              id: player.id,
              name: player.name === 'Your profile' ? 'You' : player.name,
              handicap: player.handicap,
              status: 'pending',
            },
          ],
        }
      }),
    )
    setToast('Request sent to the host.')
  }

  function updateRequest(chukkaId: string, requestId: string, status: 'accepted' | 'declined') {
    setChukkas((current) =>
      current.map((chukka) => {
        if (chukka.id !== chukkaId) return chukka
        const request = chukka.requests.find((item) => item.requestId === requestId)
        if (!request) return chukka

        const spacesLeft = chukka.totalSpots - chukka.confirmedPlayers.length
        if (status === 'accepted' && spacesLeft <= 0) return chukka

        return {
          ...chukka,
          requests: chukka.requests.map((item) =>
            item.requestId === requestId ? { ...item, status } : item,
          ),
          confirmedPlayers:
            status === 'accepted' &&
            !chukka.confirmedPlayers.some((confirmed) => confirmed.id === request.id)
              ? [
                  ...chukka.confirmedPlayers,
                  { id: request.id, name: request.name, handicap: request.handicap },
                ]
              : chukka.confirmedPlayers,
        }
      }),
    )
    setToast(status === 'accepted' ? 'Player added to the roster.' : 'Request declined.')
  }

  function createChukka(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const newChukka: Chukka = {
      id: `chukka-${Date.now()}`,
      title: form.title.trim(),
      hostId: CURRENT_USER_ID,
      hostName: player.name === 'Your profile' ? 'You' : player.name,
      club: form.club.trim(),
      location: form.location.trim(),
      date: form.date,
      time: form.time,
      chukkas: Number(form.chukkas),
      minHandicap: Number(form.minHandicap),
      maxHandicap: Number(form.maxHandicap),
      totalSpots: Number(form.totalSpots),
      ponyArrangement: form.ponyArrangement.trim(),
      price: Number(form.price || 0),
      notes: form.notes.trim(),
      confirmedPlayers: [
        {
          id: player.id,
          name: player.name === 'Your profile' ? 'You' : player.name,
          handicap: player.handicap,
        },
      ],
      requests: [],
    }

    setChukkas((current) => [newChukka, ...current])
    setForm(initialForm)
    setTab('games')
    setToast('Chukka published. Players can now request a spot.')
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setToast('Profile saved.')
  }

  function resetDemo() {
    setPlayer(seedPlayer)
    setChukkas(seedChukkas)
    setLocationFilter('All locations')
    setOnlyMatches(true)
    setTab('discover')
    setToast('Demo data reset.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('discover')} aria-label="Nasu home">
          <span className="brand-mark">N</span>
          <span>Nasu</span>
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          <NavButton active={tab === 'discover'} onClick={() => setTab('discover')}>
            Discover
          </NavButton>
          <NavButton active={tab === 'host'} onClick={() => setTab('host')}>
            Host a chukka
          </NavButton>
          <NavButton active={tab === 'games'} onClick={() => setTab('games')} badge={pendingHostRequests}>
            My chukkas
          </NavButton>
        </nav>

        <button className="profile-chip" onClick={() => setTab('profile')}>
          <span className="avatar">{player.name === 'Your profile' ? 'YP' : initials(player.name)}</span>
          <span className="profile-chip-copy">
            <strong>{player.name}</strong>
            <small>{handicapLabel(player.handicap)} handicap</small>
          </span>
        </button>
      </header>

      <main>
        {tab === 'discover' && (
          <section className="page discover-page">
            <div className="hero">
              <p className="eyebrow">PLAY MORE POLO</p>
              <h1>Find your next chukka.</h1>
              <p>
                See who needs a player, check the level and pony arrangements, then request your spot.
              </p>
              <button className="primary-button hero-button" onClick={() => setTab('host')}>
                Host a chukka
              </button>
            </div>

            <div className="section-heading discover-heading">
              <div>
                <span className="kicker">UPCOMING</span>
                <h2>Open chukkas</h2>
              </div>
              <div className="filters">
                <select
                  aria-label="Filter by location"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                >
                  {locations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={onlyMatches}
                    onChange={(event) => setOnlyMatches(event.target.checked)}
                  />
                  <span className="toggle" />
                  Match my handicap
                </label>
              </div>
            </div>

            {discoverChukkas.length > 0 ? (
              <div className="chukka-grid">
                {discoverChukkas.map((chukka) => (
                  <ChukkaCard
                    key={chukka.id}
                    chukka={chukka}
                    player={player}
                    onRequest={() => requestSpot(chukka.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No matching chukkas yet"
                copy="Try widening the filters, or host one and let the right players come to you."
                action="Host a chukka"
                onAction={() => setTab('host')}
              />
            )}
          </section>
        )}

        {tab === 'host' && (
          <section className="page narrow-page">
            <div className="page-intro">
              <span className="kicker">CREATE</span>
              <h1>Host a chukka</h1>
              <p>Publish the details players actually need before asking to join.</p>
            </div>

            <form className="form-card" onSubmit={createChukka}>
              <div className="form-section">
                <h2>Chukka details</h2>
                <div className="field-grid">
                  <Field label="Title" full>
                    <input
                      required
                      placeholder="e.g. Sunday practice chukkas"
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                    />
                  </Field>
                  <Field label="Club">
                    <input
                      required
                      placeholder="Ham Polo Club"
                      value={form.club}
                      onChange={(event) => setForm({ ...form, club: event.target.value })}
                    />
                  </Field>
                  <Field label="Location">
                    <input
                      required
                      placeholder="London"
                      value={form.location}
                      onChange={(event) => setForm({ ...form, location: event.target.value })}
                    />
                  </Field>
                  <Field label="Date">
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm({ ...form, date: event.target.value })}
                    />
                  </Field>
                  <Field label="Start time">
                    <input
                      required
                      type="time"
                      value={form.time}
                      onChange={(event) => setForm({ ...form, time: event.target.value })}
                    />
                  </Field>
                  <Field label="Number of chukkas">
                    <input
                      required
                      min="1"
                      type="number"
                      value={form.chukkas}
                      onChange={(event) => setForm({ ...form, chukkas: event.target.value })}
                    />
                  </Field>
                  <Field label="Total player spots">
                    <input
                      required
                      min="2"
                      type="number"
                      value={form.totalSpots}
                      onChange={(event) => setForm({ ...form, totalSpots: event.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="form-section">
                <h2>Who should join?</h2>
                <div className="field-grid">
                  <Field label="Minimum handicap">
                    <input
                      required
                      type="number"
                      value={form.minHandicap}
                      onChange={(event) => setForm({ ...form, minHandicap: event.target.value })}
                    />
                  </Field>
                  <Field label="Maximum handicap">
                    <input
                      required
                      type="number"
                      value={form.maxHandicap}
                      onChange={(event) => setForm({ ...form, maxHandicap: event.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="form-section">
                <h2>Logistics</h2>
                <div className="field-grid">
                  <Field label="Pony arrangement" full>
                    <input
                      required
                      placeholder="Bring your own ponies"
                      value={form.ponyArrangement}
                      onChange={(event) =>
                        setForm({ ...form, ponyArrangement: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Cost per player (£)">
                    <input
                      min="0"
                      type="number"
                      value={form.price}
                      onChange={(event) => setForm({ ...form, price: event.target.value })}
                    />
                  </Field>
                  <Field label="Notes" full>
                    <textarea
                      rows={4}
                      placeholder="Anything players should know about the pace, ground or arrangements."
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="form-footer">
                <p>You are added to the starting roster automatically.</p>
                <button className="primary-button" type="submit">
                  Publish chukka
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === 'games' && (
          <section className="page">
            <div className="page-intro row-intro">
              <div>
                <span className="kicker">YOUR POLO</span>
                <h1>My chukkas</h1>
                <p>Keep track of the games you host, joined games and pending requests.</p>
              </div>
              <button className="primary-button" onClick={() => setTab('host')}>
                Host a chukka
              </button>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-main">
                <section className="dashboard-section">
                  <div className="section-heading compact-heading">
                    <div>
                      <span className="kicker">HOSTING</span>
                      <h2>Your hosted chukkas</h2>
                    </div>
                    <span className="count-badge">{hostedChukkas.length}</span>
                  </div>

                  <div className="stack-list">
                    {hostedChukkas.map((chukka) => (
                      <HostCard key={chukka.id} chukka={chukka} onUpdateRequest={updateRequest} />
                    ))}
                  </div>
                </section>

                <section className="dashboard-section">
                  <div className="section-heading compact-heading">
                    <div>
                      <span className="kicker">PLAYING</span>
                      <h2>Confirmed chukkas</h2>
                    </div>
                  </div>

                  <div className="stack-list">
                    {joinedChukkas.filter((chukka) => chukka.hostId !== CURRENT_USER_ID).length ? (
                      joinedChukkas
                        .filter((chukka) => chukka.hostId !== CURRENT_USER_ID)
                        .map((chukka) => <CompactChukka key={chukka.id} chukka={chukka} status="Confirmed" />)
                    ) : (
                      <div className="inline-empty">No confirmed away chukkas yet.</div>
                    )}
                  </div>
                </section>
              </div>

              <aside className="dashboard-aside">
                <div className="aside-card">
                  <span className="kicker">REQUESTS</span>
                  <strong className="big-number">{requestedChukkas.length}</strong>
                  <p>Waiting for a host decision</p>
                  {requestedChukkas.map((chukka) => (
                    <CompactChukka key={chukka.id} chukka={chukka} status="Pending" />
                  ))}
                </div>
              </aside>
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="page narrow-page">
            <div className="page-intro">
              <span className="kicker">PLAYER PROFILE</span>
              <h1>Your polo details</h1>
              <p>Nasu uses these details to show chukkas that are actually suitable for you.</p>
            </div>

            <form className="form-card" onSubmit={saveProfile}>
              <div className="profile-summary">
                <span className="large-avatar">
                  {player.name === 'Your profile' ? 'YP' : initials(player.name)}
                </span>
                <div>
                  <strong>{player.name}</strong>
                  <span>{handicapLabel(player.handicap)} handicap · {player.location}</span>
                </div>
              </div>

              <div className="field-grid">
                <Field label="Name" full>
                  <input
                    required
                    value={player.name}
                    onChange={(event) => setPlayer({ ...player, name: event.target.value })}
                  />
                </Field>
                <Field label="Handicap">
                  <input
                    required
                    type="number"
                    value={player.handicap}
                    onChange={(event) =>
                      setPlayer({ ...player, handicap: Number(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Home club">
                  <input
                    value={player.club}
                    onChange={(event) => setPlayer({ ...player, club: event.target.value })}
                  />
                </Field>
                <Field label="Location">
                  <input
                    required
                    value={player.location}
                    onChange={(event) => setPlayer({ ...player, location: event.target.value })}
                  />
                </Field>
                <Field label="Pony access">
                  <select
                    value={player.ponyAccess}
                    onChange={(event) =>
                      setPlayer({
                        ...player,
                        ponyAccess: event.target.value as Player['ponyAccess'],
                      })
                    }
                  >
                    <option>Own ponies</option>
                    <option>Need ponies</option>
                    <option>Flexible</option>
                  </select>
                </Field>
              </div>

              <div className="form-footer profile-footer">
                <button className="text-button danger-text" type="button" onClick={resetDemo}>
                  Reset demo data
                </button>
                <button className="primary-button" type="submit">
                  Save profile
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavButton active={tab === 'discover'} onClick={() => setTab('discover')}>
          Discover
        </NavButton>
        <NavButton active={tab === 'host'} onClick={() => setTab('host')}>
          Host
        </NavButton>
        <NavButton active={tab === 'games'} onClick={() => setTab('games')} badge={pendingHostRequests}>
          My chukkas
        </NavButton>
        <NavButton active={tab === 'profile'} onClick={() => setTab('profile')}>
          Profile
        </NavButton>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function NavButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean
  onClick: () => void
  badge?: number
  children: React.ReactNode
}) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
      {!!badge && <span className="nav-badge">{badge}</span>}
    </button>
  )
}

function Field({
  label,
  full = false,
  children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`field ${full ? 'field-full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function ChukkaCard({
  chukka,
  player,
  onRequest,
}: {
  chukka: Chukka
  player: Player
  onRequest: () => void
}) {
  const spacesLeft = Math.max(chukka.totalSpots - chukka.confirmedPlayers.length, 0)
  const request = chukka.requests.find((item) => item.id === player.id)
  const confirmed = chukka.confirmedPlayers.some((item) => item.id === player.id)
  const levelMatches =
    player.handicap >= chukka.minHandicap && player.handicap <= chukka.maxHandicap

  let buttonCopy = 'Request spot'
  if (confirmed || request?.status === 'accepted') buttonCopy = 'Confirmed'
  if (request?.status === 'pending') buttonCopy = 'Request pending'
  if (request?.status === 'declined') buttonCopy = 'Request declined'
  if (spacesLeft === 0 && !confirmed) buttonCopy = 'Roster full'

  const disabled = confirmed || !!request || spacesLeft === 0

  return (
    <article className="chukka-card">
      <div className="card-topline">
        <span className={`match-pill ${levelMatches ? 'match' : 'stretch'}`}>
          {levelMatches ? 'Handicap match' : 'Outside your range'}
        </span>
        <span className="spots-left">{spacesLeft} {spacesLeft === 1 ? 'spot' : 'spots'} left</span>
      </div>

      <div className="date-block">
        <span>{formatDate(chukka.date)}</span>
        <strong>{chukka.time}</strong>
      </div>

      <h3>{chukka.title}</h3>
      <p className="club-name">{chukka.club}</p>
      <p className="location-copy">{chukka.location}</p>

      <div className="stat-row">
        <div>
          <span>LEVEL</span>
          <strong>{handicapLabel(chukka.minHandicap)} to {handicapLabel(chukka.maxHandicap)}</strong>
        </div>
        <div>
          <span>CHUKKAS</span>
          <strong>{chukka.chukkas}</strong>
        </div>
        <div>
          <span>COST</span>
          <strong>{formatPrice(chukka.price)}</strong>
        </div>
      </div>

      <div className="pony-line">
        <span className="pony-dot" />
        {chukka.ponyArrangement}
      </div>

      <p className="notes">{chukka.notes}</p>

      <div className="roster-preview">
        <div className="avatar-stack">
          {chukka.confirmedPlayers.slice(0, 3).map((rosterPlayer) => (
            <span className="mini-avatar" key={rosterPlayer.id} title={rosterPlayer.name}>
              {initials(rosterPlayer.name)}
            </span>
          ))}
        </div>
        <span>Hosted by {chukka.hostName}</span>
      </div>

      <button
        className={`card-action ${disabled ? 'secondary-action' : ''}`}
        disabled={disabled}
        onClick={onRequest}
      >
        {buttonCopy}
      </button>
    </article>
  )
}

function HostCard({
  chukka,
  onUpdateRequest,
}: {
  chukka: Chukka
  onUpdateRequest: (chukkaId: string, requestId: string, status: 'accepted' | 'declined') => void
}) {
  const spacesLeft = Math.max(chukka.totalSpots - chukka.confirmedPlayers.length, 0)
  const pending = chukka.requests.filter((request) => request.status === 'pending')

  return (
    <article className="host-card">
      <div className="host-card-header">
        <div>
          <span className="host-date">{formatDate(chukka.date)} · {chukka.time}</span>
          <h3>{chukka.title}</h3>
          <p>{chukka.club} · {chukka.location}</p>
        </div>
        <div className="roster-count">
          <strong>{chukka.confirmedPlayers.length}/{chukka.totalSpots}</strong>
          <span>confirmed</span>
        </div>
      </div>

      <div className="confirmed-strip">
        {chukka.confirmedPlayers.map((rosterPlayer) => (
          <span className="confirmed-player" key={rosterPlayer.id}>
            <span className="mini-avatar">{initials(rosterPlayer.name)}</span>
            {rosterPlayer.name}
            <small>{handicapLabel(rosterPlayer.handicap)}</small>
          </span>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="request-list">
          <div className="request-title">
            <strong>Join requests</strong>
            <span>{pending.length} pending</span>
          </div>
          {pending.map((request) => (
            <div className="request-row" key={request.requestId}>
              <div className="request-player">
                <span className="mini-avatar dark-avatar">{initials(request.name)}</span>
                <div>
                  <strong>{request.name}</strong>
                  <span>{handicapLabel(request.handicap)} handicap</span>
                </div>
              </div>
              <div className="request-actions">
                <button
                  className="reject-button"
                  onClick={() => onUpdateRequest(chukka.id, request.requestId, 'declined')}
                >
                  Decline
                </button>
                <button
                  className="accept-button"
                  disabled={spacesLeft === 0}
                  onClick={() => onUpdateRequest(chukka.id, request.requestId, 'accepted')}
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function CompactChukka({ chukka, status }: { chukka: Chukka; status: 'Confirmed' | 'Pending' }) {
  return (
    <div className="compact-chukka">
      <div>
        <strong>{chukka.title}</strong>
        <span>{formatDate(chukka.date)} · {chukka.club}</span>
      </div>
      <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>
    </div>
  )
}

function EmptyState({
  title,
  copy,
  action,
  onAction,
}: {
  title: string
  copy: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">N</span>
      <h3>{title}</h3>
      <p>{copy}</p>
      <button className="primary-button" onClick={onAction}>{action}</button>
    </div>
  )
}

function initials(name: string) {
  if (name === 'You') return 'YO'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P'
}

export default App
