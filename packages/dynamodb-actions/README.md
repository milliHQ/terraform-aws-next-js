# DynamoDB actions

This package describes the actions that can be performed on the DynamoDB data model.

## Tables

The design consists of the following tables:

### DeploymentTable

| Entity     | PK          | SK             |
| ---------- | ----------- | -------------- |
| Deployment | DEPLOYMENTS | D#&lt;D-id&gt; |

#### GSI1: CreateDateIndex

Allows to get all deployments sorted by Date.
Only the listed attributes are available (ProjectionType: INCLUDE).

<table>
  <thead>
    <tr>
      <td colspan="2">Primary Key</td>
      <td>Attributes</td>
    </tr>
    <tr>
      <td>PK</td>
      <td>GSI1SK</td>
      <td></td>
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

## Actions

The following actions on the database are supported:

- ListDeployments  
  Lists all deployments from the DeploymentTable, sort by `CreateDate` DESC.
- CreateDeployment  
  Inserts a new deployment into the DeploymentTable.
- ListAliasesForDeployment  
  Lists all aliases that are associated with a given deployment, sort by `CreateDate` DESC.
