import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import type { Fields, Files, File } from 'formidable';
import { Octokit } from '@octokit/rest';

export const config = {
  api: {
    bodyParser: false,
  },
};
console.log("GITHUB_TOKEN:", process.env.GITHUB_TOKEN ? '🟢 Presente' : '🔴 Ausente');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});


function getFirstValue<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getSingleFile(file: File | File[] | undefined): File | undefined {
  return Array.isArray(file) ? file[0] : file;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    const numeroFactura = getFirstValue(fields.numeroFactura);
    const nombreUsuario = getFirstValue(fields.nombreUsuario);
    const voucherFile = getSingleFile(files.voucher);

    if (!numeroFactura || !nombreUsuario || !voucherFile) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (!voucherFile.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'Solo se permiten imágenes' });
    }

    const fs = await import('fs/promises');
    const buffer = await fs.readFile(voucherFile.filepath);
    const content = buffer.toString('base64');

    // Nombre del archivo
    const nombreLimpio = String(nombreUsuario).replace(/[^a-zA-Z0-9]/g, '_');
    const fecha = new Date();
    const timestamp = fecha.toISOString().slice(0, 16).replace(/[-T:]/g, '').replace(/^(\d{8})(\d{4})$/, '$1_$2'); // YYYYMMDD_HHmm
    const filename = `FACTURA_${numeroFactura}_${nombreLimpio}_${timestamp}.PNG`;

    // Verificar si ya existe el archivo para obtener el SHA (para sobreescritura segura)
    let sha: string | undefined = undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: 'Elmerluis0129',
        repo: 'WanMarKay',
        path: `src/assest/vouchers/${filename}`,
        ref: 'main',
      });

      if (!Array.isArray(data) && data.sha) {
        sha = data.sha;
      }
    } catch (err: any) {
      if (err.status !== 404) {
        return res.status(500).json({ error: 'Error verificando existencia del archivo', details: err.message });
      }
      // si es 404, continúa creando el archivo sin SHA
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: 'Elmerluis0129',
      repo: 'WanMarKay',
      path: `src/assest/vouchers/${filename}`,
      message: `Subir voucher ${filename}`,
      content,
      branch: 'main',
      ...(sha && { sha }), // solo incluir si existe
    });

    return res.status(200).json({ success: true, filename });

  } catch (error: any) {
    console.error('Error al procesar/subir archivo:', error.message);
    return res.status(500).json({
      error: 'Error al procesar o subir el archivo',
      details: error.message || 'Error desconocido',
    });
  }
}
