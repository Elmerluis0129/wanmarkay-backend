import formidable from 'formidable';
import { Octokit } from '@octokit/rest';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const GITHUB_OWNER = 'Elmerluis0129';
const GITHUB_REPO = 'WanMarKay';
const CATALOGOS_PATH = 'src/assets/catalogos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Error al procesar el formulario' });

    let file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'Falta el archivo PDF' });
    }
    // Si formidable entrega un array, tomamos el primer archivo
    if (Array.isArray(file)) {
      file = file[0];
    }
    // Solo aceptar PDFs
    if (!file.mimetype || !file.mimetype.includes('pdf')) {
      return res.status(400).json({ error: 'Solo se permiten archivos PDF' });
    }

    // Leer el archivo y convertirlo a base64
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(file.filepath);
    const content = buffer.toString('base64');

    // Construir nombre de archivo
    const fileExt = file.originalFilename?.split('.').pop() || 'pdf';
    const baseName = file.originalFilename?.replace(/\.[^/.]+$/, '') || 'catalogo';
    const filename = `${baseName}_${Date.now()}.${fileExt}`;

    // Subir a GitHub
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: `${CATALOGOS_PATH}/${filename}`,
        message: `Subir catálogo ${filename}`,
        content,
        branch: process.env.GITHUB_BRANCH || 'main',
      });
      return res.status(200).json({ success: true, filename });
    } catch (e: any) {
      console.error('Error al subir a GitHub:', e);
      return res.status(500).json({ error: 'Error al subir a GitHub', details: e.message });
    }
  });
}
