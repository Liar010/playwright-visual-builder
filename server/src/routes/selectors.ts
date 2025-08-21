import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

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

// エクスポート用エンドポイント - 全セレクタまたはカテゴリ別
router.get('/export/all', async (req, res) => {
  try {
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    const exportData: CategorizedSelectors = {
      version: '2.0',
      categories: {}
    };
    
    // flowsディレクトリ内のディレクトリを取得
    const entries = await fs.readdir(flowsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const selectorsFile = path.join(flowsDir, entry.name, 'selectors.json');
        try {
          const content = await fs.readFile(selectorsFile, 'utf-8');
          const data = JSON.parse(content);
          
          // v2.0形式の場合
          if (data.version === '2.0' && data.categories) {
            Object.entries(data.categories).forEach(([category, labels]: [string, any]) => {
              if (!exportData.categories[category]) {
                exportData.categories[category] = {};
              }
              Object.entries(labels).forEach(([label, selectorData]: [string, any]) => {
                exportData.categories[category][label] = selectorData;
              });
            });
          }
          // 旧形式の場合
          else if (data.selectors) {
            if (!exportData.categories.default) {
              exportData.categories.default = {};
            }
            Object.entries(data.selectors).forEach(([label, selectorData]: [string, any]) => {
              exportData.categories.default[label] = selectorData;
            });
          }
        } catch (error) {
          // ファイルが存在しない場合はスキップ
        }
      }
    }
    
    // タイムスタンプ付きのファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `selectors_export_${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportDate: new Date().toISOString(),
      data: exportData
    });
  } catch (error) {
    console.error('Failed to export selectors:', error);
    res.status(500).json({ error: 'Failed to export selectors' });
  }
});

// カテゴリ別エクスポート
router.get('/export/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    const exportData: CategorizedSelectors = {
      version: '2.0',
      categories: {}
    };
    
    // flowsディレクトリ内のディレクトリを取得
    const entries = await fs.readdir(flowsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const selectorsFile = path.join(flowsDir, entry.name, 'selectors.json');
        try {
          const content = await fs.readFile(selectorsFile, 'utf-8');
          const data = JSON.parse(content);
          
          // v2.0形式の場合
          if (data.version === '2.0' && data.categories && data.categories[category]) {
            if (!exportData.categories[category]) {
              exportData.categories[category] = {};
            }
            Object.entries(data.categories[category]).forEach(([label, selectorData]: [string, any]) => {
              exportData.categories[category][label] = selectorData;
            });
          }
          // 旧形式でcategoryがdefaultの場合
          else if (category === 'default' && data.selectors) {
            if (!exportData.categories.default) {
              exportData.categories.default = {};
            }
            Object.entries(data.selectors).forEach(([label, selectorData]: [string, any]) => {
              exportData.categories.default[label] = selectorData;
            });
          }
        } catch (error) {
          // ファイルが存在しない場合はスキップ
        }
      }
    }
    
    // タイムスタンプ付きのファイル名を生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `selectors_${category}_${timestamp}.json`;
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportDate: new Date().toISOString(),
      category: category,
      data: exportData
    });
  } catch (error) {
    console.error('Failed to export category selectors:', error);
    res.status(500).json({ error: 'Failed to export category selectors' });
  }
});

// バックアップを作成
async function createBackup(flowsDirParam?: string): Promise<string> {
  const flowsDir = flowsDirParam || (process.env.NODE_ENV === 'production' 
    ? path.resolve(process.cwd(), 'flows')
    : path.resolve(process.cwd(), '../flows'));
  const backupDir = path.join(flowsDir, '.backups');
  await fs.mkdir(backupDir, { recursive: true });
  
  // YYYY-MM-DD-HHmmss形式のタイムスタンプ
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const backupFile = path.join(backupDir, `selectors_backup_${timestamp}.json`);
  
  // 現在の全セレクタをバックアップ
  const currentData: CategorizedSelectors = {
    version: '2.0',
    categories: {}
  };
  
  const entries = await fs.readdir(flowsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '.backups') {
      const selectorsFile = path.join(flowsDir, entry.name, 'selectors.json');
      try {
        const content = await fs.readFile(selectorsFile, 'utf-8');
        const data = JSON.parse(content);
        if (data.version === '2.0' && data.categories) {
          Object.entries(data.categories).forEach(([category, labels]: [string, any]) => {
            if (!currentData.categories[category]) {
              currentData.categories[category] = {};
            }
            Object.entries(labels).forEach(([label, selectorData]: [string, any]) => {
              currentData.categories[category][label] = selectorData;
            });
          });
        }
      } catch (error) {
        // スキップ
      }
    }
  }
  
  await fs.writeFile(backupFile, JSON.stringify({
    backupDate: new Date().toISOString(),
    data: currentData
  }, null, 2));
  
  return timestamp;
}

// インポート（安全モード - 既存データを上書きしない）
router.post('/import', async (req, res) => {
  try {
    const { data, mode = 'safe' } = req.body;
    
    if (mode !== 'safe') {
      return res.status(400).json({ error: 'Only safe mode import is supported' });
    }
    
    // エクスポートされたファイルの構造をチェック
    let importData: CategorizedSelectors;
    if (data && data.data && data.data.version === '2.0') {
      // エクスポートされたファイルの構造
      importData = data.data;
    } else if (data && data.version === '2.0') {
      // 直接のセレクタデータ構造
      importData = data;
    } else {
      return res.status(400).json({ error: 'Invalid import data format' });
    }
    
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    // バックアップを作成
    const backupTimestamp = await createBackup(flowsDir);
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // defaultフローのセレクタファイルを読み込み
    const defaultFlowDir = path.join(flowsDir, 'default');
    const selectorsFile = path.join(defaultFlowDir, 'selectors.json');
    
    let currentData: CategorizedSelectors;
    try {
      const content = await fs.readFile(selectorsFile, 'utf-8');
      const fileData = JSON.parse(content);
      if (fileData.version === '2.0') {
        currentData = fileData;
      } else {
        currentData = {
          version: '2.0',
          categories: {
            default: fileData.selectors || {}
          }
        };
      }
    } catch (error) {
      currentData = {
        version: '2.0',
        categories: {}
      };
    }
    
    // 安全モードでインポート（既存データを上書きしない）
    Object.entries(importData.categories).forEach(([category, labels]) => {
      if (!currentData.categories[category]) {
        currentData.categories[category] = {};
      }
      
      Object.entries(labels).forEach(([label, selectorData]: [string, any]) => {
        if (!currentData.categories[category][label]) {
          // 新規追加
          currentData.categories[category][label] = selectorData;
          addedCount++;
        } else {
          // 既存のセレクタは保持、新しいセレクタのみ追加
          const existingSelectors = currentData.categories[category][label].selectors || {};
          const newSelectors = selectorData.selectors || {};
          
          Object.entries(newSelectors).forEach(([name, selector]) => {
            if (!existingSelectors[name]) {
              existingSelectors[name] = selector as string;
              addedCount++;
            } else {
              skippedCount++;
            }
          });
          
          currentData.categories[category][label].selectors = existingSelectors;
          currentData.categories[category][label].lastUpdated = new Date().toISOString();
        }
      });
    });
    
    // ディレクトリを作成
    await fs.mkdir(defaultFlowDir, { recursive: true });
    
    // 更新されたデータを保存
    await fs.writeFile(selectorsFile, JSON.stringify({
      flowId: 'default',
      ...currentData
    }, null, 2));
    
    res.json({
      success: true,
      backupTimestamp,
      stats: {
        added: addedCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('Failed to import selectors:', error);
    res.status(500).json({ error: 'Failed to import selectors' });
  }
});

// バックアップから復元
router.post('/restore/:timestamp', async (req, res) => {
  try {
    const { timestamp } = req.params;
    
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    const backupFile = path.join(flowsDir, '.backups', `selectors_backup_${timestamp}.json`);
    
    // バックアップファイルの存在確認
    try {
      await fs.access(backupFile);
    } catch (error) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // バックアップデータを読み込み
    const backupContent = await fs.readFile(backupFile, 'utf-8');
    const backupData = JSON.parse(backupContent);
    
    // 現在のデータをバックアップ
    const currentBackupTimestamp = await createBackup(flowsDir);
    
    // バックアップデータで復元
    const defaultFlowDir = path.join(flowsDir, 'default');
    const selectorsFile = path.join(defaultFlowDir, 'selectors.json');
    
    await fs.mkdir(defaultFlowDir, { recursive: true });
    await fs.writeFile(selectorsFile, JSON.stringify({
      flowId: 'default',
      ...backupData.data
    }, null, 2));
    
    res.json({
      success: true,
      restoredFrom: timestamp,
      newBackupTimestamp: currentBackupTimestamp
    });
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    res.status(500).json({ error: 'Failed to restore from backup' });
  }
});

// バックアップ一覧を取得
router.get('/backups', async (req, res) => {
  try {
    const flowsDir = process.env.NODE_ENV === 'production' 
      ? path.resolve(process.cwd(), 'flows')
      : path.resolve(process.cwd(), '../flows');
    
    const backupDir = path.join(flowsDir, '.backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(f => f.startsWith('selectors_backup_') && f.endsWith('.json'))
        .map(f => {
          const timestamp = f.replace('selectors_backup_', '').replace('.json', '');
          // YYYY-MM-DD-HHmmss形式をパース
          const [datePart, timePart] = timestamp.split('-').reduce((acc, val, idx) => {
            if (idx < 3) acc[0].push(val);
            else acc[1] = val;
            return acc;
          }, [[], ''] as [string[], string]);
          
          const year = parseInt(datePart[0]);
          const month = parseInt(datePart[1]) - 1;
          const day = parseInt(datePart[2]);
          const hours = parseInt(timePart.substring(0, 2));
          const minutes = parseInt(timePart.substring(2, 4));
          const seconds = parseInt(timePart.substring(4, 6));
          
          const date = new Date(year, month, day, hours, minutes, seconds);
          
          return {
            timestamp,
            date: date.toISOString(),
            displayDate: date.toLocaleString('ja-JP')
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json(backups);
    } catch (error) {
      // バックアップディレクトリが存在しない場合
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// 特定フローのセレクタを取得（動的パラメータなので最後に定義）
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

// CategorizedSelectors型定義
interface CategorizedSelectors {
  version: '2.0';
  categories: {
    [category: string]: {
      [label: string]: {
        url: string;
        lastUpdated: string;
        selectors: Record<string, string>;
      };
    };
  };
}

export default router;