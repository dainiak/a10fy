import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';
import {pageListTab} from "./htmlElements";

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
        return [];
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
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data: string) => `<button class="btn btn-outline-secondary btn-sm open-page-btn" data-page-id="${data}" aria-label="Open page" title="Open page"><i class="bi bi-file-earmark-richtext"></i></button>`,
            },
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true, className: 'dt-left text-left page-timestamp'},
            {
                title: 'URL', data: 'url', name: 'url', searchable: true, className: 'dt-left text-left page-url',
                render: (data: any) => "???",
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
            // TODO: delete page info
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
    searchControl.classList.add("input-group");
    searchLabel.classList.add("input-group-text");
    searchField.classList.remove("form-control-sm");
    searchField.classList.add("form-control");
    searchField.ariaLabel = "Search history";

    return pageListTable;
}
