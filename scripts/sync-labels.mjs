import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;

if (!repository || !token) throw new Error('GITHUB_REPOSITORY 與 GITHUB_TOKEN 為必要設定。');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const labels = JSON.parse(await readFile(resolve(root, '.github/labels.json'), 'utf8'));
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'ai-build-stage-label-sync',
};

for (const label of labels) {
  const encoded = encodeURIComponent(label.name);
  const current = await fetch(`https://api.github.com/repos/${repository}/labels/${encoded}`, { headers });
  const method = current.status === 404 ? 'POST' : 'PATCH';
  if (!current.ok && current.status !== 404) throw new Error(`讀取 label ${label.name} 失敗：${current.status}`);
  const endpoint = method === 'POST'
    ? `https://api.github.com/repos/${repository}/labels`
    : `https://api.github.com/repos/${repository}/labels/${encoded}`;
  const response = await fetch(endpoint, { method, headers, body: JSON.stringify(label) });
  if (!response.ok) throw new Error(`同步 label ${label.name} 失敗：${response.status} ${await response.text()}`);
  console.log(`${method === 'POST' ? '建立' : '更新'} label：${label.name}`);
}
