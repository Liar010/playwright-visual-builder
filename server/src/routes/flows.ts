import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'yaml';
import type { TestFlow } from '@playwright-visual-builder/shared';

const router = Router();
const FLOWS_DIR = path.join(process.cwd(), '../flows');

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(FLOWS_DIR);
    const flows = await Promise.all(
      files
        .filter((f) => f.endsWith('.json') || f.endsWith('.yaml'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(FLOWS_DIR, file), 'utf-8');
          if (file.endsWith('.yaml')) {
            return yaml.parse(content);
          }
          return JSON.parse(content);
        })
    );
    res.json(flows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load flows' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jsonPath = path.join(FLOWS_DIR, `${id}.json`);
    const yamlPath = path.join(FLOWS_DIR, `${id}.yaml`);

    try {
      const content = await fs.readFile(jsonPath, 'utf-8');
      res.json(JSON.parse(content));
    } catch {
      const content = await fs.readFile(yamlPath, 'utf-8');
      res.json(yaml.parse(content));
    }
  } catch (error) {
    res.status(404).json({ error: 'Flow not found' });
  }
});

router.post('/', async (req, res) => {
  try {
    const flow: TestFlow = {
      id: `flow-${Date.now()}`,
      name: req.body.name || 'Untitled Flow',
      description: req.body.description,
      nodes: req.body.nodes || [],
      edges: req.body.edges || [],
      config: req.body.config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const format = req.query.format || 'json';
    const filename = `${flow.id}.${format}`;
    const filepath = path.join(FLOWS_DIR, filename);

    if (format === 'yaml') {
      await fs.writeFile(filepath, yaml.stringify(flow), 'utf-8');
    } else {
      await fs.writeFile(filepath, JSON.stringify(flow, null, 2), 'utf-8');
    }

    res.status(201).json({ ...flow, file: filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save flow' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jsonPath = path.join(FLOWS_DIR, `${id}.json`);
    const yamlPath = path.join(FLOWS_DIR, `${id}.yaml`);

    let existingPath: string;
    let format: string;

    try {
      await fs.access(jsonPath);
      existingPath = jsonPath;
      format = 'json';
    } catch {
      await fs.access(yamlPath);
      existingPath = yamlPath;
      format = 'yaml';
    }

    const flow: TestFlow = {
      ...req.body,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (format === 'yaml') {
      await fs.writeFile(existingPath, yaml.stringify(flow), 'utf-8');
    } else {
      await fs.writeFile(existingPath, JSON.stringify(flow, null, 2), 'utf-8');
    }

    res.json(flow);
  } catch (error) {
    res.status(404).json({ error: 'Flow not found' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const jsonPath = path.join(FLOWS_DIR, `${id}.json`);
    const yamlPath = path.join(FLOWS_DIR, `${id}.yaml`);

    try {
      await fs.unlink(jsonPath);
    } catch {
      await fs.unlink(yamlPath);
    }

    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: 'Flow not found' });
  }
});

export default router;