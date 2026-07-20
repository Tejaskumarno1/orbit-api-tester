import React from "react";

export const TableView: React.FC<{ data: any }> = ({ data }) => {
  let arrayData: any[] = [];
  
  if (Array.isArray(data)) {
    arrayData = data;
  } else if (data && typeof data === "object" && Array.isArray(data.data)) {
    arrayData = data.data;
  }

  if (!arrayData || arrayData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
        No tabular data available to display.
      </div>
    );
  }

  const firstItem = arrayData[0];
  if (typeof firstItem !== "object" || firstItem === null) {
    return (
      <div className="flex items-center justify-center h-full text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
        Data is not a list of objects.
      </div>
    );
  }

  const columns = Object.keys(firstItem);

  return (
    <div className="overflow-x-auto w-full h-full rounded-lg" style={{ border: '1px solid var(--border-primary)' }}>
      <table className="w-full text-left text-xs" style={{ color: 'var(--text-primary)' }}>
        <thead className="text-xs uppercase sticky top-0 z-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 font-semibold whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arrayData.map((row, i) => (
            <tr key={i} className="transition-colors" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
              {columns.map((col) => {
                const val = row[col];
                let displayVal = val;
                if (typeof val === "object" && val !== null) displayVal = JSON.stringify(val);
                else if (val === null) displayVal = "null";
                else if (val === undefined) displayVal = "";
                
                return (
                  <td key={col} className="px-4 py-3 max-w-[200px] truncate" title={String(displayVal)}>
                    {String(displayVal)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
