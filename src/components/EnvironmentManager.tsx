import React, { useState } from "react";
import { Environment, EnvironmentVariable } from "../types";
import { Plus, Trash2, X, Check } from "lucide-react";

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  onChangeEnvironments: (envs: Environment[]) => void;
  activeEnvironmentId: string | null;
  onChangeActiveEnvironment: (id: string | null) => void;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  isOpen,
  onClose,
  environments,
  onChangeEnvironments,
  activeEnvironmentId,
  onChangeActiveEnvironment,
}) => {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(environments[0]?.id || null);

  if (!isOpen) return null;

  const createEnvironment = () => {
    const newEnv: Environment = {
      id: Math.random().toString(),
      name: "New Environment",
      variables: [],
    };
    onChangeEnvironments([...environments, newEnv]);
    setSelectedEnvId(newEnv.id);
  };

  const deleteEnvironment = (id: string) => {
    const newEnvs = environments.filter(e => e.id !== id);
    onChangeEnvironments(newEnvs);
    if (selectedEnvId === id) setSelectedEnvId(newEnvs[0]?.id || null);
    if (activeEnvironmentId === id) onChangeActiveEnvironment(null);
  };

  const updateEnvironmentName = (id: string, name: string) => {
    onChangeEnvironments(environments.map(e => e.id === id ? { ...e, name } : e));
  };

  const addVariable = (envId: string) => {
    onChangeEnvironments(environments.map(e => {
      if (e.id !== envId) return e;
      return {
        ...e,
        variables: [...e.variables, { id: Math.random().toString(), key: "", value: "", enabled: true }]
      };
    }));
  };

  const updateVariable = (envId: string, varId: string, field: keyof EnvironmentVariable, value: any) => {
    onChangeEnvironments(environments.map(e => {
      if (e.id !== envId) return e;
      return {
        ...e,
        variables: e.variables.map(v => v.id === varId ? { ...v, [field]: value } : v)
      };
    }));
  };

  const removeVariable = (envId: string, varId: string) => {
    onChangeEnvironments(environments.map(e => {
      if (e.id !== envId) return e;
      return {
        ...e,
        variables: e.variables.filter(v => v.id !== varId)
      };
    }));
  };

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animation-fade-in">
      <div className="w-[800px] h-[600px] max-w-[95vw] max-h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div>
            <h2 className="text-lg font-bold">Manage Environments</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Use {"{{variable_name}}"} in your URLs, headers, and body payloads.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel: Environment List */}
          <div className="w-1/3 flex flex-col overflow-y-auto" style={{ borderRight: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)' }}>
            <div className="p-4 flex-1 flex flex-col gap-2">
              {environments.map(env => (
                <div 
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border`}
                  style={{
                    background: selectedEnvId === env.id ? 'var(--bg-primary)' : 'transparent',
                    borderColor: selectedEnvId === env.id ? 'var(--accent)' : 'transparent',
                    boxShadow: selectedEnvId === env.id ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold truncate">{env.name}</span>
                    <span className="text-[10px] font-mono mt-1 opacity-70">{env.variables.length} variables</span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeEnvironmentId !== env.id ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onChangeActiveEnvironment(env.id); }}
                        className="p-1.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                        title="Set as Active"
                      >
                        <Check size={14} style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    ) : (
                      <div className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Active</div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }}
                      className="p-1.5 rounded hover:bg-red-500/10 text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={createEnvironment}
                className="flex items-center justify-center gap-2 p-3 mt-2 rounded-xl border border-dashed transition-colors"
                style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}
              >
                <Plus size={16} /> New Environment
              </button>
            </div>
          </div>

          {/* Right Panel: Variable Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedEnv ? (
              <>
                <div className="p-6 pb-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <input 
                    type="text" 
                    value={selectedEnv.name}
                    onChange={(e) => updateEnvironmentName(selectedEnv.id, e.target.value)}
                    className="w-full text-xl font-bold bg-transparent outline-none"
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
                  <div className="flex justify-between text-[10px] font-mono font-bold tracking-wider uppercase pb-2" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                    <span className="w-1/3">Variable Key</span>
                    <span className="flex-1">Value</span>
                    <span className="w-8"></span>
                  </div>
                  
                  {selectedEnv.variables.map(v => (
                    <div key={v.id} className="flex gap-3 items-center">
                      <input 
                        type="checkbox" 
                        checked={v.enabled}
                        onChange={(e) => updateVariable(selectedEnv.id, v.id, "enabled", e.target.checked)}
                        className="accent-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <input 
                        type="text"
                        value={v.key}
                        onChange={(e) => updateVariable(selectedEnv.id, v.id, "key", e.target.value)}
                        placeholder="API_KEY"
                        className="w-1/3 text-sm px-3 py-2 rounded-lg font-mono outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-secondary)' }}
                      />
                      <input 
                        type="text"
                        value={v.value}
                        onChange={(e) => updateVariable(selectedEnv.id, v.id, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 text-sm px-3 py-2 rounded-lg font-mono outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-secondary)' }}
                      />
                      <button 
                        onClick={() => removeVariable(selectedEnv.id, v.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => addVariable(selectedEnv.id)}
                    className="flex items-center gap-2 self-start px-4 py-2 mt-4 rounded-lg text-sm font-bold transition-colors border border-dashed"
                    style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}
                  >
                    <Plus size={14} /> Add Variable
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-50">
                Select or create an environment
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
