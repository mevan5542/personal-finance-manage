# Git checkpoint

Run these read-only commands from the project root in PowerShell:

```powershell
cd "C:\Users\Admin\source\repos\personal-finance-manager"
git status --short
git ls-files -- client/.env server/.env
git remote -v
```

The second command should print nothing. If it lists an actual `.env`, do not publish
that file: remove it from Git tracking before committing/pushing and consider whether
its secrets have already been shared. `.env.example` files are intended to be tracked.

Review staged files with `git diff --cached --name-only`. Include source, package
manifests/lockfiles, safe examples, README and docs. Exclude node_modules, dist,
actual environment files, unrelated screenshots, code backups and personal financial
records. The original project had staged and untracked files, so review the current
status before choosing exact staging/commit commands.

After a reviewed commit, confirm the repository URL/remote and push that commit.
Do not invent a repository URL. Follow the lecturer's required repository visibility
or collaborator-access instructions so the examiner can open it.
