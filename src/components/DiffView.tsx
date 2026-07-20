import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewProps {
  oldData: any;
  newData: any;
  isDarkTheme: boolean;
}

export const DiffView: React.FC<DiffViewProps> = ({ oldData, newData, isDarkTheme }) => {
  const oldStr = typeof oldData === 'object' ? JSON.stringify(oldData, null, 2) : String(oldData || '');
  const newStr = typeof newData === 'object' ? JSON.stringify(newData, null, 2) : String(newData || '');

  return (
    <div className="w-full h-full overflow-auto text-xs font-mono">
      <ReactDiffViewer 
        oldValue={oldStr} 
        newValue={newStr} 
        splitView={true}
        useDarkTheme={isDarkTheme}
        leftTitle="History Response"
        rightTitle="Current Response"
      />
    </div>
  );
};
