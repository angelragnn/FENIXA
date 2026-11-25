// Controlador de adjuntos de una decisión y descarga de archivos.
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
      const { filePath, name } = await documents.locate(req.user.id, req.params.fileId);
      res.download(filePath, name);
    }
  };
}
