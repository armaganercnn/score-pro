# Plan: Milestone 3: R2 (Ontology Registry) of Phase B

## Objective
Seed the ontology metadata, implement dynamic entity fetching and properties/relations in OntologyRegistry, and expose the REST endpoints.

## Decomposed Steps

### Step 1: Exploration
- **Spawn Explorer** to analyze the existing code, SQL files, schema structure, data requirements, and find gaps.
- **Output**: An exploration report describing what is implemented, what needs to be changed in `V44__ontology_metadata.sql`, and what needs to be implemented/changed in `OntologyRegistry.java`, `OntologyController.java`, and `OntologyRegistryTest.java`.

### Step 2: Implementation & Verification of SQL Migration & Seeds (Milestone 1)
- **Spawn Worker** to:
  1. Add database seed statements (INSERT for object and link types) to `V44__ontology_metadata.sql`.
  2. Verify that database migrations compile and run.
  3. Ensure the REST endpoints `/api/ontology/objects` and `/api/ontology/links` retrieve the seeded data.
- **Spawn Reviewer** to inspect the migration SQL file and verify correctness.
- **Spawn Challenger** to run the unit/integration tests and verify that Milestone 1 passes.

### Step 3: Map DataSource Ownership & Sensitivity (Milestone 2)
- **Spawn Worker** to:
  1. Update `OntologyRegistry.java`'s `getObjectInstance` implementation to correctly map `DataSource` ownership (`owner_user` or `owner_orgunit` under `relations`) and sensitivity (`sensitive` under `properties`).
  2. Map properties/relations for other types (`user`, `orgunit`, `project`) if there are any gaps.
- **Spawn Reviewer** to verify the Java implementation in `OntologyRegistry.java`.
- **Spawn Challenger** to run the tests and write new test cases verifying the specific mapping.

### Step 4: Verification & Integration (Milestone 3)
- **Spawn Challenger** to execute the test suite `OntologyRegistryTest` and check compatibility.
- **Spawn Forensic Auditor** to verify integrity and authentic implementation of the requirements.
- **Output**: Test results and clean audit verdict.

## Acceptance Criteria
- Seeds for ontology object and link types are defined in `V44__ontology_metadata.sql`.
- `/api/ontology/objects` and `/api/ontology/links` endpoints are fully working and return the seeded types.
- `OntologyRegistry.getObjectInstance("datasource", id)` returns `relations` containing `owner_user` or `owner_orgunit` and `properties` containing sensitivity.
- All integration/unit tests pass successfully.
- Clean Forensic Audit verdict.
