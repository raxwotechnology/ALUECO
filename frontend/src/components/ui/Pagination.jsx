import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange, total }) {
    if (totalPages <= 1) return null;

    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium">{page}</span>
                <span className="text-gray-400"> / {totalPages}</span>
                {total !== undefined && <span className="text-gray-400 ml-1 hidden sm:inline">({total} total)</span>}
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canPrev}
                    className="min-h-[36px] px-2.5 sm:px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Previous</span>
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canNext}
                    className="min-h-[36px] px-2.5 sm:px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}