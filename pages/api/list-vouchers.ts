import { NextApiRequest, NextApiResponse } from 'next';

function cors(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
import { Octokit } from '@octokit/rest';

const GITHUB_OWNER = 'Elmerluis0129';
const GITHUB_REPO = 'WanMarKay';
const VOUCHERS_PATH = 'src/assest/vouchers';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Utilidad para extraer datos del nombre del archivo
function parseVoucherFilename(filename: string) {
  // Ejemplo: FACTURA_0419_Elizabeth_Rosario_Reyes_20250523_1712_BancoBHD.jpg
  const regex = /^FACTURA_(\d+)_([^_]+(?:_[^_]+)*)_(\d{8})_(\d{4})_([^_.]+)\.(\w+)$/i;
  const match = filename.match(regex);
  if (!match) return null;
  return {
    invoiceNumber: match[1],
    userName: match[2].replace(/_/g, ' '),
    date: match[3],
    time: match[4],
    bank: match[5],
    ext: match[6],
    filename,
    url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/blob/main/${VOUCHERS_PATH}/${filename}?raw=true`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('DEBUG path usado:', VOUCHERS_PATH);
    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: VOUCHERS_PATH,
    });
    console.log('DEBUG respuesta GitHub:', JSON.stringify(response.data, null, 2));

    if (!Array.isArray(response.data)) {
      return res.status(404).json({ error: 'No hay vouchers' });
    }

    const vouchers = response.data
      .filter((item: any) => item.type === 'file' && item.name.startsWith('FACTURA_'))
      .map((item: any) => parseVoucherFilename(item.name))
      .filter(Boolean);

    res.status(200).json({ vouchers });
  } catch (error: any) {
    console.error('ERROR al listar vouchers:', error);
    res.status(500).json({ error: 'Error al listar vouchers', details: error.message });
  }
}
