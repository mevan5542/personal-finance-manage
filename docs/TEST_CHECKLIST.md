# Final verification record

Student index: EG/2023/5542

Fill in actual results and dates. A checkbox is not evidence until you have run the
check. Earlier preparation checks passed; the user reported the updated application
working. This sheet captures reproducible final evidence on the submission version.

Tested commit: ____________________  Date: ____________________

| Check | Expected result | Actual result / evidence |
| --- | --- | --- |
| `server: npm.cmd test` | 29 tests pass | Pending entry |
| `server: npm.cmd run test:integration` | PASS and temporary database removed | Pending entry |
| `client: npm.cmd run lint` | No ESLint errors | Pending entry |
| `client: npm.cmd run build` | Build completes successfully | Pending entry |
| Registration | Valid account created; duplicate email rejected | Pending entry |
| Login | Valid credentials accepted; wrong password rejected | Pending entry |
| Create | New transaction appears once and updates totals | Pending entry |
| Read | Details and stored values match entered data | Pending entry |
| Update | Same record changes; no duplicate created | Pending entry |
| Cancel edit | Saved values remain unchanged | Pending entry |
| Delete cancel/confirm | Cancel keeps record; confirm removes it | Pending entry |
| Validation | Zero/negative/excess-precision amounts rejected | Pending entry |
| Search/filter/sort | Results match applied controls | Pending entry |
| Pagination | Next/previous work; matching totals remain consistent | Pending entry |
| Overview separation | Filtering does not change all-time totals/charts | Pending entry |
| Budgets | Month/category limits persist and use actual spending | Pending entry |
| Document save | One attachment and one linked transaction are saved | Pending entry |
| Document download | Original uploaded file downloads and opens | Pending entry |
| Remove attachment | Transaction remains saved | Pending entry |
| Delete linked transaction | Transaction and its attachment disappear | Pending entry |
| Account separation | Account B cannot see Account A's records/budgets/files | Pending entry |
| Logout | Protected operations require login again | Pending entry |
| Restart/refresh | Saved records, budgets and documents remain | Pending entry |
| Appearance | Mode/accent survive refresh for that account/browser | Pending entry |
| Mobile | Navigation, forms and cards work at roughly 390px width | Pending entry |

## Evidence distinctions

Unit/handler tests use model doubles and do not prove live MongoDB storage. The
separate integration command checks real local MongoDB operations. Browser layout,
phone-sized usability and restart persistence also need manual inspection.

Do not include secrets or real personal financial documents in evidence screenshots.
Use clearly labelled demonstration records.
