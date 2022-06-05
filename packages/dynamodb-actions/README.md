# DynamoDB Actions

This package describes the actions that can be performed on the DynamoDB data model.
The database consists of multiple entities that are splitted over two tables.

The division into two tables is mostly for cost-management reasons.
Items from the AliasTable are expected to have a much higher ReadCapacity units consumption than the items from DeploymentTable.

## Entities

All entities that are used across the tables are listed here with their short name in brackets.

- Deployment (D)
- Route (R)
- ConfigNextJS (CN)

## Tables

The design consists of the following tables:

### DeploymentTable

| Entity         | PK            | SK                 | GSI1SK                          |
| -------------- | ------------- | ------------------ | ------------------------------- |
| Deployment (D) | `DEPLOYMENTS` | `D#<DeploymentId>` | `<CreateDate>#D#<DeploymentId>` |

#### GSI1: CreateDateIndex

Allows to get all deployments sorted by CreateDate.
Only the listed attributes are available (ProjectionType: INCLUDE).

<table>
  <thead>
    <tr>
      <th colspan="2">Primary Key</th>
      <th colspan="100%" rowspan="2">Attributes</th>
    </tr>
    <tr>
      <th>PK</th>
      <th>GSI1SK</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>DEPLOYMENTS</code></td>
      <td><code>&lt;CreateDate&gt;#D#&lt;DeploymentId&gt;</code></td>
      <td>CreateDate</td>
      <td>DeploymentAlias</td>
      <td>DeploymentId</td>
      <td>Status</td>
    </tr>
  </tbody>
</table>

### AliasTable

An alias is a virtual construct and consists of multiple entities with the same sort key (SK) but different partition keys (PK).

The table is designed for a high ReadCapacity consumption through `PK` & `SK` keys (main query is `getAliasByHostname`).

| Entity            | PK             | SK                         | GSI1PK             | GSI1SK                                     |
| ----------------- | -------------- | -------------------------- | ------------------ | ------------------------------------------ |
| Route (R)         | `ROUTES`       | `<HostnameRev>#<BasePath>` | `D#<DeploymentId>` | `<CreateDate>#R#<HostnameRev>#<BasePath>`  |
| ConfigNextJS (CN) | `CONFIGNEXTJS` | `<HostnameRev>#<BasePath>` | `D#<DeploymentId>` | `<CreateDate>#CN#<HostnameRev>#<BasePath>` |

- `<HostnameRev>`  
  Full domain under which a deployment is served in reverse order (e.g. `com.example.subdomain`).
  The hostname is reversed to allow a lookup of wildcards (e.g. `begins_with(com.example)` matches `com.example.*`) in the future.
- `<BasePath>`  
  Subpath under which the deployment is available (default `/`).

#### GSI1: DeploymentIdIndex

Allows to get all aliases that are associated with a deployment sorted by CreateDate.
Only the listed attributes are available (ProjectionType: INCLUDE).

<table>
  <thead>
    <tr>
      <th colspan="2">Primary Key</th>
      <th colspan="100%" rowspan="2">Attributes</th>
    </tr>
    <tr>
      <th>GSI1PK</th>
      <th>GSI1SK</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>D#&lt;D-id&gt;</code></td>
      <td><code>&lt;CreateDate&gt;#R#&lt;hostnameRev&gt;#&lt;basePath&gt;</code></td>
      <td>BasePath</td>
      <td>CreateDate</td>
      <td>DeploymentId</td>
      <td>DeploymentAlias</td>
      <td>HostnameRev</td>
    </tr>
  </tbody>
</table>

## Actions

The following actions on the database are supported:

### Deployments

- `createDeployment`  
  Inserts a new deployment into the DeploymentTable.
- `deleteDeploymentById`
- `getDeploymentById`  
  Returns the Deployment for the given ID. Returns `null` when it does not exist.
- `listDeployments`  
  Lists all deployments from the DeploymentTable, sorted by `CreateDate` DESC.
- `updateDeploymentStatusCreateFailed`
- `updateDeploymentStatusCreateInProgress`
- `updateDeploymentStatusDestroyFailed`
- `updateDeploymentStatusDestroyInProgress`
- `updateDeploymentStatus`
- `updateDeploymentStatusDestroyRequested`
- `updateDeploymentStatusFinished`
- `updateDeploymentStatus`

### Aliases

- `createAlias`  
  Inserts a new route item into the AliasTable.
- `deleteAliasById`
- `getAliasById`
- `listAliasesForDeployment`  
  Lists all aliases that are associated with a given deployment, sorted by `CreateDate` DESC.
