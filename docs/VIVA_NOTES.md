# Viva notes — explain from your own code

1. **What problem does the project solve?** It brings manually recorded income,
   expenses, spending limits and supporting bills into one personal workspace.
2. **What does each MERN component do?** React renders the UI; Node runs JavaScript
   on the server; Express defines HTTP routes/middleware; MongoDB persists data.
3. **Why is Express different from Node?** Node is the runtime. Express is a library
   running within Node that handles web requests and middleware.
4. **Where is CRUD demonstrated?** Transactions: POST creates, GET reads, PUT edits,
   and DELETE removes. React sends requests; MongoDB stores the resulting records.
5. **Why validate on both client and server?** Client checks give quick feedback;
   requests can bypass the client, so the server must enforce the actual rules.
6. **How is money stored?** As integer cents to avoid ordinary decimal-fraction
   rounding problems. LKR 150.25 is stored as 15025.
7. **Why store dates as YYYY-MM-DD strings?** A transaction uses a calendar date,
   so this representation avoids unintended timezone shifts and sorts consistently.
   createdAt/updatedAt remain timestamp Dates.
8. **Hashing or encryption for passwords?** Hashing with Argon2id. Login verifies
   the supplied password against its stored hash; passwords are not decrypted.
   The hashing library generates a salt and includes its parameters in the hash.
9. **What is a session?** The browser holds a signed session-ID cookie. The server
   uses that identifier to find session data in MongoDB, including the user ID.
10. **Authentication versus authorization?** Authentication identifies the user.
    Authorization checks whether that user may access a particular record.
11. **How is account separation enforced?** Server queries include the owner ID
    derived from the session, alongside the record ID. Hiding UI buttons is insufficient.
12. **Why CORS and Origin checks?** CORS controls browser access to cross-origin
    responses. This app separately checks Origin for mutations. Neither replaces
    authentication or record ownership checks.
13. **Why do filters not change the global cards?** The dashboard requests an
    unfiltered summary independently from the Transactions component's filtered request.
14. **Why do pages not change matching totals?** MongoDB aggregation branches use
    the same matched records; skip/limit apply only to the list branch.
15. **How are totals/charts produced?** MongoDB groups the current user's matching
    records by type/category and sums amountCents; React renders the returned data.
16. **How do budgets work?** A user sets a limit per month/category. Spending is
    computed from transactions; remaining = limit − actual spending.
17. **Does uploading a bill read its text?** No. The user enters the fields manually.
    The file and one transaction are stored together; there is no OCR in this version.
18. **Why embed the receipt?** It belongs to one transaction, is limited to 2 MB and
    can be saved atomically with that transaction in one MongoDB document.
19. **How are duplicate upload retries prevented?** An upload reference has a unique
    owner/reference index. A submission fingerprint verifies that a retry is unchanged.
20. **What does SHA-256 do here?** It fingerprints document submissions. It is not
    used as the password-hashing scheme; passwords use Argon2id.
21. **What happens when an attachment is removed?** Only the embedded receipt is
    unset. Its transaction remains. Deleting the transaction removes both.
22. **Why indexes?** They support lookups or enforce uniqueness. They also use
    storage and add write cost; an index is not automatically useful for every query.
23. **Are MongoDB references foreign-key constraints?** No. They are logical
    references; the application must manage validity and access rules.
24. **Where are settings stored?** Appearance is stored in localStorage per account
    in that browser. Financial data and budgets are stored in MongoDB.
25. **What do tests prove?** Unit/handler tests check rules using controlled inputs
    and model doubles. Integration tests check actual MongoDB/API behaviour. Manual
    browser checks cover presentation, interaction and persistence after restart.
26. **What is Git?** A version-control system that records changes and allows history
    and recovery. GitHub hosts a remote repository. A commit is a local snapshot;
    pushing publishes commits to the configured remote.
27. **Why .env and .env.example?** .env contains local settings/secrets and is ignored
    by Git. .env.example documents required variables with safe sample values.
28. **What are the limitations?** One currency, manual entry, one attachment per
    transaction, local deployment configuration and no bank feed or OCR. The app
    does not calculate net worth or provide a professional financial risk score.

For each answer, locate the relevant file and trace one real request. Avoid
memorising a definition without being able to connect it to the implementation.
