import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';
import * as Bootstrap from "bootstrap";


function showChatTab() {
    Bootstrap.Tab.getInstance(document.getElementById("chatTab") as HTMLElement)?.show()
}

function showChatListTab() {
    Bootstrap.Tab.getInstance(document.getElementById("chatListTab") as HTMLElement)?.show()
}

function showActionsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("browserActionsTab") as HTMLElement)?.show()
}

function showSettingsTab() {
    Bootstrap.Tab.getInstance(document.getElementById("settingsTab") as HTMLElement)?.show()
}


function initializeChatListTable() {
    DataTable.ext.errMode = 'none';
    let scrollPos: number;
    let tableBody: HTMLDivElement;
    const chatListTable = new DataTable('#chatListTable', {
        layout: {
            top1: 'search',
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
        preDrawCallback: () => {
            tableBody ||= document.querySelector("#chatListPane .dt-scroll-body") as HTMLDivElement;
            scrollPos = tableBody.scrollTop;
        },
        drawCallback: function (settings) {
            (tableBody as HTMLDivElement).scrollTop = scrollPos;
        },
        columns: [
            {
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data, type, row) => `<button class="btn btn-outline-secondary btn-sm open-chat-btn" data-chat-id="${data}" aria-label="Open chat" title="Open chat"><i class="bi bi-chat-text"></i></button>`,
            },
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true, className: 'dt-left text-left'},
            {title: 'Topic', data: 'topic', name: 'topic', searchable: true, className: 'dt-left text-left'},
            {title: 'LLM persona', data: 'persona', name: 'persona', searchable: true, className: 'dt-left text-left'},
            {title: 'LLM model', data: 'model', name: 'model', searchable: true, className: 'dt-left text-left'},
            {
                title: '',
                data: 'id',
                searchable: false,
                orderable: false,
                render: (data, type, row) => `<button class="btn btn-outline-danger btn-sm delete-chat-btn" data-chat-id="${data}" aria-label="Delete chat" title="Delete chat"><i class="bi bi-trash"></i></button>`,
            }
        ],
        data: ([...Array(40).keys()]).map((i) => { return {
                timestamp: `2022-01-01 12:${i + 10}:00`,
            topic: `Some topic ${i}`,
            persona: `Some persona ${i % 3}`,
            model: `Some model ${i % 2}`,
            id: 1985+i
        }})
    });

    chatListTable.on('click', 'button', function(e) {
        const button = (e.target as HTMLElement).closest('button') as HTMLButtonElement;
        if(button.classList.contains('open-chat-btn')) {
            showChatTab()
        }
        else if(button.classList.contains('delete-chat-btn')) {
            const tr = button.closest('tr') as HTMLTableRowElement;
            chatListTable.row(tr).remove().draw();
        }
    });

    // @ts-ignore
    document.querySelector('#chatListTab').addEventListener('shown.bs.tab', function (event) {
        chatListTable.draw();
    });

    const searchControl = document.querySelector("#chatListPane div.dt-search") as HTMLDivElement;
    const searchLabel = document.querySelector("#chatListPane div.dt-search label") as HTMLLabelElement;
    const searchField = document.querySelector("#chatListPane div.dt-search input") as HTMLInputElement;
    searchControl.classList.add("input-group");
    searchLabel.classList.add("input-group-text");
    searchLabel.innerHTML = '<i class="bi bi-search"></i>';
    searchField.classList.remove("form-control-sm");
    searchField.placeholder = "start typing here…";
    searchField.ariaLabel = "Search chats";

    return chatListTable;
}



export {initializeChatListTable};