# Ultimate Finance — Personal Finance Manager

**Student index:** EG/2023/5542  
**Module:** EC4307 — Web Application Development

A MERN application for recording personal income and expenses, reviewing financial
activity, setting monthly spending limits and keeping bills linked to transactions.
The interface separates overall financial information from filtered transaction results.

## Features

| Section | Functionality |
| --- | --- |
| Overview | All-time income, expenses and net balance; category charts; recent activity |
| Transactions | Create, read details, update and delete; search, type/category/date filters, sorting and pagination |
| Financial Health | Monthly income, expenses and net; overall/category budgets; spending and remaining-limit indicators |
| Documents | PDF/PNG/JPEG uploads with manually entered transaction details, month browsing, downloads and attachment removal |
| Settings | Light, Dark or System appearance; Forest, Ocean and Plum accents |

Registration, login and logout use server-side sessions. Transactions, budgets and
files are scoped to the signed-in user. Appearance preferences are stored per
account in the current browser.

## Technology

- **React + Vite:** interface, components, forms and application state.
- **Node.js + Express:** HTTP API, authentication and validation.
- **MongoDB + Mongoose:** users, transactions, embedded attachments and budgets.
- **Argon2id:** password hashing.
- **express-session + connect-mongo:** signed session-ID cookies and MongoDB session storage.
- **Chart.js + react-chartjs-2:** income and expense category charts.
- **Node test runner + ESLint:** automated checks and code linting.

Dependency versions are pinned by the client and server `package-lock.json` files.

## Local setup — Windows PowerShell

Use Node.js 24.x, npm and a running local MongoDB service. The development workflow
uses a React server on port 5173 and an Express server on port 5000. Any suitable
editor can be used; this project was developed using Visual Studio and PowerShell.

Open PowerShell in the project root (the folder containing `client` and `server`).

### Install dependencies

```powershell
cd server
npm.cmd ci
cd ..\client
npm.cmd ci
cd ..
```

### Configure environment files

On a fresh checkout, create local `.env` files from the supplied examples.
Do not overwrite an existing working `.env` file.

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `SESSION_SECRET` in `server/.env`:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/personal_finance_manager
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=your_generated_value
```

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

The client API URL is public configuration. Database connection strings and session
secrets belong only on the server. Actual `.env` files must not be committed.

### Start the application

With MongoDB running, use two separate PowerShell terminals.

Backend terminal, from the project root:

```powershell
cd server
npm.cmd run dev
```

Frontend terminal, from the project root:

```powershell
cd client
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://localhost:5173**. Register an account with a name, email and a password
of 15–128 characters, then log in. No preloaded administrator account is required.
The backend health endpoint is **http://localhost:5000/api/health**.

Use `localhost` consistently: the configured origin and the browser URL must match.
Restart the relevant server after changing its environment file.

## Checks

From `server`:

```powershell
npm.cmd test
npm.cmd run test:integration
```

- `npm test` runs validation tests and document/budget HTTP-handler tests with model
  doubles. The supplied version reports 29 passing tests in the preparation environment.
- `npm run test:integration` requires **local MongoDB at 127.0.0.1:27017**. It starts a
  temporary backend, creates a uniquely named `finance_check_...` database, checks
  real storage and ownership, and removes that temporary database. It does not use
  the application's database or read its `.env` configuration.

From `client`:

```powershell
npm.cmd run lint
npm.cmd run build
```

Record actual local results in [the test checklist](docs/TEST_CHECKLIST.md).
The build creates `client/dist`; it does not by itself configure production hosting.

## Architecture

React sends JSON requests using `fetch` with credentials included. Express validates
requests and session ownership, then uses Mongoose to read/write MongoDB. Server-side
aggregation calculates summaries and chart data. React updates the displayed results.

The global overview has an independent, unfiltered request. Transaction filters
change only the Transactions view. Successful record mutations refresh dependent
views, including monthly budget calculations.

See [database design](docs/DATABASE_DESIGN.md) and
[API reference](docs/API_REFERENCE.md).

## Important behaviour

- Amounts are stored as integer cents: LKR 150.25 becomes `15025`.
- Transaction dates are calendar strings in `YYYY-MM-DD` format. Date filters include
  both their start and end dates.
- Net balance means recorded income minus recorded expenses. It is not a bank
  account balance or a net-worth calculation.
- Category and overall budgets overlap; their limits are not added together.
- Uploads accept PDF, PNG or JPEG files up to **2 MB**. The user enters the transaction
  details manually; uploading does not perform OCR.
- One document submission creates one transaction with one embedded attachment.
  Retrying the same unchanged submission uses its upload reference to avoid duplication.
- Removing an attachment keeps its transaction. Deleting a transaction removes its attachment.
- The Documents form creates a new transaction; it does not attach a file to an
  existing transaction. Re-entering an existing record would count it again.

## Security measures and scope

Passwords use Argon2id hashes. Login regenerates the session ID. Session cookies
are HTTP-only, use SameSite=Lax and are stored with an eight-hour cookie lifetime;
production mode sets the Secure flag. State-changing requests must match the
configured Origin. Authentication and upload routes have request rate limits.

Queries include the owner ID from the authenticated session. Input fields are
validated on the server, and editable fields are explicitly selected. Uploads have
size/signature checks and authenticated attachment downloads. File signatures are
not an antivirus scan. Mongoose references do not enforce relational foreign keys.

This repository documents local development. Public deployment requires a suitable
HTTPS, origin, proxy and secret configuration; it has not been documented as deployed.

## Source layout

| Location | Purpose |
| --- | --- |
| `client/src/pages` | Public home page and authenticated workspace |
| `client/src/components` | Transaction, chart, budget, document and settings components |
| `client/src/hooks` | Shared remote-data loading hook |
| `client/src/utils` | API helpers, categories and money/date helpers |
| `server/src/models` | User, Transaction and Budget schemas |
| `server/src/controllers` | Authentication and transaction request handlers |
| `server/src/routes` | API route definitions and budget/document handlers |
| `server/src/middleware` | Authentication checks |
| `server/src/utils` | Transaction, query, receipt and month validation |
| `server/test` | Unit and HTTP-handler tests |
| `server/scripts` | Local MongoDB integration check |
| `docs` | Database design, API reference, test evidence and presentation preparation |

## Screenshots and submission documentation

Add screenshots from the running application using the names listed in
[SCREENSHOTS.md](docs/SCREENSHOTS.md). Use demonstration records and avoid showing
passwords, session secrets or real financial documents.

A report outline, a demo run sheet and viva questions are included under `docs`.
They are preparation materials: replace pending evidence with actual results before
submitting. Review the lecturer's rules for permitted assistance and attribution.
