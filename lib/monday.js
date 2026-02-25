const MONDAY_API_URL = 'https://api.monday.com/v2';

async function mondayQuery(query, variables = {}) {
    const res = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.MONDAY_API_KEY,
            'API-Version': '2024-01',
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`Monday API HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors) throw new Error(`Monday GraphQL: ${json.errors[0].message}`);
    return json.data;
}

function itemToObject(item) {
    const obj = { _id: item.id, name: item.name };
    for (const col of item.column_values) {
        const key = col.column?.title || col.id;
        obj[key] = col.text || null;
    }
    return obj;
}

async function fetchAllItems(boardId) {
    const items = [];

    // First page
    const firstData = await mondayQuery(`
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: 500) {
          cursor
          items {
            id name
            column_values { id text column { title } }
          }
        }
      }
    }
  `);

    const firstPage = firstData.boards[0].items_page;
    items.push(...firstPage.items.map(itemToObject));
    let cursor = firstPage.cursor;

    // Subsequent pages
    while (cursor) {
        const nextData = await mondayQuery(`
      query($cursor: String!) {
        next_items_page(limit: 500, cursor: $cursor) {
          cursor
          items {
            id name
            column_values { id text column { title } }
          }
        }
      }
    `, { cursor });

        const nextPage = nextData.next_items_page;
        items.push(...nextPage.items.map(itemToObject));
        cursor = nextPage.cursor;
    }

    return items;
}

export async function getDeals() {
    return fetchAllItems(process.env.DEALS_BOARD_ID);
}

export async function getWorkOrders() {
    return fetchAllItems(process.env.WORK_ORDERS_BOARD_ID);
}
