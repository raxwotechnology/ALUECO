export default function Table({ columns, data, onRowClick }) {
    return (
        <div className="overflow-x-auto -mx-0">
            <table className="w-full min-w-[500px]">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider${col.hideOnMobile ? ' hidden sm:table-cell' : ''}`}
                                style={{ width: col.width }}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr
                            key={row._id || idx}
                            onClick={() => onRowClick?.(row)}
                            className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''} transition`}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900${col.hideOnMobile ? ' hidden sm:table-cell' : ''}`}>
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}