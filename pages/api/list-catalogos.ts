import { NextApiRequest, NextApiResponse } from 'next';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const GITHUB_OWNER = 'Elmerluis0129';
const GITHUB_REPO = 'WanMarKay';
const CATALOGOS_PATH = 'src/assets/catalogos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Puedes restringir a tu dominio en producción
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: CATALOGOS_PATH,
    });

    if (!Array.isArray(response.data)) {
      return res.status(404).json({ error: 'No hay catálogos' });
    }

    const catalogos = response.data
      .filter((item: any) => item.type === 'file' && item.name.endsWith('.pdf'))
      .map((item: any) => ({
        name: item.name,
        url: item.download_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${CATALOGOS_PATH}/${item.name}?raw=true`
      }));

    res.json({ catalogos });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'No se pudieron obtener los catálogos' });
  }
}
