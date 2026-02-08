"use client";

import { Link } from "@mui/material";
import PaginatedTable from "@/components/common/PaginatedTable";
import mastersService from "@/services/mastersService";

export default function PredefinedDocuments() {
    const fetchDocuments = async ({ page, limit }) => {
        const response = await mastersService.getList("predefine_document.model");
        const allData = response?.result?.data || response?.data || [];

        // Frontend pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = allData.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            meta: {
                page,
                limit,
                total: allData.length,
                pages: Math.ceil(allData.length / limit),
            },
        };
    };

    const columns = [
        {
            field: "page_name",
            label: "Page Name",
        },
        {
            field: "page_url",
            label: "Page URL",
            render: (row) => (
                <Link
                    href={row.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {row.page_url}
                </Link>
            ),
        },
        {
            field: "is_active",
            label: "Status",
            render: (row) => (row.is_active ? "Active" : "Inactive"),
        },
    ];

    return (
        <PaginatedTable
            columns={columns}
            fetcher={fetchDocuments}
            initialPage={1}
            initialLimit={10}
            height="calc(100vh - 278px)"
        />
    );
}
