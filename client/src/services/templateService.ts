import axios from 'axios';
import { Template } from '../components/TemplateManager';

const API_BASE = '/api/templates';

export const templateService = {
  // すべてのテンプレートを取得（ファイルベース）
  async getAllTemplates(): Promise<Template[]> {
    try {
      const response = await axios.get(API_BASE);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return [];
    }
  },

  // テンプレートを保存（ファイルとして）
  async saveTemplate(template: Template): Promise<void> {
    try {
      await axios.post(API_BASE, template);
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  },

  // テンプレートを更新
  async updateTemplate(id: string, template: Partial<Template>): Promise<void> {
    try {
      await axios.put(`${API_BASE}/${id}`, template);
    } catch (error) {
      console.error('Failed to update template:', error);
      throw error;
    }
  },

  // テンプレートを削除
  async deleteTemplate(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE}/${id}`);
    } catch (error) {
      console.error('Failed to delete template:', error);
      throw error;
    }
  },

  // LocalStorageからファイルベースへの移行
  async migrateFromLocalStorage(): Promise<number> {
    try {
      const localTemplates = localStorage.getItem('flowTemplates');
      if (!localTemplates) return 0;

      const templates = JSON.parse(localTemplates);
      let migrated = 0;

      // 既存のテンプレートを取得
      const existingTemplates = await this.getAllTemplates();
      const existingIds = new Set(existingTemplates.map(t => t.id));

      // 重複しないテンプレートのみ保存
      for (const template of templates) {
        if (!existingIds.has(template.id)) {
          await this.saveTemplate(template);
          migrated++;
        }
      }

      // 移行完了後、LocalStorageをクリア
      if (migrated > 0) {
        localStorage.removeItem('flowTemplates');
        localStorage.setItem('templates_migrated', 'true');
      }

      return migrated;
    } catch (error) {
      console.error('Failed to migrate templates:', error);
      return 0;
    }
  }
};