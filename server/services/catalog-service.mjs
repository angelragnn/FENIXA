// Servicio de catálogo: componentes, builds completas y asesor. Solo lectura.
import { readFileSync } from 'node:fs';
import { advise } from '../advisor.mjs';

const referenceBuilds = JSON.parse(readFileSync(new URL('../data-seeds/catalog.json', import.meta.url), 'utf8')).builds;

export function createCatalogService({ db }) {
  return {
    referenceBuilds: () => referenceBuilds,

    async advice(body) {
      const products = await db.prepare('SELECT c.*,d.image,d.specs FROM components c JOIN component_details d ON d.component_id=c.id').all();
      return advise(products, referenceBuilds, body);
    },

    // Cada build con sus piezas, fotos y suma de referencia, de menor a mayor precio.
    async builds() {
      const rows = await db.prepare('SELECT c.id,c.category_id,c.name,c.reference_price,cat.name AS category,d.image,d.summary,d.source FROM components c JOIN categories cat ON cat.id=c.category_id JOIN component_details d ON d.component_id=c.id').all();
      const byId = new Map(rows.map(p => [p.id, p]));
      return referenceBuilds.map(build => {
        const parts = build.componentIds.map(id => byId.get(id)).filter(Boolean);
        const priced = parts.filter(p => p.reference_price > 0);
        return {
          id: build.id,
          name: build.name,
          use: build.use === 'gaming' ? 'juegos' : build.use,
          short: build.short || '',
          description: build.description || '',
          tags: build.tags || [],
          notes: build.notes || [],
          componentIds: parts.map(p => p.id),
          parts,
          total: priced.reduce((sum, p) => sum + p.reference_price, 0),
          missingPrices: parts.length - priced.length,
          hasDedicatedGpu: parts.some(p => p.category_id === 11)
        };
      }).sort((a, b) => a.total - b.total);
    },

    catalog() {
      return db.prepare('SELECT c.*,cat.name AS category,d.source_id,d.summary,d.sku,d.source,d.image,d.specs,d.offers,d.price_min,d.price_max,d.imported_at FROM components c JOIN categories cat ON cat.id=c.category_id JOIN component_details d ON d.component_id=c.id ORDER BY c.id').all();
    },

    components() {
      return db.prepare('SELECT c.*,cat.name AS category,d.source_id,d.image,d.specs,d.summary FROM components c JOIN categories cat ON cat.id=c.category_id LEFT JOIN component_details d ON d.component_id=c.id ORDER BY c.id').all();
    }
  };
}
