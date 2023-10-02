# Repo Scripts

This a repo that contains various scripts that I use to automate tasks against GitHub repos, such as creating new rulesets or running tasks from CI for example.

Here's a list of the scripts and what they do:

- `./scripts/change-freeze.js`

When provided the flag `--enable`, it will create a new ruleset in the defined repo that will prevent any changes from being made to the repo. When provided the flag `--disable`, it will remove the ruleset from the repo.

By default, it allows the org and repo admins to bypass this.

It also targets a specific set of branches, currently defined only for the `main` branch.
