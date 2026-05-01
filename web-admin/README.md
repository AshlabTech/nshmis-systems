# Niger HMIS Outreach Web Admin

This is a standalone web admin dashboard that talks to the existing API with a Sanctum bearer token.

## Files

- `index.html`: entry page
- `styles.css`: responsive dashboard styling
- `app.js`: authentication, routing, API calls, tables, charts, modals, and admin CRUD UI

## Expected API Base URL

By default the login screen points to:

`http://127.0.0.1:8000/api`

You can change this from the login form if your backend is running elsewhere.

## Default Seeded Admin

- Email: `admin@nigerhmis.local`
- Password: `Admin@1234`

## Notes

- The dashboard uses the existing mobile sync API and does not alter the `/sync` contract.
- CSV exports are implemented for patients, encounters, and referrals.
- PDF export is not included in this first pass.
