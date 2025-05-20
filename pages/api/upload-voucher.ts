import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import type { Fields, Files, File } from 'formidable';
import { Octokit } from '@octokit/rest';

export const config = {
  api: {
    bodyParser: false,
  },
};

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

function getFirstValue<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getSingleFile(file: File | File[] | undefined): File | undefined {
  if (Array.isArray(file)) {
    return file[0];
  }
  return file;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log del método recibido
  console.log('Método recibido:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new IncomingForm();
  
  try {
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // LOG: Mostrar qué llega en fields y files
    console.log('Fields recibidos:', fields);
    console.log('Files recibidos:', files);

    // Obtener y validar los campos
    const numeroFactura = getFirstValue(fields.numeroFactura);
    const nombreUsuario = getFirstValue(fields.nombreUsuario);
    const voucherFile = getSingleFile(files.voucher);

    if (!numeroFactura || !nombreUsuario || !voucherFile) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Validar que sea una imagen
    if (!voucherFile.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'Solo se permiten imágenes' });
    }

    // Leer el archivo y convertirlo a base64
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(voucherFile.filepath);
    const content = buffer.toString('base64');

    // Nombre del archivo
    const nombreLimpio = String(nombreUsuario).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `FACTURA_${numeroFactura}_${nombreLimpio}.PNG`;

    // Subir a GitHub
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: 'Elmerluis0129',
        repo: 'WanMarKay',
        path: `src/assest/vouchers/${filename}`,
        message: `Subir voucher ${filename}`,
        content,
        branch: process.env.GITHUB_BRANCH || 'main',
      });
      return res.status(200).json({ success: true, filename });
    } catch (e) {
      console.error('Error al subir a GitHub:', e);
      return res.status(500).json({ 
        error: 'Error al subir a GitHub', 
        details: e instanceof Error ? e.message : 'Error desconocido' 
      });
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return res.status(500).json({ 
      error: 'Error al procesar la solicitud',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
} 