import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const TEMPLATES_DIR = path.join(process.cwd(), '../templates');

// テンプレート一覧を取得
router.get('/', async (req, res) => {
  try {
    // templatesディレクトリのすべてのJSONファイルを読み込む
    const files = await fs.readdir(TEMPLATES_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const templates = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        
        // 配列の場合は展開、オブジェクトの場合はそのまま追加
        if (Array.isArray(data)) {
          templates.push(...data);
        } else {
          templates.push(data);
        }
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
      }
    }
    
    res.json(templates);
  } catch (error) {
    console.error('Failed to load templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// テンプレートを保存
router.post('/', async (req, res) => {
  try {
    const template = req.body;
    
    if (!template.id || !template.name) {
      return res.status(400).json({ error: 'Template must have id and name' });
    }
    
    // ファイル名を生成（特殊文字を除去）
    const sanitizedName = template.name.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/g, '-');
    const fileName = `template-${sanitizedName}-${Date.now()}.json`;
    const filePath = path.join(TEMPLATES_DIR, fileName);
    
    // テンプレートを保存
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
    
    res.json({ 
      message: 'Template saved successfully', 
      fileName,
      template 
    });
  } catch (error) {
    console.error('Failed to save template:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// テンプレートを更新
router.put('/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    const updatedTemplate = req.body;
    
    // 既存のファイルを探す
    const files = await fs.readdir(TEMPLATES_DIR);
    let targetFile = null;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        
        if (data.id === templateId || (Array.isArray(data) && data.some(t => t.id === templateId))) {
          targetFile = file;
          break;
        }
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // ファイルを更新
    const filePath = path.join(TEMPLATES_DIR, targetFile);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      // 配列の場合は該当するテンプレートを更新
      const index = data.findIndex(t => t.id === templateId);
      if (index !== -1) {
        data[index] = { ...data[index], ...updatedTemplate, updatedAt: new Date().toISOString() };
      }
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } else {
      // 単一オブジェクトの場合
      const updated = { ...data, ...updatedTemplate, updatedAt: new Date().toISOString() };
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    }
    
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Failed to update template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// テンプレートを削除
router.delete('/:id', async (req, res) => {
  try {
    const templateId = req.params.id;
    
    // 既存のファイルを探す
    const files = await fs.readdir(TEMPLATES_DIR);
    let targetFile = null;
    let isArrayFile = false;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
        const data = JSON.parse(content);
        
        if (data.id === templateId) {
          targetFile = file;
          break;
        } else if (Array.isArray(data) && data.some(t => t.id === templateId)) {
          targetFile = file;
          isArrayFile = true;
          break;
        }
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const filePath = path.join(TEMPLATES_DIR, targetFile);
    
    if (isArrayFile) {
      // 配列の場合は該当するテンプレートを削除
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      const filtered = data.filter((t: any) => t.id !== templateId);
      
      if (filtered.length === 0) {
        // 空になったらファイルを削除
        await fs.unlink(filePath);
      } else {
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
      }
    } else {
      // 単一オブジェクトの場合はファイルごと削除
      await fs.unlink(filePath);
    }
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;