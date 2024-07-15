import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';
import 'datatables.net-fixedheader-bs5';

function initializeChatListTable() {
    DataTable.ext.errMode = 'none';
    const chatListTable = new DataTable('#chatListTable', {
        layout: {
            topStart: 'info',
            bottom: 'paging',
            bottomStart: null,
            bottomEnd: null,
        },
        fixedHeader: {
            header: true,
            footer: false
        },
        ordering: true,
        autoWidth: true,
        paging: false,
        colReorder: true,
        order: [{name: 'timestamp', dir: 'desc'}],
        scrollX: false,
        scrollY: 'calc(100vh - 250px)',
        scrollCollapse: true,
        columns: [
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true, className: 'dt-left text-left'},
            {title: 'Topic', data: 'topic', name: 'topic', searchable: true, className: 'dt-left text-left'},
            {title: 'LLM persona', data: 'persona', name: 'persona', searchable: true, className: 'dt-left text-left'},
            {title: 'LLM model', data: 'model', name: 'model', searchable: true, className: 'dt-left text-left'},
            {title: '', data: 'id', render: function(data, type, row) {
                return `
                    <button class="btn btn-outline-secondary btn-sm open-chat-btn" data-id="${data}" aria-label="Open chat"><i class="bi bi-chat-text"></i></button>
                    <button class="btn btn-outline-danger btn-sm delete-chat-btn" data-id="${data}" aria-label="Delete chat"><i class="bi bi-trash"></i></button>
                `;
                },
                searchable: false,
                orderable: false,
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
            console.log('Open chat button clicked: ', button.dataset.id);
        }
        else if(button.classList.contains('delete-chat-btn')) {
            console.log('Delete chat button clicked: ', button.dataset.id);
        }
    });

    return chatListTable;
}

export {initializeChatListTable};