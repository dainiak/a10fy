import DataTable from 'datatables.net-bs5';
import 'datatables.net-colreorder-bs5';

function initializeChatListTable() {
    DataTable.ext.errMode = 'none';
    const chatListTable = new DataTable('#chatListTable', {
        ordering: true,
        paging: true,
        colReorder: true,
        order: [{name: 'timestamp', dir: 'desc'}],
        columns: [
            {title: 'Timestamp', data: 'timestamp', name: 'timestamp', searchable: true},
            {title: 'Topic', data: 'topic', name: 'topic', searchable: true},
            {title: 'LLM persona', data: 'persona', name: 'persona', searchable: true},
            {title: 'LLM model', data: 'model', name: 'model', searchable: true},
        ],
        data: ([...Array(40).keys()]).map((i) => { return {
                timestamp: `2022-01-01 12:${i + 10}:00`,
            topic: `Some topic ${i}`,
            persona: `Some persona ${i % 3}`,
            model: `Some model ${i % 2}`
        }})
    });

    return chatListTable;
}

export {initializeChatListTable};