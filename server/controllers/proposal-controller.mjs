// Controlador de decisiones: todas las rutas exigen sesión y el servicio comprueba el propietario.
export function createProposalController({ proposals }) {
  return {
    async list(req, res) {
      res.json({ data: await proposals.list(req.user.id) });
    },

    async create(req, res) {
      res.status(201).json({ data: await proposals.create(req.user.id, req.body) });
    },

    async get(req, res) {
      res.json({ data: await proposals.get(req.user.id, req.params.id) });
    },

    async update(req, res) {
      res.json({ data: await proposals.update(req.user.id, req.params.id, req.body) });
    },

    async remove(req, res) {
      await proposals.remove(req.user.id, req.params.id);
      res.status(204).end();
    },

    async history(req, res) {
      res.json({ data: await proposals.history(req.user.id, req.params.id) });
    }
  };
}
