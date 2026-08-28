# Nasu

Nasu is a polo chukka matching platform for players who want to discover, organise, and join suitable chukkas.

## Core loop

Create chukka → discover suitable players/opportunities → request a spot → host confirms → play.

## Current build

The first working version includes:

- player profiles with handicap, club, location, and pony access
- upcoming chukka discovery with location and handicap filtering
- chukka creation with date, venue, handicap range, spaces, pony arrangements, and cost
- join requests that persist in local storage
- host acceptance and rejection of player requests
- confirmed roster management
- responsive desktop and mobile layouts

The current persistence layer is intentionally local browser storage. It proves the full product workflow before authentication and a shared database are introduced.

## Run locally

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```

## Not included yet

Authentication, shared cloud data, payments, messaging, tournaments, club administration, league tables, or pony marketplace features are intentionally outside this first product slice.
