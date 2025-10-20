# Absensi Siswa - Minimal API (SQLite)

This folder contains a minimal Express + SQLite API used by the frontend.

Available endpoints:
- GET /api/roster -> list of { name, role }
- POST /api/roster -> create/replace roster item { name, role }
- PUT /api/roster/:oldName -> rename/update a roster entry and related entries
- DELETE /api/roster/:name -> delete roster and related entries

- GET /api/entries?date=YYYY-MM-DD -> list of entries for date
- POST /api/entries -> create or update entry (if id provided)
- DELETE /api/entries/:id -> delete entry

Run server:

```bash
cd server
npm install
npm run dev
```

The server listens on port 5000 by default.
