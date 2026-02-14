import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import C from './colors';

const TEXT_MID = C.textSecondary;
const BORDER = C.border;
const ACCENT = C.primary;

/**
 * ✅ REUSABLE PAGINATION COMPONENT
 * 
 * Usage:
 * ```
 * const [page, setPage] = useState(1);
 * const itemsPerPage = 10;
 * 
 * <Pagination 
 *     page={page}
 *     totalItems={100}
 *     itemsPerPage={itemsPerPage}
 *     onPageChange={setPage}
 * />
 * ```
 */
export const Pagination = ({ 
    page = 1, 
    totalItems = 0, 
    itemsPerPage = 10,
    onPageChange = () => {},
    maxVisible = 5
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return null;

    const startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    const adjustedStartPage = Math.max(1, endPage - maxVisible + 1);

    const pages = [];
    for (let i = adjustedStartPage; i <= endPage; i++) {
        pages.push(i);
    }

    const styles = {
        container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 0',
            borderTop: `1px solid ${BORDER}`,
            marginTop: 24
        },
        button: (isActive = false) => ({
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            background: isActive ? ACCENT : 'white',
            color: isActive ? 'white' : TEXT_MID,
            cursor: isActive ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: isActive ? 0.6 : 1
        }),
        info: {
            fontSize: 13,
            color: TEXT_MID,
            marginLeft: 'auto',
            marginRight: 'auto'
        }
    };

    return (
        <div style={styles.container}>
            <button
                onClick={() => onPageChange(1)}
                disabled={page === 1}
                style={styles.button(page === 1)}
                title="First page"
            >
                <ChevronsLeft size={16} />
            </button>

            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                style={styles.button(page === 1)}
            >
                <ChevronLeft size={16} />
            </button>

            {adjustedStartPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        style={{
                            ...styles.button(),
                            padding: '8px 12px',
                            fontWeight: 600
                        }}
                    >
                        1
                    </button>
                    {adjustedStartPage > 2 && <span style={styles.info}>...</span>}
                </>
            )}

            {pages.map(p => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    style={{
                        ...styles.button(p === page),
                        padding: '8px 12px',
                        fontWeight: p === page ? 700 : 600,
                        minWidth: 40
                    }}
                >
                    {p}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span style={styles.info}>...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        style={{
                            ...styles.button(),
                            padding: '8px 12px',
                            fontWeight: 600
                        }}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                style={styles.button(page === totalPages)}
            >
                <ChevronRight size={16} />
            </button>

            <button
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages}
                style={styles.button(page === totalPages)}
                title="Last page"
            >
                <ChevronsRight size={16} />
            </button>

            <div style={styles.info}>
                Page {page} of {totalPages} ({totalItems} total)
            </div>
        </div>
    );
};

/**
 * ✅ PAGINATION HOOK
 * 
 * Usage:
 * ```
 * const { page, setPage, slicedItems, totalPages } = usePagination(
 *     items,
 *     10  // itemsPerPage
 * );
 * 
 * return (
 *     <>
 *         {slicedItems.map(item => <Item key={item.id} item={item} />)}
 *         <Pagination 
 *             page={page}
 *             totalItems={items.length}
 *             itemsPerPage={10}
 *             onPageChange={setPage}
 *         />
 *     </>
 * );
 * ```
 */
export const usePagination = (items = [], itemsPerPage = 10) => {
    const [page, setPage] = useState(1);

    const { slicedItems, totalPages } = useMemo(() => {
        const total = Math.ceil(items.length / itemsPerPage);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const sliced = items.slice(start, end);

        return {
            slicedItems: sliced,
            totalPages: total
        };
    }, [items, itemsPerPage, page]);

    const handlePageChange = useCallback((newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            // Scroll to top (optional)
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [totalPages]);

    return {
        page,
        setPage: handlePageChange,
        slicedItems,
        totalPages
    };
};

/**
 * ✅ ITEMS PER PAGE SELECTOR
 * 
 * Usage in pagination controls
 */
export const ItemsPerPageSelector = ({ value, onChange, options = [10, 25, 50, 100] }) => {
    const styles = {
        container: {
            display: 'flex',
            alignItems: 'center',
            gap: 8
        },
        label: {
            fontSize: 13,
            color: TEXT_MID,
            fontWeight: 500
        },
        select: {
            padding: '6px 10px',
            borderRadius: 6,
            border: `1px solid ${BORDER}`,
            fontSize: 13,
            cursor: 'pointer',
            background: 'white',
            color: C.textPrimary
        }
    };

    return (
        <div style={styles.container}>
            <label style={styles.label}>Items per page:</label>
            <select 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))}
                style={styles.select}
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
};

export default Pagination;
