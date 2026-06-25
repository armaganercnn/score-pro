# Scope: Ontology Registry & Entity Derivation (R2)

## Architecture
- Seed ontology object and link types via `V44__ontology_metadata.sql`.
- Expose REST API endpoints `/api/ontology/objects` and `/api/ontology/links`.
- Connect `DataSource` sensitivity (`sensitive`) and ownership (`owner_type`, `owner_id`) to the Ontology model via `OntologyRegistry.getObjectInstance`.

## Milestones
- Milestone 1: Verify `V44__ontology_metadata.sql` migration file, seed the data, and make sure REST endpoints work.
- Milestone 2: Map `DataSource` ownership relationships (`owner_user` or `owner_orgunit`) and sensitivity property under `relations` and `properties` respectively.
- Milestone 3: Verify using unit/integration tests (`OntologyRegistryTest`).

## Interface Contracts
- API endpoints `/api/ontology/objects` and `/api/ontology/links` query the DB.
- `OntologyRegistry.getObjectInstance("datasource", id)` returns `relations` containing `owner_user` or `owner_orgunit` and `properties` containing sensitivity.

## Code Layout
- Ontology Registry service: `backend/src/main/java/com/akilliorganizasyon/shared/ontology/OntologyRegistry.java`
- REST Controller: `backend/src/main/java/com/akilliorganizasyon/shared/ontology/OntologyController.java` (or similar)
- Tests: `backend/src/test/java/com/akilliorganizasyon/shared/ontology/OntologyRegistryTest.java`
