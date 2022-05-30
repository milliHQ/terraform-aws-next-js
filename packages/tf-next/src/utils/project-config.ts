import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join as pathJoin } from 'path';

import Ajv, { Schema } from 'ajv';

const CONFIG_DIR = '.next-tf';
const CONFIG_DIR_PROJECT_FILE = 'project.json';

const projectSchema: Schema = {
  type: 'object',
  properties: {
    apiEndpoint: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['apiEndpoint'],
};

type ProjectConfig = {
  apiEndpoint: string;
};

function readProjectConfig(cwd: string): ProjectConfig | null {
  const configPath = pathJoin(cwd, CONFIG_DIR, CONFIG_DIR_PROJECT_FILE);
  const configExists = existsSync(configPath);
  if (configExists) {
    try {
      const projectFileRaw = readFileSync(configPath, 'utf-8');
      const projectFileContent = JSON.parse(projectFileRaw);
      const ajv = new Ajv();
      const validate = ajv.compile<ProjectConfig>(projectSchema);

      if (validate(projectFileContent)) {
        return projectFileContent;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

function writeProjectConfig(cwd: string, projectConfig: ProjectConfig) {
  const configPath = pathJoin(cwd, CONFIG_DIR, CONFIG_DIR_PROJECT_FILE);
  writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
}

export { readProjectConfig, writeProjectConfig };
