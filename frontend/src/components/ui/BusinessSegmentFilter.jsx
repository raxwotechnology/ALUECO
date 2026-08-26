import React from 'react';
import { Layers, Package, Globe } from 'lucide-react';

export default function BusinessSegmentFilter({ value = 'all', onChange }) {
    const segments = [
        { id: 'all', label: 'All Operations', icon: Globe, color: 'text-gray-700' },
        { id: 'alueco', label: 'AluEco Aluminium', icon: Layers, color: 'text-indigo-600' },
        { id: 'normal', label: 'Standard / Agro', icon: Package, color: 'text-emerald-600' },
    ];

    return (
        <div className="inline-flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
            {segments.map((seg) => {
                const Icon = seg.icon;
                const isActive = value === seg.id;

                return (
                    <button
                        key={seg.id}
                        type="button"
                        onClick={() => onChange(seg.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                            isActive
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon size={14} className={isActive ? seg.color : 'text-gray-400'} />
                        <span>{seg.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
