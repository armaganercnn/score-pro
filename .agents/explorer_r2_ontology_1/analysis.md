# Ontology Registry Analysis (Milestone 3 R2)

## Executive Summary
A detailed review of the Milestone 3 (R2) Ontology Registry was conducted. Key findings include:
1. **SQL Seed Statements**: Designed safe and correct SQL `INSERT` statements to populate `ontology_object_types` and `ontology_link_types` with the required objects (`user`, `orgunit`, `project`, `datasource`) and links (`user_orgunit`, `datasource_orgunit`, `project_orgunit`).
2. **DataSource Mapping**: Verified that DataSource sensitivity (`sensitive` under `properties`) and ownership (`owner_user` or `owner_orgunit` under `relations`) are correctly mapped.
3. **Critical Bug in User Query**: Discovered a critical `BadSqlGrammarException` in the `user` object query inside `OntologyRegistry.java`. It queries columns (`username`, `full_name`, `role_id`) that do not exist on the `users` table. The unit tests pass only because they mock the JDBC call and return mock data.
4. **REST Endpoints**: Reviewed the endpoints in `OntologyController.java` and confirmed they align with requirements, though there is a gap in controller-level testing.
5. **Test Coverage**: Inspected `OntologyRegistryTest.java` and proposed additional tests to prevent regression and cover controller/integration boundaries.

---

## 1. Database Seeding for Ontology Metadata

### Table Analysis (`V44__ontology_metadata.sql`)
The migration defines two main tables:
- `ontology_object_types`: Key-value registry for semantic types. `key` is a unique `VARCHAR(100)`.
- `ontology_link_types`: Registry for semantic relationships. It uses foreign keys (`source_object_key` and `target_object_key`) referencing `ontology_object_types(key)`.

### Seed Statements
To avoid checksum conflicts in Flyway if `V44` is already applied, these seed statements should ideally be written into a new migration file, e.g., `V47__seed_ontology_metadata.sql`, or appended to `V44__ontology_metadata.sql` if the database can be rebuilt from scratch.

```sql
-- Seed Ontology Object Types
INSERT INTO ontology_object_types (key, display_name, description, entity_class, sensitive)
VALUES
    ('user', 'User', 'System user representation in the ontology', 'com.akilliorganizasyon.identity.domain.User', FALSE),
    ('orgunit', 'Organizational Unit', 'Organizational unit / company department or team', 'com.akilliorganizasyon.organization.domain.OrgUnit', FALSE),
    ('project', 'Project', 'Company project representation', 'com.akilliorganizasyon.assets.domain.Project', FALSE),
    ('datasource', 'Data Source', 'Database, API, or external data source connection registry', 'com.akilliorganizasyon.assets.domain.DataSource', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Seed Ontology Link Types
INSERT INTO ontology_link_types (key, display_name, source_object_key, target_object_key, cardinality)
VALUES
    ('user_orgunit', 'User Belonging to OrgUnit', 'user', 'orgunit', 'MANY_TO_MANY'),
    ('datasource_orgunit', 'DataSource Linked to OrgUnit', 'datasource', 'orgunit', 'MANY_TO_MANY'),
    ('project_orgunit', 'Project Linked to OrgUnit', 'project', 'orgunit', 'MANY_TO_MANY')
ON CONFLICT (key) DO NOTHING;
```

*Note: The `entity_class` values match the actual fully qualified class names identified in the codebase:*
- `User`: `com.akilliorganizasyon.identity.domain.User`
- `OrgUnit`: `com.akilliorganizasyon.organization.domain.OrgUnit`
- `Project`: `com.akilliorganizasyon.assets.domain.Project`
- `DataSource`: `com.akilliorganizasyon.assets.domain.DataSource`

---

## 2. Java Code Analysis (`OntologyRegistry.java`)

We analyzed the switch statement in `OntologyRegistry.getObjectInstance(...)`.

### A. DataSource Mapping (Fully Mapped)
- **Sensitivity**: Selected via `sensitive` in `SELECT ... sensitive ... FROM data_sources`. This is added to the `properties` map as required.
- **Ownership Relationships**: Under `relations`, the code handles the polymorphic owner:
  ```java
  String ownerType = (String) ds.get("owner_type");
  Object ownerIdObj = ds.get("owner_id");
  if (ownerType != null && ownerIdObj != null) {
      String ownerIdStr = ownerIdObj.toString();
      if ("user".equalsIgnoreCase(ownerType)) {
          dsRelations.put("owner_user", List.of(ownerIdStr));
      } else if ("orgunit".equalsIgnoreCase(ownerType)) {
          dsRelations.put("owner_orgunit", List.of(ownerIdStr));
      }
  }
  ```
  This matches the requirement to place ownership under `"owner_user"` or `"owner_orgunit"`.

### B. User Mapping (CRITICAL BUG)
The query for retrieving user details is:
```java
List<Map<String, Object>> userList = jdbc.queryForList(
        "SELECT username, email, full_name, role_id FROM users WHERE id = ?", id);
```
However, the `users` table (defined in `V4` and `V5`) **does not contain** columns `username`, `full_name`, or `role_id`:
- It has `email` (no `username`).
- It has `first_name` and `last_name` (no `full_name`).
- It has a join table `user_roles` mapping users to roles (no `role_id` column in `users`).

**Consequence**: Running this code at runtime against a PostgreSQL database will throw a `BadSqlGrammarException` and return `null` (since the exception is caught and logged, returning `null`), hiding the failure but causing RAG enrichment to fail silently.

**Proposed Fix**:
Modify the user query to construct the columns from existing data:
```java
List<Map<String, Object>> userList = jdbc.queryForList(
        "SELECT email AS username, email, " +
        "COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') AS full_name, " +
        "(SELECT role_id::text FROM user_roles WHERE user_id = users.id LIMIT 1) AS role_id " +
        "FROM users WHERE id = ?", id);
```

### C. OrgUnit Mapping (Fully Mapped)
- **Properties**: Correctly queries `name`, `type`, `code`, `status` from `organizations`.
- **Relations**: Correctly retrieves associated data sources via a `UNION` query on direct owners and the junction table `datasource_org_units`.

### D. Project Mapping (Fully Mapped)
- **Properties**: Correctly queries `name`, `description`, `status`, `budget` from `projects`.
- **Relations**: Correctly retrieves associated organizational units via `project_org_units`.

---

## 3. REST Endpoints Analysis (`OntologyController.java`)

The controller exposes three endpoints:
- `GET /api/ontology/objects`: Returns registered object types.
- `GET /api/ontology/links`: Returns registered link types.
- `GET /api/ontology/objects/{key}/instances/{id}`: Returns a specific instance mapping properties & relations.

All endpoints are mapped correctly using Spring MVC and annotated with OpenAPI annotations.

---

## 4. Test Verification (`OntologyRegistryTest.java`)

We ran the existing unit test suite:
- **Command**: `mvn test -Dtest=OntologyRegistryTest`
- **Result**: `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.439 s`
- **Status**: **PASSING**

### Analysis of Test Gap
The unit tests pass because they use a mocked `JdbcTemplate` that intercepts the queries and returns hardcoded mock maps (e.g. mock maps containing `"username"`, `"full_name"` keys). Because it does not interact with a real schema, the SQL grammar error went undetected.

### Recommendations for More Tests
1. **Integration Test / Slice Test**: Create a test using `@DataJpaTest` or `@SpringBootTest` with a real/in-memory H2 or Testcontainers database to verify actual SQL execution against the schema.
2. **OntologyController Tests**: Add `OntologyControllerTest.java` using `@WebMvcTest(OntologyController.class)` to verify that:
   - Request mapping works.
   - HTTP status codes are correct (e.g., `404 Not Found` for non-existent instances).
   - JSON serialization matches requirements.
3. **Specific test for user query correction**: Verify that the correct columns are parsed into `displayName` and `properties` under the `user` case.
