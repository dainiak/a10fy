import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';
import {pageListTab} from "./htmlElements";
import {deletePage, getPages} from "../storage/pageStorage";
import {getTextEmbedding} from "../geminiInterfacing";
import {debounce} from "../misc";

declare module 'datatables.net-bs5' {
    interface Config {
        fixedHeader?: any;
        colReorder?: boolean;
    }
}


export async function initializePageListTable() {
    DataTable.ext.errMode = 'none';
    let scrollPos: number;
    let tableBody: HTMLDivElement;

    const getData = async () => {
        return (await getPages() || []).map((page) => {
            return {
                id: page.id,
                timestamp: page.timestamp,
                url: page.url,
                title: page.title,
                vectors: page.vectors,
                score: 0
            }
        });
    }

    const pageListTable = new DataTable('#pageListTable', {
        layout: {
            top: 'search',
            topStart: null,
            topEnd: null,
            bottom: null,
            bottomStart: null,
            bottomEnd: null,
        },
        fixedHeader: {
            header: true,
            footer: false
        },
        ordering: true,
        searching: true,
        autoWidth: true,
        paging: false,
        colReorder: true,
        order: [{name: 'timestamp', dir: 'desc'}],
        scrollX: false,
        scrollY: 'calc(100vh - 250px)',
        scrollCollapse: true,
        language: {
            search: '<i class="bi bi-search"></i>',
            searchPlaceholder: "start typing here…",
            emptyTable: "No page snapshots saved",
            zeroRecords: "No matching pages found",
        },
        preDrawCallback: () => {
            tableBody ||= document.querySelector("#pageListPane .dt-scroll-body") as HTMLDivElement;
            scrollPos = tableBody.scrollTop;
        },
        drawCallback: () => {
            (tableBody as HTMLDivElement).scrollTop = scrollPos;
        },
        columns: [
            {
                title: 'Relevance',
                data: 'score',
                searchable: false,
                orderable: true,
                render: (data: any) => data ? `${data.toFixed(2)}` : "—",
            },
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true, className: 'dt-left text-left page-timestamp'},
            {
                title: 'URL', data: 'url', name: 'url', searchable: true, className: 'dt-left text-left page-url',
                render: (url: string) => url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : "(no url saved)",
            },
            {title: 'Title', data: 'title', name: 'title', searchable: true, className: 'dt-left text-left page-title'},
            {
                title: 'Summary', data: 'summary', name: 'summary', searchable: true, className: 'dt-left text-left page-summary',
                render: (data: any) => "???",
            },
            {
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data: string) => `
<button class="btn btn-outline-danger btn-sm delete-page-btn" data-page-id="${data}" aria-label="Delete page" title="Delete page"><i class="bi bi-trash"></i></button>
`.trim(),
            }
        ],
        data: await getData()
    });

    pageListTable.on('click', 'button', function(e) {
        const button = (e.target as HTMLElement).closest('button') as HTMLButtonElement;
        if(button.classList.contains('open-page-btn')) {
            // TODO: open page / activate tab
        }
        else if(button.classList.contains('delete-page-btn')) {
            const tr = button.closest('tr') as HTMLTableRowElement;
            pageListTable.row(tr).remove().draw();
            deletePage(button.dataset.pageId as string);
        }
    });

    pageListTab.addEventListener('shown.bs.tab', () => {
        getData().then(data => {
            pageListTable.clear();
            pageListTable.rows.add(data);
            pageListTable.draw();
        })
    });

    const searchControl = document.querySelector("#pageListPane div.dt-search") as HTMLDivElement;
    const searchLabel = document.querySelector("#pageListPane div.dt-search label") as HTMLLabelElement;
    const searchField = document.querySelector("#pageListPane div.dt-search input") as HTMLInputElement;
    const fuzzySearchField = document.getElementById("fuzzySearchInput") as HTMLInputElement;

    const debouncedDataUpdate = debounce(
        async () => {
            const searchValue = fuzzySearchField.value.trim();
            if(!searchValue) {
                pageListTable.clear();
                pageListTable.rows.add(await getData());
                pageListTable.draw();
            }

            const cosine = (v1: number[], v2: number[]) => {
                const dot = v1.reduce((acc, cur, i) => acc + cur * v2[i], 0);
                const mag1 = Math.sqrt(v1.reduce((acc, cur) => acc + cur * cur, 0));
                const mag2 = Math.sqrt(v2.reduce((acc, cur) => acc + cur * cur, 0));
                return dot / (mag1 * mag2);
            }
            const embedding = await getTextEmbedding(searchValue) as number[];
            if(Array.isArray(embedding) && embedding.length) {
                const data = await getData();

                for (const page of data) {
                    page.score = page.vectors.reduce((acc, cur) => Math.min(acc, cosine(embedding, cur)), 1000000);
                }
                data.sort((a, b) => a.score - b.score);
                pageListTable.clear();
                pageListTable.rows.add(data);
                pageListTable.order([0, "desc"]).draw();
            }
        }, 800
    )

    fuzzySearchField.onchange = debouncedDataUpdate;
    fuzzySearchField.oninput = debouncedDataUpdate;

    searchControl.classList.add("input-group");
    searchLabel.classList.add("input-group-text");
    searchField.classList.remove("form-control-sm");
    searchField.classList.add("form-control");
    searchField.ariaLabel = "Search history";

    return pageListTable;
}
