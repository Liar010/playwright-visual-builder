import { useState, useEffect, useMemo } from 'react';
import { Input, Select, Button, Space, Tooltip, Tag } from 'antd';
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import { SavedSelectors, getSelectorsByCategory } from '../services/selectorService';

const { Option, OptGroup } = Select;

interface SelectorInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  savedSelectors?: SavedSelectors;
  onReload?: () => void;
  loading?: boolean;
}

export default function SelectorInput({
  value,
  onChange,
  placeholder = 'セレクタを入力または選択',
  savedSelectors = {},
  onReload,
  loading = false
}: SelectorInputProps) {
  const [inputMode, setInputMode] = useState<'select' | 'manual'>('manual');
  const [localValue, setLocalValue] = useState(value || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // カテゴリとラベルのリストを取得
  const { categories, labels } = useMemo(() => {
    const categoryMap = getSelectorsByCategory(savedSelectors);
    const categoriesSet = new Set<string>();
    const labelsMap = new Map<string, Set<string>>();
    
    categoryMap.forEach((labelData, category) => {
      categoriesSet.add(category);
      if (!labelsMap.has(category)) {
        labelsMap.set(category, new Set());
      }
      labelData.forEach((_, label) => {
        labelsMap.get(category)!.add(label);
      });
    });
    
    return {
      categories: Array.from(categoriesSet),
      labels: labelsMap
    };
  }, [savedSelectors]);

  // 選択されたカテゴリのラベル一覧
  const availableLabels = useMemo(() => {
    if (selectedCategory === 'all') {
      const allLabels = new Set<string>();
      labels.forEach(labelSet => {
        labelSet.forEach(label => allLabels.add(label));
      });
      return Array.from(allLabels);
    }
    return Array.from(labels.get(selectedCategory) || []);
  }, [selectedCategory, labels]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'manual') {
      setInputMode('manual');
    } else {
      handleChange(selectedValue);
    }
  };

  // フィルター条件に基づいてセレクタをフィルタリング
  const filteredSelectors = useMemo(() => {
    const result: Array<{
      category: string;
      label: string;
      selectors: Map<string, string[]>;
    }> = [];
    
    const categoryMap = getSelectorsByCategory(savedSelectors);
    
    categoryMap.forEach((labelData, category) => {
      // カテゴリフィルター
      if (selectedCategory !== 'all' && category !== selectedCategory) {
        return;
      }
      
      labelData.forEach((data, label) => {
        // ラベルフィルター
        if (selectedLabel !== 'all' && label !== selectedLabel) {
          return;
        }
        
        if (data.selectors && Object.keys(data.selectors).length > 0) {
          const selectorMap = new Map<string, string[]>();
          
          Object.entries(data.selectors).forEach(([name, selector]) => {
            if (typeof selector === 'string') {
              // 検索フィルター
              if (searchText && 
                  !name.toLowerCase().includes(searchText.toLowerCase()) &&
                  !selector.toLowerCase().includes(searchText.toLowerCase())) {
                return;
              }
              
              if (!selectorMap.has(selector)) {
                selectorMap.set(selector, []);
              }
              selectorMap.get(selector)!.push(name);
            }
          });
          
          if (selectorMap.size > 0) {
            result.push({ category, label, selectors: selectorMap });
          }
        }
      });
    });
    
    return result;
  }, [savedSelectors, selectedCategory, selectedLabel, searchText]);

  // セレクタの選択肢を生成
  const renderSelectorOptions = () => {
    const options = [];
    
    filteredSelectors.forEach(({ category, label, selectors }) => {
      const groupLabel = category === 'default' ? `📁 ${label}` : `📁 ${category}/${label}`;
      
      options.push(
        <OptGroup key={`${category}/${label}`} label={groupLabel}>
          {Array.from(selectors.entries()).map(([selector, names]) => {
            // 最も短い名前を代表として使用
            const primaryName = names.sort((a, b) => a.length - b.length)[0];
            return (
              <Option key={`${category}/${label}/${selector}`} value={selector}>
                <Space>
                  <span style={{ fontWeight: 'bold' }}>{primaryName}</span>
                  <span style={{ color: '#888', fontSize: '12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selector}
                  </span>
                </Space>
              </Option>
            );
          })}
        </OptGroup>
      );
    });

    if (options.length === 0) {
      options.push(
        <Option key="no-selectors" value="manual" disabled>
          {searchText || selectedCategory !== 'all' || selectedLabel !== 'all' 
            ? 'フィルター条件に一致するセレクタがありません'
            : '保存されたセレクタがありません'}
        </Option>
      );
    }

    options.push(
      <Option key="manual" value="manual">
        📝 手動で入力...
      </Option>
    );

    return options;
  };

  // フィルターパネルのコンテンツ
  const filterContent = (
    <div 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Space direction="vertical" style={{ width: 250 }}>
        <div onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>カテゴリ</div>
          <Select
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);
              if (value !== 'all') {
                setSelectedLabel('all'); // カテゴリ変更時はラベルをリセット
              }
            }}
            style={{ width: '100%' }}
            size="small"
            getPopupContainer={(trigger) => trigger.parentElement!}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Option value="all">すべて</Option>
            {categories.map(cat => (
              <Option key={cat} value={cat}>{cat}</Option>
            ))}
          </Select>
        </div>
        
        <div onMouseDown={(e) => e.stopPropagation()}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>ラベル</div>
          <Select
            value={selectedLabel}
            onChange={setSelectedLabel}
            style={{ width: '100%' }}
            size="small"
            disabled={availableLabels.length === 0}
            getPopupContainer={(trigger) => trigger.parentElement!}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Option value="all">すべて</Option>
            {availableLabels.map(label => (
              <Option key={label} value={label}>{label}</Option>
            ))}
          </Select>
        </div>
        
        <div>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#666' }}>検索</div>
          <Input
            placeholder="名前やセレクタで検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            size="small"
            allowClear
          />
        </div>
        
        {(selectedCategory !== 'all' || selectedLabel !== 'all' || searchText) && (
          <Button 
            size="small" 
            onClick={() => {
              setSelectedCategory('all');
              setSelectedLabel('all');
              setSearchText('');
            }}
          >
            フィルターをクリア
          </Button>
        )}
      </Space>
    </div>
  );

  // アクティブなフィルター数を計算
  const activeFilterCount = 
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedLabel !== 'all' ? 1 : 0) +
    (searchText ? 1 : 0);

  return (
    <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
      {inputMode === 'manual' ? (
        <>
          <Input
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, minWidth: 0 }}
          />
          {Object.keys(savedSelectors).length > 0 && (
            <Button 
              onClick={() => setInputMode('select')}
              title="保存済みセレクタから選択"
              size="small"
            >
              選択
            </Button>
          )}
        </>
      ) : (
        <>
          <Select
            value={localValue || undefined}
            onChange={handleSelectChange}
            placeholder="セレクタを選択..."
            style={{ flex: 1, minWidth: 0 }}
            showSearch={false} // フィルター機能で代替
            open={dropdownOpen}
            onDropdownVisibleChange={setDropdownOpen}
            dropdownRender={(menu) => (
              <div onMouseDown={(e) => e.preventDefault()}>
                <div style={{ 
                  padding: '8px', 
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Button 
                    size="small" 
                    icon={<FilterOutlined />}
                    style={{ position: 'relative' }}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    フィルター
                    {activeFilterCount > 0 && (
                      <Tag 
                        color="blue" 
                        style={{ 
                          position: 'absolute', 
                          top: -10, 
                          right: -10,
                          padding: '0 4px',
                          fontSize: 10,
                          minWidth: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {activeFilterCount}
                      </Tag>
                    )}
                  </Button>
                  {activeFilterCount > 0 && !showFilters && (
                    <Space size={4}>
                      {selectedCategory !== 'all' && (
                        <Tag closable onClose={() => setSelectedCategory('all')}>
                          {selectedCategory}
                        </Tag>
                      )}
                      {selectedLabel !== 'all' && (
                        <Tag closable onClose={() => setSelectedLabel('all')}>
                          {selectedLabel}
                        </Tag>
                      )}
                      {searchText && (
                        <Tag closable onClose={() => setSearchText('')}>
                          "{searchText}"
                        </Tag>
                      )}
                    </Space>
                  )}
                </div>
                {showFilters && (
                  <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    {filterContent}
                  </div>
                )}
                {menu}
              </div>
            )}
          >
            {renderSelectorOptions()}
          </Select>
          <Button onClick={() => setInputMode('manual')}>
            手動
          </Button>
        </>
      )}
      {onReload && (
        <Tooltip title="セレクタを再読み込み">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={onReload}
            loading={loading}
          />
        </Tooltip>
      )}
    </div>
  );
}