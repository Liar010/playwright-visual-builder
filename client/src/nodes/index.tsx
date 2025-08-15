import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeType } from '@playwright-visual-builder/shared';
import ConditionNode from './ConditionNode';
import LoopNode from './LoopNode';

interface CustomNodeData {
  label: string;
  action?: any;
  assertion?: any;
  condition?: any;
}

interface CustomNodeProps extends NodeProps<CustomNodeData> {
  type: string;
}

const CustomNode = memo(({ data, type }: CustomNodeProps) => {
  const getNodeDetails = () => {
    switch (type as NodeType) {
      case 'navigate':
        return data.action?.url || 'Enter URL';
      case 'click':
      case 'fill':
        return data.action?.selector || 'Enter selector';
      case 'assertion':
        return data.assertion?.selector || 'Enter selector';
      case 'wait':
        return `${data.action?.timeout || 1000}ms`;
      case 'waitForHidden':
        return data.action?.selector || 'Enter selector';
      default:
        return null;
    }
  };

  const details = getNodeDetails();

  return (
    <div className={`custom-node ${type}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-label">{data.label}</div>
      {details && <div className="node-detail">{details}</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export const nodeTypes = {
  // Navigation
  navigate: CustomNode,
  goBack: CustomNode,
  goForward: CustomNode,
  reload: CustomNode,
  // Mouse Actions
  click: CustomNode,
  doubleClick: CustomNode,
  rightClick: CustomNode,
  hover: CustomNode,
  dragAndDrop: CustomNode,
  // Input Actions
  fill: CustomNode,
  select: CustomNode,
  check: CustomNode,
  uploadFile: CustomNode,
  focus: CustomNode,
  blur: CustomNode,
  keyboard: CustomNode,
  scroll: CustomNode,
  // Wait Actions
  wait: CustomNode,
  waitForHidden: CustomNode,
  waitForURL: CustomNode,
  waitForLoadState: CustomNode,
  waitForResponse: CustomNode,
  waitForRequest: CustomNode,
  waitForFunction: CustomNode,
  // Assertions & Get
  assertion: CustomNode,
  getText: CustomNode,
  getAttribute: CustomNode,
  getCount: CustomNode,
  isEnabled: CustomNode,
  isDisabled: CustomNode,
  isChecked: CustomNode,
  isVisible: CustomNode,
  // Browser Actions
  newPage: CustomNode,
  switchTab: CustomNode,
  setCookie: CustomNode,
  localStorage: CustomNode,
  // Advanced
  screenshot: CustomNode,
  iframe: CustomNode,
  dialog: CustomNode,
  download: CustomNode,
  condition: ConditionNode,
  loop: LoopNode,
};