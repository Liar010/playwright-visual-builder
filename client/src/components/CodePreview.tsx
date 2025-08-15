import { useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import Editor from '@monaco-editor/react';
import { generatePlaywrightCode } from '../utils/codeGenerator';

interface CodePreviewProps {
  nodes: Node[];
  edges: Edge[];
}

export default function CodePreview({ nodes, edges }: CodePreviewProps) {
  const code = useMemo(() => {
    return generatePlaywrightCode(nodes, edges);
  }, [nodes, edges]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #e8e8e8',
          fontWeight: 500,
        }}
      >
        生成されたPlaywrightコード
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          language="typescript"
          value={code}
          theme="vs-light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}