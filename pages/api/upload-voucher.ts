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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Soporte CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
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
    let banco = getFirstValue(fields.banco);
    // Normalización especial: quitar 'León' de 'Banco BHD León'
    if (banco && banco.toLowerCase().includes('bhd le')) {
      banco = 'Banco BHD';
    }
    console.log('DEBUG fields:', fields);
    console.log('DEBUG typeof fields.banco:', typeof fields.banco, 'valor:', fields.banco);
    console.log('DEBUG banco recibido:', banco);
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
    const bancoLimpio = String(banco || 'Banco').replace(/[^a-zA-Z0-9]/g, '');
    // Obtener fecha y hora en zona horaria de República Dominicana (AST, UTC-4)
    const fecha = new Date();
    // Usar date-fns-tz para obtener la hora exacta de República Dominicana
    const { utcToZonedTime, format } = require('date-fns-tz');
    console.log('DEBUG fecha local:', fecha.toString());
    console.log('DEBUG fecha UTC:', fecha.toISOString());
    const zonedDate = utcToZonedTime(fecha, 'America/Santo_Domingo');
    console.log('DEBUG zonedDate:', zonedDate.toString());
    const timestamp = format(zonedDate, 'yyyyMMdd_HHmm'); // YYYYMMDD_HHmm
    console.log('DEBUG timestamp generado:', timestamp);
    const fileExt = voucherFile.originalFilename?.split('.').pop() || 'png';
    const baseName = `FACTURA_${numeroFactura}_${nombreLimpio}_${timestamp}`;
    const filename = `${baseName}_${bancoLimpio}.${fileExt}`;

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
