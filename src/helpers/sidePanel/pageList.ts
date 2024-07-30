import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';
import {pageListTab} from "./htmlElements";
import {deletePage, getPages} from "../storage/pageStorage";
import {getTextEmbedding} from "../geminiInterfacing";
import {cosine, debounce} from "../misc";
import {escapeToHTML} from "../domTools";


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
                summaries: page.summaries,
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
                render: (url: string) => {
                    if(!url)
                        return "(no url saved)";
                    let shortenedURL = url.replace(/^https?:\/\//, '');
                    if(shortenedURL.length > 30)
                        shortenedURL = shortenedURL.slice(0, 30) + '…';
                    return `<a href="${url}" title="${url}" target="_blank" rel="noopener noreferrer">${escapeToHTML(shortenedURL)}</a>`
                },
            },
            {title: 'Title', data: 'title', name: 'title', searchable: true, className: 'dt-left text-left page-title'},
            {
                title: 'Summary', data: 'summaries', name: 'summary', searchable: true, className: 'dt-left text-left page-summary',
                render: (summaries: any) => {
                    if (!summaries || !summaries.length)
                        return "—";
                    const summary = summaries[0];
                    const shortenedSummary = summary.length > 51 ? summary.slice(0, 50) + '…' : summary;
                    return `<span title="${escapeToHTML(summary)}">${escapeToHTML(shortenedSummary)}</span>`;
                },
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
    const fuzzySearchField = document.getElementById("fuzzySearchPagesInput") as HTMLInputElement;

    fuzzySearchField.oninput = debounce(
        async () => {
            const searchValue = fuzzySearchField.value.trim();
            if(!searchValue) {
                pageListTable.clear();
                pageListTable.rows.add(await getData()).draw();
                return;
            }

            const embedding = await getTextEmbedding(searchValue) as number[];
            if(Array.isArray(embedding) && embedding.length) {
                const data = await getData();

                for (const page of data) {
                    page.score = page.vectors ? page.vectors.reduce((acc, cur) => Math.min(acc, cosine(embedding, cur)), 1000000) : 0;
                }
                data.sort((a, b) => a.score - b.score);
                pageListTable.clear();
                pageListTable.rows.add(data);
                pageListTable.order([0, "desc"]).draw();
            }
        }, 800
    )

    searchControl.classList.add("input-group");
    searchLabel.classList.add("input-group-text");
    searchField.classList.remove("form-control-sm");
    searchField.classList.add("form-control");
    searchField.ariaLabel = "Search history";

    return pageListTable;
}
