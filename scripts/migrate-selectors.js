#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * セレクタファイルを新形式（v2.0）に移行するスクリプト
 */
async function migrateSelectors() {
  const flowsDir = path.join(__dirname, '..', 'flows');
  
  try {
    // flowsディレクトリ内のすべてのフローを処理
    const flows = await fs.readdir(flowsDir);
    
    for (const flowId of flows) {
      const flowPath = path.join(flowsDir, flowId);
      const stat = await fs.stat(flowPath);
      
      if (stat.isDirectory()) {
        const selectorsFile = path.join(flowPath, 'selectors.json');
        
        try {
          // セレクタファイルを読み込み
          const content = await fs.readFile(selectorsFile, 'utf-8');
          const data = JSON.parse(content);
          
          // すでに新形式の場合はスキップ
          if (data.version === '2.0') {
            console.log(`✅ ${flowId}/selectors.json is already v2.0`);
            continue;
          }
          
          // 旧形式から新形式に変換
          const oldSelectors = data.selectors || {};
          const newData = {
            version: '2.0',
            flowId: data.flowId || flowId,
            categories: {
              default: oldSelectors
            }
          };
          
          // バックアップを作成
          const backupFile = path.join(flowPath, 'selectors.backup.json');
          await fs.writeFile(backupFile, content);
          console.log(`📁 Created backup: ${flowId}/selectors.backup.json`);
          
          // 新形式で保存
          await fs.writeFile(selectorsFile, JSON.stringify(newData, null, 2));
          console.log(`✨ Migrated ${flowId}/selectors.json to v2.0`);
          
          // カテゴリ情報を表示
          const categoryCount = Object.keys(newData.categories).length;
          const selectorCount = Object.keys(oldSelectors).length;
          console.log(`   Categories: ${categoryCount}, Selectors: ${selectorCount}`);
          
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(`⏭️  No selectors.json in ${flowId}`);
          } else {
            console.error(`❌ Error processing ${flowId}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n✅ Migration complete!');
    console.log('💡 Backup files created with .backup.json extension');
    console.log('💡 To restore: rename selectors.backup.json to selectors.json');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 実行
migrateSelectors();