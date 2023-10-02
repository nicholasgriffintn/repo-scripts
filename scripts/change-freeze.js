#!/usr/bin/env node

// This script prevents publishing a release if the change freeze is enabled
// Usage: node scripts/change-freeze.js --type enable

const { Octokit } = require('@octokit/core');

const org = 'nicholasgriffintn';
const repo = 'repo-scripts';
const branches = ['refs/heads/main'];

const authToken = process.env.GH_TOKEN;

if (!authToken) {
  throw new Error(`missing GH_TOKEN env`);
}

const octokit = new Octokit({
  auth: authToken,
});

async function getCurrentRules() {
  const data = await octokit.request('GET /repos/{owner}/{repo}/rulesets', {
    owner: org,
    repo: repo,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!data?.data?.length) {
    throw new Error(`Failed to check for rules`);
  }

  return data.data;
}

async function createOrUpdateRule(ruleName, enabled, rulesetId) {
  const requestString = rulesetId
    ? 'PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}'
    : `POST /repos/{owner}/{repo}/rulesets`;

  /*
    NOTE: 
    actor_id 1 is the "Organization admin" role
    actor_id 2 is the "Write" role
    actor_id 5 is the "Repository admin" role
  */

  const data = await octokit.request(`${requestString}`, {
    owner: org,
    repo: repo,
    ruleset_id: rulesetId || undefined,
    name: ruleName,
    target: 'branch',
    enforcement: enabled ? 'active' : 'disabled',
    bypass_actors: [
      {
        actor_id: 5,
        actor_type: 'RepositoryRole',
        bypass_mode: 'always',
      },
      {
        actor_id: 1,
        actor_type: 'OrganizationAdmin',
        bypass_mode: 'always',
      },
    ],
    conditions: {
      ref_name: {
        include: branches,
        exclude: [],
      },
    },
    rules: [
      {
        type: 'update',
      },
    ],
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!data?.data?.id) {
    throw new Error(`Failed to create rule`);
  }

  return data;
}

async function main() {
  const typeIdx = process.argv.indexOf('--type');
  const type = process.argv[typeIdx + 1];

  if (type !== 'enable' && type !== 'disable') {
    throw new Error(`--type should be enable or disable`);
  }

  const isEnable = type === 'enable';

  const changeFreezeRuleName = 'change_freeze';

  const currentRules = await getCurrentRules();

  const existingRule = currentRules.find((rule) => {
    return rule.name === changeFreezeRuleName;
  });

  if (isEnable) {
    if (existingRule && existingRule?.enforcement === 'active') {
      // eslint-disable-next-line no-console
      console.log(`Already enabled`);
      return;
    }

    await createOrUpdateRule(changeFreezeRuleName, true, existingRule?.id);

    // eslint-disable-next-line no-console
    console.log('Enabled change freeze');
  } else {
    if (existingRule && existingRule?.enforcement === 'disabled') {
      // eslint-disable-next-line no-console
      console.log(`Already disabled`);
      return;
    }

    await createOrUpdateRule(changeFreezeRuleName, false, existingRule?.id);

    // eslint-disable-next-line no-console
    console.log('Disabled change freeze');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
