# Database Systems Lecture Notes Summary - L01 to L14

> Purpose: This file is course-reference material for the HRGSMS university project. Use the relevant concepts when designing, implementing, explaining, and testing the database. It does not override the official project brief, lecturer instructions, approved ERD, SRS, or current user instructions. Do not force unrelated lecture topics into the project merely to mention them. Clearly label any necessary PostgreSQL technique that goes beyond this summary.

## L01 - Introduction

### Database Management System

A DBMS is a collection of interrelated data and programs used to access that data. It provides convenience and efficiency while addressing file-system drawbacks such as:

- data redundancy
- data inconsistency
- difficulty accessing data
- data isolation
- integrity problems
- atomicity problems
- concurrent-access problems
- security problems

### Levels of abstraction

- **Physical level:** Describes how data is stored.
- **Logical level:** Describes the data structure and relationships.
- **View level:** Hides details and can support security or simplified user views.

### Instances and schemas

- A **schema** is the logical structure of a database.
- An **instance** is the actual content of the database at a particular point in time.
- **Physical data independence** allows the physical schema to change without requiring changes to the logical schema.

### Data models

- Relational
- Entity-Relationship
- Object-based
- Semistructured, such as XML

### Relational model

The relational model represents data in tables:

- columns are attributes
- rows are tuples

### Database languages

- **DML - Data Manipulation Language:** Used to access and manipulate data. It can be procedural or declarative. SQL is primarily declarative.
- **DDL - Data Definition Language:** Defines schemas, integrity constraints, primary keys, foreign keys, and authorization. Definitions are stored in a data dictionary.

### Database engine

The database engine includes:

- storage manager
- query processor
- transaction manager

The storage manager interfaces between low-level stored data and applications. It handles matters such as file organization, indexing, and hashing.

Query processing includes:

- parsing and translation
- optimization
- evaluation

Transaction management ensures atomicity and consistency during failures and concurrent access. It supports the ACID properties.

## L02 - Entity-Relationship Model

### Entities and relationships

- An **entity** is a distinguishable object with attributes.
- An **entity set** is a set of entities of the same type.
- A **relationship** is an association among entities.
- Relationship degree is commonly binary.

### Attributes

Attributes may be:

- simple or composite
- single-valued or multivalued
- stored or derived

A domain defines the permitted values of an attribute.

### Mapping cardinalities

- one-to-one
- one-to-many
- many-to-one
- many-to-many

### Keys

- **Superkey:** A set of attributes that uniquely identifies a tuple.
- **Candidate key:** A minimal superkey.
- **Primary key:** The candidate key selected as the principal identifier.

For relationship sets, the primary key may combine the primary keys of participating entities.

### Participation

- **Total participation:** Every entity participates in at least one relationship. It is shown using a double line in traditional ER notation.
- **Partial participation:** Participation is optional for some entities.

### Weak entity sets

A weak entity has no complete primary key of its own and depends on an identifying strong entity. It has a discriminator, also called a partial key.

### Specialization and generalization

- Specialization is a top-down approach.
- Generalization is a bottom-up approach.
- Subclasses inherit attributes.
- Constraints may be disjoint or overlapping.
- Completeness may be total or partial.

### Aggregation

Aggregation treats a relationship as an abstract entity to reduce redundancy or model a relationship involving another relationship.

### Reduction to relational schemas

- Strong entities normally become tables.
- Weak entities include the primary key of their identifying strong entity.
- Many-to-many relationships become separate tables containing the primary keys of both participating entities.
- One-to-many and one-to-one relationships may place the foreign key on the appropriate side, commonly the many side for one-to-many.
- Multivalued attributes become separate tables.

## L03 - Introduction to SQL

### Data Definition Language

Common DDL commands include:

- `CREATE TABLE`
- `DROP TABLE`
- `ALTER TABLE`

### Data types

Examples include:

- `CHAR(n)`
- `VARCHAR(n)`
- `INT`
- `SMALLINT`
- `NUMERIC(p,d)`
- `REAL`
- `FLOAT`

### Integrity constraints

- `NOT NULL`
- `PRIMARY KEY`
- `FOREIGN KEY ... REFERENCES`

### Basic query structure

```sql
SELECT A1, ..., An
FROM r1, ..., rm
WHERE P;
```

- `SELECT` specifies attributes, which corresponds to projection.
- `DISTINCT` removes duplicate output rows.
- `*` selects all attributes.
- `WHERE` specifies selection conditions.
- Conditions may use `AND`, `OR`, `NOT`, and `BETWEEN`.
- Listing relations in `FROM` without join conditions produces a Cartesian product.

### Joins and renaming

- `NATURAL JOIN` matches rows using equally named attributes with equal values.
- `AS` renames relations or output attributes.

### String operations

`LIKE` supports pattern matching:

- `%` matches a substring of any length.
- `_` matches one character.

### Aggregate functions

- `AVG`
- `MIN`
- `MAX`
- `SUM`
- `COUNT`

`GROUP BY` forms groups. `HAVING` applies predicates to groups. Aggregates normally ignore null values, except `COUNT(*)`, which counts rows.

### Nested subqueries

`IN` and `NOT IN` can test set membership using subquery results.

## L04 and L06 - Relational Database Design

### Design objective

Relational design aims to avoid unnecessary repetition and excessive null values through lossless decomposition.

### First Normal Form

A relation is in 1NF when every attribute domain is atomic.

### Functional dependencies

A functional dependency `alpha -> beta` holds when any tuples agreeing on `alpha` must also agree on `beta`.

For a relation schema `R`:

- `K` is a superkey if `K -> R`.
- `K` is a candidate key if it is a superkey and no proper subset of `K` is also a superkey.

### Closure of functional dependencies

The closure `F+` can be derived using Armstrong's axioms:

- Reflexivity
- Augmentation
- Transitivity

### Boyce-Codd Normal Form

A relation is in BCNF if, for every non-trivial functional dependency `alpha -> beta`, `alpha` is a superkey.

A BCNF decomposition may replace relation `R` with:

- `alpha UNION beta`
- `R - (beta - alpha)`

BCNF decomposition may not preserve every dependency.

### Third Normal Form

A relation is in 3NF when, for each functional dependency `alpha -> beta`, at least one condition holds:

- the dependency is trivial
- `alpha` is a superkey
- each attribute in `beta - alpha` belongs to a candidate key

3NF supports lossless joins and dependency preservation.

### Canonical cover

A canonical cover is a minimal equivalent set of functional dependencies without redundant dependencies or extraneous attributes.

### Lossless-join test

For a decomposition into `R1` and `R2`, it is lossless when the common attributes functionally determine `R1` or `R2`:

- `R1 INTERSECT R2 -> R1`, or
- `R1 INTERSECT R2 -> R2`

## L05 - Intermediate SQL

### Joins

- `LEFT OUTER JOIN` keeps every row from the left relation and uses null values when there is no matching right row.
- `RIGHT OUTER JOIN` keeps every row from the right relation.
- `FULL OUTER JOIN` keeps rows from both sides.
- `INNER JOIN` returns only matching rows.

### Views

A view is a virtual relation:

```sql
CREATE VIEW view_name AS
SELECT ...;
```

View expansion replaces a view reference with its defining query. Updatable views have restrictions. Materialized views store their results physically.

### Transactions

A transaction is a unit of work. Common commands include:

- `START TRANSACTION`
- `COMMIT`
- `ROLLBACK`

Transactions support the ACID properties.

### Integrity constraints

- `NOT NULL`
- `PRIMARY KEY`
- `UNIQUE`
- `CHECK (predicate)`
- `FOREIGN KEY`

### Cascading referential actions

- `ON DELETE CASCADE`
- `ON UPDATE CASCADE`

Cascade behavior should be selected according to the intended business rule.

### Additional built-in types

- `DATE`
- `TIME`
- `TIMESTAMP`
- `INTERVAL`
- `BLOB`
- `CLOB`

### User-defined types and domains

- `CREATE TYPE`
- `CREATE DOMAIN`

### Indexing

Indexes improve data access performance:

```sql
CREATE INDEX index_name ON table_name(attribute);
```

## L07 - Application Design and Development

### Application architectures

- Two-tier architecture
- Three-tier architecture with presentation, business-logic, and data-access layers

### Web interfaces

Web applications use concepts such as:

- HTML
- HTTP
- URLs
- CGI
- cookies
- sessions

### Server-side and client-side execution

- Servlets and JSP are examples of server-side Java execution.
- JavaScript and the DOM support client-side behavior.
- AJAX supports asynchronous communication and local form feedback.

### Object-Relational Mapping

ORM tools map object-oriented concepts to relational schemas. Hibernate is an example. The HRGSMS project may still require direct SQL according to its project-specific rules.

### Performance

Caching may be applied to:

- database connections through connection pooling
- generated HTML
- query results

### Security

- Prevent SQL injection using prepared statements.
- Mitigate cross-site scripting by validating input and safely handling HTML content.
- Additional checks may include Referer or IP checks where appropriate.
- Authentication approaches include two-factor authentication, LDAP, and SAML single sign-on.
- Security mechanisms include symmetric encryption such as AES, asymmetric encryption such as RSA, and salted password hashing.
- Use HTTPS for data in transit.

## L08 - Advanced SQL

### JDBC

JDBC is the Java API for database access. A typical sequence is:

1. Open a connection.
2. Create a statement.
3. Execute the statement.
4. Fetch the `ResultSet`.

### Prepared statements

Prepared statements precompile SQL and parameterize inputs, often using placeholders such as `?`. They help prevent SQL injection.

### ODBC

ODBC is a standard database API commonly associated with C and C++ applications.

### Embedded SQL

Embedded SQL places SQL inside a host programming language. SQLJ is an example.

### Procedural SQL

Procedural SQL may include:

- `IF-THEN-ELSE`
- `WHILE`
- `FOR` loops
- stored procedures
- functions, including table-returning functions

### Triggers

Triggers execute automatically for events such as:

- `INSERT`
- `UPDATE`
- `DELETE`

Triggers may be:

- row-level using `FOR EACH ROW`
- statement-level

Triggers can enforce useful constraints, but cascading trigger executions must be considered carefully.

### Advanced aggregation and OLAP

Examples include:

- `RANK() OVER (ORDER BY ...)`
- windowing and moving averages
- `CUBE`
- `ROLLUP`

## L09 - Storage and File Structure

### Storage hierarchy

Typical storage hierarchy:

1. Cache
2. Main memory, which is volatile
3. Flash storage
4. Magnetic disk
5. Optical disk or tape, which is non-volatile

### Magnetic disks

Important terms include:

- tracks
- sectors
- cylinders

Access time depends on:

- seek time
- rotational latency
- transfer time/rate

### RAID

- **RAID 0:** Striping without redundancy.
- **RAID 1:** Mirroring.
- **RAID 5:** Block-interleaved distributed parity; tolerates one disk failure.
- **RAID 6:** P+Q redundancy; tolerates two disk failures.

### File organization

- fixed-length records
- variable-length records
- slotted-page structure
- free lists

### Record organization

- heap organization
- sequential organization
- hashing
- multitable clustering

### Buffer manager

The buffer manager loads disk blocks into memory. Replacement policies include:

- Least Recently Used - LRU
- Most Recently Used - MRU

Pinned blocks cannot be replaced while pinned.

## L10 - Indexing and Hashing

### Ordered indexes

- **Primary or clustering index:** Influences the physical ordering of data.
- **Secondary or non-clustering index:** Provides an additional access path without defining physical order.

### Dense and sparse indexes

- A dense index has an entry for every search-key value.
- A sparse index has entries for only some search-key values, often one per block or range.

### Multilevel indexes

A multilevel index may use a sparse outer index with an inner index.

### B+-Tree

A B+-Tree is balanced and reorganizes itself during insertions and deletions. It supports exact-match and range queries with logarithmic access time.

### Static hashing

Static hashing maps a search key to a bucket using a hash function. Overflow may be handled using chaining, sometimes called closed hashing in the course material.

### Bitmap indexes

A bitmap index stores a bit array for each attribute value. It is effective for combining conditions on attributes with small domains.

## L11 - Query Processing and Transactions

### Query optimization

The database system:

1. generates equivalent query expressions
2. estimates their costs, commonly emphasizing disk I/O
3. selects a lower-cost execution plan

Cost estimation uses statistics stored in the data dictionary.

### ACID properties

- **Atomicity:** A transaction happens completely or not at all.
- **Consistency:** A transaction takes the database from one valid state to another valid state.
- **Isolation:** Concurrent transactions do not improperly interfere with each other.
- **Durability:** Committed changes survive failures.

### Transaction states

- Active
- Partially Committed
- Failed
- Aborted
- Committed

## L12 - Big Data

### Characteristics

- Volume
- Velocity
- Variety

### Distributed file systems

Distributed file systems such as HDFS are replicated, scalable, and often optimized for write-once/read-many workloads.

### Sharding

Sharding partitions data across databases using a shard key.

### MapReduce

MapReduce processing consists of:

1. Map - extract key-value pairs
2. Shuffle - group values by key
3. Reduce - aggregate values for each key

It can replace some complex joins for massive parallel processing. Apache Spark uses Resilient Distributed Datasets - RDDs.

### Streaming

Window types include:

- tumbling
- hopping
- sliding
- session

Kafka is an example of a publish-subscribe system.

### Graph databases

Graph databases such as Neo4j represent data using nodes and edges and support efficient relationship traversal.

## L13 - Data Analytics

### Data warehousing

A data warehouse stores historical data. Data integration may use:

- ETL - Extract, Transform, Load
- ELT - Extract, Load, Transform

Data movement may be source-driven or destination-driven.

### OLAP

Online Analytical Processing supports interactive summary analysis. Concepts include:

- cross-tabs
- data cubes
- pivoting
- slicing and dicing
- rollup from finer detail to coarser summaries
- drill-down from coarser summaries to finer detail

### Data mining

Data mining applies machine-learning methods to large datasets.

Examples include:

- decision trees
- Bayesian classifiers
- support vector machines
- neural networks and deep learning
- regression
- association rules using support and confidence
- clustering such as k-means and hierarchical clustering

## L14 - Introduction to NoSQL Databases

### Definition

NoSQL means “Not Only SQL.” NoSQL databases are commonly designed for:

- massive scalability
- flexible schemas
- high availability

### CAP theorem

CAP concerns:

- Consistency
- Availability
- Partition Tolerance

Under a network partition, distributed systems generally choose between stronger consistency and availability.

### BASE properties

- Basically Available
- Soft state
- Eventually Consistent

BASE relaxes some traditional ACID expectations.

### Types of NoSQL databases

1. **Column store:** Examples include HBase and BigTable. Data is grouped by columns and can support specific reads and batch insertions.
2. **Key-value store:** Examples include Dynamo and Redis. These provide fast lookup by key.
3. **Document store:** Examples include MongoDB and CouchDB. These store flexible JSON/BSON-style documents.

### MapReduce in NoSQL

CouchDB can use MapReduce to generate indexed views.

## HRGSMS Course-Alignment Reminder

For the HRGSMS project, prioritize the lecture concepts that naturally demonstrate relational database knowledge:

- ER modeling and ER-to-relational conversion
- primary, candidate, composite, and foreign keys
- relationship cardinality and participation
- functional dependencies
- 1NF, 3NF, and BCNF analysis
- referential integrity
- `NOT NULL`, `UNIQUE`, and `CHECK` constraints
- exact `NUMERIC` values for money
- joins, outer joins, aggregation, grouping, and views
- transactions, ACID, commit, and rollback
- safe concurrency
- prepared/parameterized SQL
- stored functions and procedures where useful
- triggers where they provide genuine integrity value
- indexes based on real query patterns
- query-plan evaluation
- three-tier application architecture
- authentication, authorization, hashing, sessions, HTTPS assumptions, SQL-injection prevention, and XSS prevention

Do not add big-data, NoSQL, data-mining, distributed-file-system, or sharding features unless the project scope or lecturer explicitly requires them.
