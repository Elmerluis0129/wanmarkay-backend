import formidable from 'formidable';
import { Octokit } from '@octokit/rest';

export const config = {
  api: {
    bodyParser: false,
  },
};

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: 'Error al procesar el formulario' });

    const { numeroFactura, nombreUsuario } = fields;
    const file = files.voucher;

    if (!numeroFactura || !nombreUsuario || !file) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Solo aceptar imágenes
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Solo se permiten imágenes' });
    }

    // Leer el archivo y convertirlo a base64
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(file.filepath);
    const content = buffer.toString('base64');

    // Nombre del archivo
    const nombreLimpio = String(nombreUsuario).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FACTURA_${numeroFactura}_${nombreLimpio}.PNG`;

    // Subir a GitHub
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: 'Elmerluis0129',
        repo: 'WanMarKay',
        path: `src/assets/vouchers/${filename}`,
        message: `Subir voucher ${filename}`,
        content,
        branch: process.env.GITHUB_BRANCH || 'main',
      });
      return res.status(200).json({ success: true, filename });
    } catch (e) {
      console.error('Error al subir a GitHub:', e);
      return res.status(500).json({ error: 'Error al subir a GitHub', details: e.message });
    }
  });
} 