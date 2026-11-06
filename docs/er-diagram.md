# Modelo del avance 2

accounts 1:N sessions
accounts 1:N proposals
proposals N:M components mediante proposal_components
categories 1:N components
proposals 1:N documents
accounts 1:N documents
proposals 1:N history

Claves e índices: server/schema.mysql.sql. Las propuestas son builds iniciales con uso, presupuesto, notas y piezas. Las reglas actuales de compatibilidad comparan socket y generación RAM; no cubren todo el ensamblaje.
