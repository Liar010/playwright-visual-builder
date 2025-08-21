import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// 特定フローのセレクタを取得
router.get('/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const selectorsFile = path.join(
      process.env.NODE_ENV === 'production' 
        ? path.resolve(process.cwd(), 'flows')
        : path.resolve(process.cwd(), '../flows'),
      flowId,
      'selectors.json'
    );
    
    try {
      const content = await fs.readFile(selectorsFile, 'utf-8');
      const data = JSON.parse(content);
      // v2.0形式の場合はそのまま返す、旧形式の場合はselectors部分を返す
      if (data.version === '2.0') {
        res.json(data);
      } else {
        res.json(data.selectors || data || {});
      }
    } catch (error) {
      // ファイルが存在しない場合は空のオブジェクトを返す
      res.json({});
    }
  } catch (error) {
    console.error('Failed to load selectors:', error);
    res.status(500).json({ error: 'Failed to load selectors' });
  }
});

// すべてのフローのセレクタを取得
router.get('/', async (req, res) => {
  try {
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    const allSelectors: Record<string, any> = {};
    
    // flowsディレクトリ内のディレクトリを取得
    const entries = await fs.readdir(flowsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const selectorsFile = path.join(flowsDir, entry.name, 'selectors.json');
        try {
          const content = await fs.readFile(selectorsFile, 'utf-8');
          const data = JSON.parse(content);
          if (data.selectors) {
            allSelectors[entry.name] = data.selectors;
          }
        } catch (error) {
          // ファイルが存在しない場合はスキップ
        }
      }
    }
    
    res.json(allSelectors);
  } catch (error) {
    console.error('Failed to load selectors:', error);
    res.status(500).json({ error: 'Failed to load selectors' });
  }
});

// フローのセレクタを更新
router.put('/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const selectors = req.body;
    
    const baseDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    const flowDir = path.join(baseDir, flowId);
    const selectorsFile = path.join(flowDir, 'selectors.json');
    
    // ディレクトリを作成
    await fs.mkdir(flowDir, { recursive: true });
    
    // セレクタファイルを更新
    const data = {
      flowId,
      selectors
    };
    
    await fs.writeFile(selectorsFile, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating selectors:', error);
    res.status(500).json({ error: 'Failed to update selectors' });
  }
});

// 特定のラベルグループを削除
router.delete('/:flowId/:label', async (req, res) => {
  try {
    const { flowId, label } = req.params;
    
    const baseDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    const selectorsFile = path.join(baseDir, flowId, 'selectors.json');
    
    // 既存のデータを読み込み
    const content = await fs.readFile(selectorsFile, 'utf-8');
    const data = JSON.parse(content);
    
    // ラベルを削除
    if (data.selectors && data.selectors[label]) {
      delete data.selectors[label];
      await fs.writeFile(selectorsFile, JSON.stringify(data, null, 2));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting selector group:', error);
    res.status(500).json({ error: 'Failed to delete selector group' });
  }
});

// 特定のセレクタを削除
router.delete('/:flowId/:label/:selectorName', async (req, res) => {
  try {
    const { flowId, label, selectorName } = req.params;
    
    const baseDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    const selectorsFile = path.join(baseDir, flowId, 'selectors.json');
    
    // 既存のデータを読み込み
    const content = await fs.readFile(selectorsFile, 'utf-8');
    const data = JSON.parse(content);
    
    // セレクタを削除
    if (data.selectors && data.selectors[label] && data.selectors[label].selectors) {
      delete data.selectors[label].selectors[selectorName];
      
      // セレクタが空になったらラベル全体を削除
      if (Object.keys(data.selectors[label].selectors).length === 0) {
        delete data.selectors[label];
      }
      
      await fs.writeFile(selectorsFile, JSON.stringify(data, null, 2));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting selector:', error);
    res.status(500).json({ error: 'Failed to delete selector' });
  }
});

export default router;