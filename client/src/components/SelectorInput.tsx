import { useState, useEffect } from 'react';
import { Input, Select, Button, Space, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
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

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

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

  // セレクタの選択肢を生成
  const renderSelectorOptions = () => {
    const options = [];
    
    const categoryMap = getSelectorsByCategory(savedSelectors);
    
    categoryMap.forEach((labels, category) => {
      labels.forEach((data, label) => {
        if (data.selectors && Object.keys(data.selectors).length > 0) {
          // セレクタごとに名前をグループ化（重複を除去）
          const selectorMap = new Map<string, string[]>();
          
          Object.entries(data.selectors).forEach(([name, selector]) => {
            if (typeof selector === 'string') {
              if (!selectorMap.has(selector)) {
                selectorMap.set(selector, []);
              }
              selectorMap.get(selector)!.push(name);
            }
          });
          
          const groupLabel = category === 'default' ? `📁 ${label}` : `📁 ${category}/${label}`;
          
          options.push(
            <OptGroup key={`${category}/${label}`} label={groupLabel}>
              {Array.from(selectorMap.entries()).map(([selector, names]) => {
                // 最も短い名前を代表として使用
                const primaryName = names.sort((a, b) => a.length - b.length)[0];
                return (
                  <Option key={`${category}/${label}/${selector}`} value={selector}>
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{primaryName}</span>
                      <span style={{ color: '#888', fontSize: '12px' }}>{selector}</span>
                    </Space>
                  </Option>
                );
              })}
            </OptGroup>
          );
        }
      });
    });

    if (options.length === 0) {
      options.push(
        <Option key="no-selectors" value="manual" disabled>
          保存されたセレクタがありません
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
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) => {
              const children = option?.children as any;
              if (typeof children === 'string') {
                return children.toLowerCase().includes(input.toLowerCase());
              }
              // Space内のテキストを取得
              if (children && typeof children === 'object' && 'props' in children) {
                const props = (children as any).props;
                if (props && props.children) {
                  return props.children.some((child: any) => {
                    if (typeof child === 'string') {
                      return child.toLowerCase().includes(input.toLowerCase());
                    }
                    if (child && child.props && typeof child.props.children === 'string') {
                      return child.props.children.toLowerCase().includes(input.toLowerCase());
                    }
                    return false;
                  });
                }
              }
              return false;
            }}
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