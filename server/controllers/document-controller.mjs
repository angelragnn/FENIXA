// Controlador de adjuntos de una decisión y descarga de archivos.
const INLINE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const asciiName = name => name.replace(/[^ -~]|["\\]/g, '_');

export function createDocumentController({ documents, proposals }) {
  return {
    // Se ejecuta antes de multer: no se procesa ninguna subida si la decisión no es del usuario.
    async requireOwner(req, res, next) {
      await proposals.owned(req.user.id, req.params.id);
      next();
    },

    async list(req, res) {
      await proposals.owned(req.user.id, req.params.id);
      res.json({ data: await documents.list(req.params.id) });
    },

    async upload(req, res) {
      res.status(201).json({ data: await documents.upload(req.user.id, req.params.id, req.file) });
    },

    async download(req, res) {
      // El archivo pasa por el servidor (que ya comprobó el dueño): el navegador nunca ve el almacenamiento.
      const { buffer, name, mime, kind } = await documents.read(req.user.id, req.params.fileId);
      res.type(mime);
      // Solo los adjuntos (PDF/PNG/JPEG) se pueden ver en el navegador; las versiones JSON siempre se descargan.
      if (req.query.inline && kind !== 'snapshot' && INLINE_TYPES.has(mime)) {
        res.set('Content-Disposition', `inline; filename="${asciiName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`);
        // CSP propia del recurso. "sandbox" rompe el visor de PDF de Chrome, así que solo se usa con imágenes.
        res.set('Content-Security-Policy', [
          "default-src 'none'", "img-src 'self'", "style-src 'unsafe-inline'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'",
          ...(mime === 'application/pdf' ? [] : ['sandbox'])
        ].join('; '));
        res.set('Cache-Control', 'private, no-store');
      } else {
        res.attachment(name);
      }
      res.set('X-Content-Type-Options', 'nosniff');
      res.send(buffer);
    },

    async remove(req, res) {
      await documents.remove(req.user.id, req.params.fileId);
      res.status(204).end();
    }
  };
}
