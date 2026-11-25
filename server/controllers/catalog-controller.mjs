// Controlador del catálogo, las builds y el asesor.
export function createCatalogController({ catalog }) {
  return {
    async advice(req, res) {
      res.json({ data: await catalog.advice(req.body) });
    },

    referenceBuilds(req, res) {
      res.json({ data: catalog.referenceBuilds() });
    },

    async builds(req, res) {
      res.json({ data: await catalog.builds() });
    },

    async catalog(req, res) {
      res.set('Cache-Control', 'no-store');
      res.json({ data: await catalog.catalog() });
    },

    async components(req, res) {
      res.json({ data: await catalog.components() });
    }
  };
}
