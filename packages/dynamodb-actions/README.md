# DynamoDB actions

This package describes the actions that can be performed on the DynamoDB data model.

## Tables

The design consists of the following tables:

### DeploymentTable

| Entity     | PK          | SK             | GSI1SK                            |
| ---------- | ----------- | -------------- | --------------------------------- |
| Deployment | DEPLOYMENTS | D#&lt;D-id&gt; | &lt;CreateDate&gt;#D#&lt;D-id&gt; |

#### GSI1: CreateDateIndex

Allows to get all deployments sorted by Date.
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
      <td>DEPLOYMENTS</td>
      <td>&lt;CreateDate&gt;#D#&lt;D-id&gt;</td>
      <td>DeploymentId</td>
      <td>CreateDate</td>
      <td>Status</td>
      <td>DeploymentAlias</td>
    </tr>
  </tbody>
</table>

### AliasTable

| Entity | PK               | SK               |
| ------ | ---------------- | ---------------- |
| Alias  | &lt;hostname&gt; | &lt;basePath&gt; |

## Actions

The following actions on the database are supported:

- ListDeployments  
  Lists all deployments from the DeploymentTable, sort by `CreateDate` DESC.
- CreateDeployment  
  Inserts a new deployment into the DeploymentTable.
- GetDeploymentById  
  Returns the Deployment for the given ID. Returns `null` when it does not exist.
- ListAliasesForDeployment  
  Lists all aliases that are associated with a given deployment, sort by `CreateDate` DESC.
