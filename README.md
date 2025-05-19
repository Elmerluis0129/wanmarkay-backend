# WanMarKay Backend API

Este backend provee el endpoint serverless para subir vouchers a GitHub.

## Estructura

- `api/upload-voucher.js`: endpoint serverless compatible con Vercel.

## Despliegue en Vercel

1. Sube este proyecto a un repositorio de GitHub.
2. Ve a https://vercel.com/new y selecciona el repositorio.
3. Vercel detectará automáticamente la carpeta `api/` y creará el endpoint.
4. Configura las siguientes variables de entorno en Vercel:
   - `GITHUB_TOKEN`: Token fine-grained de GitHub con permisos de escritura en el repo de vouchers.
   - `GITHUB_BRANCH`: (opcional) Rama donde subir los vouchers. Por defecto es `main`.

## Uso

El endpoint estará disponible en:

```
https://<tu-proyecto>.vercel.app/api/upload-voucher
```

Haz peticiones POST multipart/form-data con los campos:
- `numeroFactura`
- `nombreUsuario`
- `voucher` (archivo imagen)

## Dependencias
- formidable
- @octokit/rest 